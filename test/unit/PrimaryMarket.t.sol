// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Fixtures} from "../utils/Fixtures.sol";
import {PrimaryMarket} from "../../src/market/PrimaryMarket.sol";

contract PrimaryMarketTest is Fixtures {
    uint256 internal lotId;
    uint256 internal constant PRICE = 7_200_000; // 7.20 EURC (6 decimals)

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

    function test_Pause_BlocksReservations() public {
        uint256 offerId = _createOffer(1_000, 0);
        vm.prank(admin);
        primaryMarket.pause();

        vm.prank(buyer);
        vm.expectRevert();
        primaryMarket.reserve(offerId, 1, PRICE);
    }
}
