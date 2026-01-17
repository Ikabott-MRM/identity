# Rootstock DID→ManifestCID Implementation Summary

## Completed Implementation

### Phase 1: Smart Contract ✅
- **Location**: `identity/contracts/`
- **Contract**: `DidManifestRegistry.sol` (Ownable, stores `didKey → manifestCID` mapping)
- **Features**:
  - `setManifestCid(bytes32 didKey, string manifestCid)` - owner only
  - `getManifestCid(bytes32 didKey)` - public read
  - `setManifestCidsBatch()` - batch writes
  - Events: `ManifestCidSet`
- **Deployment**: Hardhat scripts for Rootstock testnet (chainId 31)
- **Testing**: Unit tests included

### Phase 2: Backend Dual-Write ✅
- **Location**: `identity/src/web3Registry/`
- **Components**:
  - `Web3RegistryService`: Main service using ethers v6
  - `Web3RegistryWorkerService`: Scheduled retry worker (every 30s)
  - `Web3RegistryModule`: NestJS module
- **Features**:
  - Dual-write on credential issuance (MySQL + Rootstock)
  - Outbox pattern with DB-backed retry queue
  - Exponential backoff for failed writes
  - Comprehensive logging with correlation IDs
  - Non-blocking: issuance never fails due to chain issues
- **Database**: New `web3_manifest_outbox` table (migration included)
- **Integration**: Integrated into `IssuerAgentService.issueCredential()`

### Phase 3: Citizen App Chain Read ✅
- **Location**: `IDA-Ciudadano-App/services/`
- **Components**:
  - `web3Registry.ts`: Rootstock read functions
  - `ipfs.ts`: IPFS gateway fetch functions
  - `credentialChain.ts`: Backendless discovery orchestration
- **Features**:
  - Read `manifestCID` from Rootstock by DID
  - Fetch manifest JSON from IPFS
  - Discover credential CIDs for holder
  - Fallback to backend API if chain read fails
- **Environment Variables**: Documented in `WEB3_SETUP.md`

## Configuration Files Updated

### Backend (`identity`)
- `package.json`: Added `ethers@^6.9.0`
- `src/config/configuration.ts`: Added `web3` config section
- `src/app.module.ts`: Added `Web3RegistryModule`
- `src/ssi/issuerAgent.module.ts`: Added `Web3RegistryModule` import
- `src/ssi/issuerAgent.service.ts`: Integrated dual-write call

### Citizen App (`IDA-Ciudadano-App`)
- `package.json`: Added `ethers@^6.9.0`
- `services/credential.ts`: Added `discoverCredentialCids()` method

## Database Migration

- **File**: `migrations/20241201000000_create_web3_manifest_outbox.ts`
- **Table**: `web3_manifest_outbox`
- **Purpose**: Stores pending/failed Rootstock writes for retry

## Logging

All components include structured logging:
- Correlation IDs for tracing issuance flows
- Transaction hashes, block numbers, gas usage
- Error messages with stack traces
- Redacted sensitive data (private keys, full CIDs)

## Security

- Private keys never logged
- Contract uses `Ownable` for access control
- Outbox ensures no data loss on failures
- Graceful degradation if Web3 is disabled

## Next Steps (Phase 5 - Future)

Phase 5 (client-side decryption) is **not implemented** in this phase. It requires:
- Holder encryption keypair generation/storage
- Backend changes to encrypt with holder's public key
- Citizen app changes to decrypt locally

This is documented as a separate future enhancement.

## Testing Checklist

- [ ] Deploy contract to Rootstock testnet
- [ ] Configure backend env vars
- [ ] Run migration: `npx knex migrate:up`
- [ ] Issue a test credential
- [ ] Verify MySQL writes still work
- [ ] Verify Rootstock write (check outbox table)
- [ ] Test citizen app chain read
- [ ] Verify IPFS manifest fetch

## Documentation

- `identity/docs/WEB3_SETUP.md`: Configuration guide
- `identity/contracts/README.md`: Contract deployment guide
- `identity/docs/Web3-DID-CID-Mapping-Plan-Rootstock.md`: Original plan


