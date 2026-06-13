// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IERC735 — Claim Holder.
/// @notice Claims are signed third-party statements about an identity.
///         claimId = keccak256(abi.encode(issuer, topic)).
interface IERC735 {
    event ClaimAdded(
        bytes32 indexed claimId,
        uint256 indexed topic,
        uint256 scheme,
        address indexed issuer,
        bytes signature,
        bytes data,
        string uri
    );
    event ClaimRemoved(
        bytes32 indexed claimId,
        uint256 indexed topic,
        uint256 scheme,
        address indexed issuer,
        bytes signature,
        bytes data,
        string uri
    );
    event ClaimChanged(
        bytes32 indexed claimId,
        uint256 indexed topic,
        uint256 scheme,
        address indexed issuer,
        bytes signature,
        bytes data,
        string uri
    );

    function getClaim(bytes32 claimId)
        external
        view
        returns (uint256 topic, uint256 scheme, address issuer, bytes memory signature, bytes memory data, string memory uri);

    function getClaimIdsByTopic(uint256 topic) external view returns (bytes32[] memory claimIds);

    function addClaim(
        uint256 topic,
        uint256 scheme,
        address issuer,
        bytes calldata signature,
        bytes calldata data,
        string calldata uri
    ) external returns (bytes32 claimRequestId);

    function removeClaim(bytes32 claimId) external returns (bool success);
}
