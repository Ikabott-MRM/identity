import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying ClaimHelper with account:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.formatEther(balance), 'RBTC');

  if (balance === 0n) {
    throw new Error('Deployer has no RBTC. Fund the account first.');
  }

  const ClaimHelper = await ethers.getContractFactory('ClaimHelper');
  const claimHelper = await ClaimHelper.deploy();
  await claimHelper.waitForDeployment();

  const address = await claimHelper.getAddress();
  console.log('ClaimHelper deployed to:', address);

  // Log the calldata for the Safe transaction
  const GOVERNOR = '0x71aC6FF904a17f50f2c07B693376CCC1c92627F0';
  const ORIGINAL_SINGLETON = '0x29FCB43B46531Bca003ddC8fcB67ffE91900C762';
  const PROPOSAL_ID =
    '0xbf6ff0cf1f7360df1bce16eca7b8551031654ceaa4f1eb2b956de60c92a14a2e';

  const iface = ClaimHelper.interface;
  const calldata = iface.encodeFunctionData('claimAndRestore', [
    address,
    ORIGINAL_SINGLETON,
    GOVERNOR,
    PROPOSAL_ID,
  ]);

  console.log('\n=== SAFE TRANSACTION PARAMETERS ===');
  console.log('To:', address);
  console.log('Value: 0');
  console.log('Data:', calldata);
  console.log('Operation: 1 (DELEGATECALL)');
  console.log('safeTxGas: 0');
  console.log('baseGas: 0');
  console.log('gasPrice: 0');
  console.log('gasToken: 0x0000000000000000000000000000000000000000');
  console.log('refundReceiver: 0x0000000000000000000000000000000000000000');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
