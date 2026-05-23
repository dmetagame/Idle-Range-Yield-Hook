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
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {ERC6909} from "@uniswap/v4-core/src/ERC6909.sol";

import {ERC4626} from "solmate/src/mixins/ERC4626.sol";
import {SafeTransferLib} from "solmate/src/utils/SafeTransferLib.sol";
import {ERC20} from "solmate/src/tokens/ERC20.sol";
import {FixedPointMathLib} from "solmate/src/utils/FixedPointMathLib.sol";

/// @title IdleYieldHook — concentrated liquidity that earns lending yield while out-of-range.
/// @notice Day-3 milestone: vault routing for parked capital + tick-driven park/unpark.
contract IdleYieldHook is BaseHook, ERC6909 {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;
    using SafeTransferLib for ERC20;

    enum Status {
        UNSET,
        ACTIVE_IN_RANGE,
        PARKED_OUT_OF_RANGE
    }

    struct ManagedPool {
        int24 lowerTick;
        int24 upperTick;
        ERC4626 vault0;
        ERC4626 vault1;
        uint256 token0InHook;
        uint256 token1InHook;
        uint256 vault0Shares;
        uint256 vault1Shares;
        uint256 totalShares;
        Status status;
    }

    uint256 internal constant MIN_LIQUIDITY = 1_000;

    mapping(PoolId => ManagedPool) public pools;

    event PoolRegistered(
        PoolId indexed poolId, int24 lowerTick, int24 upperTick, address vault0, address vault1, Status status
    );
    event Deposited(PoolId indexed poolId, address indexed user, uint256 amount0, uint256 amount1, uint256 shares);
    event Withdrawn(PoolId indexed poolId, address indexed user, uint256 amount0, uint256 amount1, uint256 shares);
    event Parked(PoolId indexed poolId, uint256 amount0, uint256 amount1);
    event Unparked(PoolId indexed poolId, uint256 amount0, uint256 amount1);

    error PoolNotRegistered();
    error PoolAlreadyRegistered();
    error InvalidTickRange();
    error InvalidVault();
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
            beforeSwap: false,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function _afterInitialize(address, PoolKey calldata, uint160, int24)
        internal
        pure
        override
        returns (bytes4)
    {
        return BaseHook.afterInitialize.selector;
    }

    function _beforeAddLiquidity(address sender, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata)
        internal
        view
        override
        returns (bytes4)
    {
        require(sender == address(this), "IdleYieldHook: direct LP adds disallowed; use deposit()");
        return BaseHook.beforeAddLiquidity.selector;
    }

    function _afterSwap(address, PoolKey calldata key, SwapParams calldata, BalanceDelta, bytes calldata)
        internal
        override
        returns (bytes4, int128)
    {
        _rebalance(key);
        return (BaseHook.afterSwap.selector, 0);
    }

    /// @notice Register a pool with the hook by specifying the target active range and yield vaults.
    /// @dev Vaults must wrap the respective currencies. The pool's current tick determines the
    ///      initial status (ACTIVE if in range, PARKED otherwise).
    function registerPool(
        PoolKey calldata key,
        int24 lowerTick,
        int24 upperTick,
        ERC4626 vault0,
        ERC4626 vault1
    ) external {
        if (lowerTick >= upperTick) revert InvalidTickRange();
        if (address(vault0.asset()) != Currency.unwrap(key.currency0)) revert InvalidVault();
        if (address(vault1.asset()) != Currency.unwrap(key.currency1)) revert InvalidVault();

        PoolId poolId = key.toId();
        ManagedPool storage p = pools[poolId];
        if (p.status != Status.UNSET) revert PoolAlreadyRegistered();

        p.lowerTick = lowerTick;
        p.upperTick = upperTick;
        p.vault0 = vault0;
        p.vault1 = vault1;

        (, int24 currentTick,,) = poolManager.getSlot0(poolId);
        p.status = _isInRange(currentTick, lowerTick, upperTick) ? Status.ACTIVE_IN_RANGE : Status.PARKED_OUT_OF_RANGE;

        emit PoolRegistered(poolId, lowerTick, upperTick, address(vault0), address(vault1), p.status);
    }

    /// @notice Deposit token0 and token1 in proportion to current reserves; receive shares.
    /// @dev If pool is PARKED, deposits route straight into vaults so the new capital starts
    ///      earning yield immediately.
    function deposit(PoolKey calldata key, uint256 amount0, uint256 amount1) external returns (uint256 shares) {
        if (amount0 == 0 && amount1 == 0) revert ZeroDeposit();

        PoolId poolId = key.toId();
        ManagedPool storage p = pools[poolId];
        if (p.status == Status.UNSET) revert PoolNotRegistered();

        ERC20 token0 = ERC20(Currency.unwrap(key.currency0));
        ERC20 token1 = ERC20(Currency.unwrap(key.currency1));

        token0.safeTransferFrom(msg.sender, address(this), amount0);
        token1.safeTransferFrom(msg.sender, address(this), amount1);

        uint256 reserve0Before = _totalReserve0(p);
        uint256 reserve1Before = _totalReserve1(p);

        uint256 tokenId = uint256(PoolId.unwrap(poolId));

        if (p.totalShares == 0) {
            uint256 initialShares = FixedPointMathLib.sqrt(amount0 * amount1);
            if (initialShares <= MIN_LIQUIDITY) revert InsufficientInitialLiquidity();
            shares = initialShares - MIN_LIQUIDITY;
            _mint(address(0xdead), tokenId, MIN_LIQUIDITY);
            p.totalShares = initialShares;
        } else {
            uint256 sharesFrom0 = (amount0 * p.totalShares) / reserve0Before;
            uint256 sharesFrom1 = (amount1 * p.totalShares) / reserve1Before;
            shares = sharesFrom0 < sharesFrom1 ? sharesFrom0 : sharesFrom1;
            if (shares == 0) revert ZeroDeposit();
            p.totalShares += shares;
        }

        // Park the incoming capital if the pool is currently out-of-range, otherwise hold in hook.
        if (p.status == Status.PARKED_OUT_OF_RANGE) {
            _depositToVault(p.vault0, p, amount0, true);
            _depositToVault(p.vault1, p, amount1, false);
        } else {
            p.token0InHook += amount0;
            p.token1InHook += amount1;
        }

        _mint(msg.sender, tokenId, shares);
        emit Deposited(poolId, msg.sender, amount0, amount1, shares);
    }

    /// @notice Burn shares and receive proportional token0/token1, pulled from wherever capital lives.
    function withdraw(PoolKey calldata key, uint256 shares)
        external
        returns (uint256 amount0, uint256 amount1)
    {
        PoolId poolId = key.toId();
        ManagedPool storage p = pools[poolId];
        if (p.status == Status.UNSET) revert PoolNotRegistered();

        uint256 tokenId = uint256(PoolId.unwrap(poolId));
        uint256 userShares = balanceOf[msg.sender][tokenId];
        if (shares == 0 || shares > userShares) revert InsufficientShares();

        uint256 reserve0 = _totalReserve0(p);
        uint256 reserve1 = _totalReserve1(p);

        amount0 = (shares * reserve0) / p.totalShares;
        amount1 = (shares * reserve1) / p.totalShares;

        p.totalShares -= shares;
        _burn(msg.sender, tokenId, shares);

        _pullFromAnywhere(p, amount0, true);
        _pullFromAnywhere(p, amount1, false);

        ERC20(Currency.unwrap(key.currency0)).safeTransfer(msg.sender, amount0);
        ERC20(Currency.unwrap(key.currency1)).safeTransfer(msg.sender, amount1);

        emit Withdrawn(poolId, msg.sender, amount0, amount1, shares);
    }

    /// @notice Permissionless trigger to re-evaluate range and park/unpark as needed.
    function rebalance(PoolKey calldata key) external {
        _rebalance(key);
    }

    function totalReserve0(PoolId poolId) external view returns (uint256) {
        return _totalReserve0(pools[poolId]);
    }

    function totalReserve1(PoolId poolId) external view returns (uint256) {
        return _totalReserve1(pools[poolId]);
    }

    function _totalReserve0(ManagedPool storage p) internal view returns (uint256) {
        uint256 fromVault = p.vault0Shares == 0 ? 0 : p.vault0.convertToAssets(p.vault0Shares);
        return p.token0InHook + fromVault;
    }

    function _totalReserve1(ManagedPool storage p) internal view returns (uint256) {
        uint256 fromVault = p.vault1Shares == 0 ? 0 : p.vault1.convertToAssets(p.vault1Shares);
        return p.token1InHook + fromVault;
    }

    function _isInRange(int24 tick, int24 lower, int24 upper) internal pure returns (bool) {
        return tick >= lower && tick < upper;
    }

    function _rebalance(PoolKey calldata key) internal {
        PoolId poolId = key.toId();
        ManagedPool storage p = pools[poolId];
        if (p.status == Status.UNSET) return;

        (, int24 currentTick,,) = poolManager.getSlot0(poolId);
        bool inRange = _isInRange(currentTick, p.lowerTick, p.upperTick);

        if (!inRange && p.status == Status.ACTIVE_IN_RANGE) {
            _park(poolId, p);
        } else if (inRange && p.status == Status.PARKED_OUT_OF_RANGE) {
            _unpark(poolId, p);
        }
    }

    function _park(PoolId poolId, ManagedPool storage p) internal {
        uint256 amount0 = p.token0InHook;
        uint256 amount1 = p.token1InHook;
        if (amount0 > 0) _depositToVault(p.vault0, p, amount0, true);
        if (amount1 > 0) _depositToVault(p.vault1, p, amount1, false);
        p.token0InHook = 0;
        p.token1InHook = 0;
        p.status = Status.PARKED_OUT_OF_RANGE;
        emit Parked(poolId, amount0, amount1);
    }

    function _unpark(PoolId poolId, ManagedPool storage p) internal {
        uint256 amount0;
        uint256 amount1;
        if (p.vault0Shares > 0) {
            amount0 = p.vault0.redeem(p.vault0Shares, address(this), address(this));
            p.vault0Shares = 0;
        }
        if (p.vault1Shares > 0) {
            amount1 = p.vault1.redeem(p.vault1Shares, address(this), address(this));
            p.vault1Shares = 0;
        }
        p.token0InHook += amount0;
        p.token1InHook += amount1;
        p.status = Status.ACTIVE_IN_RANGE;
        emit Unparked(poolId, amount0, amount1);
    }

    function _depositToVault(ERC4626 vault, ManagedPool storage p, uint256 amount, bool isToken0) internal {
        ERC20(address(vault.asset())).safeApprove(address(vault), amount);
        uint256 mintedShares = vault.deposit(amount, address(this));
        if (isToken0) {
            p.vault0Shares += mintedShares;
        } else {
            p.vault1Shares += mintedShares;
        }
    }

    /// @notice Withdraw `amount` of the given side from vault first, then top up from hook if shortfall.
    /// @dev Pulls preferentially from the vault to keep hook balances available for in-range minting later.
    function _pullFromAnywhere(ManagedPool storage p, uint256 amount, bool isToken0) internal {
        if (amount == 0) return;
        ERC4626 vault = isToken0 ? p.vault0 : p.vault1;
        uint256 vaultShares = isToken0 ? p.vault0Shares : p.vault1Shares;

        if (vaultShares > 0) {
            uint256 available = vault.convertToAssets(vaultShares);
            uint256 fromVault = amount > available ? available : amount;
            uint256 sharesBurned = vault.withdraw(fromVault, address(this), address(this));
            if (isToken0) {
                p.vault0Shares -= sharesBurned;
            } else {
                p.vault1Shares -= sharesBurned;
            }
            amount -= fromVault;
        }
        if (amount > 0) {
            if (isToken0) {
                p.token0InHook -= amount;
            } else {
                p.token1InHook -= amount;
            }
        }
    }

    function poolShares(PoolId poolId, address user) external view returns (uint256) {
        return balanceOf[user][uint256(PoolId.unwrap(poolId))];
    }
}
