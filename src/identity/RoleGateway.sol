// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Identity} from "./Identity.sol";
import {IIdentity} from "../interfaces/IIdentity.sol";
import {IIdentityRegistry} from "../interfaces/IIdentityRegistry.sol";
import {ClaimTopicsLib} from "../libraries/ClaimTopicsLib.sol";

interface IVerifierRoleManager {
    function VERIFIER_ROLE() external view returns (bytes32);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
}

contract RoleGateway is Ownable {
    string public constant VERSION = "1.1.0";

    enum Role {
        None,
        Admin,
        Winery,
        Shop,
        Consumer
    }

    error InvalidRole();
    error AdminRoleNotSelfAssignable();
    error NotGatewayAdmin(address caller);
    error TestModeDisabled();
    error WalletManagedElsewhere(address wallet);

    event TestModeSet(bool enabled);
    event RoleSet(address indexed wallet, Role indexed role, address identity);

    IIdentityRegistry public immutable identityRegistry;
    IVerifierRoleManager public immutable token;

    // Self-service permits non-admin roles only.
    bool public testMode;

    mapping(address => Role) public roleOf;

    mapping(address => IIdentity) public identityOf;

    mapping(address => mapping(uint256 => bool)) private _claimIssued;

    uint256[3] private _managedTopics =
        [ClaimTopicsLib.TOPIC_KYC, ClaimTopicsLib.TOPIC_WINERY, ClaimTopicsLib.TOPIC_B2B_BUYER];

    constructor(address owner_, IIdentityRegistry identityRegistry_, IVerifierRoleManager token_) Ownable(owner_) {
        identityRegistry = identityRegistry_;
        token = token_;
    }

    modifier onlyGatewayAdmin() {
        if (roleOf[msg.sender] != Role.Admin && msg.sender != owner()) revert NotGatewayAdmin(msg.sender);
        _;
    }

    function setTestMode(bool enabled) external onlyOwner {
        testMode = enabled;
        emit TestModeSet(enabled);
    }

    function assumeRole(Role role) external {
        if (!testMode) revert TestModeDisabled();
        if (role == Role.None) revert InvalidRole();
        if (role == Role.Admin) revert AdminRoleNotSelfAssignable();
        _setRole(msg.sender, role);
    }

    function assignRole(address wallet, Role role) external onlyGatewayAdmin {
        _setRole(wallet, role);
    }

    function revokeRole(address wallet) external onlyGatewayAdmin {
        _setRole(wallet, Role.None);
    }

    function _setRole(address wallet, Role role) internal {
        Role previous = roleOf[wallet];

        bool needKyc = role == Role.Winery || role == Role.Shop || role == Role.Consumer;
        bool needWinery = role == Role.Winery;
        bool needBuyer = role == Role.Shop;

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

        if (role == Role.Admin && previous != Role.Admin) {
            token.grantRole(token.VERIFIER_ROLE(), wallet);
        } else if (role != Role.Admin && previous == Role.Admin) {
            token.revokeRole(token.VERIFIER_ROLE(), wallet);
        }

        roleOf[wallet] = role;
        emit RoleSet(wallet, role, address(identity));
    }

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

    // Gateway claims are validated against current grants, without ECDSA recovery.
    function isClaimValid(IIdentity subject, uint256 topic, bytes calldata, bytes calldata)
        external
        view
        returns (bool valid)
    {
        return _claimIssued[address(subject)][topic];
    }

    function isClaimRevoked(bytes calldata) external pure returns (bool) {
        return false;
    }

    function revokeClaimBySignature(bytes calldata) external view onlyGatewayAdmin {}
}
