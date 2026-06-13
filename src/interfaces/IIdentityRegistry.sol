// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IIdentity} from "./IIdentity.sol";

/// @title IIdentityRegistry — wallet ↔ identity binding and compliance verification.
interface IIdentityRegistry {
    event IdentityRegistered(address indexed wallet, IIdentity indexed identity);
    event IdentityRemoved(address indexed wallet, IIdentity indexed identity);
    event IdentityUpdated(address indexed wallet, IIdentity indexed oldIdentity, IIdentity indexed newIdentity);
    event CountryUpdated(address indexed wallet, uint16 indexed country);
    event RequiredClaimTopicsUpdated(uint256[] topics);

    function registerIdentity(address wallet, IIdentity identity, uint16 country) external;
    function updateIdentity(address wallet, IIdentity identity) external;
    function updateCountry(address wallet, uint16 country) external;
    function deleteIdentity(address wallet) external;
    function setRequiredClaimTopics(uint256[] calldata topics) external;

    function identityOf(address wallet) external view returns (IIdentity identity);
    function countryOf(address wallet) external view returns (uint16 country);
    function containsWallet(address wallet) external view returns (bool registered);

    /// @notice Wallet has a registered identity holding a valid claim for EVERY required topic.
    function isVerified(address wallet) external view returns (bool verified);

    /// @notice Wallet's identity holds at least one valid claim for `topic` from a trusted issuer.
    function hasValidClaim(address wallet, uint256 topic) external view returns (bool has);
}
