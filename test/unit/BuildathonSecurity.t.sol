// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Fixtures} from "../utils/Fixtures.sol";
import {ClaimIssuer} from "../../src/identity/ClaimIssuer.sol";
import {IIdentity} from "../../src/interfaces/IIdentity.sol";
import {PrimaryMarket} from "../../src/market/PrimaryMarket.sol";
import {SecondaryMarket} from "../../src/market/SecondaryMarket.sol";
import {ClaimTopicsLib} from "../../src/libraries/ClaimTopicsLib.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TaxedPaymentToken is ERC20 {
    constructor() ERC20("Taxed test asset", "TAX") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 tax = value / 10;
            super._update(from, address(0), tax);
            super._update(from, to, value - tax);
        } else {
            super._update(from, to, value);
        }
    }
}

contract BuildathonSecurityTest is Fixtures {
    function _offer(address asset, uint256 price, uint16 deposit) internal returns (uint256 id) {
        uint256 lotId = _createVerifiedLot(100, 250);
        vm.prank(winery);
        id = primaryMarket.createOffer(
            lotId,
            asset,
            price,
            100,
            uint64(block.timestamp),
            uint64(block.timestamp + 1 days),
            deposit,
            uint64(block.timestamp + 2 days),
            PrimaryMarket.OfferKind.Standard
        );
    }

    function test_ClaimCannotReplayOnOtherChain() public {
        bytes memory signature = _signClaim(address(identities[buyer]), ClaimTopicsLib.TOPIC_KYC, "");
        assertTrue(claimIssuer.isClaimValid(identities[buyer], ClaimTopicsLib.TOPIC_KYC, signature, ""));
        vm.chainId(block.chainid + 1);
        assertFalse(claimIssuer.isClaimValid(identities[buyer], ClaimTopicsLib.TOPIC_KYC, signature, ""));
    }

    function test_ClaimCannotReplayAtAnotherIssuer() public {
        bytes memory signature = _signClaim(address(identities[buyer]), ClaimTopicsLib.TOPIC_KYC, "");
        ClaimIssuer other = new ClaimIssuer(issuerOwner);
        vm.prank(issuerOwner);
        other.addKey(keccak256(abi.encode(claimSigner)), ClaimTopicsLib.PURPOSE_CLAIM, ClaimTopicsLib.KEY_TYPE_ECDSA);
        assertFalse(other.isClaimValid(identities[buyer], ClaimTopicsLib.TOPIC_KYC, signature, ""));
    }

    function test_DepositCannotRoundDownToZero() public {
        uint256 id = _offer(address(eurc), 1, 5000);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(PrimaryMarket.PaymentBelowDeposit.selector, id, 0, 1));
        primaryMarket.reserve(id, 1, 0);
        assertEq(primaryMarket.allocationCount(), 0);
    }

    function test_DelistingStopsNewReservationsButPreservesRefunds() public {
        uint256 id = _offer(address(eurc), 100, 5000);
        _fundAndApprove(buyer, 100, address(primaryMarket));
        vm.prank(buyer);
        uint256 allocation = primaryMarket.reserve(id, 1, 50);
        vm.prank(admin);
        primaryMarket.setPaymentTokenAllowed(address(eurc), false);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(PrimaryMarket.PaymentTokenNotAllowed.selector, address(eurc)));
        primaryMarket.reserve(id, 1, 50);
        vm.prank(winery);
        primaryMarket.cancelAllocation(allocation);
        assertEq(eurc.balanceOf(buyer), 100);
    }

    function test_DelistingStopsRemainderPayments() public {
        uint256 id = _offer(address(eurc), 100, 5000);
        _fundAndApprove(buyer, 100, address(primaryMarket));
        vm.prank(buyer);
        uint256 allocation = primaryMarket.reserve(id, 1, 50);
        vm.prank(admin);
        primaryMarket.setPaymentTokenAllowed(address(eurc), false);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(PrimaryMarket.PaymentTokenNotAllowed.selector, address(eurc)));
        primaryMarket.payRemainder(allocation, 50);
    }

    function test_DelistingStopsExistingSecondaryListings() public {
        uint256 id = _offer(address(eurc), 100, 0);
        _fundAndApprove(buyer, 100, address(primaryMarket));
        vm.prank(buyer);
        primaryMarket.reserve(id, 1, 100);
        (uint256 lotId,,,,,,,,,,,) = primaryMarket.offers(id);
        vm.startPrank(buyer);
        token.setApprovalForAll(address(secondaryMarket), true);
        uint256 listing = secondaryMarket.list(lotId, 1, 100, address(eurc));
        vm.stopPrank();
        _fundAndApprove(buyer2, 100, address(secondaryMarket));
        vm.prank(admin);
        secondaryMarket.setPaymentTokenAllowed(address(eurc), false);
        vm.prank(buyer2);
        vm.expectRevert(abi.encodeWithSelector(SecondaryMarket.PaymentTokenNotAllowed.selector, address(eurc)));
        secondaryMarket.buy(listing, 1, 100, block.timestamp + 1 hours);
    }

    function test_TaxedPaymentCannotCreateUnbackedEscrow() public {
        TaxedPaymentToken asset = new TaxedPaymentToken();
        vm.prank(admin);
        primaryMarket.setPaymentTokenAllowed(address(asset), true);
        uint256 id = _offer(address(asset), 100, 0);
        asset.mint(buyer, 100);
        vm.prank(buyer);
        asset.approve(address(primaryMarket), 100);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("PaymentAmountMismatch(uint256,uint256)")), 100, 90));
        primaryMarket.reserve(id, 1, 100);
        assertEq(primaryMarket.settledFunds(id), 0);
        assertEq(primaryMarket.allocationCount(), 0);
        assertEq(asset.balanceOf(buyer), 100);
    }
}
