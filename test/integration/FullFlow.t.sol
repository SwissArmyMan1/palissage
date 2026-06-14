// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Fixtures} from "../utils/Fixtures.sol";
import {PrimaryMarket} from "../../src/market/PrimaryMarket.sol";
import {IWineLotToken} from "../../src/interfaces/IWineLotToken.sol";

/// @dev End-to-end En Primeur scenario:
///      onboarding → lot → verification → En Primeur offer with milestones →
///      deposit reservation → remainder → mint → milestone releases →
///      secondary resale with fee + royalty → redemption → burn.
contract FullFlowTest is Fixtures {
    uint256 internal constant EN_PRIMEUR_PRICE = 6_500_000; // 6.50 EURe, pre-bottling discount
    uint256 internal constant RESALE_PRICE = 8_500_000;

    function test_EnPrimeurFullLifecycle() public {
        // 1. Winery creates a lot, verifier confirms it.
        uint256 lotId = _createVerifiedLot(10_000, 250);

        // 2. En Primeur offer (future harvest) with a 3-stage escrow release plan.
        vm.prank(winery);
        uint256 offerId = primaryMarket.createOffer(
            lotId,
            address(eurc),
            EN_PRIMEUR_PRICE,
            6_000,
            uint64(block.timestamp),
            uint64(block.timestamp + 90 days),
            2000, // 20% minimum deposit
            uint64(block.timestamp + 180 days),
            PrimaryMarket.OfferKind.EnPrimeur
        );

        uint16[] memory bps = new uint16[](3);
        bps[0] = 3000;
        bps[1] = 4000;
        bps[2] = 3000;
        string[] memory descriptions = new string[](3);
        descriptions[0] = "harvest confirmed";
        descriptions[1] = "bottling confirmed";
        descriptions[2] = "ready for delivery";
        vm.prank(winery);
        primaryMarket.setMilestones(offerId, bps, descriptions);

        // 3. Buyer reserves 600 bottles with a 30% prepayment (early winery liquidity).
        uint256 total = 600 * EN_PRIMEUR_PRICE;
        uint256 deposit = (total * 3000) / 10000;
        _fundAndApprove(buyer, total, address(primaryMarket));
        vm.prank(buyer);
        uint256 allocationId = primaryMarket.reserve(offerId, 600, deposit);
        assertEq(token.balanceOf(buyer, lotId), 0); // receipt only, no tokens yet

        // 4. Harvest confirmed → winery withdraws 30% of what has been paid so far.
        vm.prank(verifier);
        primaryMarket.confirmMilestone(offerId, 0);
        vm.prank(winery);
        primaryMarket.withdrawReleased(offerId);
        uint256 expectedGross1 = (deposit * 3000) / 10000;
        uint256 expectedFee1 = (expectedGross1 * 300) / 10000;
        assertEq(eurc.balanceOf(winery), expectedGross1 - expectedFee1);

        // 5. Buyer settles the remainder → ERC-7943 tokens are minted.
        vm.prank(buyer);
        primaryMarket.payRemainder(allocationId, total - deposit);
        assertEq(token.balanceOf(buyer, lotId), 600);

        // 6. Production progresses; remaining milestones release the rest of the escrow.
        vm.startPrank(winery);
        token.setProductionStatus(lotId, IWineLotToken.ProductionStatus.Harvested);
        token.setProductionStatus(lotId, IWineLotToken.ProductionStatus.Bottled);
        vm.stopPrank();

        vm.startPrank(verifier);
        primaryMarket.confirmMilestone(offerId, 1);
        primaryMarket.confirmMilestone(offerId, 2);
        vm.stopPrank();
        vm.prank(winery);
        primaryMarket.withdrawReleased(offerId);

        uint256 totalProtocolFeePrimary = eurc.balanceOf(treasury);
        // Winery received the full settlement minus the protocol fee.
        assertEq(eurc.balanceOf(winery) + totalProtocolFeePrimary, total);
        assertEq(eurc.balanceOf(address(primaryMarket)), 0);

        // 7. Buyer resells 200 bottles to buyer2 on the whitelisted secondary market.
        vm.startPrank(buyer);
        token.setApprovalForAll(address(secondaryMarket), true);
        uint256 listingId = secondaryMarket.list(lotId, 200, RESALE_PRICE, address(eurc));
        vm.stopPrank();

        uint256 resaleTotal = 200 * RESALE_PRICE;
        _fundAndApprove(buyer2, resaleTotal, address(secondaryMarket));
        uint256 wineryBefore = eurc.balanceOf(winery);
        vm.prank(buyer2);
        secondaryMarket.buy(listingId, 200, RESALE_PRICE, block.timestamp);

        uint256 resaleFee = (resaleTotal * 200) / 10000;
        uint256 royalty = (resaleTotal * 250) / 10000;
        assertEq(eurc.balanceOf(winery) - wineryBefore, royalty); // winery participation fee
        assertEq(eurc.balanceOf(treasury), totalProtocolFeePrimary + resaleFee);
        assertEq(token.balanceOf(buyer2, lotId), 200);

        // 8. Wine is ready → buyer2 redeems 200 bottles for physical delivery.
        vm.prank(winery);
        token.setProductionStatus(lotId, IWineLotToken.ProductionStatus.ReadyForDelivery);

        vm.startPrank(buyer2);
        token.setApprovalForAll(address(redemptionManager), true);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 200, keccak256("delivery-to-DE"));
        vm.stopPrank();

        vm.prank(winery);
        redemptionManager.markShipped(redemptionId, keccak256("export-docs"));
        vm.prank(buyer2);
        redemptionManager.confirmDelivery(redemptionId);

        // 9. Transparent lot history: minted / redeemed / outstanding.
        IWineLotToken.WineLot memory lot = token.getLot(lotId);
        assertEq(lot.mintedBottles, 600);
        assertEq(lot.redeemedBottles, 200);
        assertEq(token.totalSupply(lotId), 400);
        assertEq(lot.mintedBottles - lot.redeemedBottles, token.totalSupply(lotId));
        assertEq(token.balanceOf(buyer, lotId), 400);
        assertEq(token.balanceOf(buyer2, lotId), 0);
    }
}
