// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Fixtures} from "../utils/Fixtures.sol";
import {PalissageLens} from "../../src/periphery/PalissageLens.sol";
import {PrimaryMarket} from "../../src/market/PrimaryMarket.sol";
import {RedemptionManager} from "../../src/redemption/RedemptionManager.sol";
import {RoleGateway, IVerifierRoleManager} from "../../src/identity/RoleGateway.sol";
import {IClaimIssuer} from "../../src/interfaces/IClaimIssuer.sol";
import {IWineLotToken} from "../../src/interfaces/IWineLotToken.sol";
import {ClaimTopicsLib} from "../../src/libraries/ClaimTopicsLib.sol";

/// @dev The read projection the interface depends on. Wrong pagination, a wrong derived phase or
///      a permission read that answers for the wrong contract would send a user into a
///      transaction that cannot succeed, so each of them is asserted here.
contract PalissageLensTest is Fixtures {
    PalissageLens internal lens;
    RoleGateway internal gateway;

    address internal gatewayOwner = makeAddr("gatewayOwner");

    uint256 internal lotId;
    uint256 internal constant PRICE = 7_200_000; // 7.20 (MockEURe, 6 decimals)

    function setUp() public override {
        super.setUp();

        uint256[] memory topics = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) {
            topics[i] = i + 1;
        }

        vm.startPrank(admin);
        gateway = new RoleGateway(gatewayOwner, identityRegistry, IVerifierRoleManager(address(token)));
        identityRegistry.grantRole(identityRegistry.REGISTRY_AGENT_ROLE(), address(gateway));
        trustedIssuers.addTrustedIssuer(IClaimIssuer(address(gateway)), topics);
        token.grantRole(token.DEFAULT_ADMIN_ROLE(), address(gateway));
        vm.stopPrank();

        lens = new PalissageLens(token, primaryMarket, secondaryMarket, redemptionManager, identityRegistry, gateway);

        lotId = _createVerifiedLot(10_000, 250);
    }

    // ------------------------------------------------------------------ setup

    function _offer(uint32 quantity, uint16 depositBps, uint64 startTime, uint64 endTime)
        internal
        returns (uint256 offerId)
    {
        vm.prank(winery);
        offerId = primaryMarket.createOffer(
            lotId,
            address(eurc),
            PRICE,
            quantity,
            startTime,
            endTime,
            depositBps,
            endTime + 30 days,
            PrimaryMarket.OfferKind.Standard
        );
    }

    function _openOffer(uint32 quantity, uint16 depositBps) internal returns (uint256 offerId) {
        return _offer(quantity, depositBps, uint64(block.timestamp), uint64(block.timestamp + 30 days));
    }

    // --------------------------------------------------------------- protocol

    function test_Protocol_ReportsWiringFeesAndCounters() public view {
        PalissageLens.ProtocolView memory view_ = lens.protocol(address(eurc));

        assertEq(view_.chainId, block.chainid);
        assertEq(view_.version, "1.0.0-mvp");
        assertEq(view_.wineLotToken, address(token));
        assertEq(view_.primaryMarket, address(primaryMarket));
        assertEq(view_.secondaryMarket, address(secondaryMarket));
        assertEq(view_.redemptionManager, address(redemptionManager));
        assertEq(view_.identityRegistry, address(identityRegistry));
        assertEq(view_.trustedIssuersRegistry, address(trustedIssuers));
        assertEq(view_.roleGateway, address(gateway));

        assertEq(view_.primaryFeeBps, 300);
        assertEq(view_.secondaryFeeBps, 200);
        assertEq(view_.primaryTreasury, treasury);
        assertEq(view_.secondaryTreasury, treasury);
        assertFalse(view_.primaryPaused);
        assertFalse(view_.secondaryPaused);
        assertFalse(view_.testMode); // opened only at the end of the seed

        assertEq(view_.lotCount, 1);
        assertEq(view_.offerCount, 0);
        assertEq(view_.allocationCount, 0);
        assertEq(view_.listingCount, 0);
        assertEq(view_.redemptionCount, 0);

        assertEq(view_.paymentToken, address(eurc));
        assertEq(view_.paymentDecimals, 6);
        assertEq(view_.paymentSymbol, "EURe");
        assertTrue(view_.paymentAllowedPrimary);
        assertTrue(view_.paymentAllowedSecondary);
        assertTrue(view_.paymentMetadataOk);
    }

    function test_Protocol_UnreadableTokenIsReportedNotGuessed() public view {
        PalissageLens.ProtocolView memory view_ = lens.protocol(address(0));
        assertFalse(view_.paymentMetadataOk);
        assertEq(view_.paymentDecimals, 0);
        assertEq(view_.paymentSymbol, "");
        assertFalse(view_.paymentAllowedPrimary);
        assertFalse(view_.paymentAllowedSecondary);
    }

    function test_Protocol_TracksPausesAndTestMode() public {
        vm.prank(admin);
        primaryMarket.pause();
        vm.prank(gatewayOwner);
        gateway.setTestMode(true);

        PalissageLens.ProtocolView memory view_ = lens.protocol(address(eurc));
        assertTrue(view_.primaryPaused);
        assertFalse(view_.secondaryPaused);
        assertTrue(view_.testMode);
    }

    // ------------------------------------------------------------ participant

    function test_Participant_ClaimsAndPerContractRoles() public view {
        PalissageLens.ParticipantView memory buyerView = lens.participant(buyer);
        assertEq(buyerView.wallet, buyer);
        assertEq(buyerView.identity, address(identities[buyer]));
        assertTrue(buyerView.registered);
        assertTrue(buyerView.isVerified);
        assertTrue(buyerView.kyc);
        assertTrue(buyerView.kyb);
        assertFalse(buyerView.wineryClaim);
        assertTrue(buyerView.b2bClaim);
        assertTrue(buyerView.canSend);
        assertTrue(buyerView.canReceive);
        assertEq(buyerView.country, 756);

        PalissageLens.ParticipantView memory wineryView = lens.participant(winery);
        assertTrue(wineryView.wineryClaim);
        assertFalse(wineryView.b2bClaim);

        // The three verifier roles live on three contracts and are independent.
        PalissageLens.ParticipantView memory verifierView = lens.participant(verifier);
        assertTrue(verifierView.tokenVerifier);
        assertTrue(verifierView.primaryVerifier);
        assertTrue(verifierView.redemptionVerifier);
        assertFalse(verifierView.secondaryPauser);
        assertFalse(verifierView.primaryAdmin);

        PalissageLens.ParticipantView memory enforcerView = lens.participant(enforcer);
        assertTrue(enforcerView.tokenEnforcer);
        assertFalse(enforcerView.tokenVerifier);
    }

    /// @dev An operator can hold verifier rights without any identity: the interface must not ask
    ///      it for KYC before showing the verify action.
    function test_Participant_AdminWithoutIdentity() public view {
        PalissageLens.ParticipantView memory adminView = lens.participant(admin);
        assertEq(adminView.identity, address(0));
        assertFalse(adminView.registered);
        assertFalse(adminView.isVerified);
        assertTrue(adminView.tokenAdmin);
        assertTrue(adminView.primaryAdmin);
        assertTrue(adminView.primaryPauser);
        assertTrue(adminView.secondaryPauser);
    }

    function test_Participant_GatewayRoleAndOwner() public {
        vm.prank(gatewayOwner);
        gateway.assignRole(outsider, RoleGateway.Role.Admin);

        PalissageLens.ParticipantView memory view_ = lens.participant(outsider);
        assertEq(view_.gatewayRole, uint8(RoleGateway.Role.Admin));
        assertTrue(view_.gatewayAdmin);
        assertTrue(view_.tokenVerifier); // granted through the gateway
        assertFalse(view_.gatewayOwner);

        assertTrue(lens.participant(gatewayOwner).gatewayOwner);
    }

    function test_Participant_UnknownWalletIsEmptyNotFalseClaims() public {
        PalissageLens.ParticipantView memory view_ = lens.participant(makeAddr("stranger"));
        assertEq(view_.identity, address(0));
        assertFalse(view_.registered);
        assertFalse(view_.isVerified);
        assertEq(view_.gatewayRole, uint8(RoleGateway.Role.None));
        assertFalse(view_.canSend);
    }

    // -------------------------------------------------------------------- lot

    function test_Lot_MissingIdIsNotAnEmptyDraft() public view {
        (bool exists, PalissageLens.LotView memory view_) = lens.lot(999);
        assertFalse(exists);
        assertEq(view_.winery, address(0));

        (bool found,) = lens.lot(lotId);
        assertTrue(found);
    }

    function test_Lot_ProjectsRecordAndDerivedCounters() public {
        _openOffer(1_000, 0);
        (, PalissageLens.LotView memory view_) = lens.lot(lotId);

        assertEq(view_.id, lotId);
        assertEq(view_.winery, winery);
        assertEq(view_.status, uint8(IWineLotToken.LotStatus.Verified));
        assertEq(view_.production, uint8(IWineLotToken.ProductionStatus.Announced));
        assertEq(view_.totalBottles, 10_000);
        assertEq(view_.royaltyBps, 250);
        assertEq(view_.bottleSizeMl, 750);
        assertEq(view_.name, "Chateau Palissage Rouge");
        assertEq(view_.metadataURI, "ipfs://lot-metadata");
        assertEq(view_.offeredBottles, 1_000);
        assertEq(view_.circulating, 0);
    }

    function test_LotsOfWinery_FiltersAndPaginates() public {
        address winery2 = makeAddr("winery2");
        vm.prank(gatewayOwner);
        gateway.assignRole(winery2, RoleGateway.Role.Winery);
        vm.prank(winery2);
        uint256 otherLot = token.createLot(
            IWineLotToken.WineLotInput({
                totalBottles: 100,
                vintage: 2025,
                royaltyBps: 0,
                bottleSizeMl: 750,
                exportAllowed: false,
                name: "Other",
                region: "Occitanie",
                grapes: "",
                metadataURI: ""
            })
        );

        (PalissageLens.LotView[] memory all, uint256 next) = lens.lots(0, 10);
        assertEq(all.length, 2);
        assertEq(next, 0);

        (PalissageLens.LotView[] memory mine, uint256 mineNext) = lens.lotsOfWinery(winery2, 0, 10);
        assertEq(mine.length, 1);
        assertEq(mine[0].id, otherLot);
        assertEq(mineNext, 0);

        // A page smaller than the collection returns the next identifier to examine.
        (PalissageLens.LotView[] memory first, uint256 firstNext) = lens.lots(0, 1);
        assertEq(first.length, 1);
        assertEq(first[0].id, lotId);
        assertEq(firstNext, 2);
    }

    // ------------------------------------------------------------- pagination

    function test_Pagination_RejectsZeroLimit() public {
        vm.expectRevert(PalissageLens.InvalidPageLimit.selector);
        lens.lots(0, 0);
    }

    function test_Pagination_ClampsLimitToMax() public {
        // 60 offers, asked for 51: at most MAX_LIMIT come back.
        for (uint256 i = 0; i < 60; i++) {
            _openOffer(1, 0);
        }
        (PalissageLens.OfferView[] memory page, uint256 next) = lens.offers(0, 51);
        assertEq(page.length, lens.MAX_LIMIT());
        assertEq(next, lens.MAX_LIMIT() + 1);
    }

    function test_Pagination_CursorPastEndIsEmptyAndFinished() public view {
        (PalissageLens.LotView[] memory page, uint256 next) = lens.lots(99, 10);
        assertEq(page.length, 0);
        assertEq(next, 0);
    }

    /// @dev The per-call scan budget is not the end of the collection: an empty page with a
    ///      non-zero cursor means "keep going", never "no results".
    function test_Pagination_ScanBudgetReturnsCursorNotEnd() public {
        uint256 scan = lens.MAX_SCAN();
        for (uint256 i = 0; i < scan + 1; i++) {
            _openOffer(1, 0);
        }

        // Nothing matches this winery, so the whole budget is spent on a page of zero records.
        (PalissageLens.OfferView[] memory page, uint256 next) = lens.offersOfWinery(makeAddr("nobody"), 0, 10);
        assertEq(page.length, 0);
        assertEq(next, scan + 1);

        (PalissageLens.OfferView[] memory tail, uint256 tailNext) = lens.offersOfWinery(makeAddr("nobody"), next, 10);
        assertEq(tail.length, 0);
        assertEq(tailNext, 0);
    }

    // ----------------------------------------------------------------- offers

    function test_Offer_PhaseFollowsFixedPriority() public {
        uint256 scheduled = _offer(10, 0, uint64(block.timestamp + 1 days), uint64(block.timestamp + 10 days));
        assertEq(lens.offer(scheduled).phase, 0);

        uint256 open = _openOffer(10, 0);
        assertEq(lens.offer(open).phase, 1);
        assertEq(lens.offer(open).available, 10);

        _fundAndApprove(buyer, 10 * PRICE, address(primaryMarket));
        vm.prank(buyer);
        primaryMarket.reserve(open, 10, 10 * PRICE);
        assertEq(lens.offer(open).phase, 2); // sold out
        assertEq(lens.offer(open).available, 0);

        // Ended outranks sold out and scheduled.
        vm.warp(block.timestamp + 31 days);
        assertEq(lens.offer(open).phase, 3);
        assertEq(lens.offer(scheduled).phase, 3);

        // Cancelled outranks everything.
        uint64 start = uint64(block.timestamp);
        uint64 end = start + 10 days;
        uint256 cancelled = _offer(10, 0, start, end);
        vm.prank(winery);
        primaryMarket.cancelOffer(cancelled);
        assertEq(lens.offer(cancelled).phase, 4);
    }

    function test_Offer_UnknownIdReverts() public {
        vm.expectRevert(abi.encodeWithSelector(PalissageLens.EntityNotFound.selector, 1, 42));
        lens.offer(42);
    }

    function test_OffersOfLot_FiltersByLot() public {
        uint256 offerId = _openOffer(10, 0);
        (PalissageLens.OfferView[] memory page,) = lens.offersOfLot(lotId, 0, 10);
        assertEq(page.length, 1);
        assertEq(page[0].id, offerId);

        (PalissageLens.OfferView[] memory none,) = lens.offersOfLot(999, 0, 10);
        assertEq(none.length, 0);
    }

    // ------------------------------------------------------------ allocations

    function test_Allocation_RemainingAndOverdue() public {
        uint256 offerId = _openOffer(1_000, 3000);
        uint256 total = 100 * PRICE;
        uint256 deposit = (total * 3000) / 10000;
        _fundAndApprove(buyer, total, address(primaryMarket));
        vm.prank(buyer);
        uint256 allocationId = primaryMarket.reserve(offerId, 100, deposit);

        PalissageLens.AllocationView memory view_ = lens.allocation(allocationId);
        assertEq(view_.offerId, offerId);
        assertEq(view_.lotId, lotId);
        assertEq(view_.buyer, buyer);
        assertEq(view_.paymentToken, address(eurc));
        assertEq(view_.quantity, 100);
        assertEq(view_.totalDue, total);
        assertEq(view_.paidAmount, deposit);
        assertEq(view_.remaining, total - deposit);
        assertEq(view_.state, uint8(PrimaryMarket.AllocationState.Reserved));
        assertFalse(view_.overdue);

        // Past the deadline the allocation is overdue but still Reserved: Defaulted only exists
        // once the winery claims it.
        vm.warp(view_.fullPaymentDeadline + 1);
        PalissageLens.AllocationView memory late = lens.allocation(allocationId);
        assertTrue(late.overdue);
        assertEq(late.state, uint8(PrimaryMarket.AllocationState.Reserved));
    }

    function test_AllocationsOfBuyerAndOffer() public {
        uint256 offerId = _openOffer(1_000, 0);
        _fundAndApprove(buyer, 10 * PRICE, address(primaryMarket));
        vm.prank(buyer);
        uint256 mine = primaryMarket.reserve(offerId, 10, 10 * PRICE);

        _fundAndApprove(buyer2, 5 * PRICE, address(primaryMarket));
        vm.prank(buyer2);
        primaryMarket.reserve(offerId, 5, 5 * PRICE);

        (PalissageLens.AllocationView[] memory forBuyer,) = lens.allocationsOfBuyer(buyer, 0, 10);
        assertEq(forBuyer.length, 1);
        assertEq(forBuyer[0].id, mine);

        (PalissageLens.AllocationView[] memory forOffer,) = lens.allocationsOfOffer(offerId, 0, 10);
        assertEq(forOffer.length, 2);
    }

    function test_Allocation_UnknownIdReverts() public {
        vm.expectRevert(abi.encodeWithSelector(PalissageLens.EntityNotFound.selector, 2, 7));
        lens.allocation(7);
    }

    // --------------------------------------------------------------- listings

    function _buyerHoldsBottles(uint32 quantity) internal {
        uint256 offerId = _openOffer(1_000, 0);
        _fundAndApprove(buyer, uint256(quantity) * PRICE, address(primaryMarket));
        vm.prank(buyer);
        primaryMarket.reserve(offerId, quantity, uint256(quantity) * PRICE);
    }

    function test_Listing_ReportsApprovalAndSellerBalance() public {
        _buyerHoldsBottles(100);
        vm.prank(buyer);
        uint256 listingId = secondaryMarket.list(lotId, 40, 8_000_000, address(eurc));

        PalissageLens.ListingView memory before = lens.listing(listingId);
        assertEq(before.seller, buyer);
        assertEq(before.lotId, lotId);
        assertEq(before.quantity, 40);
        assertEq(before.sellerBalance, 100);
        assertEq(before.sellerTransferable, 100);
        assertFalse(before.sellerApproved); // a listing escrows nothing
        assertEq(before.royaltyBps, 250);
        assertEq(before.feeBps, secondaryMarket.secondaryFeeBps());
        assertTrue(before.lotVerified);

        vm.prank(buyer);
        token.setApprovalForAll(address(secondaryMarket), true);
        assertTrue(lens.listing(listingId).sellerApproved);

        // Frozen tokens reduce the transferable amount, not the balance.
        vm.prank(enforcer);
        token.setFrozenTokens(buyer, lotId, 70);
        PalissageLens.ListingView memory frozen = lens.listing(listingId);
        assertEq(frozen.sellerBalance, 100);
        assertEq(frozen.sellerTransferable, 30);
    }

    function test_ActiveListings_ExcludesCancelledButSellerHistoryKeepsIt() public {
        _buyerHoldsBottles(100);
        vm.startPrank(buyer);
        uint256 first = secondaryMarket.list(lotId, 10, 8_000_000, address(eurc));
        secondaryMarket.list(lotId, 20, 9_000_000, address(eurc));
        secondaryMarket.cancelListing(first);
        vm.stopPrank();

        (PalissageLens.ListingView[] memory active,) = lens.activeListings(0, 10);
        assertEq(active.length, 1);
        assertFalse(active[0].id == first);

        (PalissageLens.ListingView[] memory mine,) = lens.listingsOfSeller(buyer, 0, 10);
        assertEq(mine.length, 2);

        (PalissageLens.ListingView[] memory ofLot,) = lens.listingsOfLot(lotId, 0, 10);
        assertEq(ofLot.length, 2);
    }

    function test_Listing_UnknownIdReverts() public {
        vm.expectRevert(abi.encodeWithSelector(PalissageLens.EntityNotFound.selector, 3, 1));
        lens.listing(1);
    }

    // ------------------------------------------------------------ redemptions

    function _openRedemption(uint32 quantity) internal returns (uint256 redemptionId) {
        _buyerHoldsBottles(quantity);
        vm.prank(winery);
        token.setProductionStatus(lotId, IWineLotToken.ProductionStatus.ReadyForDelivery);
        vm.prank(buyer);
        token.setApprovalForAll(address(redemptionManager), true);
        vm.prank(buyer);
        redemptionId = redemptionManager.requestRedemption(lotId, quantity, keccak256("delivery"));
    }

    function test_Redemption_ViewCarriesWineryAndProduction() public {
        uint256 redemptionId = _openRedemption(60);

        PalissageLens.RedemptionView memory view_ = lens.redemption(redemptionId);
        assertEq(view_.buyer, buyer);
        assertEq(view_.lotId, lotId);
        assertEq(view_.quantity, 60);
        assertEq(view_.deliveryDataHash, keccak256("delivery"));
        assertEq(view_.shipmentDocsHash, bytes32(0));
        assertEq(view_.state, uint8(RedemptionManager.RedemptionState.Requested));
        assertEq(view_.winery, winery);
        assertEq(view_.lotProduction, uint8(IWineLotToken.ProductionStatus.ReadyForDelivery));

        vm.prank(winery);
        redemptionManager.markShipped(redemptionId, keccak256("docs"));
        assertEq(lens.redemption(redemptionId).state, uint8(RedemptionManager.RedemptionState.Shipped));
    }

    function test_RedemptionQueues() public {
        uint256 redemptionId = _openRedemption(60);

        (PalissageLens.RedemptionView[] memory all,) = lens.redemptions(0, 10);
        assertEq(all.length, 1);
        assertEq(all[0].id, redemptionId);

        (PalissageLens.RedemptionView[] memory ofBuyer,) = lens.redemptionsOfBuyer(buyer, 0, 10);
        assertEq(ofBuyer.length, 1);

        (PalissageLens.RedemptionView[] memory ofWinery,) = lens.redemptionsOfWinery(winery, 0, 10);
        assertEq(ofWinery.length, 1);

        (PalissageLens.RedemptionView[] memory other,) = lens.redemptionsOfWinery(makeAddr("nobody"), 0, 10);
        assertEq(other.length, 0);
    }

    function test_Redemption_UnknownIdReverts() public {
        vm.expectRevert(abi.encodeWithSelector(PalissageLens.EntityNotFound.selector, 4, 3));
        lens.redemption(3);
    }

    // ---------------------------------------------------------------positions

    function test_Positions_TransferableIsUnfrozenBalance() public {
        _buyerHoldsBottles(100);
        vm.prank(enforcer);
        token.setFrozenTokens(buyer, lotId, 30);

        uint256[] memory ids = new uint256[](1);
        ids[0] = lotId;
        PalissageLens.PositionView[] memory positions = lens.positions(buyer, ids);
        assertEq(positions[0].balance, 100);
        assertEq(positions[0].frozen, 30);
        assertEq(positions[0].transferable, 70);

        // Frozen may exceed the balance; transferable floors at zero rather than underflowing.
        vm.prank(enforcer);
        token.setFrozenTokens(buyer, lotId, 500);
        positions = lens.positions(buyer, ids);
        assertEq(positions[0].frozen, 500);
        assertEq(positions[0].transferable, 0);
    }

    function test_Positions_EmptyRequestIsAllowed() public view {
        uint256[] memory none = new uint256[](0);
        assertEq(lens.positions(buyer, none).length, 0);
    }

    function test_Positions_RejectsTooManyIdsAndUnknownLot() public {
        uint256[] memory tooMany = new uint256[](51);
        for (uint256 i = 0; i < 51; i++) {
            tooMany[i] = lotId;
        }
        vm.expectRevert(abi.encodeWithSelector(PalissageLens.TooManyPositionIds.selector, 51));
        lens.positions(buyer, tooMany);

        uint256[] memory unknown = new uint256[](1);
        unknown[0] = 4242;
        vm.expectRevert(abi.encodeWithSelector(PalissageLens.EntityNotFound.selector, 0, 4242));
        lens.positions(buyer, unknown);
    }

    function test_Positions_AcceptsExactlyFifty() public view {
        uint256[] memory ids = new uint256[](50);
        for (uint256 i = 0; i < 50; i++) {
            ids[i] = lotId;
        }
        assertEq(lens.positions(buyer, ids).length, 50);
    }

    // ------------------------------------------------------------- settlement

    function test_Settlement_MirrorsEscrowAndSchedule() public {
        uint256 offerId = _openOffer(1_000, 0);
        uint16[] memory bps = new uint16[](1);
        bps[0] = 10000;
        string[] memory descriptions = new string[](1);
        descriptions[0] = "Final release on delivery readiness";
        vm.prank(winery);
        primaryMarket.setMilestones(offerId, bps, descriptions);

        uint256 total = 100 * PRICE;
        _fundAndApprove(buyer, total, address(primaryMarket));
        vm.prank(buyer);
        primaryMarket.reserve(offerId, 100, total);

        PalissageLens.SettlementView memory before = lens.settlement(offerId);
        assertEq(before.winery, winery);
        assertEq(before.paymentToken, address(eurc));
        assertEq(before.settledFunds, total);
        assertEq(before.withdrawnGross, 0);
        assertEq(before.releasedBps, 0);
        assertEq(before.withdrawable, 0);
        assertEq(before.primaryFeeBps, 300);
        assertEq(before.milestones.length, 1);
        assertEq(before.milestones[0].bps, 10000);
        assertFalse(before.milestones[0].released);
        assertEq(before.milestones[0].description, "Final release on delivery readiness");

        vm.prank(verifier);
        primaryMarket.confirmMilestone(offerId, 0);

        PalissageLens.SettlementView memory released = lens.settlement(offerId);
        assertEq(released.releasedBps, 10000);
        assertEq(released.withdrawable, total);
        assertTrue(released.milestones[0].released);

        vm.prank(winery);
        primaryMarket.withdrawReleased(offerId);
        PalissageLens.SettlementView memory paid = lens.settlement(offerId);
        assertEq(paid.withdrawnGross, total);
        assertEq(paid.withdrawable, 0);
    }

    function test_Settlement_UnknownOfferReverts() public {
        vm.expectRevert(abi.encodeWithSelector(PalissageLens.EntityNotFound.selector, 1, 5));
        lens.settlement(5);
    }

    // ------------------------------------------------------------- properties

    function test_ImmutableWiringIsExposedForVerification() public view {
        assertEq(address(lens.token()), address(token));
        assertEq(address(lens.primary()), address(primaryMarket));
        assertEq(address(lens.secondary()), address(secondaryMarket));
        assertEq(address(lens.redemptionManager()), address(redemptionManager));
        assertEq(address(lens.registry()), address(identityRegistry));
        assertEq(address(lens.gateway()), address(gateway));
    }

    function test_Constructor_RejectsZeroAddress() public {
        vm.expectRevert(PalissageLens.ZeroAddress.selector);
        new PalissageLens(
            token, primaryMarket, secondaryMarket, redemptionManager, identityRegistry, RoleGateway(address(0))
        );
    }

    function test_LongStringsDoNotBreakTheCatalogue() public {
        string memory long = new string(4_000);
        vm.prank(winery);
        uint256 bigLot = token.createLot(
            IWineLotToken.WineLotInput({
                totalBottles: 10,
                vintage: 2026,
                royaltyBps: 0,
                bottleSizeMl: 750,
                exportAllowed: false,
                name: long,
                region: long,
                grapes: long,
                metadataURI: long
            })
        );
        (bool exists, PalissageLens.LotView memory view_) = lens.lot(bigLot);
        assertTrue(exists);
        assertEq(bytes(view_.metadataURI).length, 4_000);

        (PalissageLens.LotView[] memory page,) = lens.lots(0, 10);
        assertEq(page.length, 2);
    }
}
