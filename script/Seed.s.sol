// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

import {RoleGateway} from "../src/identity/RoleGateway.sol";
import {WineLotToken} from "../src/token/WineLotToken.sol";
import {PrimaryMarket} from "../src/market/PrimaryMarket.sol";
import {TestEURe} from "../src/testing/TestEURe.sol";
import {IWineLotToken} from "../src/interfaces/IWineLotToken.sol";

contract Seed is Script {
    error UnsupportedChain(uint256 chainId);
    error PlanChainMismatch(uint256 planChainId, uint256 chainId);
    error UnknownStage(uint8 stage);
    error ItemOutOfRange(uint8 stage, uint8 itemIndex);
    error MissingConfirmedId(string key);
    error PreconditionFailed(string what);

    uint8 internal constant LOT_COUNT = 6;
    uint8 internal constant ACTOR_COUNT = 5;

    string internal plan;

    modifier withPlan() {
        if (block.chainid != 421614 && block.chainid != 46630 && block.chainid != 31337) {
            revert UnsupportedChain(block.chainid);
        }
        plan = vm.readFile(vm.envString("SEED_PLAN"));
        uint256 planChainId = _uint(".chainId");
        if (planChainId != block.chainid) revert PlanChainMismatch(planChainId, block.chainid);
        _;
    }

    function runStep(uint8 stage, uint8 itemIndex) external withPlan {
        if (stage == 0) _assignRole(itemIndex);
        else if (stage == 1) _mintFunds(itemIndex);
        else if (stage == 2) _createLot(itemIndex);
        else if (stage == 3) _verifyLot(itemIndex);
        else if (stage == 4) _setProduction(itemIndex);
        else if (stage == 5) _createOffer(itemIndex);
        else if (stage == 6) _setMilestones(itemIndex);
        else if (stage == 7) _approvePayment(itemIndex);
        else if (stage == 8) _reserve(itemIndex);
        else if (stage == 9) _openTestMode(itemIndex);
        else revert UnknownStage(stage);
    }

    function _assignRole(uint8 itemIndex) private {
        if (itemIndex >= ACTOR_COUNT) revert ItemOutOfRange(0, itemIndex);
        string memory base = string.concat(".actors[", vm.toString(uint256(itemIndex)), "]");
        address wallet = _address(string.concat(base, ".address"));
        RoleGateway.Role role = _role(_string(string.concat(base, ".role")));

        RoleGateway gateway = RoleGateway(_address(".contracts.roleGateway"));
        if (gateway.roleOf(wallet) == role) revert PreconditionFailed("role already assigned");

        vm.startBroadcast(_address(".operator"));
        gateway.assignRole(wallet, role);
        vm.stopBroadcast();
        console.log("assignRole", wallet, uint8(role));
    }

    // Mint the fixed seed amount; resumed runs must not top up buyer balances.
    function _mintFunds(uint8 itemIndex) private {
        string memory base = string.concat(".funding[", vm.toString(uint256(itemIndex)), "]");
        if (!vm.keyExistsJson(plan, base)) revert ItemOutOfRange(1, itemIndex);
        address buyer = _address(string.concat(base, ".buyer"));
        uint256 amount = _uint(string.concat(base, ".amount"));

        vm.startBroadcast(_address(".operator"));
        TestEURe(_address(".contracts.testEURe")).mint(buyer, amount);
        vm.stopBroadcast();
        console.log("mint", buyer, amount);
    }

    function _createLot(uint8 itemIndex) private {
        string memory base = _lot(itemIndex);
        address winery = _address(string.concat(base, ".winery"));
        WineLotToken token = WineLotToken(_address(".contracts.wineLotToken"));

        IWineLotToken.WineLotInput memory input = IWineLotToken.WineLotInput({
            totalBottles: uint32(_uint(string.concat(base, ".totalBottles"))),
            vintage: uint16(_uint(string.concat(base, ".vintage"))),
            royaltyBps: uint16(_uint(string.concat(base, ".royaltyBps"))),
            bottleSizeMl: uint32(_uint(string.concat(base, ".bottleSizeMl"))),
            exportAllowed: vm.parseJsonBool(plan, string.concat(base, ".exportAllowed")),
            name: _string(string.concat(base, ".name")),
            region: _string(string.concat(base, ".region")),
            grapes: _string(string.concat(base, ".grapes")),
            metadataURI: _string(string.concat(base, ".metadataURI"))
        });

        vm.startBroadcast(winery);
        uint256 lotId = token.createLot(input);
        vm.stopBroadcast();
        console.log("createLot", _string(string.concat(base, ".fixtureId")), lotId);
    }

    function _verifyLot(uint8 itemIndex) private {
        string memory base = _lot(itemIndex);
        uint256 lotId = _confirmedId(base, ".confirmed.lotId");
        bytes32 docsHash = vm.parseJsonBytes32(plan, string.concat(base, ".docsHash"));

        WineLotToken token = WineLotToken(_address(".contracts.wineLotToken"));
        if (token.getLot(lotId).status != IWineLotToken.LotStatus.Draft) {
            revert PreconditionFailed("lot is not a draft");
        }

        vm.startBroadcast(_address(".operator"));
        token.verifyLot(lotId, docsHash);
        vm.stopBroadcast();
        console.log("verifyLot", lotId);
    }

    function _setProduction(uint8 itemIndex) private {
        string memory base = _lot(itemIndex);
        uint256 lotId = _confirmedId(base, ".confirmed.lotId");
        IWineLotToken.ProductionStatus target = _production(_string(string.concat(base, ".targetProduction")));

        WineLotToken token = WineLotToken(_address(".contracts.wineLotToken"));
        if (token.getLot(lotId).production >= target) revert PreconditionFailed("production already recorded");

        vm.startBroadcast(_address(string.concat(base, ".winery")));
        token.setProductionStatus(lotId, target);
        vm.stopBroadcast();
        console.log("setProductionStatus", lotId, uint8(target));
    }

    function _createOffer(uint8 itemIndex) private {
        string memory base = _lot(itemIndex);
        uint256 lotId = _confirmedId(base, ".confirmed.lotId");
        string memory offer = string.concat(base, ".offer");

        vm.startBroadcast(_address(string.concat(base, ".winery")));
        uint256 offerId = PrimaryMarket(_address(".contracts.primaryMarket"))
            .createOffer(
                lotId,
                _address(".contracts.testEURe"),
                _uint(string.concat(offer, ".pricePerBottle")),
                uint32(_uint(string.concat(offer, ".quantity"))),
                uint64(_uint(string.concat(offer, ".startTime"))),
                uint64(_uint(string.concat(offer, ".endTime"))),
                uint16(_uint(string.concat(offer, ".depositBps"))),
                uint64(_uint(string.concat(offer, ".fullPaymentDeadline"))),
                _offerKind(_string(string.concat(offer, ".kind")))
            );
        vm.stopBroadcast();
        console.log("createOffer", lotId, offerId);
    }

    function _setMilestones(uint8 itemIndex) private {
        string memory base = _lot(itemIndex);
        uint256 offerId = _confirmedId(base, ".confirmed.offerId");

        uint16[] memory bps = new uint16[](1);
        bps[0] = uint16(_uint(string.concat(base, ".milestones[0].bps")));
        string[] memory descriptions = new string[](1);
        descriptions[0] = _string(string.concat(base, ".milestones[0].description"));

        vm.startBroadcast(_address(string.concat(base, ".winery")));
        PrimaryMarket(_address(".contracts.primaryMarket")).setMilestones(offerId, bps, descriptions);
        vm.stopBroadcast();
        console.log("setMilestones", offerId, bps[0]);
    }

    function _approvePayment(uint8 itemIndex) private {
        if (itemIndex != 0) revert ItemOutOfRange(7, itemIndex);
        address buyer = _address(".seedPaid.buyer");
        uint256 totalDue = _uint(".seedPaid.totalDue");

        vm.startBroadcast(buyer);
        TestEURe(_address(".contracts.testEURe")).approve(_address(".contracts.primaryMarket"), totalDue);
        vm.stopBroadcast();
        console.log("approve", buyer, totalDue);
    }

    function _reserve(uint8 itemIndex) private {
        if (itemIndex != 0) revert ItemOutOfRange(8, itemIndex);
        address buyer = _address(".seedPaid.buyer");
        uint256 totalDue = _uint(".seedPaid.totalDue");
        uint32 quantity = uint32(_uint(".seedPaid.quantity"));
        uint256 offerId = _uint(".seedPaid.offerId");

        PrimaryMarket primary = PrimaryMarket(_address(".contracts.primaryMarket"));
        (,,,,, uint32 reserved,,,,,,) = primary.offers(offerId);
        if (reserved != 0) revert PreconditionFailed("offer already has reservations");

        vm.startBroadcast(buyer);
        uint256 allocationId = primary.reserve(offerId, quantity, totalDue);
        vm.stopBroadcast();
        console.log("reserve", offerId, allocationId);
    }

    function _openTestMode(uint8 itemIndex) private {
        if (itemIndex != 0) revert ItemOutOfRange(9, itemIndex);
        RoleGateway gateway = RoleGateway(_address(".contracts.roleGateway"));
        if (gateway.testMode()) revert PreconditionFailed("test mode already open");

        vm.startBroadcast(gateway.owner());
        gateway.setTestMode(true);
        vm.stopBroadcast();
        console.log("testMode opened");
    }

    function _lot(uint8 itemIndex) private view returns (string memory base) {
        if (itemIndex >= LOT_COUNT) revert ItemOutOfRange(2, itemIndex);
        return string.concat(".lots[", vm.toString(uint256(itemIndex)), "]");
    }

    // Entity IDs come from confirmed receipts, not fixture row numbers.
    function _confirmedId(string memory base, string memory key) private view returns (uint256) {
        string memory path = string.concat(base, key);
        if (!vm.keyExistsJson(plan, path)) revert MissingConfirmedId(path);
        return _uint(path);
    }

    function _uint(string memory key) private view returns (uint256) {
        return vm.parseUint(vm.parseJsonString(plan, key));
    }

    function _address(string memory key) private view returns (address) {
        return vm.parseJsonAddress(plan, key);
    }

    function _string(string memory key) private view returns (string memory) {
        return vm.parseJsonString(plan, key);
    }

    function _role(string memory name) private pure returns (RoleGateway.Role) {
        bytes32 h = keccak256(bytes(name));
        if (h == keccak256("Winery")) return RoleGateway.Role.Winery;
        if (h == keccak256("Shop")) return RoleGateway.Role.Shop;
        if (h == keccak256("Consumer")) return RoleGateway.Role.Consumer;

        revert PreconditionFailed("unknown role in plan");
    }

    function _offerKind(string memory name) private pure returns (PrimaryMarket.OfferKind) {
        bytes32 h = keccak256(bytes(name));
        if (h == keccak256("Standard")) return PrimaryMarket.OfferKind.Standard;
        if (h == keccak256("EnPrimeur")) return PrimaryMarket.OfferKind.EnPrimeur;
        revert PreconditionFailed("unknown offer kind in plan");
    }

    function _production(string memory name) private pure returns (IWineLotToken.ProductionStatus) {
        bytes32 h = keccak256(bytes(name));
        if (h == keccak256("Announced")) return IWineLotToken.ProductionStatus.Announced;
        if (h == keccak256("Growing")) return IWineLotToken.ProductionStatus.Growing;
        if (h == keccak256("Harvested")) return IWineLotToken.ProductionStatus.Harvested;
        if (h == keccak256("Vinification")) return IWineLotToken.ProductionStatus.Vinification;
        if (h == keccak256("Aging")) return IWineLotToken.ProductionStatus.Aging;
        if (h == keccak256("Bottled")) return IWineLotToken.ProductionStatus.Bottled;
        if (h == keccak256("ReadyForDelivery")) return IWineLotToken.ProductionStatus.ReadyForDelivery;
        revert PreconditionFailed("unknown production status in plan");
    }
}
