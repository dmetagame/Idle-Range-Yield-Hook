// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";

import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

import {IdleYieldHook} from "../../src/IdleYieldHook.sol";
import {MockYieldVault} from "../../src/mocks/MockYieldVault.sol";
import {XLayerConstants} from "../base/XLayerConstants.sol";

/// @notice Continues 02_DeployAll on a chain where V4 core + tokens + vaults are already deployed.
///         Mines + deploys IdleYieldHook (with current size-optimised bytecode), initializes the pool,
///         and calls registerPool.
contract FinishDeploy is Script {
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    // From broadcast/02_DeployAllToXLayerTestnet.s.sol/1952/run-latest.json
    address constant TOKEN0 = 0x3517b74800E6A731656D8cc809d77f730da4d1dA;
    address constant TOKEN1 = 0x746A932D764d37f10c2f474D170734A05a20e87a;
    address constant POOL_MANAGER = 0x4E279b5dFe71AF33b31266cf9187E1B6fE023F00;
    address constant VAULT0 = 0xB9D0Ca2E9EA03e92d2B2674547Aae70435A0F94a;
    address constant VAULT1 = 0xF0221bDE2cdf11b9855F91B491597076d27804Cf;

    int24 constant TICK_SPACING = 60;
    uint24 constant SWAP_FEE = 3000;
    int24 constant LOWER_TICK = -960;
    int24 constant UPPER_TICK = 960;

    function run() public {
        require(block.chainid == XLayerConstants.XLAYER_TESTNET, "Run against X Layer testnet (1952)");
        require(TOKEN0.code.length > 0, "TOKEN0 not deployed");
        require(POOL_MANAGER.code.length > 0, "POOL_MANAGER not deployed");
        require(VAULT0.code.length > 0, "VAULT0 not deployed");

        uint160 flags = uint160(
            Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_SWAP_FLAG
                | Hooks.AFTER_SWAP_FLAG
        );
        bytes memory creationCode = type(IdleYieldHook).creationCode;
        bytes memory ctorArgs = abi.encode(IPoolManager(POOL_MANAGER));
        (address mined, bytes32 salt) = HookMiner.find(CREATE2_DEPLOYER, flags, creationCode, ctorArgs);

        vm.startBroadcast();

        IdleYieldHook hook = new IdleYieldHook{salt: salt}(IPoolManager(POOL_MANAGER));
        require(address(hook) == mined, "Mined address mismatch");

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(TOKEN0),
            currency1: Currency.wrap(TOKEN1),
            fee: SWAP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(hook))
        });
        IPoolManager(POOL_MANAGER).initialize(key, TickMath.getSqrtPriceAtTick(0));
        hook.registerPool(key, LOWER_TICK, UPPER_TICK, MockYieldVault(VAULT0), MockYieldVault(VAULT1));

        vm.stopBroadcast();

        console2.log("===== X Layer Testnet (chain 1952) - finished =====");
        console2.log("Token0:           ", TOKEN0);
        console2.log("Token1:           ", TOKEN1);
        console2.log("PoolManager:      ", POOL_MANAGER);
        console2.log("Vault0:           ", VAULT0);
        console2.log("Vault1:           ", VAULT1);
        console2.log("IdleYieldHook:    ", address(hook));
        console2.log("======================================================");
    }
}
