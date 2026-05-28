// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "@openzeppelin/uniswap-hooks/src/base/BaseHook.sol";
import {CurrencySettler} from "@openzeppelin/uniswap-hooks/src/utils/CurrencySettler.sol";

import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager, SwapParams, ModifyLiquidityParams} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {ERC6909} from "@uniswap/v4-core/src/ERC6909.sol";

import {LiquidityAmounts} from "@uniswap/v4-core/test/utils/LiquidityAmounts.sol";

import {ERC4626} from "solmate/src/mixins/ERC4626.sol";
import {SafeTransferLib} from "solmate/src/utils/SafeTransferLib.sol";
import {ERC20} from "solmate/src/tokens/ERC20.sol";
import {FixedPointMathLib} from "solmate/src/utils/FixedPointMathLib.sol";

/// @title IdleYieldHook — concentrated liquidity that earns lending yield while out-of-range.
/// @notice Day-4: V4 LP minting via unlock callback when in-range; vault routing when out-of-range.
contract IdleYieldHook is BaseHook, ERC6909, IUnlockCallback {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;
    using CurrencySettler for Currency;
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
        uint128 liquidityInPool;
        uint256 token0InHook;
        uint256 token1InHook;
        uint256 vault0Shares;
        uint256 vault1Shares;
        uint256 totalShares;
        Status status;
    }

    enum CallbackKind {
        MINT_TO_RANGE,
        BURN_ALL_RANGE
    }

    struct CallbackData {
        CallbackKind kind;
        PoolKey key;
    }

    uint256 internal constant MIN_LIQUIDITY = 1_000;
    bytes32 internal constant POSITION_SALT = bytes32(0);
    uint256 private _locked = 1;

    address public owner;
    mapping(PoolId => ManagedPool) public pools;
    mapping(bytes32 => bool) public approvedPoolConfigs;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PoolConfigApproved(bytes32 indexed configHash);
    event PoolConfigApprovalRevoked(bytes32 indexed configHash);
    event PoolRegistered(
        PoolId indexed poolId, int24 lowerTick, int24 upperTick, address vault0, address vault1, Status status
    );
    event Deposited(PoolId indexed poolId, address indexed user, uint256 amount0, uint256 amount1, uint256 shares);
    event Withdrawn(PoolId indexed poolId, address indexed user, uint256 amount0, uint256 amount1, uint256 shares);
    event V4LiquidityMinted(PoolId indexed poolId, uint128 liquidity, uint256 used0, uint256 used1);
    event V4LiquidityBurned(PoolId indexed poolId, uint128 liquidity, uint256 received0, uint256 received1);
    event Parked(PoolId indexed poolId, uint256 amount0, uint256 amount1);
    event Unparked(PoolId indexed poolId, uint256 amount0, uint256 amount1);

    error PoolNotRegistered();
    error PoolAlreadyRegistered();
    error InvalidTickRange();
    error InvalidVault();
    error InvalidHook();
    error NotOwner();
    error PoolRegistrationNotApproved();
    error Reentrancy();
    error ZeroDeposit();
    error InsufficientShares();
    error InsufficientInitialLiquidity();
    error EmptyReserveSide();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (_locked != 1) revert Reentrancy();
        _locked = 2;
        _;
        _locked = 1;
    }

    constructor(IPoolManager _poolManager, address initialOwner) BaseHook(_poolManager) {
        require(initialOwner != address(0), "IdleYieldHook: zero owner");
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "IdleYieldHook: zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

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

    function _beforeSwap(address, PoolKey calldata key, SwapParams calldata params, bytes calldata)
        internal
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        PoolId poolId = key.toId();
        ManagedPool storage p = pools[poolId];
        if (p.status == Status.PARKED_OUT_OF_RANGE) {
            (, int24 currentTick,,) = poolManager.getSlot0(poolId);
            bool willApproachRange = params.zeroForOne
                ? p.upperTick <= currentTick // price decreasing into a range that sits at/below current tick
                : p.lowerTick > currentTick; // price increasing into a range that sits above current tick
            if (willApproachRange) {
                _unparkInUnlock(poolId, p, key);
            }
        }
        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    function _afterSwap(address, PoolKey calldata key, SwapParams calldata, BalanceDelta, bytes calldata)
        internal
        override
        returns (bytes4, int128)
    {
        _rebalanceInUnlock(key);
        return (BaseHook.afterSwap.selector, 0);
    }

    function registerPool(
        PoolKey calldata key,
        int24 lowerTick,
        int24 upperTick,
        ERC4626 vault0,
        ERC4626 vault1
    ) external nonReentrant {
        _validatePoolShape(key, lowerTick, upperTick);

        bytes32 configHash = poolConfigHash(key, lowerTick, upperTick, vault0, vault1);
        if (msg.sender != owner) {
            if (!approvedPoolConfigs[configHash]) revert PoolRegistrationNotApproved();
        }
        delete approvedPoolConfigs[configHash];

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

    function approvePoolConfig(
        PoolKey calldata key,
        int24 lowerTick,
        int24 upperTick,
        ERC4626 vault0,
        ERC4626 vault1
    ) external onlyOwner returns (bytes32 configHash) {
        _validatePoolShape(key, lowerTick, upperTick);
        if (address(vault0.asset()) != Currency.unwrap(key.currency0)) revert InvalidVault();
        if (address(vault1.asset()) != Currency.unwrap(key.currency1)) revert InvalidVault();
        poolManager.getSlot0(key.toId());

        configHash = poolConfigHash(key, lowerTick, upperTick, vault0, vault1);
        approvedPoolConfigs[configHash] = true;
        emit PoolConfigApproved(configHash);
    }

    function revokePoolConfig(bytes32 configHash) external onlyOwner {
        delete approvedPoolConfigs[configHash];
        emit PoolConfigApprovalRevoked(configHash);
    }

    function poolConfigHash(
        PoolKey calldata key,
        int24 lowerTick,
        int24 upperTick,
        ERC4626 vault0,
        ERC4626 vault1
    ) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                Currency.unwrap(key.currency0),
                Currency.unwrap(key.currency1),
                key.fee,
                key.tickSpacing,
                address(key.hooks),
                lowerTick,
                upperTick,
                address(vault0),
                address(vault1)
            )
        );
    }

    function deposit(PoolKey calldata key, uint256 amount0, uint256 amount1)
        external
        nonReentrant
        returns (uint256 shares)
    {
        if (amount0 == 0 && amount1 == 0) revert ZeroDeposit();

        PoolId poolId = key.toId();
        ManagedPool storage p = pools[poolId];
        if (p.status == Status.UNSET) revert PoolNotRegistered();

        ERC20 token0 = ERC20(Currency.unwrap(key.currency0));
        ERC20 token1 = ERC20(Currency.unwrap(key.currency1));

        if (p.status == Status.ACTIVE_IN_RANGE && p.liquidityInPool > 0) {
            _burnAllRangeFromV4(key);
        }

        uint256 reserve0Before = _totalReserveSide(poolId, p, true);
        uint256 reserve1Before = _totalReserveSide(poolId, p, false);

        uint256 tokenId = uint256(PoolId.unwrap(poolId));
        uint256 used0 = amount0;
        uint256 used1 = amount1;

        if (p.totalShares == 0) {
            uint256 initialShares = FixedPointMathLib.sqrt(amount0 * amount1);
            if (initialShares <= MIN_LIQUIDITY) revert InsufficientInitialLiquidity();
            shares = initialShares - MIN_LIQUIDITY;
            _mint(address(0xdead), tokenId, MIN_LIQUIDITY);
            p.totalShares = initialShares;
        } else {
            if (reserve0Before == 0 || reserve1Before == 0) revert EmptyReserveSide();
            uint256 sharesFrom0 = (amount0 * p.totalShares) / reserve0Before;
            uint256 sharesFrom1 = (amount1 * p.totalShares) / reserve1Before;
            shares = sharesFrom0 < sharesFrom1 ? sharesFrom0 : sharesFrom1;
            if (shares == 0) revert ZeroDeposit();
            used0 = (shares * reserve0Before) / p.totalShares;
            used1 = (shares * reserve1Before) / p.totalShares;
            p.totalShares += shares;
        }

        if (used0 > 0) token0.safeTransferFrom(msg.sender, address(this), used0);
        if (used1 > 0) token1.safeTransferFrom(msg.sender, address(this), used1);

        p.token0InHook += used0;
        p.token1InHook += used1;

        if (p.status == Status.ACTIVE_IN_RANGE) {
            _mintAllInHookToV4(key);
        } else {
            _moveAllInHookToVaults(p);
        }

        _mint(msg.sender, tokenId, shares);
        emit Deposited(poolId, msg.sender, used0, used1, shares);
    }

    function withdraw(PoolKey calldata key, uint256 shares)
        external
        nonReentrant
        returns (uint256 amount0, uint256 amount1)
    {
        PoolId poolId = key.toId();
        ManagedPool storage p = pools[poolId];
        if (p.status == Status.UNSET) revert PoolNotRegistered();

        uint256 tokenId = uint256(PoolId.unwrap(poolId));
        uint256 userShares = balanceOf[msg.sender][tokenId];
        if (shares == 0 || shares > userShares) revert InsufficientShares();

        // Burn all V4 liquidity into hook custody first so we can serve the redemption.
        if (p.status == Status.ACTIVE_IN_RANGE && p.liquidityInPool > 0) {
            _burnAllRangeFromV4(key);
        }

        uint256 reserve0 = _totalReserveSide(poolId, p, true);
        uint256 reserve1 = _totalReserveSide(poolId, p, false);

        amount0 = (shares * reserve0) / p.totalShares;
        amount1 = (shares * reserve1) / p.totalShares;

        p.totalShares -= shares;
        _burn(msg.sender, tokenId, shares);

        _pullFromAnywhere(p, amount0, true);
        _pullFromAnywhere(p, amount1, false);

        ERC20(Currency.unwrap(key.currency0)).safeTransfer(msg.sender, amount0);
        ERC20(Currency.unwrap(key.currency1)).safeTransfer(msg.sender, amount1);

        // If we were ACTIVE, redeploy whatever is left in the hook as LP again.
        if (p.status == Status.ACTIVE_IN_RANGE && (p.token0InHook > 0 || p.token1InHook > 0)) {
            _mintAllInHookToV4(key);
        }

        emit Withdrawn(poolId, msg.sender, amount0, amount1, shares);
    }

    /// @notice Permissionless trigger to re-evaluate range and park/unpark as needed.
    /// @dev Uses the unlock+callback path because it's called from non-unlocked context.
    function rebalance(PoolKey calldata key) external nonReentrant {
        PoolId poolId = key.toId();
        ManagedPool storage p = pools[poolId];
        if (p.status == Status.UNSET) return;

        (, int24 currentTick,,) = poolManager.getSlot0(poolId);
        bool inRange = _isInRange(currentTick, p.lowerTick, p.upperTick);

        if (!inRange && p.status == Status.ACTIVE_IN_RANGE) {
            _parkExternal(key);
        } else if (inRange && p.status == Status.PARKED_OUT_OF_RANGE) {
            _unparkExternal(key);
        }
    }

    function totalReserve0(PoolId poolId) external view returns (uint256) {
        return _totalReserveSide(poolId, pools[poolId], true);
    }

    function totalReserve1(PoolId poolId) external view returns (uint256) {
        return _totalReserveSide(poolId, pools[poolId], false);
    }

    function poolShares(PoolId poolId, address user) external view returns (uint256) {
        return balanceOf[user][uint256(PoolId.unwrap(poolId))];
    }

    /*//////////////////////////////////////////////////////////////
                           UNLOCK CALLBACK
    //////////////////////////////////////////////////////////////*/

    function unlockCallback(bytes calldata raw) external override returns (bytes memory) {
        require(msg.sender == address(poolManager), "IdleYieldHook: not PoolManager");
        CallbackData memory data = abi.decode(raw, (CallbackData));
        if (data.kind == CallbackKind.MINT_TO_RANGE) {
            _mintAllInHookToV4_inUnlock(data.key);
        } else if (data.kind == CallbackKind.BURN_ALL_RANGE) {
            _burnAllRangeFromV4_inUnlock(data.key);
        }
        return "";
    }

    /*//////////////////////////////////////////////////////////////
                      INTERNAL — RESERVE / RANGE
    //////////////////////////////////////////////////////////////*/

    function _totalReserveSide(PoolId poolId, ManagedPool storage p, bool isToken0)
        internal
        view
        returns (uint256)
    {
        uint256 fromVault;
        uint256 inHook;
        if (isToken0) {
            fromVault = p.vault0Shares == 0 ? 0 : p.vault0.convertToAssets(p.vault0Shares);
            inHook = p.token0InHook;
        } else {
            fromVault = p.vault1Shares == 0 ? 0 : p.vault1.convertToAssets(p.vault1Shares);
            inHook = p.token1InHook;
        }

        uint256 fromPool;
        if (p.liquidityInPool > 0) {
            (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId);
            (uint256 amt0, uint256 amt1) = LiquidityAmounts.getAmountsForLiquidity(
                sqrtPriceX96,
                TickMath.getSqrtPriceAtTick(p.lowerTick),
                TickMath.getSqrtPriceAtTick(p.upperTick),
                p.liquidityInPool
            );
            fromPool = isToken0 ? amt0 : amt1;
        }
        return inHook + fromVault + fromPool;
    }

    function _isInRange(int24 tick, int24 lower, int24 upper) internal pure returns (bool) {
        return tick >= lower && tick < upper;
    }

    function _validatePoolShape(PoolKey calldata key, int24 lowerTick, int24 upperTick) internal view {
        if (address(key.hooks) != address(this)) revert InvalidHook();
        if (
            lowerTick >= upperTick || lowerTick < TickMath.MIN_TICK || upperTick > TickMath.MAX_TICK
                || key.tickSpacing <= 0 || lowerTick % key.tickSpacing != 0 || upperTick % key.tickSpacing != 0
        ) {
            revert InvalidTickRange();
        }
    }

    /*//////////////////////////////////////////////////////////////
                       INTERNAL — V4 LP MINT / BURN
    //////////////////////////////////////////////////////////////*/

    /// @dev Called from external (non-unlocked) context; goes through unlock.
    function _mintAllInHookToV4(PoolKey calldata key) internal {
        poolManager.unlock(abi.encode(CallbackData(CallbackKind.MINT_TO_RANGE, key)));
    }

    /// @dev Called from external (non-unlocked) context; goes through unlock.
    function _burnAllRangeFromV4(PoolKey calldata key) internal {
        poolManager.unlock(abi.encode(CallbackData(CallbackKind.BURN_ALL_RANGE, key)));
    }

    function _mintAllInHookToV4_inUnlock(PoolKey memory key) internal {
        PoolId poolId = key.toId();
        ManagedPool storage p = pools[poolId];
        uint256 amt0 = p.token0InHook;
        uint256 amt1 = p.token1InHook;
        if (amt0 == 0 && amt1 == 0) return;

        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId);
        uint160 sqrtLower = TickMath.getSqrtPriceAtTick(p.lowerTick);
        uint160 sqrtUpper = TickMath.getSqrtPriceAtTick(p.upperTick);
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(sqrtPriceX96, sqrtLower, sqrtUpper, amt0, amt1);
        if (liquidity == 0) return;

        (BalanceDelta delta,) = poolManager.modifyLiquidity(
            key,
            ModifyLiquidityParams({
                tickLower: p.lowerTick,
                tickUpper: p.upperTick,
                liquidityDelta: int256(uint256(liquidity)),
                salt: POSITION_SALT
            }),
            ""
        );

        uint256 used0 = delta.amount0() < 0 ? uint256(int256(-delta.amount0())) : 0;
        uint256 used1 = delta.amount1() < 0 ? uint256(int256(-delta.amount1())) : 0;

        if (used0 > 0) key.currency0.settle(poolManager, address(this), used0, false);
        if (used1 > 0) key.currency1.settle(poolManager, address(this), used1, false);

        p.token0InHook -= used0;
        p.token1InHook -= used1;
        p.liquidityInPool += liquidity;
        emit V4LiquidityMinted(poolId, liquidity, used0, used1);
    }

    function _burnAllRangeFromV4_inUnlock(PoolKey memory key) internal {
        PoolId poolId = key.toId();
        ManagedPool storage p = pools[poolId];
        if (p.liquidityInPool == 0) return;

        uint128 liq = p.liquidityInPool;
        (BalanceDelta delta, BalanceDelta feesAccrued) = poolManager.modifyLiquidity(
            key,
            ModifyLiquidityParams({
                tickLower: p.lowerTick,
                tickUpper: p.upperTick,
                liquidityDelta: -int256(uint256(liq)),
                salt: POSITION_SALT
            }),
            ""
        );
        feesAccrued; // fees are folded into delta and routed to the hook

        uint256 got0 = delta.amount0() > 0 ? uint256(int256(delta.amount0())) : 0;
        uint256 got1 = delta.amount1() > 0 ? uint256(int256(delta.amount1())) : 0;

        if (got0 > 0) key.currency0.take(poolManager, address(this), got0, false);
        if (got1 > 0) key.currency1.take(poolManager, address(this), got1, false);

        p.liquidityInPool = 0;
        p.token0InHook += got0;
        p.token1InHook += got1;
        emit V4LiquidityBurned(poolId, liq, got0, got1);
    }

    /*//////////////////////////////////////////////////////////////
                       INTERNAL — PARK / UNPARK
    //////////////////////////////////////////////////////////////*/

    function _parkExternal(PoolKey calldata key) internal {
        // Burn V4 LP back into hook custody first (needs unlock since we're outside one).
        if (pools[key.toId()].liquidityInPool > 0) {
            _burnAllRangeFromV4(key);
        }
        ManagedPool storage p = pools[key.toId()];
        uint256 amount0 = p.token0InHook;
        uint256 amount1 = p.token1InHook;
        if (amount0 > 0) _depositToVault(p.vault0, p, amount0, true);
        if (amount1 > 0) _depositToVault(p.vault1, p, amount1, false);
        p.token0InHook = 0;
        p.token1InHook = 0;
        p.status = Status.PARKED_OUT_OF_RANGE;
        emit Parked(key.toId(), amount0, amount1);
    }

    function _unparkExternal(PoolKey calldata key) internal {
        ManagedPool storage p = pools[key.toId()];
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
        // Re-deploy as V4 LP
        if (p.token0InHook > 0 || p.token1InHook > 0) {
            _mintAllInHookToV4(key);
        }
        emit Unparked(key.toId(), amount0, amount1);
    }

    /// @dev Called from inside afterSwap — already in unlock context, so direct modifyLiquidity.
    function _rebalanceInUnlock(PoolKey calldata key) internal {
        PoolId poolId = key.toId();
        ManagedPool storage p = pools[poolId];
        if (p.status == Status.UNSET) return;

        (, int24 currentTick,,) = poolManager.getSlot0(poolId);
        bool inRange = _isInRange(currentTick, p.lowerTick, p.upperTick);

        if (!inRange && p.status == Status.ACTIVE_IN_RANGE) {
            _parkInUnlock(poolId, p, key);
        } else if (inRange && p.status == Status.PARKED_OUT_OF_RANGE) {
            _unparkInUnlock(poolId, p, key);
        }
    }

    function _parkInUnlock(PoolId poolId, ManagedPool storage p, PoolKey calldata key) internal {
        if (p.liquidityInPool > 0) {
            _burnAllRangeFromV4_inUnlock(key);
        }
        uint256 amount0 = p.token0InHook;
        uint256 amount1 = p.token1InHook;
        if (amount0 > 0) _depositToVault(p.vault0, p, amount0, true);
        if (amount1 > 0) _depositToVault(p.vault1, p, amount1, false);
        p.token0InHook = 0;
        p.token1InHook = 0;
        p.status = Status.PARKED_OUT_OF_RANGE;
        emit Parked(poolId, amount0, amount1);
    }

    function _unparkInUnlock(PoolId poolId, ManagedPool storage p, PoolKey calldata key) internal {
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
        if (p.token0InHook > 0 || p.token1InHook > 0) {
            _mintAllInHookToV4_inUnlock(key);
        }
        emit Unparked(poolId, amount0, amount1);
    }

    /*//////////////////////////////////////////////////////////////
                          INTERNAL — VAULT IO
    //////////////////////////////////////////////////////////////*/

    function _moveAllInHookToVaults(ManagedPool storage p) internal {
        uint256 amt0 = p.token0InHook;
        uint256 amt1 = p.token1InHook;
        if (amt0 > 0) _depositToVault(p.vault0, p, amt0, true);
        if (amt1 > 0) _depositToVault(p.vault1, p, amt1, false);
        p.token0InHook = 0;
        p.token1InHook = 0;
    }

    function _depositToVault(ERC4626 vault, ManagedPool storage p, uint256 amount, bool isToken0) internal {
        ERC20(address(vault.asset())).safeApprove(address(vault), 0);
        ERC20(address(vault.asset())).safeApprove(address(vault), amount);
        uint256 mintedShares = vault.deposit(amount, address(this));
        if (isToken0) {
            p.vault0Shares += mintedShares;
        } else {
            p.vault1Shares += mintedShares;
        }
    }

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
}
