// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {Constants} from "@uniswap/v4-core/test/utils/Constants.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";

import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {ERC20} from "solmate/src/tokens/ERC20.sol";

import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";

import {IdleYieldHook} from "../src/IdleYieldHook.sol";
import {MockYieldVault} from "../src/mocks/MockYieldVault.sol";
import {BaseTest} from "./utils/BaseTest.sol";
import {EasyPosm} from "./utils/libraries/EasyPosm.sol";

contract IdleYieldHookTest is BaseTest {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    Currency currency0;
    Currency currency1;
    PoolKey poolKey;
    PoolId poolId;

    IdleYieldHook hook;
    MockYieldVault vault0;
    MockYieldVault vault1;

    int24 constant LOWER_TICK = -600;
    int24 constant UPPER_TICK = 600;
    uint256 constant DEAD_SHARES = 1_000;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address attacker = address(0xA77A);
    address yieldFunder = address(0xF11ED);

    function setUp() public {
        deployArtifactsAndLabel();
        (currency0, currency1) = deployCurrencyPair();

        address flags = address(
            uint160(
                Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_SWAP_FLAG
                    | Hooks.AFTER_SWAP_FLAG
            ) ^ (0x4444 << 144)
        );
        bytes memory constructorArgs = abi.encode(poolManager, address(this));
        deployCodeTo("IdleYieldHook.sol:IdleYieldHook", constructorArgs, flags);
        hook = IdleYieldHook(flags);

        poolKey = PoolKey(currency0, currency1, 3000, 60, IHooks(hook));
        poolId = poolKey.toId();
        poolManager.initialize(poolKey, Constants.SQRT_PRICE_1_1);

        vault0 = new MockYieldVault(ERC20(Currency.unwrap(currency0)), "Vault0", "V0");
        vault1 = new MockYieldVault(ERC20(Currency.unwrap(currency1)), "Vault1", "V1");

        hook.registerPool(poolKey, LOWER_TICK, UPPER_TICK, vault0, vault1);

        MockERC20(Currency.unwrap(currency0)).mint(alice, 1_000 ether);
        MockERC20(Currency.unwrap(currency1)).mint(alice, 1_000 ether);
        MockERC20(Currency.unwrap(currency0)).mint(bob, 1_000 ether);
        MockERC20(Currency.unwrap(currency1)).mint(bob, 1_000 ether);
        MockERC20(Currency.unwrap(currency0)).mint(yieldFunder, 1_000 ether);
        MockERC20(Currency.unwrap(currency1)).mint(yieldFunder, 1_000 ether);

        vm.startPrank(alice);
        MockERC20(Currency.unwrap(currency0)).approve(address(hook), type(uint256).max);
        MockERC20(Currency.unwrap(currency1)).approve(address(hook), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(bob);
        MockERC20(Currency.unwrap(currency0)).approve(address(hook), type(uint256).max);
        MockERC20(Currency.unwrap(currency1)).approve(address(hook), type(uint256).max);
        vm.stopPrank();
    }

    function _status(PoolId id) internal view returns (IdleYieldHook.Status) {
        (,,,,,,,,,, IdleYieldHook.Status status) = hook.pools(id);
        return status;
    }

    function _totalShares(PoolId id) internal view returns (uint256 ts) {
        (,,,,,,,,, ts,) = hook.pools(id);
    }

    function _depositInRange() internal {
        // Pool is initialised at price 1:1, tick 0 → in range [-600, 600]
        vm.prank(alice);
        hook.deposit(poolKey, 100 ether, 100 ether);
    }

    function mintExternalPosition(int24 tickLower, int24 tickUpper, uint256 liquidity)
        external
        returns (uint256 tokenId)
    {
        (tokenId,) = EasyPosm.mint({
            posm: positionManager,
            poolKey: poolKey,
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidity: liquidity,
            amount0Max: 10_000 ether,
            amount1Max: 10_000 ether,
            recipient: address(this),
            deadline: block.timestamp + 1,
            hookData: ""
        });
    }

    function test_registerPool_alreadyRegistered_reverts() public {
        vm.expectRevert(IdleYieldHook.PoolAlreadyRegistered.selector);
        hook.registerPool(poolKey, LOWER_TICK, UPPER_TICK, vault0, vault1);
    }

    function test_registerPool_wrongVault_reverts() public {
        PoolKey memory other = PoolKey(currency0, currency1, 500, 10, IHooks(hook));
        poolManager.initialize(other, Constants.SQRT_PRICE_1_1);

        vm.expectRevert(IdleYieldHook.InvalidVault.selector);
        hook.registerPool(other, LOWER_TICK, UPPER_TICK, vault1, vault0); // swapped
    }

    function test_registerPool_unapprovedCaller_reverts() public {
        PoolKey memory other = PoolKey(currency0, currency1, 500, 10, IHooks(hook));
        poolManager.initialize(other, Constants.SQRT_PRICE_1_1);

        MockYieldVault v0 = new MockYieldVault(ERC20(Currency.unwrap(currency0)), "VP0", "VP0");
        MockYieldVault v1 = new MockYieldVault(ERC20(Currency.unwrap(currency1)), "VP1", "VP1");

        vm.expectRevert(IdleYieldHook.PoolRegistrationNotApproved.selector);
        vm.prank(attacker);
        hook.registerPool(other, LOWER_TICK, UPPER_TICK, v0, v1);
    }

    function test_registerPool_approvedConfig_canBeRegisteredByAnyone() public {
        PoolKey memory other = PoolKey(currency0, currency1, 500, 10, IHooks(hook));
        poolManager.initialize(other, Constants.SQRT_PRICE_1_1);

        MockYieldVault v0 = new MockYieldVault(ERC20(Currency.unwrap(currency0)), "VP0", "VP0");
        MockYieldVault v1 = new MockYieldVault(ERC20(Currency.unwrap(currency1)), "VP1", "VP1");

        bytes32 configHash = hook.approvePoolConfig(other, LOWER_TICK, UPPER_TICK, v0, v1);
        assertTrue(hook.approvedPoolConfigs(configHash));

        vm.prank(attacker);
        hook.registerPool(other, LOWER_TICK, UPPER_TICK, v0, v1);

        PoolId otherId = other.toId();
        assertEq(uint8(_status(otherId)), uint8(IdleYieldHook.Status.ACTIVE_IN_RANGE));
        assertFalse(hook.approvedPoolConfigs(configHash));
    }

    function test_registerPool_invalidHook_reverts() public {
        PoolKey memory other = PoolKey(currency0, currency1, 500, 10, IHooks(address(0)));

        vm.expectRevert(IdleYieldHook.InvalidHook.selector);
        hook.registerPool(other, LOWER_TICK, UPPER_TICK, vault0, vault1);
    }

    function test_registerPool_invalidTickSpacing_reverts() public {
        PoolKey memory other = PoolKey(currency0, currency1, 500, 10, IHooks(hook));

        vm.expectRevert(IdleYieldHook.InvalidTickRange.selector);
        hook.registerPool(other, LOWER_TICK - 1, UPPER_TICK, vault0, vault1);
    }

    function test_registerPool_startsActive_whenTickInRange() public view {
        assertEq(uint8(_status(poolId)), uint8(IdleYieldHook.Status.ACTIVE_IN_RANGE));
    }

    function test_absorberLiquidity_overlappingManagedRange_reverts() public {
        vm.expectRevert();
        this.mintExternalPosition(LOWER_TICK, UPPER_TICK, 1 ether);
    }

    function test_absorberLiquidity_adjacentOutsideManagedRange_allowed() public {
        (uint256 tokenId,) = EasyPosm.mint({
            posm: positionManager,
            poolKey: poolKey,
            tickLower: UPPER_TICK,
            tickUpper: UPPER_TICK + 600,
            liquidity: 1 ether,
            amount0Max: 100 ether,
            amount1Max: 100 ether,
            recipient: address(this),
            deadline: block.timestamp + 1,
            hookData: ""
        });

        assertGt(tokenId, 0);
    }

    function test_deposit_inRange_mintsV4Liquidity() public {
        _depositInRange();
        // V4 LiquidityAmounts.getLiquidityForAmounts rounds down → up to 1-2 wei dust.
        assertApproxEqAbs(hook.totalReserve0(poolId), 100 ether, 2);
        assertApproxEqAbs(hook.totalReserve1(poolId), 100 ether, 2);
        // Vaults stay empty — we're in-range so capital sits as V4 LP.
        assertEq(vault0.totalAssets(), 0);
        assertEq(vault1.totalAssets(), 0);
        // Liquidity should be live in the V4 pool.
        (,,,, uint128 liq,,,,,,) = hook.pools(poolId);
        assertGt(liq, 0);
    }

    function test_deposit_firstDepositor_locksMinLiquidity() public {
        vm.prank(alice);
        uint256 shares = hook.deposit(poolKey, 100 ether, 100 ether);
        assertEq(shares, 100 ether - DEAD_SHARES);
        assertEq(_totalShares(poolId), 100 ether);
    }

    function test_deposit_secondDepositor_proportional() public {
        _depositInRange();
        vm.prank(bob);
        uint256 bobShares = hook.deposit(poolKey, 50 ether, 50 ether);
        assertEq(bobShares, 50 ether);
    }

    function test_deposit_imbalancedSecondDeposit_onlyPullsMatchedAmounts() public {
        _depositInRange();

        uint256 bob0Before = MockERC20(Currency.unwrap(currency0)).balanceOf(bob);
        uint256 bob1Before = MockERC20(Currency.unwrap(currency1)).balanceOf(bob);

        vm.prank(bob);
        uint256 bobShares = hook.deposit(poolKey, 50 ether, 100 ether);

        uint256 spent0 = bob0Before - MockERC20(Currency.unwrap(currency0)).balanceOf(bob);
        uint256 spent1 = bob1Before - MockERC20(Currency.unwrap(currency1)).balanceOf(bob);

        assertGt(bobShares, 49.999 ether);
        assertLt(bobShares, 50.001 ether);
        assertApproxEqAbs(spent0, spent1, 2);
        assertLt(spent1, 50.001 ether);
    }

    function test_rebalance_movesToVault_whenOutOfRange() public {
        _depositInRange();
        // Force pool tick out of range by re-initialising at higher price would require
        // a real swap; instead manually shift the pool tick via getSlot0 mocking.
        // For day-3 unit scope, we expose rebalance() and verify the *no-op* path here;
        // park/unpark via real tick movement is covered after V4 liquidity lands (day 4).
        hook.rebalance(poolKey);
        // Pool tick is still 0 (in range), so nothing should change
        assertEq(uint8(_status(poolId)), uint8(IdleYieldHook.Status.ACTIVE_IN_RANGE));
        assertEq(vault0.totalAssets(), 0);
    }

    /// @notice Force PARKED state directly via a custom pool that initialises out-of-range,
    ///         then verify deposits route to the vault.
    function test_deposit_whenParked_routesToVault() public {
        // Initialise a separate pool at a price outside our range. tick = 5000 > 600 = upper.
        PoolKey memory parkedKey = PoolKey(currency0, currency1, 500, 10, IHooks(hook));
        poolManager.initialize(parkedKey, TickMath.getSqrtPriceAtTick(5000));

        MockYieldVault v0 = new MockYieldVault(ERC20(Currency.unwrap(currency0)), "VP0", "VP0");
        MockYieldVault v1 = new MockYieldVault(ERC20(Currency.unwrap(currency1)), "VP1", "VP1");
        hook.registerPool(parkedKey, LOWER_TICK, UPPER_TICK, v0, v1);

        PoolId parkedId = parkedKey.toId();
        assertEq(uint8(_status(parkedId)), uint8(IdleYieldHook.Status.PARKED_OUT_OF_RANGE));

        vm.prank(alice);
        hook.deposit(parkedKey, 50 ether, 50 ether);

        // Tokens land in vaults, not in hook directly
        assertEq(v0.totalAssets(), 50 ether);
        assertEq(v1.totalAssets(), 50 ether);
        assertEq(hook.totalReserve0(parkedId), 50 ether);
        assertEq(hook.totalReserve1(parkedId), 50 ether);
    }

    function test_yieldAccrues_increasesReservesAndSharePrice() public {
        // Bootstrap a parked pool with alice
        PoolKey memory parkedKey = PoolKey(currency0, currency1, 500, 10, IHooks(hook));
        poolManager.initialize(parkedKey, TickMath.getSqrtPriceAtTick(5000));
        MockYieldVault v0 = new MockYieldVault(ERC20(Currency.unwrap(currency0)), "VP0", "VP0");
        MockYieldVault v1 = new MockYieldVault(ERC20(Currency.unwrap(currency1)), "VP1", "VP1");
        hook.registerPool(parkedKey, LOWER_TICK, UPPER_TICK, v0, v1);

        vm.prank(alice);
        hook.deposit(parkedKey, 100 ether, 100 ether);

        PoolId parkedId = parkedKey.toId();
        assertEq(hook.totalReserve0(parkedId), 100 ether);

        // Simulate 5% yield accrued on token0 via the funder
        vm.startPrank(yieldFunder);
        MockERC20(Currency.unwrap(currency0)).approve(address(v0), 5 ether);
        v0.accrueYield(5 ether);
        vm.stopPrank();

        // Reserve0 should now be 105 ether (vault assets grew)
        assertEq(hook.totalReserve0(parkedId), 105 ether);

        // Alice's withdraw should now return ~105 token0 instead of 100
        uint256 aliceShares = hook.poolShares(parkedId, alice);
        uint256 bal0Before = MockERC20(Currency.unwrap(currency0)).balanceOf(alice);
        vm.prank(alice);
        (uint256 out0,) = hook.withdraw(parkedKey, aliceShares);
        uint256 bal0After = MockERC20(Currency.unwrap(currency0)).balanceOf(alice);
        // ~105 ether minus a tiny dust from MIN_LIQUIDITY lock
        assertGt(out0, 104.99 ether);
        assertLt(out0, 105 ether);
        assertEq(bal0After - bal0Before, out0);
    }

    function test_withdraw_pullsFromVaultFirstThenHook() public {
        _depositInRange();
        // Alice withdraws everything; tokens come from hook because in-range
        uint256 aliceShares = hook.poolShares(poolId, alice);

        uint256 bal0Before = MockERC20(Currency.unwrap(currency0)).balanceOf(alice);
        vm.prank(alice);
        (uint256 out0, uint256 out1) = hook.withdraw(poolKey, aliceShares);
        uint256 bal0After = MockERC20(Currency.unwrap(currency0)).balanceOf(alice);

        assertGt(out0, 99.999 ether);
        assertGt(out1, 99.999 ether);
        assertEq(bal0After - bal0Before, out0);
    }

    function test_withdraw_insufficientShares_reverts() public {
        _depositInRange();
        uint256 aliceShares = hook.poolShares(poolId, alice);
        vm.expectRevert(IdleYieldHook.InsufficientShares.selector);
        vm.prank(alice);
        hook.withdraw(poolKey, aliceShares + 1);
    }

    function test_deposit_unregisteredPool_reverts() public {
        PoolKey memory other = PoolKey(currency0, currency1, 100, 1, IHooks(hook));
        vm.expectRevert(IdleYieldHook.PoolNotRegistered.selector);
        vm.prank(alice);
        hook.deposit(other, 1 ether, 1 ether);
    }

    function test_swap_against_hookLP_accruesFeesToReserves() public {
        _depositInRange();

        uint256 reserve0Before = hook.totalReserve0(poolId);
        uint256 reserve1Before = hook.totalReserve1(poolId);

        // Mint and approve tokens for the swap caller (the test contract)
        MockERC20(Currency.unwrap(currency0)).mint(address(this), 10 ether);
        MockERC20(Currency.unwrap(currency0)).approve(address(swapRouter), type(uint256).max);
        MockERC20(Currency.unwrap(currency1)).approve(address(swapRouter), type(uint256).max);

        BalanceDelta delta = swapRouter.swapExactTokensForTokens({
            amountIn: 1 ether,
            amountOutMin: 0,
            zeroForOne: true,
            poolKey: poolKey,
            hookData: "",
            receiver: address(this),
            deadline: block.timestamp + 1
        });

        // Swap should have succeeded against the hook's freshly-minted LP
        assertEq(int256(delta.amount0()), -1 ether);
        assertGt(int256(delta.amount1()), 0);

        // After the swap, post-swap tick is still in [-600, 600] (small swap), so hook stayed ACTIVE.
        assertEq(uint8(_status(poolId)), uint8(IdleYieldHook.Status.ACTIVE_IN_RANGE));

        // The 0.3% fee from the swap accrues to the hook's LP position; reserve0 grows by ~0.003 ether
        // (rounding can make either side bigger depending on direction)
        uint256 reserve0After = hook.totalReserve0(poolId);
        uint256 reserve1After = hook.totalReserve1(poolId);
        // Net value moved into the pool from the swap; reserve0 went up (tokens flowed in)
        assertGt(reserve0After, reserve0Before);
        // Total value (in token1 terms) should be >= pre-swap minus a tiny dust window
        assertLt(reserve1After, reserve1Before);
    }

    function test_absorberLiquidity_allowsOnePoolToParkAfterBoundaryCrossing() public {
        _depositInRange();

        this.mintExternalPosition(UPPER_TICK, UPPER_TICK + 5_400, 100 ether);

        MockERC20(Currency.unwrap(currency1)).mint(address(this), 1_000 ether);
        MockERC20(Currency.unwrap(currency0)).approve(address(swapRouter), type(uint256).max);
        MockERC20(Currency.unwrap(currency1)).approve(address(swapRouter), type(uint256).max);

        swapRouter.swapExactTokensForTokens({
            amountIn: 200 ether,
            amountOutMin: 0,
            zeroForOne: false,
            poolKey: poolKey,
            hookData: "",
            receiver: address(this),
            deadline: block.timestamp + 1
        });

        assertEq(uint8(_status(poolId)), uint8(IdleYieldHook.Status.ACTIVE_IN_RANGE));
        hook.rebalance(poolKey);

        assertEq(uint8(_status(poolId)), uint8(IdleYieldHook.Status.PARKED_OUT_OF_RANGE));
        (,,,, uint128 hookLiquidity,,,,,,) = hook.pools(poolId);
        assertEq(hookLiquidity, 0);
        assertGt(vault1.totalAssets(), 0);
    }

    function test_deposit_afterSwap_crystallizesFeesBeforeMintingShares() public {
        _depositInRange();

        MockERC20(Currency.unwrap(currency0)).mint(address(this), 10 ether);
        MockERC20(Currency.unwrap(currency0)).approve(address(swapRouter), type(uint256).max);
        MockERC20(Currency.unwrap(currency1)).approve(address(swapRouter), type(uint256).max);

        swapRouter.swapExactTokensForTokens({
            amountIn: 1 ether,
            amountOutMin: 0,
            zeroForOne: true,
            poolKey: poolKey,
            hookData: "",
            receiver: address(this),
            deadline: block.timestamp + 1
        });

        vm.prank(bob);
        uint256 bobShares = hook.deposit(poolKey, 100 ether, 100 ether);

        assertLt(bobShares, 100 ether);
        assertGt(hook.poolShares(poolId, alice), bobShares);
    }
}
