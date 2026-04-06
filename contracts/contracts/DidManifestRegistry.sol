// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title DidManifestRegistry
 * @dev Stores mapping of DID keys (keccak256 hash of DID URI) to manifest CIDs on IPFS.
 *      Only the contract owner (issuer backend) can write mappings.
 *      Anyone can read mappings.
 */
contract DidManifestRegistry is Ownable2Step {
    // Mapping from DID key (bytes32) to manifest CID (string)
    mapping(bytes32 => string) private manifestCidByDidKey;

    error InvalidCid();
    error ArrayMismatch();
    error ManifestNotFound();

    /**
     * @dev Emitted when a manifest CID is set for a DID key.
     * @param didKey The hashed DID URI (keccak256)
     * @param manifestCid The IPFS CID of the manifest
     * @param writer The address that wrote the mapping (msg.sender)
     */
    event ManifestCidSet(
        bytes32 indexed didKey,
        string manifestCid,
        address indexed writer
    );

    /**
     * @dev Emitted when multiple manifest CIDs are set in a batch.
     * @param didKeys Array of DID keys
     * @param manifestCids Array of manifest CIDs
     * @param writer The address that wrote the mappings (msg.sender)
     */
    event ManifestCidsBatchSet(
        bytes32[] didKeys,
        string[] manifestCids,
        address indexed writer
    );

    /**
     * @dev Emitted when a manifest CID is deleted for a DID key.
     * @param didKey The hashed DID URI (keccak256)
     * @param writer The address that deleted the mapping (msg.sender)
     */
    event ManifestCidDeleted(bytes32 indexed didKey, address indexed writer);

    /**
     * @dev Emitted when multiple manifest CIDs are deleted in a batch.
     * @param didKeys Array of DID keys
     * @param writer The address that deleted the mappings (msg.sender)
     */
    event ManifestCidsBatchDeleted(bytes32[] didKeys, address indexed writer);

    /**
     * @dev Constructor sets the deployer as the initial owner.
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Sets the manifest CID for a given DID key.
     *      Only callable by the contract owner.
     * @param didKey The keccak256 hash of the DID URI
     * @param manifestCid The IPFS CID of the manifest (must be non-empty)
     */
    function setManifestCid(
        bytes32 didKey,
        string calldata manifestCid
    ) external onlyOwner {
        // SWC-101 false positive: Mythril flags the ABI decoder SUB opcode emitted by solc for
        // `string calldata` length validation. That SUB is guarded by a compiler-inserted REVERT;
        // no underflow is reachable. See audit/mythril-notes.md for full analysis.
        if (bytes(manifestCid).length == 0) revert InvalidCid();

        manifestCidByDidKey[didKey] = manifestCid;

        emit ManifestCidSet(didKey, manifestCid, msg.sender);
    }

    /**
     * @dev Retrieves the manifest CID for a given DID key.
     * @param didKey The keccak256 hash of the DID URI
     * @return The IPFS CID of the manifest, or empty string if not set
     */
    function getManifestCid(
        bytes32 didKey
    ) external view returns (string memory) {
        return manifestCidByDidKey[didKey];
    }

    /**
     * @dev Batch set multiple manifest CIDs in a single transaction.
     *      Only callable by the contract owner.
     * @param didKeys Array of DID keys
     * @param manifestCids Array of corresponding manifest CIDs
     */
    function setManifestCidsBatch(
        bytes32[] calldata didKeys,
        string[] calldata manifestCids
    ) external onlyOwner {
        if (didKeys.length != manifestCids.length) revert ArrayMismatch();

        for (uint256 i = 0; i < didKeys.length; ) {
            // SWC-101 false positive: same ABI decoder false positive as setManifestCid line 77.
            if (bytes(manifestCids[i]).length == 0) revert InvalidCid();
            manifestCidByDidKey[didKeys[i]] = manifestCids[i];
            unchecked {
                ++i;
            }
        }
        emit ManifestCidsBatchSet(didKeys, manifestCids, msg.sender);
    }

    /**
     * @dev Deletes the manifest mapping for a given DID key.
     *      Only callable by the contract owner.
     *      Reverts if the manifest does not exist.
     * @param didKey The keccak256 hash of the DID URI
     */
    function deleteManifestCid(bytes32 didKey) external onlyOwner {
        if (bytes(manifestCidByDidKey[didKey]).length == 0) revert ManifestNotFound();
        delete manifestCidByDidKey[didKey];
        emit ManifestCidDeleted(didKey, msg.sender);
    }

    /**
     * @dev Batch delete multiple manifest mappings in a single transaction.
     *      Only callable by the contract owner.
     *      Reverts if any of the manifests do not exist.
     * @param didKeys Array of DID keys to delete
     */
    function deleteManifestCidsBatch(bytes32[] calldata didKeys) external onlyOwner {
        for (uint256 i = 0; i < didKeys.length; ) {
            if (bytes(manifestCidByDidKey[didKeys[i]]).length == 0) revert ManifestNotFound();
            delete manifestCidByDidKey[didKeys[i]];
            unchecked {
                ++i;
            }
        }
        emit ManifestCidsBatchDeleted(didKeys, msg.sender);
    }
}
