// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Identity} from "./Identity.sol";
import {IIdentity} from "../interfaces/IIdentity.sol";
import {IIdentityRegistry} from "../interfaces/IIdentityRegistry.sol";
import {ClaimTopicsLib} from "../libraries/ClaimTopicsLib.sol";

/// @notice Minimal slice of WineLotToken (AccessControl) the gateway needs to
///         grant/revoke the verifier role to admin wallets.
interface IVerifierRoleManager {
    function VERIFIER_ROLE() external view returns (bytes32);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
}

/// @title RoleGateway - test-mode role switcher and on-chain role authority.
/// @notice A self-contained trusted claim issuer that lets the Palissage UI assign protocol
///         roles on-chain without off-chain signing. Each managed wallet gets one gateway-owned
///         {Identity} and a set of issuer claims; the gateway validates its own claims from
///         on-chain bookkeeping (see {isClaimValid}) instead of ECDSA recovery.
///
///         Two ways to set a role:
///           - {assumeRole}  — open self-service, only while {testMode} is on (the sandbox).
///           - {assignRole}  — gateway-admin only, works in any mode (real admin onboarding).
///
///         A wallet holds exactly one role at a time; assigning a new role removes the previous
///         one's claims (and the admin verifier role) first.
///
///         SECURITY: this is a privileged sandbox component. To do its job it holds
///         REGISTRY_AGENT_ROLE on the IdentityRegistry, is a trusted issuer for every role topic,
///         and holds DEFAULT_ADMIN_ROLE on the WineLotToken. A production deployment keeps
///         {testMode} off and scopes these powers down or retires them.
contract RoleGateway is Ownable {
    enum Role {
        None,
        Admin,
        Winery,
        Shop,
        Consumer
    }

    error InvalidRole();
    error NotGatewayAdmin(address caller);
    error TestModeDisabled();
    error WalletManagedElsewhere(address wallet);

    event TestModeSet(bool enabled);
    event RoleSet(address indexed wallet, Role indexed role, address identity);

    IIdentityRegistry public immutable identityRegistry;
    IVerifierRoleManager public immutable token;

    /// @notice When on, any wallet may {assumeRole} into any role (testnet sandbox). Default: on.
    bool public testMode = true;

    /// @notice The single role currently held by each wallet.
    mapping(address => Role) public roleOf;

    /// @notice Gateway-deployed identity for each managed wallet (0 until first claim role).
    mapping(address => IIdentity) public identityOf;

    /// @dev identity address => topic => claim currently issued by this gateway.
    mapping(address => mapping(uint256 => bool)) private _claimIssued;

    /// @dev Topics the gateway manages, in claim-diff iteration order.
    uint256[3] private _managedTopics =
        [ClaimTopicsLib.TOPIC_KYC, ClaimTopicsLib.TOPIC_WINERY, ClaimTopicsLib.TOPIC_B2B_BUYER];

    constructor(address owner_, IIdentityRegistry identityRegistry_, IVerifierRoleManager token_) Ownable(owner_) {
        identityRegistry = identityRegistry_;
        token = token_;
        // The protocol admin is seeded post-deploy via `assignRole(admin, Role.Admin)` (callable by
        // the owner) so it also picks up the VERIFIER_ROLE grant.
    }

    modifier onlyGatewayAdmin() {
        if (roleOf[msg.sender] != Role.Admin && msg.sender != owner()) revert NotGatewayAdmin(msg.sender);
        _;
    }

    // ---------------------------------------------------------------------
    // Owner
    // ---------------------------------------------------------------------

    /// @notice Toggle the test-mode sandbox. Only the owner (not the admin) may call.
    function setTestMode(bool enabled) external onlyOwner {
        testMode = enabled;
        emit TestModeSet(enabled);
    }

    // ---------------------------------------------------------------------
    // Role assignment
    // ---------------------------------------------------------------------

    /// @notice Self-service: the caller takes on `role`, dropping any previous role. Test mode only.
    function assumeRole(Role role) external {
        if (!testMode) revert TestModeDisabled();
        if (role == Role.None) revert InvalidRole();
        _setRole(msg.sender, role);
    }

    /// @notice Admin onboarding: set `wallet`'s role (or {Role.None} to clear). Works in any mode.
    function assignRole(address wallet, Role role) external onlyGatewayAdmin {
        _setRole(wallet, role);
    }

    /// @notice Admin: clear `wallet`'s role and all gateway-issued claims.
    function revokeRole(address wallet) external onlyGatewayAdmin {
        _setRole(wallet, Role.None);
    }

    function _setRole(address wallet, Role role) internal {
        Role previous = roleOf[wallet];

        bool needKyc = role == Role.Winery || role == Role.Shop || role == Role.Consumer;
        bool needWinery = role == Role.Winery;
        bool needBuyer = role == Role.Shop;

        // Provision a gateway-owned identity the first time the wallet needs a claim.
        IIdentity identity = identityOf[wallet];
        if (needKyc && address(identity) == address(0)) {
            if (identityRegistry.containsWallet(wallet)) revert WalletManagedElsewhere(wallet);
            identity = IIdentity(address(new Identity(address(this))));
            identityOf[wallet] = identity;
            identityRegistry.registerIdentity(wallet, identity, 0);
        }

        if (address(identity) != address(0)) {
            _setClaim(identity, ClaimTopicsLib.TOPIC_KYC, needKyc);
            _setClaim(identity, ClaimTopicsLib.TOPIC_WINERY, needWinery);
            _setClaim(identity, ClaimTopicsLib.TOPIC_B2B_BUYER, needBuyer);
        }

        // The admin role carries the on-chain verifier capability.
        if (role == Role.Admin && previous != Role.Admin) {
            token.grantRole(token.VERIFIER_ROLE(), wallet);
        } else if (role != Role.Admin && previous == Role.Admin) {
            token.revokeRole(token.VERIFIER_ROLE(), wallet);
        }

        roleOf[wallet] = role;
        emit RoleSet(wallet, role, address(identity));
    }

    /// @dev Adds or removes the gateway's claim for `topic` on `identity` to match `wanted`.
    function _setClaim(IIdentity identity, uint256 topic, bool wanted) internal {
        bool issued = _claimIssued[address(identity)][topic];
        if (wanted == issued) return;
        if (wanted) {
            identity.addClaim(topic, ClaimTopicsLib.SCHEME_ECDSA, address(this), "", "", "");
        } else {
            identity.removeClaim(keccak256(abi.encode(address(this), topic)));
        }
        _claimIssued[address(identity)][topic] = wanted;
    }

    // ---------------------------------------------------------------------
    // IClaimIssuer surface (read by IdentityRegistry)
    // ---------------------------------------------------------------------

    /// @notice A gateway claim is valid iff the gateway currently has it issued for the subject.
    /// @dev `subject` is the wallet's Identity contract (as passed by IdentityRegistry).
    function isClaimValid(IIdentity subject, uint256 topic, bytes calldata, bytes calldata)
        external
        view
        returns (bool valid)
    {
        return _claimIssued[address(subject)][topic];
    }

    /// @notice Gateway claims carry no real signature, so none are ever signature-revoked.
    function isClaimRevoked(bytes calldata) external pure returns (bool) {
        return false;
    }

    /// @notice No-op: revocation is done through {revokeRole}/{assignRole}, not by signature.
    function revokeClaimBySignature(bytes calldata) external view onlyGatewayAdmin {}
}
