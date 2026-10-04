// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ClaimTopicsLib - canonical claim topics of the Palissage protocol.
library ClaimTopicsLib {
    /// @notice Natural person / representative passed KYC.
    uint256 internal constant TOPIC_KYC = 1;
    /// @notice Legal entity passed KYB.
    uint256 internal constant TOPIC_KYB = 2;
    /// @notice Verified winery, allowed to create lots and offers.
    uint256 internal constant TOPIC_WINERY = 3;
    /// @notice Verified B2B buyer: shop / importer / restaurant group / wine club.
    uint256 internal constant TOPIC_B2B_BUYER = 4;
    /// @notice Verifier / warehouse partner (informational).
    uint256 internal constant TOPIC_VERIFIER = 5;

    /// @notice ERC-734 key purposes.
    uint256 internal constant PURPOSE_MANAGEMENT = 1;
    uint256 internal constant PURPOSE_ACTION = 2;
    uint256 internal constant PURPOSE_CLAIM = 3;
    uint256 internal constant PURPOSE_ENCRYPTION = 4;

    /// @notice ERC-734 key types.
    uint256 internal constant KEY_TYPE_ECDSA = 1;

    /// @notice ERC-735 signature schemes.
    uint256 internal constant SCHEME_ECDSA = 1;
}
