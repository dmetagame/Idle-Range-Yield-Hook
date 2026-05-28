// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {IdleYieldHook} from "../src/IdleYieldHook.sol";

/// @notice One-shot: transfer hook ownership away from the leaked deployer wallet.
/// @dev Run with the LEAKED key. After this completes the leaked key has no
///      owner privileges on the hook; it still holds dust OKB + mock tokens
///      (worthless) but those don't affect users.
///
///      Required env:
///        NEW_OWNER  — checksummed address of the fresh wallet you control
///        HOOK       — optional override; defaults to X Layer mainnet deployment
contract TransferHookOwnership is Script {
    address internal constant XLAYER_MAINNET_HOOK = 0x3e4e0D5009Ee9fa6f4376b064fd1A4e4C01BD8c0;

    function run() external {
        address newOwner = vm.envAddress("NEW_OWNER");
        address hookAddr = vm.envOr("HOOK", XLAYER_MAINNET_HOOK);
        require(newOwner != address(0), "NEW_OWNER zero");
        require(hookAddr.code.length > 0, "hook has no code at this address");

        IdleYieldHook hook = IdleYieldHook(hookAddr);
        address currentOwner = hook.owner();

        console2.log("hook:           ", hookAddr);
        console2.log("current owner:  ", currentOwner);
        console2.log("requested owner:", newOwner);
        require(currentOwner != newOwner, "NEW_OWNER already owns the hook");

        vm.startBroadcast();
        hook.transferOwnership(newOwner);
        vm.stopBroadcast();

        address postOwner = hook.owner();
        console2.log("post-tx owner:  ", postOwner);
        require(postOwner == newOwner, "ownership transfer did not land");
    }
}
