// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {Identity} from "../../src/identity/Identity.sol";
import {ClaimIssuer} from "../../src/identity/ClaimIssuer.sol";
import {TrustedIssuersRegistry} from "../../src/identity/TrustedIssuersRegistry.sol";
import {IdentityRegistry} from "../../src/identity/IdentityRegistry.sol";
import {WineLotToken} from "../../src/token/WineLotToken.sol";
import {PrimaryMarket} from "../../src/market/PrimaryMarket.sol";
import {SecondaryMarket} from "../../src/market/SecondaryMarket.sol";
import {RedemptionManager} from "../../src/redemption/RedemptionManager.sol";
import {IWineLotToken} from "../../src/interfaces/IWineLotToken.sol";
import {IIdentity} from "../../src/interfaces/IIdentity.sol";
import {IClaimIssuer} from "../../src/interfaces/IClaimIssuer.sol";
import {ClaimTopicsLib} from "../../src/libraries/ClaimTopicsLib.sol";
import {MockEURC} from "../mocks/MockEURC.sol";

/// @dev Full protocol deployment + identity onboarding helpers shared by all tests.
abstract contract Fixtures is Test {
    address internal admin = makeAddr("admin");
    address internal treasury = makeAddr("treasury");
    address internal verifier = makeAddr("verifier");
    address internal enforcer = makeAddr("enforcer");
    address internal registryAgent = makeAddr("registryAgent");
    address internal issuerOwner = makeAddr("issuerOwner");
    address internal winery = makeAddr("winery");
    address internal buyer = makeAddr("buyer");
    address internal buyer2 = makeAddr("buyer2");
    address internal outsider = makeAddr("outsider");

    address internal claimSigner;
    uint256 internal claimSignerKey;

    TrustedIssuersRegistry internal trustedIssuers;
    IdentityRegistry internal identityRegistry;
    WineLotToken internal token;
    PrimaryMarket internal primaryMarket;
    SecondaryMarket internal secondaryMarket;
    RedemptionManager internal redemptionManager;
    ClaimIssuer internal claimIssuer;
    MockEURC internal eurc;

    mapping(address => Identity) internal identities;

    function setUp() public virtual {
        (claimSigner, claimSignerKey) = makeAddrAndKey("claimSigner");

        trustedIssuers = new TrustedIssuersRegistry(admin);
        identityRegistry = new IdentityRegistry(admin, trustedIssuers);
        token = new WineLotToken(admin, identityRegistry);
        primaryMarket = new PrimaryMarket(admin, token, identityRegistry, treasury);
        secondaryMarket = new SecondaryMarket(admin, token, identityRegistry, treasury);
        redemptionManager = new RedemptionManager(admin, token);
        eurc = new MockEURC();

        claimIssuer = new ClaimIssuer(issuerOwner);
        vm.prank(issuerOwner);
        claimIssuer.addKey(keccak256(abi.encode(claimSigner)), ClaimTopicsLib.PURPOSE_CLAIM, ClaimTopicsLib.KEY_TYPE_ECDSA);

        uint256[] memory topics = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) {
            topics[i] = i + 1;
        }

        vm.startPrank(admin);
        trustedIssuers.addTrustedIssuer(IClaimIssuer(address(claimIssuer)), topics);
        identityRegistry.grantRole(identityRegistry.REGISTRY_AGENT_ROLE(), registryAgent);

        token.grantRole(token.VERIFIER_ROLE(), verifier);
        token.grantRole(token.ENFORCER_ROLE(), enforcer);
        token.grantRole(token.MINTER_ROLE(), address(primaryMarket));
        token.grantRole(token.BURNER_ROLE(), address(redemptionManager));
        token.grantRole(token.TRANSFER_AGENT_ROLE(), address(primaryMarket));
        token.grantRole(token.TRANSFER_AGENT_ROLE(), address(secondaryMarket));
        token.grantRole(token.TRANSFER_AGENT_ROLE(), address(redemptionManager));
        token.setSystemAddress(address(redemptionManager), true);

        primaryMarket.grantRole(primaryMarket.VERIFIER_ROLE(), verifier);
        primaryMarket.grantRole(primaryMarket.PAUSER_ROLE(), admin);
        primaryMarket.setPaymentTokenAllowed(address(eurc), true);

        secondaryMarket.grantRole(secondaryMarket.PAUSER_ROLE(), admin);
        secondaryMarket.setPaymentTokenAllowed(address(eurc), true);

        redemptionManager.grantRole(redemptionManager.VERIFIER_ROLE(), verifier);
        vm.stopPrank();

        uint256[] memory wineryTopics = new uint256[](3);
        wineryTopics[0] = ClaimTopicsLib.TOPIC_KYC;
        wineryTopics[1] = ClaimTopicsLib.TOPIC_KYB;
        wineryTopics[2] = ClaimTopicsLib.TOPIC_WINERY;
        _onboard(winery, 250, wineryTopics); // FR

        uint256[] memory buyerTopics = new uint256[](3);
        buyerTopics[0] = ClaimTopicsLib.TOPIC_KYC;
        buyerTopics[1] = ClaimTopicsLib.TOPIC_KYB;
        buyerTopics[2] = ClaimTopicsLib.TOPIC_B2B_BUYER;
        _onboard(buyer, 756, buyerTopics); // CH
        _onboard(buyer2, 276, buyerTopics); // DE
    }

    /// @dev Deploys an identity for `wallet`, adds issuer-signed claims and registers the wallet.
    function _onboard(address wallet, uint16 country, uint256[] memory topics) internal {
        Identity identity = new Identity(wallet);
        identities[wallet] = identity;

        for (uint256 i = 0; i < topics.length; i++) {
            bytes memory data = "";
            bytes memory sig = _signClaim(address(identity), topics[i], data);
            vm.prank(wallet);
            identity.addClaim(topics[i], ClaimTopicsLib.SCHEME_ECDSA, address(claimIssuer), sig, data, "");
        }

        vm.prank(registryAgent);
        identityRegistry.registerIdentity(wallet, IIdentity(address(identity)), country);
    }

    function _signClaim(address identity, uint256 topic, bytes memory data) internal view returns (bytes memory sig) {
        bytes32 dataHash = keccak256(abi.encode(identity, topic, data));
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(dataHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimSignerKey, ethSignedHash);
        return abi.encodePacked(r, s, v);
    }

    function _createVerifiedLot(uint32 totalBottles, uint16 royaltyBps) internal returns (uint256 lotId) {
        vm.prank(winery);
        lotId = token.createLot(
            IWineLotToken.WineLotInput({
                totalBottles: totalBottles,
                vintage: 2024,
                royaltyBps: royaltyBps,
                bottleSizeMl: 750,
                exportAllowed: true,
                name: "Chateau Palissage Rouge",
                region: "Bordeaux AOC",
                grapes: "Merlot 60%, Cabernet Sauvignon 40%",
                metadataURI: "ipfs://lot-metadata"
            })
        );
        vm.prank(verifier);
        token.verifyLot(lotId, keccak256("docs"));
    }

    function _fundAndApprove(address account, uint256 amount, address spender) internal {
        eurc.mint(account, amount);
        vm.prank(account);
        eurc.approve(spender, amount);
    }
}
