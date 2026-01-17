import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error(
      'No deployer account found. Please set DEPLOYER_PRIVATE_KEY in .env file.\n' +
      'Copy .env.example to .env and fill in your private key.',
    );
  }

  console.log('Deploying DidManifestRegistry with account:', deployer.address);
  console.log('Account balance:', (await ethers.provider.getBalance(deployer.address)).toString());

  const DidManifestRegistry = await ethers.getContractFactory('DidManifestRegistry');
  const registry = await DidManifestRegistry.deploy();

  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();
  console.log('DidManifestRegistry deployed to:', contractAddress);

  // Save deployment info
  const deploymentInfo = {
    network: 'rootstockTestnet',
    chainId: 31,
    contractAddress,
    deployerAddress: deployer.address,
    blockNumber: await ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
  };

  const deploymentDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentDir, `rootstock-testnet-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log('Deployment info saved to:', deploymentFile);

  // Get ABI
  const artifact = await ethers.getContractFactory('DidManifestRegistry');
  const abi = artifact.interface.format('json');
  const abiFile = path.join(deploymentDir, 'DidManifestRegistry.abi.json');
  // format('json') returns an array, so we need to stringify it
  fs.writeFileSync(abiFile, JSON.stringify(abi, null, 2));
  console.log('ABI saved to:', abiFile);

  console.log('\n=== Deployment Summary ===');
  console.log('Contract Address:', contractAddress);
  console.log('Deployer Address:', deployer.address);
  console.log('Network: Rootstock Testnet (Chain ID: 31)');
  console.log('\nNext steps:');
  console.log('1. Update WEB3_CONTRACT_ADDRESS in backend .env');
  console.log('2. Update EXPO_PUBLIC_WEB3_CONTRACT_ADDRESS in citizen app .env');
  console.log('3. Verify contract on explorer (optional):');
  console.log(`   npx hardhat verify --network rootstockTestnet ${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


