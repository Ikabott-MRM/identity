# Contract Deployment Complete ✅

## Deployment Summary

**Contract Address**: `0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F`  
**Network**: Rootstock Testnet (Chain ID: 31)  
**Deployer/Owner**: `0x799f8c5124e8c6C4Ec19b5314be2a214E05f4Be5`  
**Block Number**: 7243398  
**Deployment Date**: 2026-01-15

## Next Steps

### 1. Update Backend Configuration

Add/update these variables in `identity/.env`:

```bash
WEB3_ENABLED=true
WEB3_CHAIN_ID=31
WEB3_RPC_URL=https://public-node.testnet.rsk.co
WEB3_CONTRACT_ADDRESS=0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F
WEB3_PRIVATE_KEY=0x...your_private_key_here
WEB3_CONFIRMATIONS=1
WEB3_TX_TIMEOUT_MS=60000
```

**Important**: 
- `WEB3_PRIVATE_KEY` should be the same as `DEPLOYER_PRIVATE_KEY` (or another account that you transfer ownership to)
- The account must have testnet RBTC for gas fees

### 2. Run Database Migration

```bash
cd identity
npx knex migrate:up
```

This creates the `web3_manifest_outbox` table for retry queue.

### 3. Update Citizen App Configuration

Add/update these variables in `IDA-Ciudadano-App` (in `eas.json` or `.env`):

```bash
EXPO_PUBLIC_WEB3_CHAIN_ID=31
EXPO_PUBLIC_WEB3_RPC_URL=https://public-node.testnet.rsk.co
EXPO_PUBLIC_WEB3_CONTRACT_ADDRESS=0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F
EXPO_PUBLIC_IPFS_GATEWAY_BASE_URL=https://gateway.pinata.cloud/ipfs
```

### 4. Verify Contract (Optional)

You can verify the contract on Blockscout:

```bash
cd identity/contracts
npx hardhat verify --network rootstockTestnet 0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F
```

### 5. Test the Integration

1. **Start the backend** with the new Web3 configuration
2. **Issue a test credential** - it should write to both MySQL and Rootstock
3. **Check the outbox table** to verify Rootstock writes are being queued/processed
4. **Test citizen app** - it should be able to read manifest CID from Rootstock

## Contract Explorer Links

- **Blockscout**: https://rootstock.blockscout.com/address/0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F
- **Contract Owner**: https://rootstock.blockscout.com/address/0x799f8c5124e8c6C4Ec19b5314be2a214E05f4Be5

## Deployment Files

- Deployment info: `identity/contracts/deployments/rootstock-testnet-1768449593520.json`
- ABI: `identity/contracts/deployments/DidManifestRegistry.abi.json` (if saved successfully)

## Troubleshooting

If you encounter issues:

1. **Backend can't connect**: Check `WEB3_RPC_URL` and network connectivity
2. **Transactions failing**: Ensure the wallet has sufficient RBTC for gas
3. **Outbox records stuck**: Check worker logs and ensure `@nestjs/schedule` is running
4. **Citizen app can't read**: Verify `EXPO_PUBLIC_WEB3_CONTRACT_ADDRESS` is set correctly
