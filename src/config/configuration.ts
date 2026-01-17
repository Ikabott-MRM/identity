export default () => ({
  corsConfig: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: process.env.CORS_METHODS || 'GET,POST,DELETE,PUT',
    preflightContinue: process.env.CORS_PREFLIGHT || false,
    optionsSuccessStatus: parseInt(process.env.CORS_OPT_SUCCESS_STATUS) || 204,
    maxAge: parseInt(process.env.CORS_MAX_AGE) || 60,
  },
  rateLimiting: {
    ttl: parseInt(process.env.RL_TTL) || 60,
    limit: parseInt(process.env.RL_LIMIT) || 10,
  },
  ssi: {
    ssiProjectName: process.env.SSI_PROJECT_NAME || 'TBD',
    gatewayUri: process.env.GATEWAY_URI,
  },
  apiKeys: {
    cacheTTL: parseInt(process.env.CACHE_TTL) || 360000,
  },
  issuerPersistenceAndRecovery: {
    secretPwd: process.env.SECRET_PWD,
    issuerDidSalt: process.env.SALT_ISSUER_DID,
    credentialsSalt: process.env.SALT_ISSUER_CREDENTIALS,
    issuerDidCID: process.env.ISSUER_PORTABLE_DID_CID,
    emailAddress: process.env.MAIL_ADDRESS,
  },
  web3: {
    enabled: process.env.WEB3_ENABLED === 'true',
    rpcUrl: process.env.WEB3_RPC_URL,
    chainId: parseInt(process.env.WEB3_CHAIN_ID || '31', 10),
    contractAddress: process.env.WEB3_CONTRACT_ADDRESS,
    privateKey: process.env.WEB3_PRIVATE_KEY,
    confirmations: parseInt(process.env.WEB3_CONFIRMATIONS || '1', 10),
    txTimeoutMs: parseInt(process.env.WEB3_TX_TIMEOUT_MS || '60000', 10),
  },
});
