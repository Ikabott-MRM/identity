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
  ssiService: {
    ssiServiceEndpoint: process.env.SSI_SERVICE_URL,
    //TODO definir si se va a tener uno no propio por default
    dwn: process.env.DWN_URL,
    ssiProjectName: process.env.SSI_PROJECT_NAME || 'TBD',
  },
  database: {},
});
