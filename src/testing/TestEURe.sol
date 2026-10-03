// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Valueless test token with a per-address faucet.
contract TestEURe is ERC20, Ownable {
    string public constant VERSION = "1.1.0";

    uint256 public constant FAUCET_AMOUNT = 5_000e18;

    uint256 public constant FAUCET_COOLDOWN = 1 days;

    uint256 public constant ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
    uint256 public constant ROBINHOOD_TESTNET_CHAIN_ID = 46630;

    uint256 public constant LOCAL_CHAIN_ID = 31337;

    mapping(address => uint256) public lastClaimAt;

    // Track first use separately because timestamp zero is valid locally.
    mapping(address => bool) public hasClaimed;

    error FaucetCooldownActive(address account, uint256 availableAt);
    error UnsupportedTestChain(uint256 chainId);

    event FaucetClaimed(address indexed account, uint256 amount);

    constructor(address owner_) ERC20("Palissage Test EUR", "tEURe") Ownable(owner_) {
        if (
            block.chainid != ARBITRUM_SEPOLIA_CHAIN_ID && block.chainid != ROBINHOOD_TESTNET_CHAIN_ID
                && block.chainid != LOCAL_CHAIN_ID
        ) {
            revert UnsupportedTestChain(block.chainid);
        }
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function claim() external {
        uint256 last = lastClaimAt[msg.sender];
        if (hasClaimed[msg.sender] && block.timestamp < last + FAUCET_COOLDOWN) {
            revert FaucetCooldownActive(msg.sender, last + FAUCET_COOLDOWN);
        }
        hasClaimed[msg.sender] = true;
        lastClaimAt[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    function faucetAvailableAt(address account) external view returns (uint256 availableAt) {
        uint256 last = lastClaimAt[account];
        return hasClaimed[account] ? last + FAUCET_COOLDOWN : 0;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
