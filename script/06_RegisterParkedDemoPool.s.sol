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
    address constant TOKEN0 = 0x997cD0d393FCe9c3726cCDb02Cc94F9b222f4182;
    address constant TOKEN1 = 0xF20a8F2e9F4127c6e83aAB89106d09d8C26AF6A9;
    address constant IDLE_YIELD_HOOK = 0x3e4e0D5009Ee9fa6f4376b064fd1A4e4C01BD8c0;
    address constant VAULT0 = 0x6f8be9FfCaD5EbA84d1fe3db9875005FBA24c396;
    address constant VAULT1 = 0x90Fee8b4D1834CbbAc5427e3D3554d189B8653f8;

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
