// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IERC734 - Key Holder (identity key management).
/// @notice Key purposes: 1 = MANAGEMENT, 2 = ACTION, 3 = CLAIM, 4 = ENCRYPTION.
///         Key types: 1 = ECDSA, 2 = RSA. Keys are stored as keccak256(abi.encode(address)).
interface IERC734 {
    event KeyAdded(bytes32 indexed key, uint256 indexed purpose, uint256 indexed keyType);
    event KeyRemoved(bytes32 indexed key, uint256 indexed purpose, uint256 indexed keyType);
    event ExecutionRequested(uint256 indexed executionId, address indexed to, uint256 indexed value, bytes data);
    event Executed(uint256 indexed executionId, address indexed to, uint256 indexed value, bytes data);
    event ExecutionFailed(uint256 indexed executionId, address indexed to, uint256 indexed value, bytes data);
    event Approved(uint256 indexed executionId, bool approved);

    function getKey(bytes32 key) external view returns (uint256[] memory purposes, uint256 keyType, bytes32 key_);
    function keyHasPurpose(bytes32 key, uint256 purpose) external view returns (bool exists);
    function getKeysByPurpose(uint256 purpose) external view returns (bytes32[] memory keys);
    function addKey(bytes32 key, uint256 purpose, uint256 keyType) external returns (bool success);
    function removeKey(bytes32 key, uint256 purpose) external returns (bool success);
    function execute(address to, uint256 value, bytes calldata data) external payable returns (uint256 executionId);
    function approve(uint256 id, bool approve_) external returns (bool success);
}
