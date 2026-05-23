// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC4626} from "solmate/src/mixins/ERC4626.sol";
import {ERC20} from "solmate/src/tokens/ERC20.sol";

/// @notice Minimal ERC-4626 vault used only by the IdleYieldHook demo.
/// @dev Total assets are tracked via the vault's underlying token balance. Yield is
///      simulated by `accrueYield(amount)` which transfers extra underlying token into
///      the vault from a pre-funded yield budget; this raises pricePerShare for all holders.
contract MockYieldVault is ERC4626 {
    constructor(ERC20 _asset, string memory _name, string memory _symbol)
        ERC4626(_asset, _name, _symbol)
    {}

    /// @notice Total assets backing the vault = the vault's token balance.
    function totalAssets() public view override returns (uint256) {
        return asset.balanceOf(address(this));
    }

    /// @notice Simulates lending yield. Caller must already hold `amount` of the underlying
    ///         token and have approved this vault to pull it (or use `accrueYieldFrom`).
    /// @dev Only for the hackathon demo. A real vault would earn yield from a lending market.
    function accrueYield(uint256 amount) external {
        asset.transferFrom(msg.sender, address(this), amount);
    }
}
