// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title TestEURe - testnet-only payment token for Palissage demos.
/// @notice Not a stablecoin, not redeemable, not Monerium EURe. Anyone can mint from the faucet.
/// @dev The chain-id allowlist only guards the deploy script against an operator mistake.
contract TestEURe is ERC20, Ownable {
    string public constant VERSION = "1.1.0";

    /// @notice Amount a single faucet claim mints (18 decimals).
    uint256 public constant FAUCET_AMOUNT = 5_000e18;
    /// @notice Minimum interval between two claims by the same address.
    uint256 public constant FAUCET_COOLDOWN = 1 days;

    /// @notice Supported public test networks. No mainnet deployment is permitted.
    uint256 public constant ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
    uint256 public constant ROBINHOOD_TESTNET_CHAIN_ID = 46630;
    /// @notice Anvil / local fork, developer builds only.
    uint256 public constant LOCAL_CHAIN_ID = 31337;

    mapping(address => uint256) public lastClaimAt;
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

    /// @notice Self-service test funds. One claim per address per {FAUCET_COOLDOWN}.
    /// @dev `hasClaimed` is separate from `lastClaimAt` so a first claim at timestamp 0
    ///      (possible locally) still starts the cooldown.
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

    /// @notice Timestamp from which `account` may claim again (0 = now, never claimed).
    function faucetAvailableAt(address account) external view returns (uint256 availableAt) {
        uint256 last = lastClaimAt[account];
        return hasClaimed[account] ? last + FAUCET_COOLDOWN : 0;
    }

    /// @notice Owner mint, used by the seed script to fund the demo wallets.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
