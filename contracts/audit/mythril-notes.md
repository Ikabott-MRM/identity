# Mythril Analysis Notes — DidManifestRegistry.sol

**Date analyzed:** 2026-03-13
**Tool:** Mythril (SWC Registry detector)
**Contract:** `contracts/DidManifestRegistry.sol`
**Solidity version:** `^0.8.20`

---

## Findings Summary

All three findings carry SWC-101 ("Integer Overflow and Underflow") and the message
**"Arithmetic operator can underflow"**.

| #   | Function         | Reported location                   | Verdict        |
| --- | ---------------- | ----------------------------------- | -------------- |
| 1   | `setManifestCid` | Line 74 (source)                    | False positive |
| 2   | `getManifestCid` | `#utility.yul:92` (compiler helper) | False positive |
| 3   | `setManifestCid` | `#utility.yul:92` (compiler helper) | False positive |

---

## Root Cause of the Findings

### What Mythril is seeing

Mythril's SWC-101 module operates at **raw EVM opcode level** via symbolic execution (LASER
engine). It flags any `SUB` opcode whose operands can symbolically wrap below zero on the
256-bit word — regardless of whether that underflowing path terminates in a `REVERT`.

### Why `bytes(manifestCid).length` triggers it

Line 74 reads:

```solidity
if (bytes(manifestCid).length == 0) revert InvalidCid();
```

`manifestCid` is declared `string calldata`. Accessing `.length` on a `calldata` string does
**not** compile to a simple memory read. The Solidity 0.8+ Yul codegen emits an ABI decoder
that validates the calldata encoding before the function body is reached:

1. Reads the offset pointer from calldata.
2. Validates bounds: `calldatasize() - (offset + 32)` — emits a `SUB` opcode.
3. Reads the length word from calldata.
4. Validates length: `calldatasize() - (offset + 32 + length)` — another `SUB`.

Each `SUB` is immediately followed by a conditional `REVERT` if it would underflow. Mythril
sees the `SUB` with symbolic operands and reports the potential wrap-around, but does **not**
fully model that every underflowing execution path terminates in `REVERT`.

### What `#utility.yul:92` is

`#utility.yul` is a **compiler-synthetic pseudo-filename** embedded in the Solidity source
map. It denotes helper routines generated entirely by `solc` — notably `abi_decode_string_calldata`
and related bounds-check helpers. This is not code present in any source file; it is emitted
by the compiler.

Findings 2 and 3 appear there because Mythril traced execution into the same ABI decoder
routine when analyzing `getManifestCid` and `setManifestCid`. The `SUB` at `#utility.yul:92`
is the bounds-check subtraction described above.

---

## Why All Three Findings Are False Positives

The safety chain is complete:

1. **ABI decoding fires before the function body.** If calldata is malformed (bad offset,
   overflowing length field), the ABI decoder's own `REVERT` fires first. The function body
   is never reached with invalid data.

2. **Solidity 0.8+ checked arithmetic.** All user-written arithmetic in this contract is
   under checked mode by default. There is no user-written subtraction on these paths — only
   a `.length == 0` comparison.

3. **`onlyOwner` access gate.** Only the contract owner can call `setManifestCid`. No
   external actor can freely exercise this code path.

4. **`getManifestCid` has no arithmetic at all.** Finding 2 flags the ABI decoding of its
   `bytes32 didKey` parameter — a fixed-size type whose decoding involves no subtraction in
   the user path; the flagged `SUB` lives entirely inside the compiler helper.

**Actual exploitability: zero.** There is no state-corrupting or fund-draining path reachable
through these code sites.

---

## Known Mythril Behavior

This class of false positive is documented:

- **Mythril GitHub issue #1316, #166** — SWC-101 detector does not require the underflowing
  path to reach a harmful state; it flags the `SUB` opcode alone.
- **Solidity GitHub issue #13335** — External bytecode analysis tools flag `#utility.yul`
  compiler helpers because `solc` uses subtraction-based encoding for equality checks and
  bounds guards that appear unprotected to pure-opcode analyzers.

The SWC-101 module is intentionally conservative (minimizes false negatives at the cost of
false positives) and is known to fire on ABI decoder code in every contract that accepts
`string` or `bytes` calldata parameters.

---

## Recommended Actions

| Action                                                           | Status                                    |
| ---------------------------------------------------------------- | ----------------------------------------- |
| Add explanatory comments at each flagged source line             | Done (lines 74, 105, 121, 134)            |
| Filter `#utility.yul`-only findings in the Mythril runner script | Done (`scripts/run-myth-with-timeout.js`) |
| No contract logic changes                                        | N/A — code is correct as written          |

---

## No Changes Required to Contract Logic

The `.length == 0` guard pattern is idiomatic and correct in Solidity 0.8+. The contract's
access control, storage layout, event structure, and `Ownable2Step` inheritance are unaffected.
