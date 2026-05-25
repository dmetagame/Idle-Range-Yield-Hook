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

import {ERC20} from "solmate/src/tokens/ERC20.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";

import {IdleYieldHook} from "../src/IdleYieldHook.sol";
import {MockYieldVault} from "../src/mocks/MockYieldVault.sol";
import {XLayerConstants} from "./base/XLayerConstants.sol";

/// @notice Production deploy on X Layer mainnet (chain 196).
///         Uniswap v4 core is already deployed at canonical addresses; we only
///         deploy the demo tokens, vaults, hook, and the pool.
contract DeployToXLayerMainnet is Script {
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    int24 constant TICK_SPACING = 60;
    uint24 constant SWAP_FEE = 3000;
    int24 constant LOWER_TICK = -960;
    int24 constant UPPER_TICK = 960;

    function run() public {
        require(block.chainid == XLayerConstants.XLAYER_MAINNET, "Run against X Layer mainnet (196)");

        address poolManager = XLayerConstants.poolManager(block.chainid);
        require(poolManager.code.length > 0, "Canonical PoolManager missing");

        address sender = msg.sender;
        console2.log("Deployer (sender):", sender);

        vm.startBroadcast();

        MockERC20 t0 = new MockERC20("IdleYield Token0", "IY0", 18);
        MockERC20 t1 = new MockERC20("IdleYield Token1", "IY1", 18);
        t0.mint(sender, 10_000_000 ether);
        t1.mint(sender, 10_000_000 ether);
        (MockERC20 token0, MockERC20 token1) = address(t0) < address(t1) ? (t0, t1) : (t1, t0);

        MockYieldVault vault0 = new MockYieldVault(ERC20(address(token0)), "IY0 Yield Vault", "yIY0");
        MockYieldVault vault1 = new MockYieldVault(ERC20(address(token1)), "IY1 Yield Vault", "yIY1");

        uint160 flags = uint160(
            Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_SWAP_FLAG
                | Hooks.AFTER_SWAP_FLAG
        );
        bytes memory creationCode = type(IdleYieldHook).creationCode;
        bytes memory ctorArgs = abi.encode(IPoolManager(poolManager));
        (address mined, bytes32 salt) = HookMiner.find(CREATE2_DEPLOYER, flags, creationCode, ctorArgs);
        IdleYieldHook hook = new IdleYieldHook{salt: salt}(IPoolManager(poolManager));
        require(address(hook) == mined, "Mined address mismatch");

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(token0)),
            currency1: Currency.wrap(address(token1)),
            fee: SWAP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(hook))
        });
        IPoolManager(poolManager).initialize(key, TickMath.getSqrtPriceAtTick(0));
        hook.registerPool(key, LOWER_TICK, UPPER_TICK, vault0, vault1);

        vm.stopBroadcast();

        console2.log("===== X Layer Mainnet (chain 196) =====");
        console2.log("Token0:           ", address(token0));
        console2.log("Token1:           ", address(token1));
        console2.log("PoolManager:      ", poolManager);
        console2.log("Vault0:           ", address(vault0));
        console2.log("Vault1:           ", address(vault1));
        console2.log("IdleYieldHook:    ", address(hook));
        console2.log("=========================================");
    }
}
