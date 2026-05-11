// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../../contracts/DidManifestRegistry.sol";
import "./RegistryHandler.sol";

/**
 * @title DidManifestRegistryInvariantTest
 * @dev Invariant (stateful fuzz) tests for DidManifestRegistry.
 *
 *      The Foundry invariant engine will:
 *        1. Randomly call functions on RegistryHandler (call depth per sequence: `[invariant].depth` in foundry.toml)
 *        2. After each call sequence, execute every function prefixed `invariant_`
 *        3. Fail the test if any invariant ever returns false / reverts
 *
 *      The handler maintains ghost state (a mirror of what should be in the
 *      registry), which lets us write invariants that span multiple calls.
 */
contract DidManifestRegistryInvariantTest is Test {
    DidManifestRegistry public registry;
    RegistryHandler public handler;

    function setUp() public {
        registry = new DidManifestRegistry();

        // The handler is deployed FROM this test contract, so the registry
        // constructor sets address(this) as owner.  We need to transfer
        // ownership to the handler so it can call write functions.
        handler = new RegistryHandler(registry);
        registry.transferOwnership(address(handler));
        vm.prank(address(handler));
        registry.acceptOwnership();

        // Tell Foundry to only call functions on the handler contract,
        // not on the registry directly (which would hit access-control reverts
        // that are not useful for state exploration).
        targetContract(address(handler));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Invariant 1: owner() is always the handler (the only authorised writer).
    //              It must never silently change to an unexpected address.
    // ─────────────────────────────────────────────────────────────────────────
    function invariant_ownerIsAlwaysHandler() public view {
        assertEq(
            registry.owner(),
            address(handler),
            "Invariant broken: registry owner changed unexpectedly"
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Invariant 2: every key tracked in ghost state has a non-empty CID
    //              stored on-chain.
    //              (Verifies set() always persists correctly.)
    // ─────────────────────────────────────────────────────────────────────────
    function invariant_storedCidIsNeverEmpty() public view {
        uint256 count = handler.storedKeysCount();
        for (uint256 i = 0; i < count; i++) {
            bytes32 key = handler.storedKeyAt(i);
            string memory onChainCid = registry.getManifestCid(key);
            assertGt(
                bytes(onChainCid).length,
                0,
                "Invariant broken: a tracked key has an empty CID on-chain"
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Invariant 3: every key that the handler deleted returns empty string.
    //              (Verifies delete() always removes correctly.)
    // ─────────────────────────────────────────────────────────────────────────
    function invariant_deletedKeyReturnsEmpty() public view {
        uint256 count = handler.deletedKeysCount();
        for (uint256 i = 0; i < count; i++) {
            bytes32 key = handler.deletedKeyAt(i);
            assertEq(
                registry.getManifestCid(key),
                "",
                "Invariant broken: a deleted key still has a non-empty CID on-chain"
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Invariant 4: ghost mirror consistency — for every key the handler
    //              believes is stored, the on-chain value matches the ghost CID.
    //              (Verifies no silent corruption / overwrite of values.)
    // ─────────────────────────────────────────────────────────────────────────
    function invariant_ghostMirrorConsistency() public view {
        uint256 count = handler.storedKeysCount();
        for (uint256 i = 0; i < count; i++) {
            bytes32 key = handler.storedKeyAt(i);
            assertEq(
                registry.getManifestCid(key),
                handler.ghostCidFor(key),
                "Invariant broken: on-chain CID differs from ghost mirror"
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Invariant 5: a non-owner call to setManifestCid must NEVER succeed.
    //              The handler counts successes; this invariant asserts it stays 0.
    // ─────────────────────────────────────────────────────────────────────────
    function invariant_nonOwnerCannotMutate() public view {
        assertEq(
            handler.nonOwnerSuccesses(),
            0,
            "Invariant broken: a non-owner call to setManifestCid succeeded"
        );
    }
}
