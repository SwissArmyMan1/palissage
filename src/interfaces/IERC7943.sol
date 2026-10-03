// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// ERC-7943 multi-token interface ID: 0x41c4fbad.
interface IERC7943MultiToken is IERC165 {
    event ForcedTransfer(address indexed from, address indexed to, uint256 indexed tokenId, uint256 amount);

    event Frozen(address indexed account, uint256 indexed tokenId, uint256 amount);

    error ERC7943CannotSend(address account);
    error ERC7943CannotReceive(address account);
    error ERC7943CannotTransfer(address from, address to, uint256 tokenId, uint256 amount);
    error ERC7943InsufficientUnfrozenBalance(address account, uint256 tokenId, uint256 amount, uint256 unfrozen);

    function forcedTransfer(address from, address to, uint256 tokenId, uint256 amount) external returns (bool result);

    /// @notice Absolute frozen amount; may exceed the current balance.
    function setFrozenTokens(address account, uint256 tokenId, uint256 amount) external returns (bool result);

    function canSend(address account) external view returns (bool allowed);

    function canReceive(address account) external view returns (bool allowed);

    function getFrozenTokens(address account, uint256 tokenId) external view returns (uint256 amount);

    function canTransfer(address from, address to, uint256 tokenId, uint256 amount)
        external
        view
        returns (bool allowed);
}
