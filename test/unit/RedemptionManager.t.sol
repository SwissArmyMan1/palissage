// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Fixtures} from "../utils/Fixtures.sol";
import {RedemptionManager} from "../../src/redemption/RedemptionManager.sol";
import {PrimaryMarket} from "../../src/market/PrimaryMarket.sol";
import {IWineLotToken} from "../../src/interfaces/IWineLotToken.sol";
import {IERC7943MultiToken} from "../../src/interfaces/IERC7943.sol";

contract RedemptionManagerTest is Fixtures {
    uint256 internal lotId;
    uint256 internal constant PRICE = 7_200_000;

    function setUp() public override {
        super.setUp();
        lotId = _createVerifiedLot(1_000, 0);

        vm.prank(winery);
        uint256 offerId = primaryMarket.createOffer(
            lotId,
            address(eurc),
            PRICE,
            1_000,
            uint64(block.timestamp),
            uint64(block.timestamp + 30 days),
            0,
            uint64(block.timestamp + 60 days),
            PrimaryMarket.OfferKind.Standard
        );
        _fundAndApprove(buyer, 100 * PRICE, address(primaryMarket));
        vm.prank(buyer);
        primaryMarket.reserve(offerId, 100, 100 * PRICE);

        vm.prank(buyer);
        token.setApprovalForAll(address(redemptionManager), true);
    }

    function _makeReady() internal {
        vm.prank(winery);
        token.setProductionStatus(lotId, IWineLotToken.ProductionStatus.ReadyForDelivery);
    }

    /// @dev Buyer's EIP-712 authorization for recovering a redemption's escrow to `newWallet`.
    function _signRecovery(uint256 redemptionId, address newWallet, uint256 deadline)
        internal
        view
        returns (bytes memory sig)
    {
        bytes32 digest = redemptionManager.recoveryDigest(redemptionId, newWallet, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(buyerKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_Request_RevertsBeforeReadyForDelivery() public {
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(RedemptionManager.LotNotReadyForDelivery.selector, lotId));
        redemptionManager.requestRedemption(lotId, 10, keccak256("delivery"));
    }

    function test_FullRedemptionFlow_BurnsTokens() public {
        _makeReady();

        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 40, keccak256("delivery"));
        assertEq(token.balanceOf(buyer, lotId), 60);
        assertEq(token.balanceOf(address(redemptionManager), lotId), 40);

        vm.prank(winery);
        redemptionManager.markShipped(redemptionId, keccak256("shipping-docs"));

        vm.prank(buyer);
        redemptionManager.confirmDelivery(redemptionId);

        assertEq(token.balanceOf(address(redemptionManager), lotId), 0);
        assertEq(token.totalSupply(lotId), 60);

        IWineLotToken.WineLot memory lot = token.getLot(lotId);
        assertEq(lot.mintedBottles, 100);
        assertEq(lot.redeemedBottles, 40);
        // Invariant: minted − redeemed == totalSupply.
        assertEq(lot.mintedBottles - lot.redeemedBottles, token.totalSupply(lotId));
    }

    function test_BuyerConfirm_RequiresShipped() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 10, keccak256("delivery"));

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(RedemptionManager.BuyerConfirmRequiresShipped.selector, redemptionId));
        redemptionManager.confirmDelivery(redemptionId);
    }

    function test_VerifierCanForceCompleteFromRequested() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 10, keccak256("delivery"));

        vm.prank(verifier);
        redemptionManager.confirmDelivery(redemptionId);
        assertEq(token.getLot(lotId).redeemedBottles, 10);
    }

    function test_MarkShipped_OnlyLotWinery() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 10, keccak256("delivery"));

        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(RedemptionManager.NotLotWinery.selector, lotId, outsider));
        redemptionManager.markShipped(redemptionId, bytes32(0));
    }

    function test_CancelRedemption_ReturnsTokens() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 25, keccak256("delivery"));

        vm.prank(buyer);
        redemptionManager.cancelRedemption(redemptionId);

        assertEq(token.balanceOf(buyer, lotId), 100);
        assertEq(token.balanceOf(address(redemptionManager), lotId), 0);
    }

    function test_CancelRedemption_RevertsAfterShipment() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 25, keccak256("delivery"));
        vm.prank(winery);
        redemptionManager.markShipped(redemptionId, keccak256("docs"));

        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(
                RedemptionManager.RedemptionNotInState.selector, redemptionId, RedemptionManager.RedemptionState.Requested
            )
        );
        redemptionManager.cancelRedemption(redemptionId);
    }

    /// @dev [H-02] regression: after markShipped the buyer can neither cancel nor recover
    ///      the escrowed tokens; a verifier must be able to refund a failed delivery.
    function test_RefundRedemption_ReturnsTokensAfterShipment() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 25, keccak256("delivery"));
        vm.prank(winery);
        redemptionManager.markShipped(redemptionId, keccak256("docs"));

        assertEq(token.balanceOf(buyer, lotId), 75);
        assertEq(token.balanceOf(address(redemptionManager), lotId), 25);

        vm.prank(verifier);
        redemptionManager.refundRedemption(redemptionId);

        // Tokens returned to the buyer; nothing burned, redeemed counter untouched.
        assertEq(token.balanceOf(buyer, lotId), 100);
        assertEq(token.balanceOf(address(redemptionManager), lotId), 0);
        assertEq(token.getLot(lotId).redeemedBottles, 0);
        assertEq(token.totalSupply(lotId), 100);
    }

    /// @dev [M-01] regression: a suspended lot must not trap escrowed tokens. Suspension is
    ///      the natural verifier action during a delivery dispute, yet the refund (return to
    ///      buyer) must still succeed — mirroring confirmDelivery, whose burn path already
    ///      bypasses the lot-status restriction. Without this the verified buyer's escrowed
    ///      tokens are stuck until the lot is unsuspended.
    function test_RefundRedemption_WorksWhenLotSuspended() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 25, keccak256("delivery"));
        vm.prank(winery);
        redemptionManager.markShipped(redemptionId, keccak256("docs"));

        // Verifier suspends the lot while resolving the failed delivery.
        vm.prank(verifier);
        token.suspendLot(lotId);

        vm.prank(verifier);
        redemptionManager.refundRedemption(redemptionId);

        assertEq(token.balanceOf(buyer, lotId), 100);
        assertEq(token.balanceOf(address(redemptionManager), lotId), 0);
        assertEq(token.getLot(lotId).redeemedBottles, 0);
        assertEq(token.totalSupply(lotId), 100);
    }

    /// @dev [M-01] regression: the buyer can reclaim escrowed tokens via cancel even after the
    ///      lot has been suspended (still in Requested state, before shipment).
    function test_CancelRedemption_WorksWhenLotSuspended() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 25, keccak256("delivery"));

        vm.prank(verifier);
        token.suspendLot(lotId);

        vm.prank(buyer);
        redemptionManager.cancelRedemption(redemptionId);

        assertEq(token.balanceOf(buyer, lotId), 100);
        assertEq(token.balanceOf(address(redemptionManager), lotId), 0);
    }

    function test_RefundRedemption_WorksFromRequested() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 25, keccak256("delivery"));

        vm.prank(verifier);
        redemptionManager.refundRedemption(redemptionId);

        assertEq(token.balanceOf(buyer, lotId), 100);
        assertEq(token.balanceOf(address(redemptionManager), lotId), 0);
    }

    function test_RefundRedemption_OnlyVerifier() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 25, keccak256("delivery"));
        vm.prank(winery);
        redemptionManager.markShipped(redemptionId, keccak256("docs"));

        // Neither the buyer nor the winery can self-refund; only a verifier can.
        vm.prank(buyer);
        vm.expectRevert();
        redemptionManager.refundRedemption(redemptionId);
    }

    /// @dev M-03 regression: if the buyer loses transfer eligibility (canReceive) while tokens are
    ///      escrowed, refund/cancel revert inside forcedTransfer's canReceive check and the escrow
    ///      is otherwise only burnable. A verifier must be able to recover it to a new compliant
    ///      wallet the buyer authorizes so the tokens are never trapped.
    function test_RecoverEscrow_ReturnsToNewWalletWhenBuyerDeverified() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 25, keccak256("delivery"));

        // The buyer authorizes recovery to buyer2 (signing power survives identity revocation).
        uint256 deadline = block.timestamp + 1 days;
        bytes memory sig = _signRecovery(redemptionId, buyer2, deadline);

        // Buyer loses verification while tokens sit in escrow: refund to the buyer now reverts.
        vm.prank(registryAgent);
        identityRegistry.deleteIdentity(buyer);

        vm.prank(verifier);
        vm.expectRevert(abi.encodeWithSelector(IERC7943MultiToken.ERC7943CannotReceive.selector, buyer));
        redemptionManager.refundRedemption(redemptionId);

        // Recovery to the buyer-authorized verified wallet succeeds and clears the escrow.
        vm.prank(verifier);
        redemptionManager.recoverEscrow(redemptionId, buyer2, deadline, sig);

        assertEq(token.balanceOf(buyer2, lotId), 25);
        assertEq(token.balanceOf(address(redemptionManager), lotId), 0);
        assertEq(token.getLot(lotId).redeemedBottles, 0);
        assertEq(token.totalSupply(lotId), 100);
    }

    /// @dev H-01 regression: a verifier cannot divert escrow to a wallet the buyer never authorized.
    function test_RecoverEscrow_RevertsWithoutBuyerAuth() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 25, keccak256("delivery"));

        uint256 deadline = block.timestamp + 1 days;
        // Signature authorizes buyer2, but the verifier tries to redirect to its own wallet.
        bytes memory sig = _signRecovery(redemptionId, buyer2, deadline);

        vm.prank(verifier);
        vm.expectRevert(abi.encodeWithSelector(RedemptionManager.InvalidRecoveryAuth.selector, redemptionId, verifier));
        redemptionManager.recoverEscrow(redemptionId, verifier, deadline, sig);
    }

    /// @dev H-01 regression: a stale authorization is rejected once its deadline passes.
    function test_RecoverEscrow_RevertsAfterDeadline() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 25, keccak256("delivery"));

        uint256 deadline = block.timestamp + 1 days;
        bytes memory sig = _signRecovery(redemptionId, buyer2, deadline);

        vm.warp(deadline + 1);
        vm.prank(verifier);
        vm.expectRevert(abi.encodeWithSelector(RedemptionManager.RecoveryAuthExpired.selector, deadline));
        redemptionManager.recoverEscrow(redemptionId, buyer2, deadline, sig);
    }

    function test_RecoverEscrow_OnlyVerifier() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 25, keccak256("delivery"));

        uint256 deadline = block.timestamp + 1 days;
        bytes memory sig = _signRecovery(redemptionId, buyer2, deadline);

        vm.prank(buyer);
        vm.expectRevert();
        redemptionManager.recoverEscrow(redemptionId, buyer2, deadline, sig);
    }

    function test_RecoverEscrow_RevertsForZeroWallet() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 25, keccak256("delivery"));

        vm.prank(verifier);
        vm.expectRevert(RedemptionManager.ZeroAddress.selector);
        redemptionManager.recoverEscrow(redemptionId, address(0), block.timestamp + 1 days, "");
    }

    /// @dev Recovery must still refuse a non-compliant destination (canReceive enforced) even when
    ///      the buyer authorized it.
    function test_RecoverEscrow_RevertsForNonCompliantWallet() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 25, keccak256("delivery"));

        uint256 deadline = block.timestamp + 1 days;
        bytes memory sig = _signRecovery(redemptionId, outsider, deadline);

        vm.prank(verifier);
        vm.expectRevert(abi.encodeWithSelector(IERC7943MultiToken.ERC7943CannotReceive.selector, outsider));
        redemptionManager.recoverEscrow(redemptionId, outsider, deadline, sig);
    }

    function test_RefundRedemption_RevertsAfterCompleted() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 25, keccak256("delivery"));
        vm.prank(winery);
        redemptionManager.markShipped(redemptionId, keccak256("docs"));
        vm.prank(buyer);
        redemptionManager.confirmDelivery(redemptionId);

        vm.prank(verifier);
        vm.expectRevert(
            abi.encodeWithSelector(
                RedemptionManager.RedemptionNotInState.selector, redemptionId, RedemptionManager.RedemptionState.Shipped
            )
        );
        redemptionManager.refundRedemption(redemptionId);
    }
}
