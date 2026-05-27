// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {ERC20} from "solmate/src/tokens/ERC20.sol";

import {AaveV3ERC4626Adapter, IAaveV3Pool} from "../src/integrations/AaveV3ERC4626Adapter.sol";
import {XLayerConstants} from "./base/XLayerConstants.sol";

/// @notice Deploys ERC-4626 adapters for an official Aave V3 market.
/// @dev This is intentionally env-driven. Do not hardcode market addresses until
///      the target Aave deployment is live and verified from official sources.
contract DeployAaveAdapters is Script {
    function run() public {
        require(block.chainid == XLayerConstants.XLAYER_MAINNET, "Run against X Layer mainnet (196)");

        address aavePool = vm.envAddress("AAVE_V3_POOL");
        address asset0 = vm.envAddress("AAVE_ASSET0");
        address asset1 = vm.envAddress("AAVE_ASSET1");
        address aToken0 = vm.envAddress("AAVE_ATOKEN0");
        address aToken1 = vm.envAddress("AAVE_ATOKEN1");

        require(aavePool.code.length > 0, "AAVE_V3_POOL has no code");
        require(asset0.code.length > 0, "AAVE_ASSET0 has no code");
        require(asset1.code.length > 0, "AAVE_ASSET1 has no code");
        require(aToken0.code.length > 0, "AAVE_ATOKEN0 has no code");
        require(aToken1.code.length > 0, "AAVE_ATOKEN1 has no code");

        vm.startBroadcast();
        AaveV3ERC4626Adapter vault0 = new AaveV3ERC4626Adapter(
            ERC20(asset0), IAaveV3Pool(aavePool), ERC20(aToken0), "IdleYield Aave Vault 0", "iyAAVE0"
        );
        AaveV3ERC4626Adapter vault1 = new AaveV3ERC4626Adapter(
            ERC20(asset1), IAaveV3Pool(aavePool), ERC20(aToken1), "IdleYield Aave Vault 1", "iyAAVE1"
        );
        vm.stopBroadcast();

        console2.log("===== IdleYield Aave V3 adapters =====");
        console2.log("Aave Pool:", aavePool);
        console2.log("Asset0:   ", asset0);
        console2.log("aToken0:  ", aToken0);
        console2.log("Vault0:   ", address(vault0));
        console2.log("Asset1:   ", asset1);
        console2.log("aToken1:  ", aToken1);
        console2.log("Vault1:   ", address(vault1));
        console2.log("=======================================");
    }
}
