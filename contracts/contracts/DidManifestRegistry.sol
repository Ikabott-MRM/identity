// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DidManifestRegistry
 * @dev Stores mapping of DID keys (keccak256 hash of DID URI) to manifest CIDs on IPFS.
 *      Only the contract owner (issuer backend) can write mappings.
 *      Anyone can read mappings.
 */
contract DidManifestRegistry is Ownable {
    // Mapping from DID key (bytes32) to manifest CID (string)
    mapping(bytes32 => string) private manifestCidByDidKey;

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
        require(
            bytes(manifestCid).length > 0,
            "DidManifestRegistry: manifestCid cannot be empty"
        );

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
        require(
            didKeys.length == manifestCids.length,
            "DidManifestRegistry: arrays length mismatch"
        );

        for (uint256 i = 0; i < didKeys.length; i++) {
            require(
                bytes(manifestCids[i]).length > 0,
                "DidManifestRegistry: manifestCid cannot be empty"
            );
            manifestCidByDidKey[didKeys[i]] = manifestCids[i];
            emit ManifestCidSet(didKeys[i], manifestCids[i], msg.sender);
        }
    }
}


