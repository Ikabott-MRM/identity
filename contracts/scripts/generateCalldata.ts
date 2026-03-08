import { ethers } from 'hardhat';

async function main() {
  const CLAIM_HELPER = '0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F';
  const GOVERNOR = '0x71ac6ff904a17f50f2c07b693376ccc1c92627f0';
  const ORIGINAL_SINGLETON = '0x29fcb43b46531bca003ddc8fcb67ffe91900c762';
  const PROPOSAL_ID =
    '0xbf6ff0cf1f7360df1bce16eca7b8551031654ceaa4f1eb2b956de60c92a14a2e';

  // Use lowercase to avoid RSK EIP-1191 checksum issues
  const claimHelperChecksummed = ethers.getAddress(CLAIM_HELPER.toLowerCase());
  const governorChecksummed = ethers.getAddress(GOVERNOR.toLowerCase());
  const singletonChecksummed = ethers.getAddress(
    ORIGINAL_SINGLETON.toLowerCase(),
  );

  const abi = [
    'function claimAndRestore(address claimHelperAddr, address originalSingleton, address governor, uint256 proposalId)',
  ];
  const iface = new ethers.Interface(abi);

  const calldata = iface.encodeFunctionData('claimAndRestore', [
    claimHelperChecksummed,
    singletonChecksummed,
    governorChecksummed,
    PROPOSAL_ID,
  ]);

  console.log('\n=== SAFE TRANSACTION PARAMETERS ===');
  console.log('To (ClaimHelper):', claimHelperChecksummed);
  console.log('Value: 0');
  console.log('Data:', calldata);
  console.log('Operation: 1 (DELEGATECALL)');
  console.log('\nsafeTxGas: 0');
  console.log('baseGas: 0');
  console.log('gasPrice: 0');
  console.log('gasToken: 0x0000000000000000000000000000000000000000');
  console.log('refundReceiver: 0x0000000000000000000000000000000000000000');

  // Also verify the singleton on-chain
  const safeAddress = ethers.getAddress(
    '0xab13affb7e7b5f8102b05015da82d3f08d5bd26d',
  );
  const slot0 = await ethers.provider.getStorage(safeAddress, 0);
  const currentSingleton = '0x' + slot0.slice(26);
  console.log('\n=== VERIFICATION ===');
  console.log('Safe address:', safeAddress);
  console.log('Current singleton (slot 0):', currentSingleton);
  console.log('Expected singleton:', ORIGINAL_SINGLETON);
  console.log(
    'Match:',
    currentSingleton.toLowerCase() === ORIGINAL_SINGLETON.toLowerCase(),
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
