// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library ClaimTopicsLib {
    uint256 internal constant TOPIC_KYC = 1;

    uint256 internal constant TOPIC_KYB = 2;

    uint256 internal constant TOPIC_WINERY = 3;

    uint256 internal constant TOPIC_B2B_BUYER = 4;

    uint256 internal constant TOPIC_VERIFIER = 5;

    // ERC-734 key purposes.
    uint256 internal constant PURPOSE_MANAGEMENT = 1;
    uint256 internal constant PURPOSE_ACTION = 2;
    uint256 internal constant PURPOSE_CLAIM = 3;
    uint256 internal constant PURPOSE_ENCRYPTION = 4;

    uint256 internal constant KEY_TYPE_ECDSA = 1;

    uint256 internal constant SCHEME_ECDSA = 1;
}
