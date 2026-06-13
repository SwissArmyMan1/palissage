// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IIdentityRegistry} from "../interfaces/IIdentityRegistry.sol";
import {ITrustedIssuersRegistry} from "../interfaces/ITrustedIssuersRegistry.sol";
import {IClaimIssuer} from "../interfaces/IClaimIssuer.sol";
import {IIdentity} from "../interfaces/IIdentity.sol";
import {ClaimTopicsLib} from "../libraries/ClaimTopicsLib.sol";

/// @title IdentityRegistry — binds wallets to ERC-734/735 identities and answers
///        compliance queries (isVerified / hasValidClaim) against trusted issuers.
contract IdentityRegistry is AccessControl, IIdentityRegistry {
    bytes32 public constant REGISTRY_AGENT_ROLE = keccak256("REGISTRY_AGENT_ROLE");

    error WalletAlreadyRegistered(address wallet);
    error WalletNotRegistered(address wallet);
    error ZeroAddress();

    event TrustedIssuersRegistryUpdated(address indexed registry);

    ITrustedIssuersRegistry public trustedIssuersRegistry;

    mapping(address => IIdentity) private _identities;
    mapping(address => uint16) private _countries;

    /// @notice Topics a wallet must hold a valid claim for to pass `isVerified`. Default: [KYC].
    uint256[] private _requiredClaimTopics;

    constructor(address admin, ITrustedIssuersRegistry trustedIssuers) {
        if (address(trustedIssuers) == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        trustedIssuersRegistry = trustedIssuers;
        _requiredClaimTopics.push(ClaimTopicsLib.TOPIC_KYC);
    }

    // ---------------------------------------------------------------------
    // Admin / agent
    // ---------------------------------------------------------------------

    function setTrustedIssuersRegistry(ITrustedIssuersRegistry registry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (address(registry) == address(0)) revert ZeroAddress();
        trustedIssuersRegistry = registry;
        emit TrustedIssuersRegistryUpdated(address(registry));
    }

    /// @inheritdoc IIdentityRegistry
    function setRequiredClaimTopics(uint256[] calldata topics) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _requiredClaimTopics = topics;
        emit RequiredClaimTopicsUpdated(topics);
    }

    /// @inheritdoc IIdentityRegistry
    function registerIdentity(address wallet, IIdentity identity, uint16 country)
        external
        onlyRole(REGISTRY_AGENT_ROLE)
    {
        if (wallet == address(0) || address(identity) == address(0)) revert ZeroAddress();
        if (address(_identities[wallet]) != address(0)) revert WalletAlreadyRegistered(wallet);
        _identities[wallet] = identity;
        _countries[wallet] = country;
        emit IdentityRegistered(wallet, identity);
        emit CountryUpdated(wallet, country);
    }

    /// @inheritdoc IIdentityRegistry
    function updateIdentity(address wallet, IIdentity identity) external onlyRole(REGISTRY_AGENT_ROLE) {
        if (address(identity) == address(0)) revert ZeroAddress();
        IIdentity old = _identities[wallet];
        if (address(old) == address(0)) revert WalletNotRegistered(wallet);
        _identities[wallet] = identity;
        emit IdentityUpdated(wallet, old, identity);
    }

    /// @inheritdoc IIdentityRegistry
    function updateCountry(address wallet, uint16 country) external onlyRole(REGISTRY_AGENT_ROLE) {
        if (address(_identities[wallet]) == address(0)) revert WalletNotRegistered(wallet);
        _countries[wallet] = country;
        emit CountryUpdated(wallet, country);
    }

    /// @inheritdoc IIdentityRegistry
    function deleteIdentity(address wallet) external onlyRole(REGISTRY_AGENT_ROLE) {
        IIdentity identity = _identities[wallet];
        if (address(identity) == address(0)) revert WalletNotRegistered(wallet);
        delete _identities[wallet];
        delete _countries[wallet];
        emit IdentityRemoved(wallet, identity);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @inheritdoc IIdentityRegistry
    function identityOf(address wallet) external view returns (IIdentity identity) {
        return _identities[wallet];
    }

    /// @inheritdoc IIdentityRegistry
    function countryOf(address wallet) external view returns (uint16 country) {
        return _countries[wallet];
    }

    /// @inheritdoc IIdentityRegistry
    function containsWallet(address wallet) external view returns (bool registered) {
        return address(_identities[wallet]) != address(0);
    }

    function requiredClaimTopics() external view returns (uint256[] memory topics) {
        return _requiredClaimTopics;
    }

    /// @inheritdoc IIdentityRegistry
    function isVerified(address wallet) external view returns (bool verified) {
        IIdentity identity = _identities[wallet];
        if (address(identity) == address(0)) return false;

        uint256 len = _requiredClaimTopics.length;
        for (uint256 i = 0; i < len; i++) {
            if (!_hasValidClaim(identity, _requiredClaimTopics[i])) return false;
        }
        return true;
    }

    /// @inheritdoc IIdentityRegistry
    function hasValidClaim(address wallet, uint256 topic) external view returns (bool has) {
        IIdentity identity = _identities[wallet];
        if (address(identity) == address(0)) return false;
        return _hasValidClaim(identity, topic);
    }

    /// @dev A claim is valid when its issuer is trusted for the topic and the issuer
    ///      confirms the signature (CLAIM-purpose signer, not revoked).
    function _hasValidClaim(IIdentity identity, uint256 topic) internal view returns (bool) {
        bytes32[] memory claimIds = identity.getClaimIdsByTopic(topic);
        ITrustedIssuersRegistry issuersRegistry = trustedIssuersRegistry;

        uint256 len = claimIds.length;
        for (uint256 i = 0; i < len; i++) {
            (uint256 claimTopic,, address issuer, bytes memory sig, bytes memory data,) = identity.getClaim(claimIds[i]);
            if (claimTopic != topic) continue;
            if (!issuersRegistry.isTrustedIssuer(issuer)) continue;
            if (!issuersRegistry.hasClaimTopic(issuer, topic)) continue;

            try IClaimIssuer(issuer).isClaimValid(identity, topic, sig, data) returns (bool valid) {
                if (valid) return true;
            } catch {
                continue;
            }
        }
        return false;
    }
}
