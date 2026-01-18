# DidManifestRegistry Smart Contract

This directory contains the Rootstock smart contract for decentralized DID↔ManifestCID mapping storage.

## Overview

The `DidManifestRegistry` contract enables **backendless credential discovery** for citizens by storing DID→ManifestCID mappings on the Rootstock blockchain.

**Deployed Contract (Testnet):** [`0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F`](https://rootstock-testnet.blockscout.com/address/0x657b5b93E07aDd7B0DA58043B68f5DDC57aF467f)

## Contract Interface

### Write Functions (Owner Only)

#### `setManifestCid(bytes32 didKey, string calldata manifestCid)`
Stores a single DID→ManifestCID mapping.

**Parameters:**
- `didKey` (bytes32): The keccak256 hash of the DID URI
- `manifestCid` (string): The IPFS CID of the manifest

**Access:** Only contract owner  
**Gas:** ~87,000  
**Emits:** `ManifestCidSet(didKey, manifestCid, msg.sender)`

**Example:**
```javascript
const didUri = "did:dht:abc123xyz";
const didKey = ethers.keccak256(ethers.toUtf8Bytes(didUri));
const manifestCid = "QmYwAPJzv5CZsnA6wXE7ZvDcB...";

await contract.setManifestCid(didKey, manifestCid);
```

#### `setManifestCidsBatch(bytes32[] calldata didKeys, string[] calldata manifestCids)`
Stores multiple DID→ManifestCID mappings in a single transaction.

**Parameters:**
- `didKeys` (bytes32[]): Array of DID key hashes
- `manifestCids` (string[]): Array of manifest CIDs (must match length of didKeys)

**Access:** Only contract owner  
**Gas:** ~87,000 per mapping  
**Emits:** `ManifestCidSet` for each mapping

**Example:**
```javascript
const didKeys = [
  ethers.keccak256(ethers.toUtf8Bytes("did:dht:user1")),
  ethers.keccak256(ethers.toUtf8Bytes("did:dht:user2")),
];
const manifestCids = [
  "QmManifest1...",
  "QmManifest2...",
];

await contract.setManifestCidsBatch(didKeys, manifestCids);
```

### Read Functions (Public)

#### `getManifestCid(bytes32 didKey) → string`
Retrieves the manifest CID for a given DID.

**Parameters:**
- `didKey` (bytes32): The keccak256 hash of the DID URI

**Returns:** Manifest CID string (empty if not found)  
**Gas:** FREE (view function)

**Example:**
```javascript
const didUri = "did:dht:abc123xyz";
const didKey = ethers.keccak256(ethers.toUtf8Bytes(didUri));
const manifestCid = await contract.getManifestCid(didKey);

if (manifestCid !== "") {
  console.log("Manifest CID:", manifestCid);
  // Fetch from IPFS: https://gateway.pinata.cloud/ipfs/${manifestCid}
}
```

## Events

### `ManifestCidSet(bytes32 indexed didKey, string manifestCid, address indexed writer)`
Emitted when a manifest CID is stored or updated.

**Parameters:**
- `didKey` (indexed): The DID key hash for filtering
- `manifestCid`: The stored manifest CID
- `writer` (indexed): The address that performed the write

**Use Cases:**
- Off-chain indexing for analytics
- Real-time notifications
- Audit trail

## Setup & Installation

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

```bash
cd identity/contracts
npm install
```

### Environment Configuration

Create or update `identity/.env`:

```bash
# Rootstock Testnet
WEB3_RPC_URL=https://public-node.testnet.rsk.co
WEB3_CHAIN_ID=31

# Deployer wallet (must have tRBTC)
DEPLOYER_PRIVATE_KEY=0x...

# Optional: Blockscout API key for verification
BLOCKSCOUT_API_KEY=your_api_key_here
```

**⚠️ Security Warning:** Never commit your private key to version control.

## Deployment

### Deploy to Rootstock Testnet

```bash
npm run deploy:testnet
```

**Expected Output:**
```
Deploying DidManifestRegistry to Rootstock testnet...
✅ Contract deployed to: 0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F
Deployment transaction: 0x...
Block number: 7253369
Gas used: 512,847
ABI saved to: deployments/testnet/DidManifestRegistry.abi.json
Deployment info saved to: deployments/testnet/deployment-info.json
```

### Deploy to Rootstock Mainnet

```bash
npm run deploy:mainnet
```

**Before mainnet deployment:**
1. ✅ Security audit complete
2. ✅ Testnet thoroughly tested
3. ✅ Sufficient RBTC in deployer wallet
4. ✅ Environment variables verified

## Testing

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests with Gas Reporting

```bash
npm run test:gas
```

**Expected Output:**
```
  DidManifestRegistry
    ✓ Should set and get manifest CID (125ms)
    ✓ Should emit ManifestCidSet event (89ms)
    ✓ Should reject empty manifest CID (76ms)
    ✓ Should only allow owner to write (82ms)
    ✓ Should handle batch writes (203ms)

  5 passing (1s)
```

## Development

### Compile Contracts

```bash
npm run compile
```

Output: `artifacts/` and `typechain-types/`

### Clean Build Artifacts

```bash
npm run clean
```

### Verify Contract on Blockscout

```bash
npx hardhat verify --network testnet 0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F
```

## Hardhat Tasks

### List Available Tasks

```bash
npx hardhat help
```

### Run Hardhat Console

```bash
npx hardhat console --network testnet
```

**Example console commands:**
```javascript
const contract = await ethers.getContractAt(
  "DidManifestRegistry",
  "0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F"
);

const didKey = ethers.keccak256(ethers.toUtf8Bytes("did:dht:test"));
const manifestCid = await contract.getManifestCid(didKey);
console.log(manifestCid);
```

## Gas Optimization

The contract uses several gas optimization techniques:

1. **`calldata` for strings:** Saves ~40% gas vs `memory`
2. **Minimal storage:** Only stores hash→CID mapping
3. **Batch operations:** Amortizes transaction overhead
4. **Indexed events:** Efficient off-chain querying

### Measured Gas Costs

| Operation | Gas Used | USD (testnet) | USD (mainnet est.) |
|-----------|----------|---------------|-------------------|
| Deploy contract | 512,847 | ~$0.50 | ~$5.00 |
| setManifestCid() | 87,000 | ~$0.0002 | ~$0.02 |
| setManifestCidsBatch() (100) | ~8.7M | ~$0.02 | ~$2.00 |
| getManifestCid() | 0 | FREE | FREE |

*Based on RBTC = $100 USD*

## Security Considerations

### Access Control
- Only the contract **owner** can write mappings
- Anyone can **read** mappings (public data)
- Owner is set at deployment and can be transferred

### Input Validation
- Manifest CID cannot be empty string
- Array lengths must match in batch operations
- No length limits enforced (trust the owner)

### Upgradeability
- Contract is **NOT upgradeable** by design
- Data immutability ensures trust
- Ownership can be transferred if needed

### Best Practices
- ✅ Use OpenZeppelin's `Ownable` for access control
- ✅ Emit events for all state changes
- ✅ Use `calldata` for gas efficiency
- ✅ Validate inputs in modifiers and requires
- ✅ Follow Checks-Effects-Interactions pattern

## Integration with Backend

The backend (`identity/src/web3Registry/`) automatically writes to this contract when credentials are issued.

**See:** [`identity/docs/WEB3_SETUP.md`](../docs/WEB3_SETUP.md)

## Integration with Citizen App

The citizen app reads from this contract to discover credentials without calling the backend API.

**Flow:**
1. User has DID: `did:dht:abc123xyz`
2. App calculates didKey: `keccak256(didUri)`
3. App queries contract: `contract.getManifestCid(didKey)`
4. App fetches manifest from IPFS
5. App fetches credentials from IPFS
6. App displays credentials ✅

**See:** [`IDA-Ciudadano-App/services/web3Registry.ts`](../../IDA-Ciudadano-App/services/web3Registry.ts)

## Troubleshooting

### Deployment Fails: "Insufficient funds"
**Solution:** Fund deployer wallet with tRBTC from [Rootstock Faucet](https://faucet.rootstock.io/)

### Deployment Fails: "nonce too low"
**Solution:** Reset Hardhat cache:
```bash
rm -rf artifacts/ cache/ typechain-types/
npm run compile
```

### Contract Verification Fails
**Solution:** Ensure exact compiler settings match deployment:
```javascript
// hardhat.config.ts
solidity: {
  version: "0.8.20",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
}
```

### "Transaction underpriced"
**Solution:** Increase gas price in `hardhat.config.ts`:
```javascript
networks: {
  testnet: {
    gasPrice: 65000000, // 0.065 gwei
  }
}
```

## Additional Resources

- **Rootstock Docs:** https://dev.rootstock.io/
- **Hardhat Docs:** https://hardhat.org/docs
- **OpenZeppelin Contracts:** https://docs.openzeppelin.com/contracts/
- **Blockscout Explorer:** https://rootstock-testnet.blockscout.com/

## License

MIT License - See [LICENSE](../../LICENSE) file.

## SupportFor questions or issues:
- GitHub Issues: https://github.com/IOV-Foundation/identity/issues
- Email: dev@iovfoundation.org
