// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {V4RouterDeployer} from "hookmate/artifacts/V4Router.sol";

import {XLayerConstants} from "./base/XLayerConstants.sol";

/// @notice Deploys the hookmate V4Router on X Layer mainnet so the dApp can call
///         `swapExactTokensForTokens` directly without encoding Universal Router commands.
contract DeployRouter is Script {
    function run() public {
        require(block.chainid == XLayerConstants.XLAYER_MAINNET, "Run against X Layer mainnet (196)");

        address poolManager = XLayerConstants.poolManager(block.chainid);
        address permit2 = XLayerConstants.permit2();

        vm.startBroadcast();
        address router = V4RouterDeployer.deploy(poolManager, permit2);
        vm.stopBroadcast();

        console2.log("===== Hookmate V4Router on X Layer mainnet =====");
        console2.log("PoolManager:", poolManager);
        console2.log("Permit2:    ", permit2);
        console2.log("V4Router:   ", router);
        console2.log("================================================");
    }
}
