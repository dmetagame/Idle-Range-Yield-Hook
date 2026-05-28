// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";

import {IUniswapV4Router04} from "hookmate/interfaces/router/IUniswapV4Router04.sol";

import {ERC20} from "solmate/src/tokens/ERC20.sol";

import {IdleYieldHook} from "../src/IdleYieldHook.sol";
import {XLayerConstants} from "./base/XLayerConstants.sol";

/// @notice Seeds the hardened X Layer deployment with initial hook-owned liquidity
///         and alternating swaps so the live dApp has immediate on-chain activity.
contract SeedHardenedDemo is Script {
    address constant TOKEN0 = 0x997cD0d393FCe9c3726cCDb02Cc94F9b222f4182;
    address constant TOKEN1 = 0xF20a8F2e9F4127c6e83aAB89106d09d8C26AF6A9;
    address constant IDLE_YIELD_HOOK = 0x3e4e0D5009Ee9fa6f4376b064fd1A4e4C01BD8c0;
    address payable constant V4_ROUTER = payable(0xE4e6CAdE3E2a67F16A5d867C44e1e7Df02f0fc03);

    uint24 constant SWAP_FEE = 3000;
    int24 constant TICK_SPACING = 60;
    uint256 constant DEPOSIT_AMOUNT = 2 ether;
    uint256 constant SWAP_AMOUNT = 0.05 ether;
    uint256 constant SWAP_COUNT = 9;

    function run() public {
        require(block.chainid == XLayerConstants.XLAYER_MAINNET, "Run against X Layer mainnet (196)");

        ERC20 token0 = ERC20(TOKEN0);
        ERC20 token1 = ERC20(TOKEN1);
        IdleYieldHook hook = IdleYieldHook(IDLE_YIELD_HOOK);
        IUniswapV4Router04 router = IUniswapV4Router04(V4_ROUTER);

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(TOKEN0),
            currency1: Currency.wrap(TOKEN1),
            fee: SWAP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(IDLE_YIELD_HOOK)
        });

        vm.startBroadcast();

        token0.approve(address(hook), DEPOSIT_AMOUNT);
        token1.approve(address(hook), DEPOSIT_AMOUNT);
        hook.deposit(key, DEPOSIT_AMOUNT, DEPOSIT_AMOUNT);

        token0.approve(address(router), type(uint256).max);
        token1.approve(address(router), type(uint256).max);

        for (uint256 i; i < SWAP_COUNT; ++i) {
            router.swapExactTokensForTokens({
                amountIn: SWAP_AMOUNT,
                amountOutMin: 1,
                zeroForOne: i % 2 == 0,
                poolKey: key,
                hookData: "",
                receiver: msg.sender,
                deadline: block.timestamp + 30 minutes
            });
        }

        vm.stopBroadcast();
    }
}
