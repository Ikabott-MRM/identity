// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../../contracts/DidManifestRegistry.sol";

/**
 * @title RegistryHandler
 * @dev Handler contract for invariant testing of DidManifestRegistry.
 *
 *      The Foundry invariant fuzzer calls functions on this handler contract
 *      (not the registry directly). The handler:
 *        - Acts as the registry owner so it can call write functions
 *        - Maintains a "ghost state" mirror that tracks what should be in the registry
 *        - Exposes helpers so the invariant test can query ghost state
 *
 *      Ghost state allows the invariant test to assert things like
 *      "every key I think is stored actually IS stored with a non-empty CID".
 */
contract RegistryHandler is Test {
    DidManifestRegistry public registry;

    // ── Ghost state ──────────────────────────────────────────────────────────
    // Keys currently stored in the registry (according to our mirror)
    bytes32[] internal _storedKeys;
    // Tracks whether a key is in _storedKeys to avoid duplicates
    mapping(bytes32 => bool) internal _isStored;
    // The CID we last stored for each key (mirror of on-chain mapping)
    mapping(bytes32 => string) internal _ghostCid;

    // Deleted keys (keys we have confirmed are no longer in the registry)
    bytes32[] internal _deletedKeys;

    // Counter for non-owner call attempts that we expect to revert
    uint256 public nonOwnerAttempts;
    uint256 public nonOwnerSuccesses; // should always stay 0

    constructor(DidManifestRegistry _registry) {
        registry = _registry;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Handler: set a single manifest CID
    // ─────────────────────────────────────────────────────────────────────────
    function set(bytes32 didKey, string calldata manifestCid) external {
        if (bytes(manifestCid).length == 0) return; // skip invalid — let fuzz tests cover that

        registry.setManifestCid(didKey, manifestCid);

        // Update ghost state
        if (!_isStored[didKey]) {
            _storedKeys.push(didKey);
            _isStored[didKey] = true;
        }
        _ghostCid[didKey] = manifestCid;

        // Remove from deleted list if it was previously deleted
        _removeFromDeletedKeys(didKey);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Handler: delete a manifest CID (only if it exists in ghost state)
    // ─────────────────────────────────────────────────────────────────────────
    function remove(bytes32 didKey) external {
        if (!_isStored[didKey]) return; // nothing to delete

        registry.deleteManifestCid(didKey);

        // Update ghost state
        _isStored[didKey] = false;
        _ghostCid[didKey] = "";
        _deletedKeys.push(didKey);
        _removeFromStoredKeys(didKey);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Handler: batch set (bounded to 4 entries to keep gas manageable)
    // ─────────────────────────────────────────────────────────────────────────
    function batchSet(bytes32[4] calldata keys, string[4] calldata cids) external {
        bytes32[] memory didKeys = new bytes32[](4);
        string[] memory manifestCids = new string[](4);
        for (uint256 i = 0; i < 4; i++) {
            if (bytes(cids[i]).length == 0) return; // bail on any empty CID
            didKeys[i] = keys[i];
            manifestCids[i] = cids[i];
        }

        registry.setManifestCidsBatch(didKeys, manifestCids);

        // Iterate in forward order so last-write-wins is reflected in ghost state
        for (uint256 i = 0; i < 4; i++) {
            if (!_isStored[didKeys[i]]) {
                _storedKeys.push(didKeys[i]);
                _isStored[didKeys[i]] = true;
            }
            // Overwrite ghost CID; for duplicates this will settle on the last entry
            _ghostCid[didKeys[i]] = manifestCids[i];
            _removeFromDeletedKeys(didKeys[i]);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Handler: attempt to call set as a non-owner (should always revert)
    // ─────────────────────────────────────────────────────────────────────────
    function setAsNonOwner(address caller, bytes32 didKey, string calldata manifestCid) external {
        if (caller == address(this)) return; // handler IS the owner; skip same address
        if (caller == address(0)) return;
        if (bytes(manifestCid).length == 0) return;

        nonOwnerAttempts++;

        vm.prank(caller);
        try registry.setManifestCid(didKey, manifestCid) {
            nonOwnerSuccesses++;
        } catch {
            // Expected — revert is correct behaviour
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Ghost state read helpers (used by invariant test)
    // ─────────────────────────────────────────────────────────────────────────
    function storedKeysCount() external view returns (uint256) {
        return _storedKeys.length;
    }

    function storedKeyAt(uint256 index) external view returns (bytes32) {
        return _storedKeys[index];
    }

    function ghostCidFor(bytes32 didKey) external view returns (string memory) {
        return _ghostCid[didKey];
    }

    function isTracked(bytes32 didKey) external view returns (bool) {
        return _isStored[didKey];
    }

    function deletedKeysCount() external view returns (uint256) {
        return _deletedKeys.length;
    }

    function deletedKeyAt(uint256 index) external view returns (bytes32) {
        return _deletedKeys[index];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers for maintaining array-based sets
    // ─────────────────────────────────────────────────────────────────────────
    function _removeFromStoredKeys(bytes32 key) internal {
        uint256 len = _storedKeys.length;
        for (uint256 i = 0; i < len; i++) {
            if (_storedKeys[i] == key) {
                _storedKeys[i] = _storedKeys[len - 1];
                _storedKeys.pop();
                return;
            }
        }
    }

    function _removeFromDeletedKeys(bytes32 key) internal {
        uint256 len = _deletedKeys.length;
        for (uint256 i = 0; i < len; i++) {
            if (_deletedKeys[i] == key) {
                _deletedKeys[i] = _deletedKeys[len - 1];
                _deletedKeys.pop();
                return;
            }
        }
    }
}
