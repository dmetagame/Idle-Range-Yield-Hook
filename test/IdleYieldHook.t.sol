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

import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";

import {IdleYieldHook} from "../src/IdleYieldHook.sol";
import {BaseTest} from "./utils/BaseTest.sol";

contract IdleYieldHookTest is BaseTest {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    Currency currency0;
    Currency currency1;
    PoolKey poolKey;
    PoolId poolId;

    IdleYieldHook hook;

    int24 constant LOWER_TICK = -600;
    int24 constant UPPER_TICK = 600;
    uint256 constant DEAD_SHARES = 1_000; // mirrors MIN_LIQUIDITY in the hook

    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        deployArtifactsAndLabel();
        (currency0, currency1) = deployCurrencyPair();

        address flags = address(
            uint160(
                Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_SWAP_FLAG
                    | Hooks.AFTER_SWAP_FLAG
            ) ^ (0x4444 << 144)
        );
        bytes memory constructorArgs = abi.encode(poolManager);
        deployCodeTo("IdleYieldHook.sol:IdleYieldHook", constructorArgs, flags);
        hook = IdleYieldHook(flags);

        poolKey = PoolKey(currency0, currency1, 3000, 60, IHooks(hook));
        poolId = poolKey.toId();
        poolManager.initialize(poolKey, Constants.SQRT_PRICE_1_1);

        hook.registerPool(poolKey, LOWER_TICK, UPPER_TICK);

        // Fund test users and approve hook
        MockERC20(Currency.unwrap(currency0)).mint(alice, 1_000 ether);
        MockERC20(Currency.unwrap(currency1)).mint(alice, 1_000 ether);
        MockERC20(Currency.unwrap(currency0)).mint(bob, 1_000 ether);
        MockERC20(Currency.unwrap(currency1)).mint(bob, 1_000 ether);

        vm.startPrank(alice);
        MockERC20(Currency.unwrap(currency0)).approve(address(hook), type(uint256).max);
        MockERC20(Currency.unwrap(currency1)).approve(address(hook), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(bob);
        MockERC20(Currency.unwrap(currency0)).approve(address(hook), type(uint256).max);
        MockERC20(Currency.unwrap(currency1)).approve(address(hook), type(uint256).max);
        vm.stopPrank();
    }

    function test_registerPool_alreadyRegistered_reverts() public {
        vm.expectRevert(IdleYieldHook.PoolAlreadyRegistered.selector);
        hook.registerPool(poolKey, LOWER_TICK, UPPER_TICK);
    }

    function test_deposit_firstDepositor_locksMinLiquidity() public {
        uint256 amount0 = 100 ether;
        uint256 amount1 = 100 ether;

        vm.prank(alice);
        uint256 shares = hook.deposit(poolKey, amount0, amount1);

        // first deposit gets sqrt(amount0 * amount1) - MIN_LIQUIDITY
        // sqrt(100e18 * 100e18) = 100e18; alice gets 100e18 - 1000
        assertEq(shares, 100 ether - DEAD_SHARES, "alice shares wrong");
        assertEq(hook.balanceOf(alice, uint256(PoolId.unwrap(poolId))), 100 ether - DEAD_SHARES);
        assertEq(hook.balanceOf(address(0xdead), uint256(PoolId.unwrap(poolId))), DEAD_SHARES);

        (,, uint128 liquidityInPool, uint256 t0, uint256 t1, uint256 ts,) = hook.pools(poolId);
        liquidityInPool;
        assertEq(t0, amount0);
        assertEq(t1, amount1);
        assertEq(ts, 100 ether);
    }

    function test_deposit_secondDepositor_proportional() public {
        vm.prank(alice);
        hook.deposit(poolKey, 100 ether, 100 ether);

        vm.prank(bob);
        uint256 bobShares = hook.deposit(poolKey, 50 ether, 50 ether);

        // After alice, totalShares=100e18, reserves=(100e18, 100e18)
        // Bob deposits half → expects half the total shares = 50e18
        assertEq(bobShares, 50 ether, "bob shares wrong");

        (,,, uint256 t0, uint256 t1, uint256 ts,) = hook.pools(poolId);
        assertEq(t0, 150 ether);
        assertEq(t1, 150 ether);
        assertEq(ts, 150 ether);
    }

    function test_deposit_unbalanced_takesMinShare() public {
        vm.prank(alice);
        hook.deposit(poolKey, 100 ether, 100 ether);

        // Bob deposits 50 of token0 and 80 of token1 → mismatch; should mint min(50e18, 80e18) = 50e18
        vm.prank(bob);
        uint256 bobShares = hook.deposit(poolKey, 50 ether, 80 ether);
        assertEq(bobShares, 50 ether);
    }

    function test_deposit_unregisteredPool_reverts() public {
        PoolKey memory other = PoolKey(currency0, currency1, 500, 10, IHooks(hook));
        vm.expectRevert(IdleYieldHook.PoolNotRegistered.selector);
        vm.prank(alice);
        hook.deposit(other, 1 ether, 1 ether);
    }

    function test_deposit_zero_reverts() public {
        vm.expectRevert(IdleYieldHook.ZeroDeposit.selector);
        vm.prank(alice);
        hook.deposit(poolKey, 0, 0);
    }

    function test_withdraw_returnsProportional() public {
        vm.prank(alice);
        hook.deposit(poolKey, 100 ether, 200 ether);

        uint256 aliceShares = hook.balanceOf(alice, uint256(PoolId.unwrap(poolId)));

        uint256 bal0Before = MockERC20(Currency.unwrap(currency0)).balanceOf(alice);
        uint256 bal1Before = MockERC20(Currency.unwrap(currency1)).balanceOf(alice);

        vm.prank(alice);
        (uint256 amount0Out, uint256 amount1Out) = hook.withdraw(poolKey, aliceShares);

        // alice should get back approximately what she put in, minus dust from MIN_LIQUIDITY lock
        // her shares = sqrt(100e18 * 200e18) - 1000; totalShares = sqrt(...)
        // amount0 = aliceShares * 100e18 / totalShares ≈ 100e18 * (1 - 1000/totalShares)
        assertGt(amount0Out, 99.999 ether, "amount0 too small");
        assertLt(amount0Out, 100 ether, "amount0 too big");
        assertGt(amount1Out, 199.999 ether, "amount1 too small");
        assertLt(amount1Out, 200 ether, "amount1 too big");

        assertEq(MockERC20(Currency.unwrap(currency0)).balanceOf(alice), bal0Before + amount0Out);
        assertEq(MockERC20(Currency.unwrap(currency1)).balanceOf(alice), bal1Before + amount1Out);
        assertEq(hook.balanceOf(alice, uint256(PoolId.unwrap(poolId))), 0);
    }

    function test_withdraw_insufficientShares_reverts() public {
        vm.prank(alice);
        hook.deposit(poolKey, 100 ether, 100 ether);

        uint256 aliceShares = hook.balanceOf(alice, uint256(PoolId.unwrap(poolId)));

        vm.expectRevert(IdleYieldHook.InsufficientShares.selector);
        vm.prank(alice);
        hook.withdraw(poolKey, aliceShares + 1);
    }
}
