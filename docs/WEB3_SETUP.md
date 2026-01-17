# Web3 Registry Setup Guide

This guide explains how to configure the Rootstock testnet integration for DID→ManifestCID mapping.

## Backend Configuration (`identity`)

### Environment Variables

Add the following to your `.env` file (or deployment secrets):

```bash
# Enable/disable Web3 writes (set to 'true' to enable)
WEB3_ENABLED=true

# Rootstock testnet RPC URL
WEB3_RPC_URL=https://public-node.testnet.rsk.co

# Rootstock testnet chain ID (31)
WEB3_CHAIN_ID=31

# Contract address (obtained after deploying DidManifestRegistry)
# Example (Rootstock Testnet): 0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F
WEB3_CONTRACT_ADDRESS=0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F

# Private key of the account that will sign transactions (must be contract owner)
# ⚠️ SECURITY: Never commit this to version control!
WEB3_PRIVATE_KEY=0x...

# Number of block confirmations to wait (default: 1)
WEB3_CONFIRMATIONS=1

# Transaction timeout in milliseconds (default: 60000)
WEB3_TX_TIMEOUT_MS=60000
```

### Deployment Steps

1. **Deploy the contract**:
   ```bash
   cd identity/contracts
   npm install
   # Set DEPLOYER_PRIVATE_KEY in .env
   npm run deploy:testnet
   ```

2. **Update backend `.env`** with the contract address from deployment output.

3. **Fund the wallet**: Ensure the wallet address (derived from `WEB3_PRIVATE_KEY`) has testnet RBTC for gas.

4. **Run migrations**:
   ```bash
   npx knex migrate:up
   ```

5. **Start the backend**: The Web3RegistryService will initialize on startup.

### Monitoring

- Check logs for Web3Registry initialization and transaction status.
- Monitor the `web3_manifest_outbox` table for pending/failed writes.
- The retry worker runs every 30 seconds to process outbox records.

## Citizen App Configuration (`IDA-Ciudadano-App`)

### Environment Variables

Add to your Expo environment configuration (e.g., `eas.json` or `.env`):

```bash
# Rootstock testnet chain ID
EXPO_PUBLIC_WEB3_CHAIN_ID=31

# Rootstock testnet RPC URL
EXPO_PUBLIC_WEB3_RPC_URL=https://public-node.testnet.rsk.co

# Contract address (same as backend)
# Example (Rootstock Testnet): 0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F
EXPO_PUBLIC_WEB3_CONTRACT_ADDRESS=0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F

# Public IPFS gateway for reading manifest/credentials
# Options:
# - https://ipfs.io/ipfs (public, slower)
# - https://gateway.pinata.cloud/ipfs (public)
# - https://<your>.mypinata.cloud/ipfs (your dedicated gateway)
EXPO_PUBLIC_IPFS_GATEWAY_BASE_URL=https://gateway.pinata.cloud/ipfs
```

### Usage

The citizen app can now discover credential CIDs without calling the backend:

```typescript
import credential from '@/services/credential';

// Discover credential CIDs from Rootstock + IPFS
const cids = await credential.discoverCredentialCids(did);
```

**Note**: In Phase 1, this only discovers CIDs. Decryption still requires the backend API. Phase 5 will enable full backendless decryption.

## Security Notes

- **Private Key**: Treat `WEB3_PRIVATE_KEY` as a high-risk secret. Use a dedicated account with minimal RBTC balance.
- **Secrets Management**: In production, use AWS Secrets Manager, Azure Key Vault, or similar instead of plain env vars.
- **Access Control**: The contract uses `Ownable`, so only the owner address can write. Keep the private key secure.

## Troubleshooting

### Backend Issues

- **"Web3Registry not initialized"**: Check that `WEB3_ENABLED=true` and all required env vars are set.
- **"Transaction timeout"**: Increase `WEB3_TX_TIMEOUT_MS` or check RPC connectivity.
- **Outbox records stuck**: Check worker logs and ensure the scheduled task is running.

### Citizen App Issues

- **"Cannot read from Rootstock"**: Verify `EXPO_PUBLIC_WEB3_CONTRACT_ADDRESS` is set correctly.
- **"IPFS fetch failed"**: Check `EXPO_PUBLIC_IPFS_GATEWAY_BASE_URL` and network connectivity.

## Next Steps

- Phase 5: Implement client-side credential decryption for full backend independence.


