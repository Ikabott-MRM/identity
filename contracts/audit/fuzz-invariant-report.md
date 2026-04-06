# Fuzz & Invariant Testing Report

## DidManifestRegistry.sol

**Date:** 2026-03-16  
**Tool:** Foundry 1.5.1-stable (`forge`)  
**Compiler:** Solc 0.8.33 (auto-selected by Foundry; contract targets ^0.8.20)  
**Network target:** Rootstock (RSK) — chainId 30/31  
**Tester:** Automated via Foundry fuzzer — no manual input selection

---

## 1. Contract Under Test

`DidManifestRegistry` is a registry that maps DID keys (`bytes32`, the `keccak256` hash of a DID URI) to IPFS manifest CIDs (`string`). It is deployed on Rootstock and acts as the authoritative on-chain source of DID-to-manifest pointers for the SSI issuer backend.

**Inheritance:** `Ownable2Step` (OpenZeppelin)

**Write surface (owner-only):**

| Function                                    | Description                                        |
| ------------------------------------------- | -------------------------------------------------- |
| `setManifestCid(bytes32, string)`           | Store or overwrite a single DID→CID mapping        |
| `setManifestCidsBatch(bytes32[], string[])` | Store or overwrite multiple mappings in one tx     |
| `deleteManifestCid(bytes32)`                | Delete a single mapping; reverts if not found      |
| `deleteManifestCidsBatch(bytes32[])`        | Delete multiple mappings; reverts if any not found |

**Read surface (public):**

| Function                  | Description                            |
| ------------------------- | -------------------------------------- |
| `getManifestCid(bytes32)` | Returns stored CID, or `""` if not set |

**Custom errors:** `InvalidCid`, `ArrayMismatch`, `ManifestNotFound`

---

## 2. Testing Methodology

### 2.1 Fuzz Testing (Stateless)

Foundry's fuzz engine generates random values for every function parameter on each run. The test asserts a _property_ — a statement that must hold for _all_ inputs, not just the ones a human would think of.

**Configuration:** 1,000 runs per test function (`[fuzz] runs = 1000` in `foundry.toml`).

Each run generates fresh random values for `bytes32` keys, `string` CIDs, `address` callers, and arrays of varying lengths, covering edge cases like:

- `bytes32(0)` as a key
- Unicode strings, emoji, null-bytes, and very long strings
- Arrays of length 0, 1, and large sizes
- Addresses at address space boundaries (e.g. `address(1)`, `address(type(uint160).max)`)

### 2.2 Invariant Testing (Stateful Fuzzing)

The invariant engine randomly calls contract functions in sequence — up to `depth` calls per run — then checks that a set of _invariants_ (rules that must always be true) hold after every call sequence.

**Configuration:** 200 runs × 50 calls per run = up to **10,000 state transitions** per invariant.

A **handler contract** (`RegistryHandler`) was written to wrap the registry. The handler:

- Holds ownership of the registry so it can perform valid writes
- Maintains a **ghost state** — an in-memory mirror of what should currently be stored on-chain
- Exposes a `setAsNonOwner` function that attempts writes from arbitrary addresses to probe access control

The fuzzer calls `set`, `remove`, `batchSet`, and `setAsNonOwner` in random order with random inputs. After each call sequence, all five invariant functions are evaluated.

---

## 3. Test Files

| File                                                         | Role                                                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `test/foundry/DidManifestRegistry.fuzz.t.sol`                | 9 stateless fuzz tests                                                 |
| `test/foundry/invariant/RegistryHandler.sol`                 | Handler + ghost state mirror for invariant fuzzer                      |
| `test/foundry/invariant/DidManifestRegistry.invariant.t.sol` | 5 stateful invariant tests                                             |
| `foundry.toml`                                               | Foundry configuration (src, libs, remappings, fuzz/invariant settings) |

---

## 4. Fuzz Tests — Detail and Results

All 9 fuzz tests passed on 1,000 randomly generated inputs each.

---

### F-01 · `testFuzz_setAndGet`

**Property:** For any non-empty CID and any `bytes32` key, setting a manifest CID and then immediately reading it returns exactly the value that was written.

**Inputs:** `bytes32 didKey`, `string manifestCid` (filtered: non-empty)  
**Runs:** 1,000  
**Result:** PASS

**Why it matters:** This is the core data-integrity guarantee of the registry. A failure here would mean values are silently corrupted or lost on write.

---

### F-02 · `testFuzz_emptyStringAlwaysReverts`

**Property:** Calling `setManifestCid` with an empty string always reverts with `InvalidCid`, for any key.

**Inputs:** `bytes32 didKey`  
**Runs:** 1,000  
**Result:** PASS

**Why it matters:** An empty CID is meaningless — it would make `getManifestCid` indistinguishable from "not found". The guard must be airtight for every possible key, not just the ones tested by hand.

---

### F-03 · `testFuzz_nonOwnerCannotSet`

**Property:** Any address other than the owner — no matter what key or CID is used — is always rejected with `OwnableUnauthorizedAccount`.

**Inputs:** `address caller` (filtered: not owner, not zero address), `bytes32 didKey`, `string manifestCid` (filtered: non-empty)  
**Runs:** 1,000  
**Result:** PASS

**Why it matters:** This is the primary access-control property of the contract. If any address could bypass `onlyOwner`, arbitrary parties could overwrite or inject DID→CID mappings, breaking the trust model of the issuer backend.

---

### F-04 · `testFuzz_setOverwritesValue`

**Property:** Writing a second (different) CID to the same key always replaces the first value.

**Inputs:** `bytes32 didKey`, `string firstCid`, `string secondCid` (both non-empty, not equal to each other)  
**Runs:** 1,000  
**Result:** PASS

**Why it matters:** Updates to IPFS manifest pointers (e.g. when a credential manifest is revised) must fully replace the old value with no stale data retained.

---

### F-05 · `testFuzz_deleteAfterSet`

**Property:** After writing a CID and then deleting it, `getManifestCid` always returns `""`.

**Inputs:** `bytes32 didKey`, `string manifestCid` (non-empty)  
**Runs:** 1,000  
**Result:** PASS

**Why it matters:** A delete that leaves behind a ghost value would cause verifiers to still find and trust a manifest that has been intentionally revoked.

---

### F-06 · `testFuzz_batchArrayMismatch`

**Property:** Any call to `setManifestCidsBatch` where `didKeys.length != manifestCids.length` always reverts with `ArrayMismatch`.

**Inputs:** `bytes32[] didKeys`, `string[] manifestCids` (filtered: different lengths)  
**Runs:** 1,000  
**Result:** PASS

**Why it matters:** Without this guard, a mismatched batch could silently pair the wrong CID with the wrong DID key, or index out of bounds.

---

### F-07 · `testFuzz_batchSetAndGet`

**Property:** After a valid batch set of 4 entries, each key that appears only once (or last, if duplicated) returns its corresponding CID.

**Inputs:** `bytes32[4] keys`, `string[4] cids` (all non-empty)  
**Runs:** 1,001  
**Result:** PASS

**Notable finding during development:** The first version of this test naively asserted all 4 positions. The fuzzer immediately discovered a case where two entries in the batch shared the same key — the first write was overwritten by the second. This is correct and expected behaviour (last-write-wins), but it means a naive assertion fails. The test was corrected to only assert from the final-writer's perspective. This is a direct example of the fuzzer finding a real edge case that hand-written unit tests missed.

---

### F-08 · `testFuzz_bytes32ZeroKeyIsValid`

**Property:** `bytes32(0)` (the zero hash) is a valid key — the contract treats it identically to any other key, with no special-casing.

**Inputs:** `string manifestCid` (non-empty)  
**Runs:** 1,000  
**Result:** PASS

**Why it matters:** A contract that rejects or silently ignores `bytes32(0)` would be incompatible with any DID whose hash happens to produce that value, or with the initial state of storage slots.

---

### F-09 · `testFuzz_nonExistentKeyReturnsEmpty`

**Property:** On a fresh contract, `getManifestCid` returns `""` for every possible key without reverting.

**Inputs:** `bytes32 didKey`  
**Runs:** 1,000  
**Result:** PASS

**Why it matters:** The contract documentation specifies that unset keys return empty string. If the function reverted instead, any verifier checking an unknown DID would crash rather than receiving a graceful "not found" signal.

---

## 5. Invariant Tests — Detail and Results

All 5 invariant tests passed across 200 runs × 50 call-depth = **10,000 state-changing interactions** each.

The call distribution per invariant run (representative sample):

| Handler Function | Calls  | Reverts | Discards |
| ---------------- | ------ | ------- | -------- |
| `set`            | ~2,470 | 0       | 0        |
| `remove`         | ~2,530 | 0       | 0        |
| `batchSet`       | ~2,490 | 0       | 0        |
| `setAsNonOwner`  | ~2,510 | 0       | 0        |

Zero reverts from the handler means the handler correctly guards all invalid inputs before forwarding to the contract (empty CIDs, non-existent deletes), so the fuzzer is exploring valid state space efficiently rather than wasting cycles on input validation.

---

### I-01 · `invariant_ownerIsAlwaysHandler`

**Rule:** `registry.owner()` must always equal `address(handler)` — ownership must never silently change to an unexpected address after any sequence of calls.

**Runs:** 200 | **Calls:** 10,000 | **Reverts:** 0  
**Result:** PASS

**Why it matters:** `Ownable2Step` requires two transactions to transfer ownership. This invariant verifies that no random call sequence in the handler can accidentally trigger an ownership transfer or acceptance.

---

### I-02 · `invariant_storedCidIsNeverEmpty`

**Rule:** For every key that the ghost state believes is currently stored, the on-chain `getManifestCid` must return a non-empty string.

**Runs:** 200 | **Calls:** 10,000 | **Reverts:** 0  
**Result:** PASS

**Why it matters:** This is a direct end-to-end check that `setManifestCid` and `setManifestCidsBatch` always persist the data correctly, and that no later operation (e.g. a delete of a different key) can corrupt an unrelated key's value.

---

### I-03 · `invariant_deletedKeyReturnsEmpty`

**Rule:** For every key that the ghost state has marked as deleted, the on-chain `getManifestCid` must return `""`.

**Runs:** 200 | **Calls:** 10,000 | **Reverts:** 0  
**Result:** PASS

**Why it matters:** This verifies that `deleteManifestCid` and `deleteManifestCidsBatch` fully clean up storage, and that subsequent writes to other keys do not resurrect a deleted entry.

---

### I-04 · `invariant_ghostMirrorConsistency`

**Rule:** For every key in ghost state, the on-chain value must exactly match the last CID the handler wrote for that key — no silent corruption, no partial writes.

**Runs:** 200 | **Calls:** 10,000 | **Reverts:** 0  
**Result:** PASS

**Why it matters:** This is the most comprehensive data-integrity invariant. It catches any scenario where the contract's internal storage diverges from what callers believe they stored, including edge cases like string truncation, storage slot collisions, or unexpected side effects from `unchecked` arithmetic in the batch loops.

---

### I-05 · `invariant_nonOwnerCannotMutate`

**Rule:** The `nonOwnerSuccesses` counter in the handler must always be zero — no call from a non-owner address must ever succeed in writing to the registry.

**Runs:** 200 | **Calls:** 10,000 | **Reverts:** 0  
**Result:** PASS

**Why it matters:** `setAsNonOwner` called the registry with ~2,500 different addresses across random key/CID combinations under full stateful conditions. None of them succeeded. This provides much stronger access-control assurance than the unit tests, which only checked a handful of fixed addresses.

---

## 6. Notable Finding: Batch Duplicate-Key Behaviour

During the fuzz test run for `testFuzz_batchSetAndGet` (F-07), the fuzzer discovered on run 6 that a batch containing a duplicate key (the same `bytes32` appearing twice in the `didKeys` array) causes the first entry to be silently overwritten by the second. This is **not a bug** — it is correct and consistent with the contract's design as a simple mapping — but it is **behaviour that was not covered by the existing Hardhat unit tests**.

**Practical implication:** Callers of `setManifestCidsBatch` should not pass duplicate keys. If they do, only the last occurrence takes effect and no error is raised. This should be documented as a known behaviour and ideally validated at the application layer (the NestJS backend) before calling the contract.

---

## 7. Summary

| Category             | Tests  | Passed | Failed |
| -------------------- | ------ | ------ | ------ |
| Fuzz (stateless)     | 9      | 9      | 0      |
| Invariant (stateful) | 5      | 5      | 0      |
| **Total**            | **14** | **14** | **0**  |

**Total fuzzer executions:**

- Fuzz tests: ~9,000 individual property checks (1,000 runs × 9 tests)
- Invariant tests: ~50,000 state-changing calls across 1,000 run-sequences (200 runs × 50 depth × 5 invariants)

**Conclusion:** No vulnerabilities, logic errors, or violated properties were found. The contract behaves correctly across the full space of inputs tested. The one behaviour surfaced — silent last-write-wins on duplicate batch keys — is correct by design but should be noted in documentation and guarded at the application layer.

**Recommended next step before mainnet:** Increase invariant depth to `runs = 500, depth = 100` in `foundry.toml` for a pre-audit deep sweep (~10× more state transitions), and consider adding a formal audit of the `Ownable2Step` ownership transfer path.
