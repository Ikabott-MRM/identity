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
});
