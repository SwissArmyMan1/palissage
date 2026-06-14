// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

import {IIdentityRegistry} from "../../src/interfaces/IIdentityRegistry.sol";
import {IIdentity} from "../../src/interfaces/IIdentity.sol";
import {IWineLotToken} from "../../src/interfaces/IWineLotToken.sol";
import {WineLotToken} from "../../src/token/WineLotToken.sol";
import {PrimaryMarket} from "../../src/market/PrimaryMarket.sol";
import {SecondaryMarket} from "../../src/market/SecondaryMarket.sol";
import {RedemptionManager} from "../../src/redemption/RedemptionManager.sol";

contract EchidnaIdentityRegistry is IIdentityRegistry {
    mapping(address => IIdentity) private _identities;
    mapping(address => uint16) private _countries;
    mapping(address => bool) private _verified;
    mapping(address => mapping(uint256 => bool)) private _claims;

    function setVerified(address wallet, bool verified) external {
        _verified[wallet] = verified;
    }

    function setClaim(address wallet, uint256 topic, bool hasClaim) external {
        _claims[wallet][topic] = hasClaim;
    }

    function registerIdentity(address wallet, IIdentity identity, uint16 country) external {
        _identities[wallet] = identity;
        _countries[wallet] = country;
        _verified[wallet] = true;
        emit IdentityRegistered(wallet, identity);
        emit CountryUpdated(wallet, country);
    }

    function updateIdentity(address wallet, IIdentity identity) external {
        IIdentity old = _identities[wallet];
        _identities[wallet] = identity;
        emit IdentityUpdated(wallet, old, identity);
    }

    function updateCountry(address wallet, uint16 country) external {
        _countries[wallet] = country;
        emit CountryUpdated(wallet, country);
    }

    function deleteIdentity(address wallet) external {
        IIdentity identity = _identities[wallet];
        delete _identities[wallet];
        delete _countries[wallet];
        _verified[wallet] = false;
        emit IdentityRemoved(wallet, identity);
    }

    function setRequiredClaimTopics(uint256[] calldata topics) external {
        emit RequiredClaimTopicsUpdated(topics);
    }

    function identityOf(address wallet) external view returns (IIdentity identity) {
        return _identities[wallet];
    }

    function countryOf(address wallet) external view returns (uint16 country) {
        return _countries[wallet];
    }

    function containsWallet(address wallet) external view returns (bool registered) {
        return _verified[wallet] || address(_identities[wallet]) != address(0);
    }

    function isVerified(address wallet) external view returns (bool verified) {
        return _verified[wallet];
    }

    function hasValidClaim(address wallet, uint256 topic) external view returns (bool has) {
        return _claims[wallet][topic];
    }
}

contract EchidnaActor is ERC1155Holder {
    function createLot(WineLotToken token, IWineLotToken.WineLotInput calldata input)
        external
        returns (uint256 lotId)
    {
        return token.createLot(input);
    }

    function setProductionStatus(WineLotToken token, uint256 lotId, IWineLotToken.ProductionStatus production)
        external
    {
        token.setProductionStatus(lotId, production);
    }

    function setApprovalForAll(WineLotToken token, address operator, bool approved) external {
        token.setApprovalForAll(operator, approved);
    }

    function approveERC20(IERC20 token, address spender, uint256 amount) external {
        token.approve(spender, amount);
    }

    function createOffer(
        PrimaryMarket market,
        uint256 lotId,
        address paymentToken,
        uint256 pricePerBottle,
        uint32 quantity,
        uint64 startTime,
        uint64 endTime,
        uint16 depositBps,
        uint64 fullPaymentDeadline,
        PrimaryMarket.OfferKind kind
    ) external returns (uint256 offerId) {
        return market.createOffer(
            lotId, paymentToken, pricePerBottle, quantity, startTime, endTime, depositBps, fullPaymentDeadline, kind
        );
    }

    function reserve(PrimaryMarket market, uint256 offerId, uint32 quantity, uint256 payNow)
        external
        returns (uint256 allocationId)
    {
        return market.reserve(offerId, quantity, payNow);
    }

    function payRemainder(PrimaryMarket market, uint256 allocationId, uint256 amount) external {
        market.payRemainder(allocationId, amount);
    }

    function cancelAllocation(PrimaryMarket market, uint256 allocationId) external {
        market.cancelAllocation(allocationId);
    }

    function withdrawReleased(PrimaryMarket market, uint256 offerId) external {
        market.withdrawReleased(offerId);
    }

    function list(SecondaryMarket market, uint256 lotId, uint32 quantity, uint256 pricePerBottle, address paymentToken)
        external
        returns (uint256 listingId)
    {
        return market.list(lotId, quantity, pricePerBottle, paymentToken);
    }

    function updateListingPrice(SecondaryMarket market, uint256 listingId, uint256 pricePerBottle) external {
        market.updateListingPrice(listingId, pricePerBottle);
    }

    function cancelListing(SecondaryMarket market, uint256 listingId) external {
        market.cancelListing(listingId);
    }

    function buy(SecondaryMarket market, uint256 listingId, uint32 quantity) external {
        market.buy(listingId, quantity, type(uint256).max, type(uint256).max);
    }

    function requestRedemption(RedemptionManager manager, uint256 lotId, uint32 quantity, bytes32 deliveryDataHash)
        external
        returns (uint256 redemptionId)
    {
        return manager.requestRedemption(lotId, quantity, deliveryDataHash);
    }

    function markShipped(RedemptionManager manager, uint256 redemptionId, bytes32 shipmentDocsHash) external {
        manager.markShipped(redemptionId, shipmentDocsHash);
    }

    function confirmDelivery(RedemptionManager manager, uint256 redemptionId) external {
        manager.confirmDelivery(redemptionId);
    }

    function cancelRedemption(RedemptionManager manager, uint256 redemptionId) external {
        manager.cancelRedemption(redemptionId);
    }
}
