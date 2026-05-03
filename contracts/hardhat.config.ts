import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-gas-reporter';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root (identity/.env) instead of contracts/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    rootstockTestnet: {
      url:
        process.env.ROOTSTOCK_TESTNET_RPC_URL ||
        'https://public-node.testnet.rsk.co',
      chainId: 31,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
    rootstockMainnet: {
      url:
        process.env.ROOTSTOCK_MAINNET_RPC_URL || 'https://public-node.rsk.co',
      chainId: 30,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
  etherscan: {
    apiKey: {
      rootstockTestnet: process.env.ROOTSTOCK_EXPLORER_API_KEY || '',
      rootstockMainnet:
        process.env.ROOTSTOCK_MAINNET_EXPLORER_API_KEY ||
        process.env.ROOTSTOCK_EXPLORER_API_KEY ||
        '',
    },
    customChains: [
      {
        network: 'rootstockTestnet',
        chainId: 31,
        urls: {
          apiURL: 'https://rootstock-testnet.blockscout.com/api',
          browserURL: 'https://rootstock-testnet.blockscout.com',
        },
      },
      {
        network: 'rootstockMainnet',
        chainId: 30,
        urls: {
          apiURL: 'https://rootstock.blockscout.com/api',
          browserURL: 'https://rootstock.blockscout.com',
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === '1',
    currency: 'USD',
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
};

export default config;
