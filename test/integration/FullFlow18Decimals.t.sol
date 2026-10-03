// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Fixtures} from "../utils/Fixtures.sol";
import {TestEURe} from "../../src/testing/TestEURe.sol";
import {PrimaryMarket} from "../../src/market/PrimaryMarket.sol";
import {IWineLotToken} from "../../src/interfaces/IWineLotToken.sol";

/// @dev The demonstration scenario end to end on the 18-decimal payment token actually deployed
///      to the testnet, with the exact figures the interface shows (chain-mvp 03 §4.3, 08 §5).
///      The existing suites cover the 6-decimal mock; this one proves the arithmetic the public
///      run will produce.
contract FullFlow18DecimalsTest is Fixtures {
    TestEURe internal teure;

    uint256 internal constant PRICE = 8.4e18; // 8.40 tEURe per bottle
    uint256 internal constant RESALE_PRICE = 9.2e18;
    uint32 internal constant LOT_BOTTLES = 2_400;
    uint32 internal constant RESERVED = 120;
    uint32 internal constant RESOLD = 24;
    uint32 internal constant REDEEMED = 60;

    function setUp() public override {
        vm.chainId(421614);
        super.setUp();
        teure = new TestEURe(admin);

        vm.startPrank(admin);
        primaryMarket.setPaymentTokenAllowed(address(teure), true);
        secondaryMarket.setPaymentTokenAllowed(address(teure), true);
        vm.stopPrank();
    }

    function _fund(address account, uint256 amount, address spender) internal {
        vm.prank(admin);
        teure.mint(account, amount);
        vm.prank(account);
        teure.approve(spender, amount);
    }

    function test_DemonstrationScenarioArithmetic() public {
        assertEq(teure.decimals(), 18);

        // 1. Verified En Primeur lot with the seed royalty.
        uint256 lotId = _createVerifiedLot(LOT_BOTTLES, 250);

        vm.prank(winery);
        uint256 offerId = primaryMarket.createOffer(
            lotId,
            address(teure),
            PRICE,
            LOT_BOTTLES,
            uint64(block.timestamp),
            uint64(block.timestamp + 30 days),
            3000, // 30% deposit
            uint64(block.timestamp + 60 days),
            PrimaryMarket.OfferKind.EnPrimeur
        );

        // One explicit final milestone, as every seed offer has.
        uint16[] memory bps = new uint16[](1);
        bps[0] = 10000;
        string[] memory descriptions = new string[](1);
        descriptions[0] = "Final release on delivery readiness";
        vm.prank(winery);
        primaryMarket.setMilestones(offerId, bps, descriptions);

        // 2. Deposit reservation: 120 x 8.40 = 1008, deposit 302.40, remainder 705.60.
        uint256 total = uint256(RESERVED) * PRICE;
        uint256 deposit = (total * 3000) / 10000;
        assertEq(total, 1008e18);
        assertEq(deposit, 302.4e18);

        _fund(buyer, total, address(primaryMarket));
        vm.prank(buyer);
        uint256 allocationId = primaryMarket.reserve(offerId, RESERVED, deposit);

        (,,,, uint256 totalDue, uint256 paid,, PrimaryMarket.AllocationState state) =
            primaryMarket.allocations(allocationId);
        assertEq(uint8(state), uint8(PrimaryMarket.AllocationState.Reserved));
        assertEq(totalDue, 1008e18);
        assertEq(paid, deposit);
        assertEq(token.balanceOf(buyer, lotId), 0); // no bottles before full payment
        assertEq(primaryMarket.settledFunds(offerId), 302.4e18);
        assertEq(primaryMarket.withdrawable(offerId), 0);

        // 3. Remainder settles the allocation and mints exactly once.
        vm.prank(buyer);
        primaryMarket.payRemainder(allocationId, total - deposit);
        (,,,,, paid,, state) = primaryMarket.allocations(allocationId);
        assertEq(uint8(state), uint8(PrimaryMarket.AllocationState.Paid));
        assertEq(paid, 1008e18);
        assertEq(token.balanceOf(buyer, lotId), RESERVED);
        assertEq(token.getLot(lotId).mintedBottles, RESERVED);
        assertEq(primaryMarket.settledFunds(offerId), 1008e18);

        // 4. Resale of 24 bottles: gross 220.80, fee at the contract's own rate, royalty 5.52.
        vm.prank(buyer);
        token.setApprovalForAll(address(secondaryMarket), true);
        vm.prank(buyer);
        uint256 listingId = secondaryMarket.list(lotId, RESOLD, RESALE_PRICE, address(teure));

        uint256 gross = uint256(RESOLD) * RESALE_PRICE;
        assertEq(gross, 220.8e18);
        // The demo mode shows 300 bps; the contract's own value decides here (decision D-10).
        uint256 fee = (gross * secondaryMarket.secondaryFeeBps()) / 10000;
        uint256 royalty = (gross * 250) / 10000;
        assertEq(royalty, 5.52e18);
        assertEq(secondaryMarket.secondaryFeeBps(), 200);
        assertEq(fee, 4.416e18);
        assertEq(gross - fee - royalty, 210.864e18); // seller net at the testnet fee

        _fund(buyer2, gross, address(secondaryMarket));
        uint256 wineryBefore = teure.balanceOf(winery);
        vm.prank(buyer2);
        secondaryMarket.buy(listingId, RESOLD, RESALE_PRICE, block.timestamp);

        assertEq(teure.balanceOf(treasury), fee);
        assertEq(teure.balanceOf(winery) - wineryBefore, royalty);
        assertEq(teure.balanceOf(buyer), gross - fee - royalty);
        assertEq(token.balanceOf(buyer, lotId), 96);
        assertEq(token.balanceOf(buyer2, lotId), RESOLD);

        // 5. Readiness, then the single milestone releases the whole primary escrow.
        vm.prank(winery);
        token.setProductionStatus(lotId, IWineLotToken.ProductionStatus.ReadyForDelivery);

        vm.prank(verifier);
        primaryMarket.confirmMilestone(offerId, 0);
        assertEq(primaryMarket.releasedBps(offerId), 10000);
        assertEq(primaryMarket.withdrawable(offerId), 1008e18);
        // Confirmed is not paid: the money has not moved yet.
        assertEq(primaryMarket.withdrawnGross(offerId), 0);

        uint256 treasuryBeforeWithdraw = teure.balanceOf(treasury);
        uint256 wineryBeforeWithdraw = teure.balanceOf(winery);
        vm.prank(winery);
        primaryMarket.withdrawReleased(offerId);

        assertEq(teure.balanceOf(treasury) - treasuryBeforeWithdraw, 30.24e18); // 3% of 1008
        assertEq(teure.balanceOf(winery) - wineryBeforeWithdraw, 977.76e18);
        assertEq(primaryMarket.withdrawnGross(offerId), 1008e18);
        assertEq(primaryMarket.withdrawable(offerId), 0);

        // Royalty and primary payout are two different incomes of the same winery.
        assertEq(teure.balanceOf(winery), 983.28e18);
        assertEq(teure.balanceOf(treasury), 34.656e18);

        // 6. Redemption of 60 bottles: escrow, shipment, then burn on confirmation.
        vm.prank(buyer);
        token.setApprovalForAll(address(redemptionManager), true);
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, REDEEMED, keccak256("delivery"));

        assertEq(token.balanceOf(buyer, lotId), 36);
        assertEq(token.balanceOf(address(redemptionManager), lotId), REDEEMED);
        assertEq(token.totalSupply(lotId), RESERVED); // escrow does not burn

        vm.prank(winery);
        redemptionManager.markShipped(redemptionId, keccak256("shipment"));
        assertEq(token.totalSupply(lotId), RESERVED);
        assertEq(token.getLot(lotId).mintedBottles, RESERVED);

        vm.prank(buyer);
        redemptionManager.confirmDelivery(redemptionId);

        assertEq(token.balanceOf(buyer, lotId), 36);
        assertEq(token.balanceOf(buyer2, lotId), RESOLD);
        assertEq(token.balanceOf(address(redemptionManager), lotId), 0);
        assertEq(token.getLot(lotId).redeemedBottles, REDEEMED);
        assertEq(token.totalSupply(lotId), 60);
        // Redeeming never returns lifetime mint capacity.
        assertEq(token.getLot(lotId).mintedBottles, RESERVED);
        assertEq(
            token.totalSupply(lotId), uint256(token.getLot(lotId).mintedBottles) - token.getLot(lotId).redeemedBottles
        );
    }
}
