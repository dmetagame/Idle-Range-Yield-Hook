// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "@openzeppelin/uniswap-hooks/src/base/BaseHook.sol";

import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager, SwapParams, ModifyLiquidityParams} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {ERC6909} from "@uniswap/v4-core/src/ERC6909.sol";

import {SafeTransferLib} from "solmate/src/utils/SafeTransferLib.sol";
import {ERC20} from "solmate/src/tokens/ERC20.sol";
import {FixedPointMathLib} from "solmate/src/utils/FixedPointMathLib.sol";

/// @title IdleYieldHook — concentrated liquidity that earns lending yield while out-of-range.
/// @notice Day-2 milestone: ERC-6909 share accounting + deposit/withdraw.
///         Token custody is currently held in the hook itself; vault routing comes day 3,
///         V4 liquidity provisioning comes day 3-4.
contract IdleYieldHook is BaseHook, ERC6909 {
    using PoolIdLibrary for PoolKey;
    using SafeTransferLib for ERC20;

    enum Status {
        UNSET,
        ACTIVE_IN_RANGE,
        PARKED_OUT_OF_RANGE
    }

    struct ManagedPool {
        int24 lowerTick;
        int24 upperTick;
        uint128 liquidityInPool;
        uint256 token0Reserve;
        uint256 token1Reserve;
        uint256 totalShares;
        Status status;
    }

    uint256 internal constant MIN_LIQUIDITY = 1_000;

    mapping(PoolId => ManagedPool) public pools;

    event PoolRegistered(PoolId indexed poolId, int24 lowerTick, int24 upperTick);
    event Deposited(PoolId indexed poolId, address indexed user, uint256 amount0, uint256 amount1, uint256 shares);
    event Withdrawn(PoolId indexed poolId, address indexed user, uint256 amount0, uint256 amount1, uint256 shares);

    error PoolNotRegistered();
    error PoolAlreadyRegistered();
    error InvalidTickRange();
    error ZeroDeposit();
    error InsufficientShares();
    error InsufficientInitialLiquidity();

    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {}

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: true,
            beforeAddLiquidity: true,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    /// @notice Register the active range for a pool. Called once after the V4 pool is initialised.
    /// @dev Range is encoded in initialize hookData as abi.encode(int24 lowerTick, int24 upperTick).
    function _afterInitialize(address, PoolKey calldata key, uint160, int24)
        internal
        override
        returns (bytes4)
    {
        return BaseHook.afterInitialize.selector;
    }

    /// @notice Block direct LP adds; users must route through `deposit()` so the hook owns positions.
    function _beforeAddLiquidity(address sender, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata)
        internal
        view
        override
        returns (bytes4)
    {
        require(sender == address(this), "IdleYieldHook: direct LP adds disallowed; use deposit()");
        return BaseHook.beforeAddLiquidity.selector;
    }

    function _beforeSwap(address, PoolKey calldata, SwapParams calldata, bytes calldata)
        internal
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    function _afterSwap(address, PoolKey calldata, SwapParams calldata, BalanceDelta, bytes calldata)
        internal
        override
        returns (bytes4, int128)
    {
        return (BaseHook.afterSwap.selector, 0);
    }

    /// @notice Register a pool with the hook by specifying the target active range.
    /// @dev Permissionless. The first caller for a given PoolId wins; further calls revert.
    function registerPool(PoolKey calldata key, int24 lowerTick, int24 upperTick) external {
        if (lowerTick >= upperTick) revert InvalidTickRange();
        PoolId poolId = key.toId();
        ManagedPool storage p = pools[poolId];
        if (p.status != Status.UNSET) revert PoolAlreadyRegistered();
        p.lowerTick = lowerTick;
        p.upperTick = upperTick;
        p.status = Status.PARKED_OUT_OF_RANGE;
        emit PoolRegistered(poolId, lowerTick, upperTick);
    }

    /// @notice Deposit token0 and token1 in proportion to the pool's current reserves; receive shares.
    /// @dev First depositor sets the initial reserve ratio and gets sqrt(amount0 * amount1) shares
    ///      (minus MIN_LIQUIDITY which is locked to prevent share-price manipulation).
    function deposit(PoolKey calldata key, uint256 amount0, uint256 amount1) external returns (uint256 shares) {
        if (amount0 == 0 && amount1 == 0) revert ZeroDeposit();

        PoolId poolId = key.toId();
        ManagedPool storage p = pools[poolId];
        if (p.status == Status.UNSET) revert PoolNotRegistered();

        ERC20 token0 = ERC20(Currency.unwrap(key.currency0));
        ERC20 token1 = ERC20(Currency.unwrap(key.currency1));

        token0.safeTransferFrom(msg.sender, address(this), amount0);
        token1.safeTransferFrom(msg.sender, address(this), amount1);

        uint256 tokenId = uint256(PoolId.unwrap(poolId));

        if (p.totalShares == 0) {
            uint256 initialShares = FixedPointMathLib.sqrt(amount0 * amount1);
            if (initialShares <= MIN_LIQUIDITY) revert InsufficientInitialLiquidity();
            shares = initialShares - MIN_LIQUIDITY;
            _mint(address(0xdead), tokenId, MIN_LIQUIDITY);
            p.totalShares = initialShares;
        } else {
            uint256 sharesFrom0 = (amount0 * p.totalShares) / p.token0Reserve;
            uint256 sharesFrom1 = (amount1 * p.totalShares) / p.token1Reserve;
            shares = sharesFrom0 < sharesFrom1 ? sharesFrom0 : sharesFrom1;
            if (shares == 0) revert ZeroDeposit();
            p.totalShares += shares;
        }

        p.token0Reserve += amount0;
        p.token1Reserve += amount1;

        _mint(msg.sender, tokenId, shares);
        emit Deposited(poolId, msg.sender, amount0, amount1, shares);
    }

    /// @notice Burn shares and receive proportional token0/token1.
    function withdraw(PoolKey calldata key, uint256 shares)
        external
        returns (uint256 amount0, uint256 amount1)
    {
        PoolId poolId = key.toId();
        ManagedPool storage p = pools[poolId];
        if (p.status == Status.UNSET) revert PoolNotRegistered();

        uint256 userShares = balanceOf[msg.sender][uint256(PoolId.unwrap(poolId))];
        if (shares == 0 || shares > userShares) revert InsufficientShares();

        amount0 = (shares * p.token0Reserve) / p.totalShares;
        amount1 = (shares * p.token1Reserve) / p.totalShares;

        p.token0Reserve -= amount0;
        p.token1Reserve -= amount1;
        p.totalShares -= shares;

        _burn(msg.sender, uint256(PoolId.unwrap(poolId)), shares);

        ERC20(Currency.unwrap(key.currency0)).safeTransfer(msg.sender, amount0);
        ERC20(Currency.unwrap(key.currency1)).safeTransfer(msg.sender, amount1);

        emit Withdrawn(poolId, msg.sender, amount0, amount1, shares);
    }

    function poolShares(PoolId poolId, address user) external view returns (uint256) {
        return balanceOf[user][uint256(PoolId.unwrap(poolId))];
    }
}
