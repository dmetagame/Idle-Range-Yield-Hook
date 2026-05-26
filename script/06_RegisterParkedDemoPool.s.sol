// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";

import {ERC4626} from "solmate/src/mixins/ERC4626.sol";

import {IdleYieldHook} from "../src/IdleYieldHook.sol";
import {XLayerConstants} from "./base/XLayerConstants.sol";

/// @notice Registers a second pool against the already deployed hook. The pool is
///         initialized above the managed range, so deposits route to the vaults
///         immediately and judges can verify the parked/yield path on-chain.
contract RegisterParkedDemoPool is Script {
    address constant TOKEN0 = 0x3517b74800E6A731656D8cc809d77f730da4d1dA;
    address constant TOKEN1 = 0x746A932D764d37f10c2f474D170734A05a20e87a;
    address constant IDLE_YIELD_HOOK = 0xc1c27663969645A7bfd53507324227137eE058C0;
    address constant VAULT0 = 0x54E7f00A7401130340e81cE6d9B0D02C7C8c7E5d;
    address constant VAULT1 = 0x09a6133261d993b58324bA3C6d14D93B12BD8CB4;

    int24 constant LOWER_TICK = -960;
    int24 constant UPPER_TICK = 960;
    int24 constant INITIAL_TICK = 5_000;
    uint24 constant SWAP_FEE = 500;
    int24 constant TICK_SPACING = 10;

    function run() public {
        require(block.chainid == XLayerConstants.XLAYER_MAINNET, "Run against X Layer mainnet (196)");

        address poolManager = XLayerConstants.poolManager(block.chainid);
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(TOKEN0),
            currency1: Currency.wrap(TOKEN1),
            fee: SWAP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(IDLE_YIELD_HOOK)
        });

        vm.startBroadcast();
        IPoolManager(poolManager).initialize(key, TickMath.getSqrtPriceAtTick(INITIAL_TICK));
        IdleYieldHook(IDLE_YIELD_HOOK).registerPool(key, LOWER_TICK, UPPER_TICK, ERC4626(VAULT0), ERC4626(VAULT1));
        vm.stopBroadcast();

        PoolId poolId = key.toId();
        console2.log("===== Parked Demo Pool on X Layer mainnet =====");
        console2.log("IdleYieldHook:", IDLE_YIELD_HOOK);
        console2.log("Token0:       ", TOKEN0);
        console2.log("Token1:       ", TOKEN1);
        console2.log("Vault0:       ", VAULT0);
        console2.log("Vault1:       ", VAULT1);
        console2.log("fee:          ", SWAP_FEE);
        console2.log("tickSpacing:  ", TICK_SPACING);
        console2.log("initialTick:  ", INITIAL_TICK);
        console2.logBytes32(PoolId.unwrap(poolId));
        console2.log("================================================");
    }
}
