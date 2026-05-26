// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC4626} from "solmate/src/mixins/ERC4626.sol";
import {ERC20} from "solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "solmate/src/utils/SafeTransferLib.sol";

interface IAaveV3Pool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

/// @notice ERC-4626 wrapper around an Aave V3 reserve.
/// @dev This is the production integration surface for replacing MockYieldVault.
///      Aave aTokens accrue interest through balance growth, so aToken.balanceOf
///      is the adapter's totalAssets value.
contract AaveV3ERC4626Adapter is ERC4626 {
    using SafeTransferLib for ERC20;

    IAaveV3Pool public immutable pool;
    ERC20 public immutable aToken;

    constructor(ERC20 underlying, IAaveV3Pool aavePool, ERC20 reserveAToken, string memory name, string memory symbol)
        ERC4626(underlying, name, symbol)
    {
        pool = aavePool;
        aToken = reserveAToken;
    }

    function totalAssets() public view override returns (uint256) {
        return aToken.balanceOf(address(this));
    }

    function afterDeposit(uint256 assets, uint256) internal override {
        asset.safeApprove(address(pool), 0);
        asset.safeApprove(address(pool), assets);
        pool.supply(address(asset), assets, address(this), 0);
    }

    function beforeWithdraw(uint256 assets, uint256) internal override {
        pool.withdraw(address(asset), assets, address(this));
    }
}
