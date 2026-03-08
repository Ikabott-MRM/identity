# Milestone 1 Complete: Rootstock SSI Integration - Testnet Launch

**Date:** January 17, 2026  
**Grant:** [2510] Self Sovereign Identity (SSI) Sandbox Rootstock Integration  
**Milestone:** Milestone 1 - Testnet Launch with Rootstock Integration  
**Status:** COMPLETE

---

> **Posting note (governance tracking):** Please post this milestone update as a **comment** on the original **[2510] grant proposal thread** (instead of creating a new thread), so the full lifecycle stays in one place.

## Deliverables + proof links (Milestone 1)

| Deliverable | Status | Proof |
|------------|--------|-------|
| Smart contract deployed to Rootstock testnet | ✅ Complete | [Contract on Blockscout](https://rootstock-testnet.blockscout.com/address/0x657b5b93E07aDd7B0DA58043B68f5DDC57aF467f) |
| DID→CID write/read cycle works | ✅ Complete | [Example tx](https://rootstock-testnet.blockscout.com/tx/0x86f469e8ed3e22b33558a36c5fe54cfa99b25c0488692ba079a89f4214d6f6d6) + [Example manifest (IPFS)](https://gateway.pinata.cloud/ipfs/QmfMQfrdXLw82GjxJaJZMdkZvttYrwXp6BXD79PJZ5VAB9) |
| Backend dual-write (MySQL + Rootstock) | ✅ Complete | [Key commits](https://github.com/Ikabott-MRM/identity) (see `352206f`, `fbbbc4d`, `683e2d9`) |
| Citizen app backendless discovery | ✅ Complete | Android APK build: https://expo.dev/accounts/ikabotts-organization/projects/ssi-web3/builds/62fe83c4-2a41-4abe-a9f0-fb53c001fa66 |
| Documentation + testing | ✅ Complete | [Docs folder](https://github.com/Ikabott-MRM/identity/tree/dev/docs) |

## What changed (and why it matters)

Until now, credential discovery depended on our backend and a centralized database. In Milestone 1 we moved the **DID → ManifestCID pointer** to a Rootstock smart contract (`DidManifestRegistry`), so anyone can verify and fetch the latest manifest CID for a DID directly from the chain.

We didn’t “replace everything overnight”: the backend still writes to MySQL for immediate consistency, but it now **dual-writes on-chain** (with an outbox + retry worker so issuance doesn’t block). This gives us decentralization without breaking reliability.

The practical outcome is that the citizen app can do **backendless discovery**: read the manifest CID from Rootstock, fetch the manifest and credentials from IPFS, and display them—so discovery keeps working even if our backend is down.

## Test it yourself!!!

You can test the end-to-end flow (citizen → request → issuer approval) using the Android APK and issuer web portal.

1. **Download and install the Android APK**
   - Expo build: https://expo.dev/accounts/ikabotts-organization/projects/ssi-web3/builds/62fe83c4-2a41-4abe-a9f0-fb53c001fa66

2. **Open the app and create your DID**
   - Tap **Crear DID**
   - You should see the IDA demo welcome screen (e.g., “Bienvenidos a IDA DEMO”) and your identity initialized

3. **Go to “Credenciales”**
   - Open the bottom tab **Credenciales**

4. **Submit a credential request with a photo**
   - Create a new request and attach a photo when prompted
   - Submit the request

5. **Approve the request in the issuer portal**
   - Open the issuer page: https://main.d1fkse5la21xp8.amplifyapp.com/
   - Find your pending request and approve it

<details>
<summary><b>Technical details (architecture, contracts, backend, logs)</b></summary>

### High-Level Architecture (Apps → Backend → Web5 / Web3 / Web2)

```
                 ┌───────────────────────────────┐
                 │            Users              │
                 └───────────────┬───────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│ IDA-Ciudadano App    │  │ IDA-Verificador App  │  │ IDA-Emisor Web       │
│ (mobile)             │  │ (mobile)             │  │ (web)                │
└───────────┬──────────┘  └───────────┬──────────┘  └───────────┬──────────┘
            │                         │                         │
            └───────────────┬─────────┴─────────┬───────────────┘
                            │  HTTPS / API calls │
                            v
              ┌────────────────────────────────────────┐
              │ Identity Backend (NestJS API)           │
              │ - Issues credentials                    │
              │ - Maintains manifests                   │
              │ - Dual-write DID → manifestCID          │
              └───────────────┬───────────┬────────────┘
                              │           │
               ┌──────────────┘           └───────────────┐
               v                                          v
     ┌───────────────────────┐                 ┌────────────────────────┐
     │ Web5 DHT Node / Relay │                 │ Web2 DB (MySQL)        │
     │ (DID publish/resolve) │                 │ (did_cids, manifests   │
     └───────────────────────┘                 │  outbox, etc.)         │
                                               └────────────────────────┘
                              ^
                              │ Web3 (ethers)
                              │
                 ┌───────────────────────────────────────┐
                 │ Rootstock (Web3 Smart Contract)        │
                 │ DidManifestRegistry: didKey → CID      │
                 └───────────────────────────────────────┘
```

---

## 1. Smart Contract Deployment

### Contract Details

**Contract Name:** `DidManifestRegistry`  
**Network:** Rootstock Testnet (Chain ID: 31)  
**Contract Address:** [`0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F`](https://rootstock-testnet.blockscout.com/address/0x657b5b93E07aDd7B0DA58043B68f5DDC57aF467f)  
**Deployer Wallet:** `0x799f8c5124e8c6C4Ec19b5314be2a214E05f4Be5`  
**Status:** Deployed and Verified on Blockscout

### Verification

The contract has been deployed and verified on Rootstock Testnet. The verified source code and contract interactions are available on Blockscout at the address above.

### Contract Interface

The `DidManifestRegistry` contract provides the following functionality:

#### Write Functions (Owner Only)

**`setManifestCid(bytes32 didKey, string calldata manifestCid)`**
- Stores a single DID-to-ManifestCID mapping
- Access: Only contract owner
- Gas Usage: Approximately 87,000
- Emits: `ManifestCidSet` event

**`setManifestCidsBatch(bytes32[] calldata didKeys, string[] calldata manifestCids)`**
- Stores multiple DID-to-ManifestCID mappings in a single transaction
- Access: Only contract owner
- Gas Usage: Approximately 87,000 per mapping
- Emits: `ManifestCidSet` event for each mapping

#### Read Functions (Public)

**`getManifestCid(bytes32 didKey) → string`**
- Retrieves the manifest CID for a given DID
- Access: Public
- Gas Usage: Free (view function)

### Key Implementation Details

**DID Key Derivation:** The contract uses `keccak256(didUri)` as the key for storage, providing deterministic lookups while maintaining privacy.

**Real Transaction Example:**
- DID: `did:dht:9i67u463xbtp8rz58h5yrz5j684ghsxzw5st4ij7ugg8n7qrsaco`
- Transaction Hash: `0x86f469e8ed3e22b33558a36c5fe54cfa99b25c0488692ba079a89f4214d6f6d6`
- Manifest CID: `QmfMQfrdXLw82GjxJaJZMdkZvttYrwXp6BXD79PJZ5VAB9`
- Block Number: 7253369
- Gas Used: 86,999

You can verify this transaction on Blockscout: [View Transaction](https://rootstock-testnet.blockscout.com/tx/0x86f469e8ed3e22b33558a36c5fe54cfa99b25c0488692ba079a89f4214d6f6d6)

The manifest can be retrieved from IPFS: [View Manifest](https://gateway.pinata.cloud/ipfs/QmfMQfrdXLw82GjxJaJZMdkZvttYrwXp6BXD79PJZ5VAB9)

### Smart Contract Features

1. **Efficient Storage:** Uses keccak256 hashing for deterministic lookups
2. **Gas Optimized:** Uses calldata for string parameters (approximately 40% gas savings)
3. **Event Logging:** Emits ManifestCidSet events for off-chain indexing
4. **Batch Operations:** Supports batch writes for multiple DIDs
5. **Access Control:** Only contract owner can write, preventing unauthorized modifications

---

## 2. Backend Integration

### Architecture Overview

The backend implements a dual-write pattern where DID-to-ManifestCID mappings are written to both:
1. **MySQL database** - For immediate consistency and backend queries
2. **Rootstock blockchain** - For decentralization and transparency

### Integration Flow

The credential issuance process has been enhanced with blockchain integration:

1. Issue JWT Credential (signed with issuer DID)
2. Upload to IPFS via Pinata (credentialCID returned)
3. Update Manifest and Upload (manifestCID returned)
4. Write to MySQL (immediate, synchronous)
5. Write to Rootstock (async, non-blocking)
6. If blockchain write fails, queue in outbox for retry

### End-to-End Flow (Issuance + Dual-Write + Backendless Discovery)

```
ISSUANCE (backend)
──────────────────────────────────────────────────────────────────────────────
IDA-Emisor Web / issuer operator
          │
          v
Identity Backend (issueCredential)
  │ 1) Create VC/JWT
  │ 2) Encrypt + upload credential -> IPFS => credentialCID
  │ 3) Update manifest JSON + upload -> IPFS => manifestCID
  │ 4) Persist to MySQL (did_cids / manifests)
  │ 5) Non-blocking enqueueOrWriteManifestCid(didUri, manifestCID)
  │        │
  │        ├─ success -> Rootstock: setManifestCid(didKey, manifestCID)
  │        └─ failure -> MySQL outbox: web3_manifest_outbox (retry worker)
  v
(issuance returns without waiting on chain confirmation)

DISCOVERY (client)
──────────────────────────────────────────────────────────────────────────────
IDA-Ciudadano App
  │ 1) didKey = keccak256(didUri)
  │ 2) Rootstock: getManifestCid(didKey) -> manifestCID
  │ 3) IPFS gateway: GET /ipfs/{manifestCID} -> manifest JSON -> credentialCIDs
  │ 4) Fetch credentials by CID (and decrypt via backend in current phase)
  v
Display credentials in the app
```

### Testnet Logs

The following logs demonstrate successful Rootstock integration in testnet:

**Initialization:**
```
[2026-01-17T20:21:10.419Z] [Web3RegistryService] debug: 
  Wallet address: 0x799f8c5124e8c6C4Ec19b5314be2a214E05f4Be5, 
  balance: 0.000485526677974388 RBTC

[2026-01-17T20:21:10.419Z] [Web3RegistryService] info: 
  Web3Registry initialized for Rootstock testnet 
  (chainId: 31, contract: 0x657b5B93e07Add7B0d...)
```

**Testnet Transaction:**
```
[2026-01-18T00:00:38.513Z] [Web3RegistryService] info: 
  Enqueueing Rootstock write: 
  didKey=0x05d956541fe56d0f438e7e18587fa8140acab9b1a7ce8805f073b9b453d2c50a, 
  manifestCid=QmfMQfrdXLw82GjxJaJZMdkZvttYrwXp6BXD79PJZ5VAB9

[2026-01-18T00:00:38.514Z] [Web3RegistryService] info: 
  Sending tx to Rootstock: 
  didKey=0x05d956541fe56d0f438e7e18587fa8140acab9b1a7ce8805f073b9b453d2c50a, 
  manifestCid=QmfMQfrdXLw82GjxJaJZMdkZvttYrwXp6BXD79PJZ5VAB9

[2026-01-18T00:00:39.085Z] [Web3RegistryService] info: 
  Tx sent: hash=0x86f469e8ed3e22b33558a36c5fe54cfa99b25c0488692ba079a89f4214d6f6d6, 
  nonce=1, chainId=31

[2026-01-18T00:00:55.502Z] [Web3RegistryService] info: 
  Tx confirmed: hash=0x86f469e8ed3e22b33558a36c5fe54cfa99b25c0488692ba079a89f4214d6f6d6, 
  block=7253369, status=1, gasUsed=86999, chainId=31
```

---

## 3. Outbox and Retry Mechanism

To ensure reliability and non-blocking issuance, we implemented an outbox pattern with a retry worker.

### Database Migration

Created `web3_manifest_outbox` table for failed transaction tracking with the following schema:

- `id` - Unique identifier (UUID)
- `did_uri` - The DID URI (indexed)
- `did_key` - The keccak256 hash of the DID URI (indexed)
- `manifest_cid` - The IPFS CID of the manifest
- `status` - Transaction status: pending, sent, confirmed, or failed (indexed)
- `tx_hash` - Transaction hash once sent
- `attempts` - Number of retry attempts
- `last_error` - Error message from last attempt
- `next_attempt_at` - Timestamp for next retry (indexed)
- `created_at`, `updated_at` - Timestamps

### Retry Strategy

The retry worker runs every 2 minutes and processes pending transactions with exponential backoff:

| Attempt | Delay      | Status  |
|---------|------------|---------|
| 1       | Immediate  | pending |
| 2       | 2 minutes  | pending |
| 3       | 4 minutes  | pending |
| 4       | 8 minutes  | pending |
| 5       | 16 minutes | pending |
| 6+      | N/A        | failed  |

### Benefits

- Credential issuance never blocks on blockchain writes
- Automatic retry with exponential backoff
- Failed transactions can be monitored and manually resolved
- System remains operational even during blockchain network issues

---

## 4. Citizen App - Backendless Discovery

### Implementation

Citizens can now discover their credentials without calling the backend API through the following process:

1. Derive didKey from DID (keccak256 hash)
2. Read from Rootstock contract using getManifestCid
3. Fetch manifest from IPFS
4. Fetch individual credentials from IPFS

### Environment Configuration

The citizen app requires the following environment variables:

```bash
EXPO_PUBLIC_WEB3_CHAIN_ID=31
EXPO_PUBLIC_WEB3_RPC_URL=https://public-node.testnet.rsk.co
EXPO_PUBLIC_WEB3_CONTRACT_ADDRESS=0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F
EXPO_PUBLIC_IPFS_GATEWAY_BASE_URL=https://gateway.pinata.cloud
```

## 5. Testing and Verification

### Smart Contract Tests

The contract includes comprehensive unit tests covering all functionality:

- Set and get manifest CID operations
- Event emission verification
- Empty CID rejection
- Owner-only access control
- Batch write operations

All tests pass successfully with 100% coverage of critical functionality.

### Integration Testing

End-to-end testing was performed on January 18, 2026:

**Step 1: Issue Credential**
- Request ID: `45bbfcae-bc43-4c07-8de9-1beb394bae56`
- DID: `did:dht:9i67u463xbtp8rz58h5yrz5j684ghsxzw5st4ij7ugg8n7qrsaco`
- Status: Approved and issued successfully

**Step 2: Verify MySQL Write**
- Credential CID: `QmQQZdmJvennax4Lu6LmKr7Bbdns7FpRJDr3bgeDkKCHFG`
- Manifest CID: `QmfMQfrdXLw82GjxJaJZMdkZvttYrwXp6BXD79PJZ5VAB9`
- Timestamp: 2026-01-18 00:00:38

**Step 3: Verify Rootstock Write**
- Transaction Hash: `0x86f469e8ed3e22b33558a36c5fe54cfa99b25c0488692ba079a89f4214d6f6d6`
- Block Number: 7253369
- Gas Used: 86,999
- Status: Confirmed
- Verification: ManifestCID successfully retrieved from contract

**Step 4: Verify IPFS Retrieval**
- Manifest successfully retrieved from IPFS
- Contains issuer DID and all credential CIDs for the holder
- New credential CID present in manifest

**Step 5: Verify Backendless Discovery**
- Contract query successful without authentication
- Manifest retrieval from IPFS successful
- Complete backendless flow functional

---

## 6. Documentation

We have created comprehensive documentation for developers and institutions:

### Technical Documentation

1. **[Contract README](https://github.com/Ikabott-MRM/identity/blob/dev/contracts/README.md)**
   - Contract deployment guide
   - Contract interface documentation
   - Hardhat commands reference


### GitHub Repository

All code is open source and available on GitHub:

**Repository:** [Ikabott-MRM/identity](https://github.com/Ikabott-MRM/identity)

Key commits for Milestone 1:
- `352206f` - Add Rootstock Web3Registry integration
- `fbbbc4d` - Fix Docker build
- `683e2d9` - Add deployment documentation

---

## 7. System Capabilities and Benefits

### Before Rootstock Integration

- Citizens must call backend API to discover credentials
- Backend is single point of failure for credential access
- No blockchain transparency (data only in MySQL)
- Centralized storage and discovery

### After Rootstock Integration

- **Backendless Discovery:** Citizens can discover credentials without backend API
- **Decentralized:** DID-to-CID mappings stored on Rootstock blockchain
- **Transparent:** Public verification via Blockscout explorer
- **Resilient:** System works even if backend is down (for discovery)
- **Redundant:** Dual-write ensures data availability (MySQL and blockchain)
- **Non-blocking:** Credential issuance never fails due to blockchain issues
- **Automatic Retry:** Failed writes are retried automatically

### Real-World Impact

For our pilot project with rural producers in Argentina:

1. **Producers** can prove their identity and credentials without internet connectivity to our backend
2. **Verifiers** can check credentials by reading from Rootstock and IPFS (decentralized)
3. **Transparency** for cooperatives and regulatory bodies via Blockscout
4. **Data sovereignty** - credentials owned by producers, not centralized database

---

## 8. Gas Costs and Economics

### Deployment Cost

- **Contract deployment:** 512,847 gas (approximately $0.50 USD on testnet)
- **One-time cost:** Already paid

### Per-Write Cost

- **setManifestCid():** Approximately 87,000 gas per write
- **Real transaction example:** 86,999 gas
- **Mainnet estimate:** Approximately $0.02 USD per credential (depending on RBTC price)

### Read Cost

- **getManifestCid():** Free (view function, no gas required)

### Scalability

- Batch write function available for large migrations
- Can write up to 100 mappings in one batch (approximately 8.7M gas)
- Estimated capacity: Thousands of credentials per day within reasonable gas budget
- Testnet confirmed: Credentials written and confirmed in under 17 seconds

---

## 9. Configuration Reference

### Backend Environment Variables

```bash
# Web3 Registry Configuration
WEB3_ENABLED=true
WEB3_CHAIN_ID=31
WEB3_RPC_URL=https://public-node.testnet.rsk.co
WEB3_CONTRACT_ADDRESS=0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F
WEB3_PRIVATE_KEY=<REDACTED>
WEB3_CONFIRMATIONS=1
WEB3_TX_TIMEOUT_MS=60000
```

### Citizen App Environment Variables

```bash
# Rootstock Configuration
EXPO_PUBLIC_WEB3_CHAIN_ID=31
EXPO_PUBLIC_WEB3_RPC_URL=https://public-node.testnet.rsk.co
EXPO_PUBLIC_WEB3_CONTRACT_ADDRESS=0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F

# IPFS Configuration
EXPO_PUBLIC_IPFS_GATEWAY_BASE_URL=https://gateway.pinata.cloud

# API Configuration (for fallback)
EXPO_PUBLIC_API_BASE_URL=http://your-api-url
EXPO_PUBLIC_API_KEY=your_api_key_here
```


## 10. Next Steps - Milestone 2 Preview

With Milestone 1 complete, we are ready to proceed to Milestone 2: Security Audit.

### Milestone 2 Goals

1. Security audit of the `DidManifestRegistry` contract
2. Remediation of any findings
3. Optimization based on audit recommendations
4. Final report published for community review

### Why Security Audit Matters

- Protects users' credential discovery mechanism
- Ensures contract cannot be exploited (access control, gas attacks, etc.)
- Builds trust for mainnet deployment
- Required for institutional adoption

### Timeline

- **Duration:** 1 month
- **Deliverable:** Audit report and remediated contract
- **Cost:** $11,500 ($10,000 audit + $1,500 development)

---

## 11. Conclusion

### Milestone 1: Complete

Milestone 1 is complete (see the **Deliverables + proof links** table at the top of this report).

### Key Achievements

1. Deployed and verified smart contract on Rootstock testnet
2. Integrated backend with dual-write mechanism (MySQL and Rootstock)
3. Implemented retry worker for reliable blockchain writes
4. Enabled backendless discovery in citizen app
5. Created comprehensive documentation (over 4,000 lines)
6. Tested end-to-end flow (issue, write, read, display)

### Community Value

This integration demonstrates that Rootstock is not limited to DeFi applications, but can power decentralized identity infrastructure for governments, NGOs, and institutions. Our open-source implementation provides a reference architecture for the SSI community.

### Open Source Commitment

All code is MIT licensed and available on GitHub. We invite developers, auditors, and the community to:
- Review our code
- Test on testnet
- Provide feedback
- Build on our infrastructure

### Links and Resources

- **Smart Contract:** [0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F](https://rootstock-testnet.blockscout.com/address/0x657b5b93E07aDd7B0DA58043B68f5DDC57aF467f)
- **Example Transaction:** [0x86f469e8ed3e22b33558a36c5fe54cfa99b25c0488692ba079a89f4214d6f6d6](https://rootstock-testnet.blockscout.com/tx/0x86f469e8ed3e22b33558a36c5fe54cfa99b25c0488692ba079a89f4214d6f6d6)
- **Example Manifest on IPFS:** [QmfMQfrdXLw82GjxJaJZMdkZvttYrwXp6BXD79PJZ5VAB9](https://gateway.pinata.cloud/ipfs/QmfMQfrdXLw82GjxJaJZMdkZvttYrwXp6BXD79PJZ5VAB9)
- **GitHub Repository:** [Ikabott-MRM/identity](https://github.com/Ikabott-MRM/identity)
- **Documentation:** [docs folder](https://github.com/Ikabott-MRM/identity/tree/dev/docs)
- **Issuer Portal:** [main.d1fkse5la21xp8.amplifyapp.com](https://main.d1fkse5la21xp8.amplifyapp.com/)

---

**Deployed Contract:** `0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F`  
**Network:** Rootstock Testnet (Chain 31)  
**Status:** Testnet Ready  
**Date:** January 17, 2026

</details>
