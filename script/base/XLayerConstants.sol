// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AddressConstants} from "hookmate/constants/AddressConstants.sol";

/// @notice X Layer-specific Uniswap V4 deployment addresses, plus passthrough to hookmate for other chains.
/// @dev Sourced from https://developers.uniswap.org/contracts/v4/deployments (X Layer mainnet, chain 196).
///      X Layer testnet (chain 195) has no canonical V4 deployment as of 2026-05; deploy locally if needed.
library XLayerConstants {
    uint256 internal constant XLAYER_MAINNET = 196;
    uint256 internal constant XLAYER_TESTNET = 195;

    address internal constant XLAYER_POOL_MANAGER = 0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32;
    address internal constant XLAYER_POSITION_MANAGER = 0xcF1EAFC6928dC385A342E7C6491d371d2871458b;
    address internal constant XLAYER_POSITION_DESCRIPTOR = 0x9e9FBbEf0e1Bd752E83De5aCff3D0c936A9E5A4b;
    address internal constant XLAYER_V4_QUOTER = 0x8928074CA1b241D8Ec02815881c1Af11E8bC5219;
    address internal constant XLAYER_STATE_VIEW = 0x76Fd297e2D437cd7f76d50F01AfE6160f86e9990;
    address internal constant XLAYER_UNIVERSAL_ROUTER = 0xDa00aE15d3A71466517129255255db7c0c0956d3;
    address internal constant XLAYER_UNIVERSAL_ROUTER_211 = 0x8B844f885672f333Bc0042cB669255f93a4C1E6b;

    function poolManager(uint256 chainId) internal pure returns (address) {
        if (chainId == XLAYER_MAINNET) return XLAYER_POOL_MANAGER;
        return AddressConstants.getPoolManagerAddress(chainId);
    }

    function positionManager(uint256 chainId) internal pure returns (address) {
        if (chainId == XLAYER_MAINNET) return XLAYER_POSITION_MANAGER;
        return AddressConstants.getPositionManagerAddress(chainId);
    }

    function permit2() internal pure returns (address) {
        return AddressConstants.getPermit2Address();
    }
}
