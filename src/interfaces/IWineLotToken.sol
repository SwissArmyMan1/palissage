// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC7943MultiToken} from "./IERC7943.sol";

/// @title IWineLotToken — wine lot RWA token: one tokenId per lot, balance = bottles.
interface IWineLotToken is IERC1155, IERC7943MultiToken {
    enum LotStatus {
        Draft,
        Verified,
        Suspended,
        Closed
    }

    enum ProductionStatus {
        Announced,
        Growing,
        Harvested,
        Vinification,
        Aging,
        Bottled,
        ReadyForDelivery
    }

    /// @notice Full onchain wine lot record. Extended data (photos, documents,
    ///         redemption rules) lives in the JSON behind `metadataURI`, anchored by `docsHash`.
    struct WineLot {
        address winery;
        LotStatus status;
        ProductionStatus production;
        uint32 totalBottles;
        uint32 mintedBottles;
        uint32 redeemedBottles;
        uint16 vintage;
        uint16 royaltyBps;
        uint32 bottleSizeMl;
        bool exportAllowed;
        address verifier;
        string name;
        string region;
        string grapes;
        string metadataURI;
        bytes32 docsHash;
    }

    struct WineLotInput {
        uint32 totalBottles;
        uint16 vintage;
        uint16 royaltyBps;
        uint32 bottleSizeMl;
        bool exportAllowed;
        string name;
        string region;
        string grapes;
        string metadataURI;
    }

    event LotCreated(uint256 indexed lotId, address indexed winery, uint32 totalBottles, uint16 vintage);
    event LotVerified(uint256 indexed lotId, address indexed verifier, bytes32 docsHash);
    event LotStatusChanged(uint256 indexed lotId, LotStatus status);
    event ProductionStatusChanged(uint256 indexed lotId, ProductionStatus production);
    event LotMetadataUpdated(uint256 indexed lotId, string metadataURI, bytes32 docsHash);

    function createLot(WineLotInput calldata input) external returns (uint256 lotId);
    function verifyLot(uint256 lotId, bytes32 docsHash) external;
    function setProductionStatus(uint256 lotId, ProductionStatus production) external;
    function updateLotMetadata(uint256 lotId, string calldata metadataURI, bytes32 docsHash) external;
    function suspendLot(uint256 lotId) external;
    function unsuspendLot(uint256 lotId) external;
    function closeLot(uint256 lotId) external;

    function mint(address to, uint256 lotId, uint256 amount) external;
    function burnFrom(address from, uint256 lotId, uint256 amount) external;

    function getLot(uint256 lotId) external view returns (WineLot memory lot);
    function lotExists(uint256 lotId) external view returns (bool exists);
    function lotCount() external view returns (uint256 count);
}
