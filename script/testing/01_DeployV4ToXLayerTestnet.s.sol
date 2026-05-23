// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {Permit2Deployer} from "hookmate/artifacts/Permit2.sol";
import {V4PoolManagerDeployer} from "hookmate/artifacts/V4PoolManager.sol";
import {V4PositionManagerDeployer} from "hookmate/artifacts/V4PositionManager.sol";
import {V4RouterDeployer} from "hookmate/artifacts/V4Router.sol";

import {XLayerConstants} from "../base/XLayerConstants.sol";

/// @notice Bootstraps Uniswap v4 core on a chain that has no canonical deployment yet.
/// @dev Run against X Layer testnet (chain 1952, Terigon). After running, copy the printed
///      addresses into XLayerConstants.sol under a new XLAYER_TESTNET_* block.
contract DeployV4ToXLayerTestnet is Script {
    function run() public {
        require(
            block.chainid == XLayerConstants.XLAYER_TESTNET,
            "Run against X Layer testnet (chain 1952) only"
        );

        address canonicalPermit2 = XLayerConstants.permit2();
        bool permit2Exists = canonicalPermit2.code.length > 0;

        vm.startBroadcast();

        address permit2;
        if (permit2Exists) {
            permit2 = canonicalPermit2;
        } else {
            // X Layer testnet currently has Permit2 at canonical; this branch is only a
            // fallback if that ever changes. Deploys a non-canonical instance.
            permit2 = Permit2Deployer.deploy();
        }

        address deployer = msg.sender;
        address poolManager = V4PoolManagerDeployer.deploy(deployer);

        // PositionManager(poolManager, permit2, unsubscribeGasLimit=300000, posDescriptor=0, wnative=0)
        address positionManager =
            V4PositionManagerDeployer.deploy(poolManager, permit2, 300_000, address(0), address(0));

        address router = V4RouterDeployer.deploy(poolManager, permit2);

        vm.stopBroadcast();

        console2.log("===== X Layer Testnet V4 Core =====");
        console2.log("chainId:           ", block.chainid);
        console2.log("Permit2 (reused):  ", permit2);
        console2.log("PoolManager:       ", poolManager);
        console2.log("PositionManager:   ", positionManager);
        console2.log("V4Router:          ", router);
        console2.log("====================================");
        console2.log("Next: paste these into script/base/XLayerConstants.sol");
        console2.log("under a new XLAYER_TESTNET_* address block.");
    }
}
