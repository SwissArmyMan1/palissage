// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @title IERC7943MultiToken - uRWA (Universal Real World Asset) interface, multi-token variant.
/// @notice Final ERC-7943 interface for ERC-1155 based RWA tokens. Interface ID: 0x41c4fbad.
interface IERC7943MultiToken is IERC165 {
    /// @notice Emitted when tokens are transferred by an authorized enforcer, bypassing owner consent.
    event ForcedTransfer(address indexed from, address indexed to, uint256 indexed tokenId, uint256 amount);

    /// @notice Emitted when the frozen amount of `tokenId` for `account` is set to `amount`.
    event Frozen(address indexed account, uint256 indexed tokenId, uint256 amount);

    error ERC7943CannotSend(address account);
    error ERC7943CannotReceive(address account);
    error ERC7943CannotTransfer(address from, address to, uint256 tokenId, uint256 amount);
    error ERC7943InsufficientUnfrozenBalance(address account, uint256 tokenId, uint256 amount, uint256 unfrozen);

    /// @notice Forcibly moves `amount` of `tokenId` from `from` to `to`, bypassing standard checks.
    function forcedTransfer(address from, address to, uint256 tokenId, uint256 amount) external returns (bool result);

    /// @notice Sets the absolute frozen amount of `tokenId` for `account`. May exceed the balance.
    function setFrozenTokens(address account, uint256 tokenId, uint256 amount) external returns (bool result);

    /// @notice Whether `account` is currently allowed to send tokens.
    function canSend(address account) external view returns (bool allowed);

    /// @notice Whether `account` is currently allowed to receive tokens.
    function canReceive(address account) external view returns (bool allowed);

    /// @notice Current frozen amount of `tokenId` for `account`.
    function getFrozenTokens(address account, uint256 tokenId) external view returns (uint256 amount);

    /// @notice Whether a public transfer of `amount` of `tokenId` from `from` to `to` would be allowed.
    function canTransfer(address from, address to, uint256 tokenId, uint256 amount)
        external
        view
        returns (bool allowed);
}
