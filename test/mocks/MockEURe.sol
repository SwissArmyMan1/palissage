// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Test stand-in for the EURe stablecoin (Monerium EUR emoney).
///      Decimals are kept at 6 here purely to simplify test arithmetic;
///      the production EURe token on Arbitrum uses 18 decimals.
contract MockEURe is ERC20 {
    constructor() ERC20("Mock EURe", "EURe") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
