// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {WineLotToken} from "../../src/token/WineLotToken.sol";
import {IWineLotToken} from "../../src/interfaces/IWineLotToken.sol";
import {ClaimTopicsLib} from "../../src/libraries/ClaimTopicsLib.sol";
import {EchidnaActor, EchidnaIdentityRegistry} from "./EchidnaHelpers.sol";

contract WineLotTokenEchidna {
    uint32 internal constant TOTAL_BOTTLES = 1_000;

    EchidnaIdentityRegistry internal registry;
    WineLotToken internal token;
    EchidnaActor internal winery;
    EchidnaActor[3] internal holders;
    uint256 internal lotId;

    constructor() {
        registry = new EchidnaIdentityRegistry();
        token = new WineLotToken(address(this), registry);

        winery = new EchidnaActor();
        holders[0] = new EchidnaActor();
        holders[1] = new EchidnaActor();
        holders[2] = new EchidnaActor();

        registry.setVerified(address(winery), true);
        registry.setClaim(address(winery), ClaimTopicsLib.TOPIC_WINERY, true);
        for (uint256 i = 0; i < holders.length; i++) {
            registry.setVerified(address(holders[i]), true);
            registry.setClaim(address(holders[i]), ClaimTopicsLib.TOPIC_B2B_BUYER, true);
        }

        token.grantRole(token.VERIFIER_ROLE(), address(this));
        token.grantRole(token.MINTER_ROLE(), address(this));
        token.grantRole(token.BURNER_ROLE(), address(this));
        token.grantRole(token.ENFORCER_ROLE(), address(this));
        token.grantRole(token.TRANSFER_AGENT_ROLE(), address(this));

        lotId = winery.createLot(
            token,
            IWineLotToken.WineLotInput({
                totalBottles: TOTAL_BOTTLES,
                vintage: 2024,
                royaltyBps: 250,
                bottleSizeMl: 750,
                exportAllowed: true,
                name: "Echidna Rouge",
                region: "Bordeaux",
                grapes: "Merlot",
                metadataURI: "ipfs://echidna-lot"
            })
        );
        token.verifyLot(lotId, keccak256("docs"));

        for (uint256 i = 0; i < holders.length; i++) {
            holders[i].setApprovalForAll(token, address(this), true);
        }
    }

    function mintTo(uint8 holderSeed, uint32 amountSeed) external {
        IWineLotToken.WineLot memory lot = token.getLot(lotId);
        uint256 available = lot.totalBottles - lot.mintedBottles;
        if (available == 0) return;

        uint256 amount = _amount(amountSeed, available);
        token.mint(_holder(holderSeed), lotId, amount);
    }

    function burnFrom(uint8 holderSeed, uint32 amountSeed) external {
        address from = _holder(holderSeed);
        uint256 unfrozen = _unfrozen(from);
        if (unfrozen == 0) return;

        token.burnFrom(from, lotId, _amount(amountSeed, unfrozen));
    }

    function transferBetween(uint8 fromSeed, uint8 toSeed, uint32 amountSeed) external {
        address from = _holder(fromSeed);
        address to = _differentHolder(fromSeed, toSeed);
        uint256 unfrozen = _unfrozen(from);
        if (unfrozen == 0) return;

        try token.safeTransferFrom(from, to, lotId, _amount(amountSeed, unfrozen), "") {} catch {}
    }

    function forcedTransferBetween(uint8 fromSeed, uint8 toSeed, uint32 amountSeed) external {
        address from = _holder(fromSeed);
        address to = _differentHolder(fromSeed, toSeed);
        uint256 balance = token.balanceOf(from, lotId);
        if (balance == 0) return;

        token.forcedTransfer(from, to, lotId, _amount(amountSeed, balance));
    }

    function freezeHolder(uint8 holderSeed, uint32 frozenSeed) external {
        address account = _holder(holderSeed);
        uint256 balance = token.balanceOf(account, lotId);
        uint256 frozen = balance == 0 ? 0 : uint256(frozenSeed) % (balance + 1);
        token.setFrozenTokens(account, lotId, frozen);
    }

    function toggleSuspension(bool suspend) external {
        IWineLotToken.WineLot memory lot = token.getLot(lotId);
        if (suspend && lot.status == IWineLotToken.LotStatus.Verified) {
            token.suspendLot(lotId);
        } else if (!suspend && lot.status == IWineLotToken.LotStatus.Suspended) {
            token.unsuspendLot(lotId);
        }
    }

    function echidna_supply_accounting_is_consistent() external view returns (bool) {
        IWineLotToken.WineLot memory lot = token.getLot(lotId);
        return lot.redeemedBottles <= lot.mintedBottles && lot.mintedBottles <= lot.totalBottles
            && token.totalSupply(lotId) + lot.redeemedBottles == lot.mintedBottles;
    }

    function echidna_tracked_balances_match_supply() external view returns (bool) {
        return _trackedBalances() == token.totalSupply(lotId);
    }

    function echidna_fully_frozen_accounts_cannot_transfer() external view returns (bool) {
        for (uint256 i = 0; i < holders.length; i++) {
            address account = address(holders[i]);
            uint256 balance = token.balanceOf(account, lotId);
            if (balance > 0 && token.getFrozenTokens(account, lotId) >= balance) {
                address recipient = address(holders[(i + 1) % holders.length]);
                if (token.canTransfer(account, recipient, lotId, 1)) return false;
            }
        }
        return true;
    }

    function _holder(uint8 seed) internal view returns (address) {
        return address(holders[uint256(seed) % holders.length]);
    }

    function _differentHolder(uint8 fromSeed, uint8 toSeed) internal view returns (address) {
        uint256 fromIndex = uint256(fromSeed) % holders.length;
        uint256 offset = 1 + (uint256(toSeed) % (holders.length - 1));
        return address(holders[(fromIndex + offset) % holders.length]);
    }

    function _amount(uint256 seed, uint256 max) internal pure returns (uint256) {
        return 1 + (seed % max);
    }

    function _unfrozen(address account) internal view returns (uint256) {
        uint256 balance = token.balanceOf(account, lotId);
        uint256 frozen = token.getFrozenTokens(account, lotId);
        return balance > frozen ? balance - frozen : 0;
    }

    function _trackedBalances() internal view returns (uint256 sum) {
        for (uint256 i = 0; i < holders.length; i++) {
            sum += token.balanceOf(address(holders[i]), lotId);
        }
    }
}
