/**
 * Prints deployer address and balance on the selected network.
 * Uses DEPLOYER_PRIVATE_KEY from identity/.env (loaded by hardhat.config.ts).
 *
 * Usage:
 *   npx hardhat run scripts/printDeployerInfo.ts --network rootstockMainnet
 *   npx hardhat run scripts/printDeployerInfo.ts --network rootstockTestnet
 */
import { ethers, network } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      'No deployer account. Set DEPLOYER_PRIVATE_KEY in identity/.env',
    );
  }
  const chainId =
    typeof network.config.chainId === 'number'
      ? network.config.chainId
      : Number(network.config.chainId);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log('Network:', network.name, 'chainId:', chainId);
  console.log('Deployer address:', deployer.address);
  console.log('Balance (wei):', bal.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
