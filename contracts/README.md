# DID Manifest Registry Contracts

Smart contracts for storing DID → Manifest CID mappings on Rootstock testnet.

## Setup

1. Install dependencies:
```bash
cd contracts
npm install
```

2. Add deployment variables to the project root `.env` file (`identity/.env`):
```
DEPLOYER_PRIVATE_KEY=your_private_key_here
ROOTSTOCK_TESTNET_RPC_URL=https://public-node.testnet.rsk.co
ROOTSTOCK_EXPLORER_API_KEY=your_api_key_here (optional but recommended for verification)
```

   **Note**: 
   - Hardhat is configured to use the project root `.env` file (`identity/.env`) for security - all sensitive keys in one place
   - For Blockscout verification:
     - The explorer URL is automatically configured to `https://rootstock.blockscout.com`
     - API key is optional but recommended for better rate limits (get one at https://rootstock.blockscout.com/my-account/api-keys)
     - Without an API key, you're limited to ~10 requests/second globally
     - With an API key, you get per-account rate limits

## Compile

```bash
npm run compile
```

## Deploy

```bash
npm run deploy:testnet
```

This will:
- Deploy the contract to Rootstock testnet (chainId 31)
- Save deployment info to `deployments/`
- Save ABI to `deployments/DidManifestRegistry.abi.json`

## Verify Contract (Optional)

```bash
npm run verify
```

## Contract Interface

### `setManifestCid(bytes32 didKey, string calldata manifestCid)`
- Only owner can call
- Sets the manifest CID for a given DID key
- Emits `ManifestCidSet` event

### `getManifestCid(bytes32 didKey) external view returns (string memory)`
- Public read function
- Returns the manifest CID for a given DID key, or empty string if not set

### `setManifestCidsBatch(bytes32[] calldata didKeys, string[] calldata manifestCids)`
- Only owner can call
- Batch set multiple mappings in one transaction


