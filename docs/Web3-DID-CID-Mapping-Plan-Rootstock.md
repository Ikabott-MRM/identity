# Web3 DID↔CID Mapping (Rootstock) — Implementation Plan

## Goal
Keep the existing fast lookup in **MySQL** while additionally writing a **public, on-chain “directory”** record on **Rootstock** so a citizen can discover where their credential data lives **without calling our backend**.

## Current behavior (today)
When issuing a credential, the API:
- Uploads the **encrypted credential** to IPFS → gets `credentialCID`
- Stores `didUri -> credentialCID` in MySQL table **`did_cids`**
- Updates an **issuer manifest** and uploads it to IPFS → gets `manifestCID`
- Stores the latest manifest CID in MySQL table **`manifests`**

Retrieval flow (`queryCredentialsFromIPFS`) currently:
- Reads holder CIDs from MySQL (`did_cids`)
- Fetches those CIDs from IPFS and decrypts

## Proposed behavior (dual-write: MySQL + Rootstock)
On issuance, after producing `manifestCID`, the API will also:
- Compute a stable key: `didKey = keccak256(utf8(didUri))`
- Submit a Rootstock tx to store: `didKey -> manifestCID`

Citizen “backendless discovery”:
1. Citizen computes `didKey` locally from their DID.
2. Citizen reads `manifestCID = contract.getManifestCid(didKey)` from Rootstock via any RPC provider.
3. Citizen fetches manifest JSON from IPFS gateway and learns which credential CIDs exist.
4. Citizen fetches credential payloads from IPFS and decrypts locally (keys/salts remain client-side).

## Smart contract design (minimal)
Recommended minimal storage (cheaper than storing arrays of all credential CIDs):
- Store **only** the latest per-holder `manifestCID`.

Interface:
- `setManifestCid(bytes32 didKey, string calldata manifestCid)` (restricted)
- `getManifestCid(bytes32 didKey) external view returns (string memory)`

Access control:
- Use `Ownable` or role-based access control so only the issuer/admin can write.

Notes:
- Storing the DID as plaintext is linkable. Prefer `didKey` (hash) as the key.
- CIDs are public by nature; ensure the payloads remain encrypted as they are today.

## Backend changes (NestJS)
Add a new module/service (suggestion):
- `src/web3Registry/web3Registry.service.ts`
- `src/web3Registry/web3Registry.module.ts`

Responsibilities:
- Connect to Rootstock RPC (`WEB3_RPC_URL`)
- Instantiate contract at `WEB3_CONTRACT_ADDRESS`
- Sign txs (dev: private key; prod: consider KMS-based signing)
- `setManifestCid(didUri, manifestCid)` method with retries + logging (tx hash)

Integration point:
- In `IssuerAgentService.issueCredential()` after `newManifestCID` is created/uploaded and stored in DB:
  - Keep existing MySQL writes unchanged
  - Call `web3RegistryService.setManifestCid(subjectDid, newManifestCID)`

Error handling strategy (recommended):
- If Rootstock write fails, return success for issuance but log + alert, and enqueue a retry job (so issuance isn’t blocked by chain/RPC issues).

## Configuration (env vars)
Add to config (e.g. `src/config/configuration.ts`):
- `WEB3_RPC_URL`
- `WEB3_CHAIN_ID` (Rootstock chain id)
- `WEB3_CONTRACT_ADDRESS`
- **Signer**:
  - Dev: `WEB3_PRIVATE_KEY`
  - Later: KMS-based signing config (optional)

## Rollout steps
1. Deploy contract to Rootstock testnet (or chosen Rootstock network).
2. Add backend module + env vars and deploy to `identity-web3-node`.
3. Confirm issuance dual-writes:
   - MySQL `did_cids` continues to populate
   - Rootstock mapping updates on issuance (tx present)
4. Build a small citizen-side proof:
   - call `getManifestCid(didKey)`
   - fetch manifest from IPFS
   - fetch credential CIDs and verify decrypt flow works without backend

## Testing checklist
- Unit tests for `didKey` derivation (canonicalization consistency)
- “Happy path” issuance writes Rootstock mapping
- Retry behavior on transient RPC errors
- Confirm no secrets are leaked in logs (private key, etc.)



