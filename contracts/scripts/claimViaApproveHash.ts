import { ethers } from 'hardhat';

const SAFE_ABI = [
  'function nonce() view returns (uint256)',
  'function getTransactionHash(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) view returns (bytes32)',
  'function approvedHashes(address owner, bytes32 hash) view returns (uint256)',
  'function execTransaction(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes memory signatures) payable returns (bool success)',
];

const SAFE_ADDR = ethers.getAddress(
  '0xab13affb7e7b5f8102b05015da82d3f08d5bd26d',
);
const OWNER = ethers.getAddress('0xb7c1c4a7a4792b947933ac6ed6a018502609177e');
const CLAIM_HELPER = ethers.getAddress(
  '0x657b5b93e07add7b0da58043b68f5ddc57af467f',
);
const ORIGINAL_SINGLETON = '0x29fcb43b46531bca003ddc8fcb67ffe91900c762';
const GOVERNOR = '0x71ac6ff904a17f50f2c07b693376ccc1c92627f0';
const PROPOSAL_ID =
  '0xbf6ff0cf1f7360df1bce16eca7b8551031654ceaa4f1eb2b956de60c92a14a2e';

async function main() {
  const step = process.env.STEP || '1';
  const safe = new ethers.Contract(SAFE_ADDR, SAFE_ABI, ethers.provider);

  const helperIface = new ethers.Interface([
    'function claimAndRestore(address claimHelperAddr, address originalSingleton, address governor, uint256 proposalId)',
  ]);
  const innerData = helperIface.encodeFunctionData('claimAndRestore', [
    CLAIM_HELPER,
    ethers.getAddress(ORIGINAL_SINGLETON),
    ethers.getAddress(GOVERNOR),
    PROPOSAL_ID,
  ]);

  const nonce = await safe.nonce();
  console.log('Safe nonce:', nonce.toString());

  const txHash = await safe.getTransactionHash(
    CLAIM_HELPER, // to
    0, // value
    innerData, // data
    1, // operation = DELEGATECALL
    0, // safeTxGas
    0, // baseGas
    0, // gasPrice
    ethers.ZeroAddress, // gasToken
    ethers.ZeroAddress, // refundReceiver
    nonce, // nonce
  );
  console.log('Safe tx hash:', txHash);

  if (step === '1') {
    // Encode the approveHash calldata for the user to send via MetaMask
    const approveHashData = new ethers.Interface([
      'function approveHash(bytes32 hashToApprove)',
    ]).encodeFunctionData('approveHash', [txHash]);

    console.log('\n========================================');
    console.log('STEP 1: Send this tx from your hardware wallet via MetaMask');
    console.log('========================================');
    console.log('To:', SAFE_ADDR);
    console.log('Value: 0');
    console.log('Data:', approveHashData);
    console.log(
      '\nIn MetaMask: click your account icon > Send > paste the Safe address',
    );
    console.log('Then click "Hex" tab and paste the Data field above.');
    console.log('Set amount to 0 RBTC. Sign with your hardware wallet.');
    console.log(
      '\nAfter the tx confirms, run: STEP=2 npx hardhat run scripts/claimViaApproveHash.ts --network rootstockMainnet',
    );
  }

  if (step === '2') {
    const approved = await safe.approvedHashes(OWNER, txHash);
    if (approved === 0n) {
      console.error('ERROR: Hash not yet approved by owner. Run STEP 1 first.');
      return;
    }
    console.log('Hash approved by owner: YES');

    // Build the "approved hash" signature: r=owner (padded), s=0, v=1
    const sig =
      '0x' +
      OWNER.slice(2).toLowerCase().padStart(64, '0') +
      '0'.repeat(64) +
      '01';

    console.log('\nExecuting Safe transaction with DELEGATECALL...');
    const [deployer] = await ethers.getSigners();
    console.log('Executor:', deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log('Executor balance:', ethers.formatEther(balance), 'RBTC');

    const safeSigner = safe.connect(deployer);
    const tx = await safeSigner.execTransaction(
      CLAIM_HELPER,
      0,
      innerData,
      1, // operation = DELEGATECALL
      0,
      0,
      0,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      sig,
      { gasLimit: 1_500_000 },
    );

    console.log('Transaction sent:', tx.hash);
    console.log('Waiting for confirmation...');
    const receipt = await tx.wait();
    console.log('Status:', receipt!.status === 1 ? 'SUCCESS' : 'FAILED');
    console.log('Gas used:', receipt!.gasUsed.toString());
    console.log('\nCheck:', `https://explorer.rootstock.io/tx/${tx.hash}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
