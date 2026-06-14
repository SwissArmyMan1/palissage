// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Fixtures} from "../utils/Fixtures.sol";
import {PrimaryMarket} from "../../src/market/PrimaryMarket.sol";

contract PrimaryMarketTest is Fixtures {
    uint256 internal lotId;
    uint256 internal constant PRICE = 7_200_000; // 7.20 EURe (6 decimals)

    function setUp() public override {
        super.setUp();
        lotId = _createVerifiedLot(10_000, 250);
    }

    function _createOffer(uint32 qty, uint16 depositBps) internal returns (uint256 offerId) {
        vm.prank(winery);
        offerId = primaryMarket.createOffer(
            lotId,
            address(eurc),
            PRICE,
            qty,
            uint64(block.timestamp),
            uint64(block.timestamp + 30 days),
            depositBps,
            uint64(block.timestamp + 60 days),
            PrimaryMarket.OfferKind.Standard
        );
    }

    // ---------------------------------------------------------------- offers

    function test_CreateOffer_RevertsForNonWinery() public {
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(PrimaryMarket.NotWinery.selector, buyer));
        primaryMarket.createOffer(
            lotId, address(eurc), PRICE, 100, 0, 1, 0, 1, PrimaryMarket.OfferKind.Standard
        );
    }

    function test_CreateOffer_RevertsOnOversell() public {
        _createOffer(9_000, 0);
        vm.prank(winery);
        vm.expectRevert(
            abi.encodeWithSelector(PrimaryMarket.OfferQuantityExceedsLot.selector, lotId, 2_000, 1_000)
        );
        primaryMarket.createOffer(
            lotId,
            address(eurc),
            PRICE,
            2_000,
            uint64(block.timestamp),
            uint64(block.timestamp + 30 days),
            0,
            uint64(block.timestamp + 60 days),
            PrimaryMarket.OfferKind.Standard
        );
    }

    function test_CreateOffer_RevertsForDisallowedPaymentToken() public {
        vm.prank(winery);
        vm.expectRevert(abi.encodeWithSelector(PrimaryMarket.PaymentTokenNotAllowed.selector, address(1)));
        primaryMarket.createOffer(
            lotId,
            address(1),
            PRICE,
            100,
            uint64(block.timestamp),
            uint64(block.timestamp + 30 days),
            0,
            uint64(block.timestamp + 60 days),
            PrimaryMarket.OfferKind.Standard
        );
    }

    // ----------------------------------------------------- full payment flow

    function test_Reserve_FullPayment_MintsTokens() public {
        uint256 offerId = _createOffer(1_000, 0);
        uint256 total = 100 * PRICE;
        _fundAndApprove(buyer, total, address(primaryMarket));

        vm.prank(buyer);
        uint256 allocationId = primaryMarket.reserve(offerId, 100, total);

        (,,,,, uint256 paid,, PrimaryMarket.AllocationState state) = primaryMarket.allocations(allocationId);
        assertEq(uint8(state), uint8(PrimaryMarket.AllocationState.Paid));
        assertEq(paid, total);
        assertEq(token.balanceOf(buyer, lotId), 100);
        assertEq(eurc.balanceOf(address(primaryMarket)), total);
        assertEq(primaryMarket.settledFunds(offerId), total);
    }

    function test_Reserve_RevertsForNonBuyer() public {
        uint256 offerId = _createOffer(1_000, 0);
        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(PrimaryMarket.NotBuyer.selector, outsider));
        primaryMarket.reserve(offerId, 10, 10 * PRICE);
    }

    // ---------------------------------------------------------- deposit flow

    function test_Reserve_Deposit_NoTokensUntilFullPayment() public {
        uint256 offerId = _createOffer(1_000, 3000); // 30% deposit
        uint256 total = 200 * PRICE;
        uint256 deposit = (total * 3000) / 10000;
        _fundAndApprove(buyer, total, address(primaryMarket));

        vm.prank(buyer);
        uint256 allocationId = primaryMarket.reserve(offerId, 200, deposit);

        (,,,,, uint256 paid,, PrimaryMarket.AllocationState state) = primaryMarket.allocations(allocationId);
        assertEq(uint8(state), uint8(PrimaryMarket.AllocationState.Reserved));
        assertEq(paid, deposit);
        assertEq(token.balanceOf(buyer, lotId), 0);

        vm.prank(buyer);
        primaryMarket.payRemainder(allocationId, total - deposit);

        (,,,,, paid,, state) = primaryMarket.allocations(allocationId);
        assertEq(uint8(state), uint8(PrimaryMarket.AllocationState.Paid));
        assertEq(paid, total);
        assertEq(token.balanceOf(buyer, lotId), 200);
    }

    /// @dev M-02 regression: the buyer cannot settle the remainder past the full-payment deadline.
    ///      Otherwise it keeps free optionality — wait until the lot's value is known, then either
    ///      complete (front-running claimDefault) or walk away.
    function test_PayRemainder_RevertsAfterDeadline() public {
        uint256 offerId = _createOffer(1_000, 3000); // 30% deposit
        uint64 deadline = uint64(block.timestamp + 60 days);
        uint256 total = 100 * PRICE;
        uint256 deposit = (total * 3000) / 10000;
        _fundAndApprove(buyer, total, address(primaryMarket));
        vm.prank(buyer);
        uint256 allocationId = primaryMarket.reserve(offerId, 100, deposit);

        vm.warp(deadline + 1);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(PrimaryMarket.PaymentDeadlinePassed.selector, allocationId, deadline));
        primaryMarket.payRemainder(allocationId, total - deposit);
    }

    /// @dev M-02 boundary: settling exactly at the deadline is still allowed.
    function test_PayRemainder_AllowedAtDeadline() public {
        uint256 offerId = _createOffer(1_000, 3000);
        uint64 deadline = uint64(block.timestamp + 60 days);
        uint256 total = 100 * PRICE;
        uint256 deposit = (total * 3000) / 10000;
        _fundAndApprove(buyer, total, address(primaryMarket));
        vm.prank(buyer);
        uint256 allocationId = primaryMarket.reserve(offerId, 100, deposit);

        vm.warp(deadline);
        vm.prank(buyer);
        primaryMarket.payRemainder(allocationId, total - deposit);
        assertEq(token.balanceOf(buyer, lotId), 100);
    }

    function test_Reserve_RevertsBelowDeposit() public {
        uint256 offerId = _createOffer(1_000, 3000);
        uint256 total = 100 * PRICE;
        uint256 minDeposit = (total * 3000) / 10000;
        _fundAndApprove(buyer, total, address(primaryMarket));

        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(PrimaryMarket.PaymentBelowDeposit.selector, offerId, minDeposit - 1, minDeposit)
        );
        primaryMarket.reserve(offerId, 100, minDeposit - 1);
    }

    function test_Reserve_RevertsWhenDepositsDisabled() public {
        uint256 offerId = _createOffer(1_000, 0);
        _fundAndApprove(buyer, 100 * PRICE, address(primaryMarket));
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(PrimaryMarket.DepositsDisabled.selector, offerId));
        primaryMarket.reserve(offerId, 100, PRICE); // partial payment
    }

    // ------------------------------------------------------------ milestones

    function test_SetMilestones_RevertsOnBadSum() public {
        uint256 offerId = _createOffer(1_000, 0);
        uint16[] memory bps = new uint16[](2);
        bps[0] = 5000;
        bps[1] = 4000;
        string[] memory descriptions = new string[](2);
        descriptions[0] = "harvest";
        descriptions[1] = "bottled";

        vm.prank(winery);
        vm.expectRevert(abi.encodeWithSelector(PrimaryMarket.MilestoneBpsSumInvalid.selector, 9000));
        primaryMarket.setMilestones(offerId, bps, descriptions);
    }

    function test_MilestoneReleaseWithProtocolFee() public {
        uint256 offerId = _createOffer(1_000, 0);

        uint16[] memory bps = new uint16[](2);
        bps[0] = 6000;
        bps[1] = 4000;
        string[] memory descriptions = new string[](2);
        descriptions[0] = "bottled";
        descriptions[1] = "ready";
        vm.prank(winery);
        primaryMarket.setMilestones(offerId, bps, descriptions);

        uint256 total = 1_000 * PRICE; // 7_200_000_000
        _fundAndApprove(buyer, total, address(primaryMarket));
        vm.prank(buyer);
        primaryMarket.reserve(offerId, 1_000, total);

        // Nothing withdrawable before confirmation.
        vm.prank(winery);
        vm.expectRevert(abi.encodeWithSelector(PrimaryMarket.NothingToWithdraw.selector, offerId));
        primaryMarket.withdrawReleased(offerId);

        vm.prank(verifier);
        primaryMarket.confirmMilestone(offerId, 0);
        assertEq(primaryMarket.withdrawable(offerId), (total * 6000) / 10000);

        vm.prank(winery);
        primaryMarket.withdrawReleased(offerId);

        uint256 gross = (total * 6000) / 10000;
        uint256 fee = (gross * 300) / 10000; // 3%
        assertEq(eurc.balanceOf(treasury), fee);
        assertEq(eurc.balanceOf(winery), gross - fee);

        // Second milestone releases the remainder.
        vm.prank(verifier);
        primaryMarket.confirmMilestone(offerId, 1);
        vm.prank(winery);
        primaryMarket.withdrawReleased(offerId);

        uint256 totalFee = (gross * 300) / 10000 + ((total - gross) * 300) / 10000;
        assertEq(eurc.balanceOf(treasury), totalFee);
        assertEq(eurc.balanceOf(winery), total - totalFee);
        assertEq(eurc.balanceOf(address(primaryMarket)), 0);
    }

    function test_ConfirmMilestone_OnlyVerifier() public {
        uint256 offerId = _createOffer(1_000, 0);
        _fundAndApprove(buyer, PRICE, address(primaryMarket));
        vm.prank(buyer);
        primaryMarket.reserve(offerId, 1, PRICE);

        vm.prank(winery);
        vm.expectRevert();
        primaryMarket.confirmMilestone(offerId, 0);
    }

    // ------------------------------------------------------- cancel / default

    function test_CancelAllocation_RefundsBuyer() public {
        uint256 offerId = _createOffer(1_000, 3000);
        uint256 total = 100 * PRICE;
        uint256 deposit = (total * 3000) / 10000;
        _fundAndApprove(buyer, deposit, address(primaryMarket));

        vm.prank(buyer);
        uint256 allocationId = primaryMarket.reserve(offerId, 100, deposit);

        vm.prank(winery);
        primaryMarket.cancelAllocation(allocationId);

        assertEq(eurc.balanceOf(buyer), deposit);
        assertEq(primaryMarket.settledFunds(offerId), 0);
        (,,,,,,, PrimaryMarket.AllocationState state) = primaryMarket.allocations(allocationId);
        assertEq(uint8(state), uint8(PrimaryMarket.AllocationState.Cancelled));
    }

    function test_CancelAllocation_RevertsAfterFundsReleased() public {
        uint256 offerId = _createOffer(1_000, 3000);
        uint256 total = 100 * PRICE;
        uint256 deposit = (total * 3000) / 10000;
        _fundAndApprove(buyer, deposit, address(primaryMarket));
        vm.prank(buyer);
        uint256 allocationId = primaryMarket.reserve(offerId, 100, deposit);

        // Default single 100% milestone confirmed and fully withdrawn.
        vm.prank(verifier);
        primaryMarket.confirmMilestone(offerId, 0);
        vm.prank(winery);
        primaryMarket.withdrawReleased(offerId);

        vm.prank(winery);
        vm.expectRevert(abi.encodeWithSelector(PrimaryMarket.RefundExceedsUnreleasedEscrow.selector, allocationId));
        primaryMarket.cancelAllocation(allocationId);
    }

    function test_ClaimDefault_ForfeitsDepositWithFee() public {
        uint256 offerId = _createOffer(1_000, 3000);
        uint256 total = 100 * PRICE;
        uint256 deposit = (total * 3000) / 10000;
        _fundAndApprove(buyer, deposit, address(primaryMarket));
        vm.prank(buyer);
        uint256 allocationId = primaryMarket.reserve(offerId, 100, deposit);

        vm.prank(winery);
        vm.expectRevert(
            abi.encodeWithSelector(
                PrimaryMarket.DeadlineNotReached.selector, allocationId, uint64(block.timestamp + 60 days)
            )
        );
        primaryMarket.claimDefault(allocationId);

        vm.warp(block.timestamp + 61 days);
        vm.prank(winery);
        primaryMarket.claimDefault(allocationId);

        uint256 fee = (deposit * 300) / 10000;
        assertEq(eurc.balanceOf(treasury), fee);
        assertEq(eurc.balanceOf(winery), deposit - fee);

        // Bottles return to the offer.
        (,,,,, uint32 reserved,,,,,,) = primaryMarket.offers(offerId);
        assertEq(reserved, 0);
    }

    /// @dev H-01 regression: a deposit that was already released to the winery via a
    ///      milestone withdrawal must not be paid out a second time on default, which
    ///      previously drained the escrow of unrelated offers sharing the payment token.
    function test_ClaimDefault_DoesNotDoublePayReleasedDeposit() public {
        // Offer A: buyer reserves with a 30% deposit.
        uint256 offerA = _createOffer(1_000, 3000);
        uint256 totalA = 100 * PRICE;
        uint256 depositA = (totalA * 3000) / 10000;
        _fundAndApprove(buyer, depositA, address(primaryMarket));
        vm.prank(buyer);
        uint256 allocA = primaryMarket.reserve(offerA, 100, depositA);

        // Offer B (same winery/token): buyer2's deposit sits in escrow untouched.
        uint256 offerB = _createOffer(1_000, 3000);
        uint256 depositB = depositA;
        _fundAndApprove(buyer2, depositB, address(primaryMarket));
        vm.prank(buyer2);
        uint256 allocB = primaryMarket.reserve(offerB, 100, depositB);

        // The winery releases and withdraws offer A's deposit (default 100% milestone).
        vm.prank(verifier);
        primaryMarket.confirmMilestone(offerA, 0);
        vm.prank(winery);
        primaryMarket.withdrawReleased(offerA);

        uint256 feeWithdraw = (depositA * 300) / 10000;
        assertEq(eurc.balanceOf(winery), depositA - feeWithdraw, "winery got the released deposit");
        // Only offer B's deposit remains escrowed in the market.
        assertEq(eurc.balanceOf(address(primaryMarket)), depositB, "only B escrow remains");

        // Buyer defaults; winery claims the default after the deadline.
        vm.warp(block.timestamp + 61 days);
        vm.prank(winery);
        primaryMarket.claimDefault(allocA);

        // The already-released deposit is NOT paid again: the winery's balance is
        // unchanged and offer B's escrow is fully intact.
        assertEq(eurc.balanceOf(winery), depositA - feeWithdraw, "no double payment to winery");
        assertEq(eurc.balanceOf(address(primaryMarket)), depositB, "offer B escrow untouched");

        // Accounting stays consistent for both offers.
        assertEq(primaryMarket.settledFunds(offerA), 0);
        assertEq(primaryMarket.withdrawnGross(offerA), 0);
        assertEq(primaryMarket.settledFunds(offerB), depositB);

        // buyer2 can still be fully refunded from offer B.
        vm.prank(winery);
        primaryMarket.cancelAllocation(allocB);
        assertEq(eurc.balanceOf(buyer2), depositB, "buyer2 refundable in full");
        assertEq(eurc.balanceOf(address(primaryMarket)), 0);
    }

    /// @dev M-02 regression: when part of a deposit was already released, the already-released
    ///      share attributed to a defaulting allocation must round UP. Rounding it down rounds the
    ///      second payout up, letting the default skim one token unit from a sibling allocation's
    ///      still-live escrow and leaving its refund underfunded. Minimal case from the finding:
    ///      two 1-unit deposits (settled = 2), 50% released and withdrawn (withdrawn = 1), then one
    ///      allocation defaults — the naive share (1*1/2 = 0) would pay the winery 1 again.
    function test_ClaimDefault_RoundsAttributedShareUp_NoSiblingDrain() public {
        // Two 1-bottle allocations at price 2, each paying a 1-unit (50%) deposit on one offer.
        vm.prank(winery);
        uint256 offerId = primaryMarket.createOffer(
            lotId,
            address(eurc),
            2, // pricePerBottle
            2, // quantity
            uint64(block.timestamp),
            uint64(block.timestamp + 30 days),
            5000, // 50% deposit
            uint64(block.timestamp + 60 days),
            PrimaryMarket.OfferKind.Standard
        );

        // Two 50% milestones so exactly half the escrow can be released.
        uint16[] memory bps = new uint16[](2);
        bps[0] = 5000;
        bps[1] = 5000;
        string[] memory descs = new string[](2);
        descs[0] = "half";
        descs[1] = "half";
        vm.prank(winery);
        primaryMarket.setMilestones(offerId, bps, descs);

        _fundAndApprove(buyer, 1, address(primaryMarket));
        vm.prank(buyer);
        uint256 allocA = primaryMarket.reserve(offerId, 1, 1); // deposit 1 of totalDue 2

        _fundAndApprove(buyer2, 1, address(primaryMarket));
        vm.prank(buyer2);
        uint256 allocB = primaryMarket.reserve(offerId, 1, 1);

        assertEq(primaryMarket.settledFunds(offerId), 2);

        // Release 50% and withdraw: entitled = 2 * 50% = 1.
        vm.prank(verifier);
        primaryMarket.confirmMilestone(offerId, 0);
        vm.prank(winery);
        primaryMarket.withdrawReleased(offerId);
        assertEq(primaryMarket.withdrawnGross(offerId), 1);
        assertEq(eurc.balanceOf(address(primaryMarket)), 1);

        uint256 wineryBalBefore = eurc.balanceOf(winery);

        // A defaults: attributed already-released share = ceil(1*1/2) = 1, so payout = 0.
        vm.warp(block.timestamp + 61 days);
        vm.prank(winery);
        primaryMarket.claimDefault(allocA);
        assertEq(eurc.balanceOf(winery), wineryBalBefore, "no extra unit skimmed on default");
        assertEq(primaryMarket.withdrawnGross(offerId), 0);
        assertEq(primaryMarket.settledFunds(offerId), 1);

        // B's escrow is intact: buyer2 is still refundable in full.
        vm.prank(winery);
        primaryMarket.cancelAllocation(allocB);
        assertEq(eurc.balanceOf(buyer2), 1, "sibling escrow fully refundable");
        assertEq(eurc.balanceOf(address(primaryMarket)), 0);
    }

    /// @dev M-01 regression: a reserved allocation that is cancelled AFTER its offer was
    ///      cancelled must release its committed bottles back to the lot. Otherwise cancelOffer
    ///      only reclaimed the unreserved bottles and the reserved share leaks out of
    ///      offeredPerLot forever, permanently shrinking what the winery can re-offer.
    function test_OfferedPerLot_ReclaimedOnCancelAllocationAfterOfferCancel() public {
        uint256 offerId = _createOffer(1_000, 3000); // 30% deposit
        uint256 deposit = (100 * PRICE * 3000) / 10000;
        _fundAndApprove(buyer, deposit, address(primaryMarket));
        vm.prank(buyer);
        uint256 allocationId = primaryMarket.reserve(offerId, 100, deposit);
        assertEq(primaryMarket.offeredPerLot(lotId), 1_000);

        // Winery cancels the offer; only the 900 unreserved bottles are reclaimed.
        vm.prank(winery);
        primaryMarket.cancelOffer(offerId);
        assertEq(primaryMarket.offeredPerLot(lotId), 100, "reserved bottles still committed");

        // Cancelling the now-orphaned reservation must reclaim the remaining 100.
        vm.prank(winery);
        primaryMarket.cancelAllocation(allocationId);
        assertEq(primaryMarket.offeredPerLot(lotId), 0, "all bottles reclaimed");

        // The winery can offer the full lot volume again.
        uint256 newOffer = _createOffer(10_000, 0);
        assertEq(primaryMarket.offeredPerLot(lotId), 10_000);
        assertGt(newOffer, 0);
    }

    /// @dev M-01 regression: same leak via the default path on a cancelled offer.
    function test_OfferedPerLot_ReclaimedOnDefaultAfterOfferCancel() public {
        uint256 offerId = _createOffer(1_000, 3000);
        uint256 deposit = (100 * PRICE * 3000) / 10000;
        _fundAndApprove(buyer, deposit, address(primaryMarket));
        vm.prank(buyer);
        uint256 allocationId = primaryMarket.reserve(offerId, 100, deposit);

        vm.prank(winery);
        primaryMarket.cancelOffer(offerId);
        assertEq(primaryMarket.offeredPerLot(lotId), 100);

        vm.warp(block.timestamp + 61 days);
        vm.prank(winery);
        primaryMarket.claimDefault(allocationId);
        assertEq(primaryMarket.offeredPerLot(lotId), 0, "bottles reclaimed on default");
    }

    /// @dev M-01: while the offer is still active, a cancelled allocation's bottles stay in
    ///      offeredPerLot because they return to the offer's pool and can be re-reserved.
    function test_OfferedPerLot_UnchangedOnCancelWhileOfferActive() public {
        uint256 offerId = _createOffer(1_000, 3000);
        uint256 deposit = (100 * PRICE * 3000) / 10000;
        _fundAndApprove(buyer, deposit, address(primaryMarket));
        vm.prank(buyer);
        uint256 allocationId = primaryMarket.reserve(offerId, 100, deposit);

        vm.prank(winery);
        primaryMarket.cancelAllocation(allocationId);
        // Offer still active: the 1_000 bottles remain committed and re-reservable.
        assertEq(primaryMarket.offeredPerLot(lotId), 1_000);
    }

    function test_Pause_BlocksReservations() public {
        uint256 offerId = _createOffer(1_000, 0);
        vm.prank(admin);
        primaryMarket.pause();

        vm.prank(buyer);
        vm.expectRevert();
        primaryMarket.reserve(offerId, 1, PRICE);
    }
}
