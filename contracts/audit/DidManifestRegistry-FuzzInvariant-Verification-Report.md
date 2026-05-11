# Verification report: Foundry fuzz and invariant tests (500 x 100)

## Purpose

This document is evidence that the **pre-mainnet deep invariant profile** (`[invariant]` **runs = 500**, **depth = 100**) and the configured stateless fuzz profile (`[fuzz]` **runs = 1000**) were executed successfully with **zero failures**.

For methodology and property definitions, see the main report: [fuzz-invariant-report.md](./fuzz-invariant-report.md) (and the copy under `docs/identity/`).

## Scope

Tests deploy `DidManifestRegistry` locally inside Foundry’s EVM (see `test/foundry/invariant/DidManifestRegistry.invariant.t.sol` `setUp`). This verifies **contract bytecode and logic** at the configured depth; it is **not** a forked call sequence against a live Mainnet contract address unless you add such a test separately.

## Configuration verified

File: [`../foundry.toml`](../foundry.toml)

| Section     | Setting                          |
| ----------- | -------------------------------- |
| `[fuzz]`    | `runs = 1000`                    |
| `[invariant]` | `runs = 500`, `depth = 100`    |

## How to reproduce

```bash
cd identity/contracts
forge --version
forge test
```

Optional (same tests, via npm):

```bash
cd identity/contracts
npm run test:foundry
```

## Results

| Suite        | Tests | Passed | Failed |
| ------------ | ----- | ------ | ------ |
| Stateless fuzz (`DidManifestRegistry.fuzz.t.sol`) | 9 | 9 | 0 |
| Stateful invariants (`DidManifestRegistry.invariant.t.sol`) | 5 | 5 | 0 |
| **Total**    | **14** | **14** | **0** |

Each of the five invariant tests executed with **500** sequences and **50,000** handler calls per invariant function, with **0** handler reverts reported by Foundry.

**Headline execution counts (approximate):**

- Stateless fuzz: ~9,000 runs across nine tests (one test uses 1,001 runs).
- Invariant calls: **5 x 50,000 = 250,000** handler calls.
- **Combined:** on the order of **~259,000** fuzz plus invariant executions (see main report for exact wording).

## Evidence artifacts

| Artifact | Description |
| -------- | ----------- |
| [forge-test-evidence-summary.txt](./forge-test-evidence-summary.txt) | ASCII transcript summary suitable for attachments |
| Console log | Run `forge test` locally and retain stdout, or attach CI logs if you add a Foundry job later |

**Tooling note:** Foundry 1.5.1-stable was used for the recorded run (`forge --version`). Minor timing differences between machines are expected.

## Sign-off

- **Configuration:** `[invariant]` 500 x 100 committed in `foundry.toml`.
- **Outcome:** `forge test` exit code **0**; all **14** tests **PASS**.

For questions about individual invariants, see comments in `test/foundry/invariant/DidManifestRegistry.invariant.t.sol`.
