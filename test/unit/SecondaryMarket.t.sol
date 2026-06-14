// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Fixtures} from "../utils/Fixtures.sol";
import {SecondaryMarket} from "../../src/market/SecondaryMarket.sol";
import {PrimaryMarket} from "../../src/market/PrimaryMarket.sol";
import {IWineLotToken} from "../../src/interfaces/IWineLotToken.sol";

contract SecondaryMarketTest is Fixtures {
    uint256 internal lotId;
    uint256 internal constant PRIMARY_PRICE = 7_200_000;
    uint256 internal constant RESALE_PRICE = 8_000_000;

    function setUp() public override {
        super.setUp();
        lotId = _createVerifiedLot(1_000, 250); // 2.5% royalty

        // buyer acquires 100 bottles on the primary market
        vm.prank(winery);
        uint256 offerId = primaryMarket.createOffer(
            lotId,
            address(eurc),
            PRIMARY_PRICE,
            1_000,
            uint64(block.timestamp),
            uint64(block.timestamp + 30 days),
            0,
            uint64(block.timestamp + 60 days),
            PrimaryMarket.OfferKind.Standard
        );
        _fundAndApprove(buyer, 100 * PRIMARY_PRICE, address(primaryMarket));
        vm.prank(buyer);
        primaryMarket.reserve(offerId, 100, 100 * PRIMARY_PRICE);
    }

    function _list(uint32 qty) internal returns (uint256 listingId) {
        vm.prank(buyer);
        token.setApprovalForAll(address(secondaryMarket), true);
        vm.prank(buyer);
        listingId = secondaryMarket.list(lotId, qty, RESALE_PRICE, address(eurc));
    }

    function test_List_RevertsForUnverifiedSeller() public {
        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(SecondaryMarket.SellerNotVerified.selector, outsider));
        secondaryMarket.list(lotId, 1, RESALE_PRICE, address(eurc));
    }

    function test_List_RevertsWithoutBalance() public {
        vm.prank(buyer2);
        vm.expectRevert(abi.encodeWithSelector(SecondaryMarket.InsufficientSellerBalance.selector, 0));
        secondaryMarket.list(lotId, 1, RESALE_PRICE, address(eurc));
    }

    function test_Buy_SplitsFeeRoyaltyAndProceeds() public {
        uint256 listingId = _list(50);

        uint256 total = 50 * RESALE_PRICE; // 400 EURe
        _fundAndApprove(buyer2, total, address(secondaryMarket));

        uint256 wineryBalanceBefore = eurc.balanceOf(winery);
        vm.prank(buyer2);
        secondaryMarket.buy(listingId, 50, RESALE_PRICE, block.timestamp);

        uint256 fee = (total * 200) / 10000; // 2%
        uint256 royalty = (total * 250) / 10000; // 2.5%
        assertEq(eurc.balanceOf(treasury), fee);
        assertEq(eurc.balanceOf(winery) - wineryBalanceBefore, royalty);
        assertEq(eurc.balanceOf(buyer), total - fee - royalty);

        assertEq(token.balanceOf(buyer, lotId), 50);
        assertEq(token.balanceOf(buyer2, lotId), 50);
    }

    function test_Buy_PartialThenSoldOut() public {
        uint256 listingId = _list(50);
        _fundAndApprove(buyer2, 50 * RESALE_PRICE, address(secondaryMarket));

        vm.prank(buyer2);
        secondaryMarket.buy(listingId, 20, RESALE_PRICE, block.timestamp);
        (,, uint32 remaining,,, bool active) = secondaryMarket.listings(listingId);
        assertEq(remaining, 30);
        assertTrue(active);

        vm.prank(buyer2);
        secondaryMarket.buy(listingId, 30, RESALE_PRICE, block.timestamp);
        (,, remaining,,, active) = secondaryMarket.listings(listingId);
        assertEq(remaining, 0);
        assertFalse(active);
    }

    function test_Buy_RevertsForNonB2BBuyer() public {
        uint256 listingId = _list(10);
        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(SecondaryMarket.NotBuyer.selector, outsider));
        secondaryMarket.buy(listingId, 1, RESALE_PRICE, block.timestamp);
    }

    function test_Buy_RevertsWhenSellerBalanceGone() public {
        uint256 listingId = _list(100);

        // Seller redeems everything: listing becomes unbackable.
        vm.prank(winery);
        token.setProductionStatus(lotId, IWineLotToken.ProductionStatus.ReadyForDelivery);
        vm.startPrank(buyer);
        token.setApprovalForAll(address(redemptionManager), true);
        redemptionManager.requestRedemption(lotId, 100, keccak256("delivery"));
        vm.stopPrank();

        _fundAndApprove(buyer2, RESALE_PRICE, address(secondaryMarket));
        vm.prank(buyer2);
        vm.expectRevert(abi.encodeWithSelector(SecondaryMarket.InsufficientSellerBalance.selector, listingId));
        secondaryMarket.buy(listingId, 1, RESALE_PRICE, block.timestamp);
    }

    function test_Buy_RevertsWhenSellerFrontRunsPriceHike() public {
        uint256 listingId = _list(1);

        // Buyer approves a large allowance expecting to pay RESALE_PRICE.
        _fundAndApprove(buyer2, 10_000 * RESALE_PRICE, address(secondaryMarket));

        // Seller front-runs with an inflated price.
        uint256 inflated = 10_000 * RESALE_PRICE;
        vm.prank(buyer);
        secondaryMarket.updateListingPrice(listingId, inflated);

        // Buyer's slippage bound (RESALE_PRICE) protects them: the call reverts.
        vm.prank(buyer2);
        vm.expectRevert(
            abi.encodeWithSelector(SecondaryMarket.PriceExceedsLimit.selector, listingId, inflated, RESALE_PRICE)
        );
        secondaryMarket.buy(listingId, 1, RESALE_PRICE, block.timestamp);
    }

    function test_Buy_RevertsAfterDeadline() public {
        uint256 listingId = _list(1);
        _fundAndApprove(buyer2, RESALE_PRICE, address(secondaryMarket));

        vm.warp(1_000_000);
        uint256 deadline = 999_999; // already in the past

        vm.prank(buyer2);
        vm.expectRevert(abi.encodeWithSelector(SecondaryMarket.DeadlineExpired.selector, deadline));
        secondaryMarket.buy(listingId, 1, RESALE_PRICE, deadline);
    }

    function test_CancelListing() public {
        uint256 listingId = _list(10);
        vm.prank(buyer);
        secondaryMarket.cancelListing(listingId);

        _fundAndApprove(buyer2, RESALE_PRICE, address(secondaryMarket));
        vm.prank(buyer2);
        vm.expectRevert(abi.encodeWithSelector(SecondaryMarket.ListingNotActive.selector, listingId));
        secondaryMarket.buy(listingId, 1, RESALE_PRICE, block.timestamp);
    }
}
