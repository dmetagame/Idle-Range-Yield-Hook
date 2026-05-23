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

import {Permit2Deployer} from "hookmate/artifacts/Permit2.sol";
import {V4PoolManagerDeployer} from "hookmate/artifacts/V4PoolManager.sol";
import {V4PositionManagerDeployer} from "hookmate/artifacts/V4PositionManager.sol";
import {V4RouterDeployer} from "hookmate/artifacts/V4Router.sol";

import {ERC20} from "solmate/src/tokens/ERC20.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";

import {IdleYieldHook} from "../../src/IdleYieldHook.sol";
import {MockYieldVault} from "../../src/mocks/MockYieldVault.sol";
import {XLayerConstants} from "../base/XLayerConstants.sol";

/// @notice One-shot deploy for X Layer testnet:
///   1. Mock tokens (token0/token1) — 18 decimals, deployer holds 10M of each
///   2. Uniswap v4 core (PoolManager, PositionManager, V4Router) via hookmate artifacts
///   3. Two MockYieldVaults wrapping token0/token1
///   4. IdleYieldHook (mined CREATE2 address with correct permission bits)
///   5. PoolKey initialised at 1:1, hook.registerPool() called
///
/// Run with:
///   forge script script/testing/02_DeployAllToXLayerTestnet.s.sol \
///     --rpc-url xlayer_testnet --broadcast --account deployer --sender 0xYourAddr
///
/// CREATE2 Deployer Proxy `0x4e59b44847b379578588920cA78FbF26c0B4956C` is used by Foundry's
/// `new Contract{salt: salt}(...)` syntax when the deployer is the proxy.
contract DeployAllToXLayerTestnet is Script {
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    int24 constant TICK_SPACING = 60;
    uint24 constant SWAP_FEE = 3000; // 0.30%
    // Active range: ±10% around the initial 1:1 price. With tick spacing 60, ~tick ±960.
    int24 constant LOWER_TICK = -960;
    int24 constant UPPER_TICK = 960;

    function run() public {
        require(block.chainid == XLayerConstants.XLAYER_TESTNET, "Run against X Layer testnet (1952)");

        address sender = msg.sender;
        console2.log("Deployer (sender):", sender);

        vm.startBroadcast();

        // 1) Demo tokens
        MockERC20 t0 = new MockERC20("IdleYield Token0", "IY0", 18);
        MockERC20 t1 = new MockERC20("IdleYield Token1", "IY1", 18);
        t0.mint(sender, 10_000_000 ether);
        t1.mint(sender, 10_000_000 ether);
        (MockERC20 token0, MockERC20 token1) = address(t0) < address(t1) ? (t0, t1) : (t1, t0);

        // 2) Uniswap v4 core
        address canonicalPermit2 = XLayerConstants.permit2();
        address permit2 = canonicalPermit2.code.length > 0 ? canonicalPermit2 : Permit2Deployer.deploy();
        address poolManager = V4PoolManagerDeployer.deploy(sender);
        address positionManager =
            V4PositionManagerDeployer.deploy(poolManager, permit2, 300_000, address(0), address(0));
        address router = V4RouterDeployer.deploy(poolManager, permit2);

        // 3) Vaults wrapping the demo tokens
        MockYieldVault vault0 = new MockYieldVault(ERC20(address(token0)), "IY0 Yield Vault", "yIY0");
        MockYieldVault vault1 = new MockYieldVault(ERC20(address(token1)), "IY1 Yield Vault", "yIY1");

        // 4) Mine IdleYieldHook address with correct permission bits
        uint160 flags = uint160(
            Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_SWAP_FLAG
                | Hooks.AFTER_SWAP_FLAG
        );
        bytes memory creationCode = type(IdleYieldHook).creationCode;
        bytes memory ctorArgs = abi.encode(IPoolManager(poolManager));
        (address hookAddr, bytes32 salt) = HookMiner.find(CREATE2_DEPLOYER, flags, creationCode, ctorArgs);
        IdleYieldHook hook = new IdleYieldHook{salt: salt}(IPoolManager(poolManager));
        require(address(hook) == hookAddr, "Mined address mismatch");

        // 5) Initialise pool + register with hook
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(token0)),
            currency1: Currency.wrap(address(token1)),
            fee: SWAP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(hook))
        });
        IPoolManager(poolManager).initialize(key, TickMath.getSqrtPriceAtTick(0)); // 1:1 price
        hook.registerPool(key, LOWER_TICK, UPPER_TICK, vault0, vault1);

        vm.stopBroadcast();

        console2.log("===== X Layer Testnet (chain 1952) =====");
        console2.log("Token0:           ", address(token0));
        console2.log("Token1:           ", address(token1));
        console2.log("Permit2:          ", permit2);
        console2.log("PoolManager:      ", poolManager);
        console2.log("PositionManager:  ", positionManager);
        console2.log("V4Router:         ", router);
        console2.log("Vault0:           ", address(vault0));
        console2.log("Vault1:           ", address(vault1));
        console2.log("IdleYieldHook:    ", address(hook));
        console2.log("Pool fee:         ", SWAP_FEE);
        console2.log("Tick spacing:     ", TICK_SPACING);
        console2.log("Lower tick:       ", LOWER_TICK);
        console2.log("Upper tick:       ", UPPER_TICK);
        console2.log("========================================");
    }
}
