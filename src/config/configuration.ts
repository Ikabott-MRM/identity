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
  didAuth: {
    jwtSecret:
      process.env.DID_AUTH_JWT_SECRET ||
      'dev-only-did-auth-jwt-secret-change-me',
    jwtTtlSec: parseInt(process.env.DID_AUTH_JWT_TTL_SEC || '1800', 10),
    challengeTtlSec: parseInt(process.env.DID_AUTH_CHALLENGE_TTL_SEC || '300', 10),
    audience: 'ssi-citizen',
    // Dev-only default: require DID JWT on subject routes.
    required: process.env.DID_AUTH_REQUIRED !== 'false',
  },
  verifierSession: {
    jwtSecret:
      process.env.VERIFIER_SESSION_JWT_SECRET ||
      process.env.DID_AUTH_JWT_SECRET ||
      'dev-only-verifier-session-jwt-secret-change-me',
    // Pilot default: 12 hours
    jwtTtlSec: parseInt(process.env.VERIFIER_SESSION_TTL_SEC || '43200', 10),
    audience: 'ssi-verifier',
  },
  documents: {
    urlSigningSecret:
      process.env.DOCUMENT_URL_SIGNING_SECRET ||
      'dev-only-document-url-signing-secret-change-me',
    urlTtlSec: parseInt(process.env.DOCUMENT_URL_TTL_SEC || '600', 10),
  },
  publicApiBaseUrl: (
    process.env.PUBLIC_API_BASE_URL || 'http://localhost:3000'
  ).replace(/\/$/, ''),
});
