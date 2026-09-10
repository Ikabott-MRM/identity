# Credential types (Geyser + stack default)

| Tenant | Request `schema_id` | Notes |
|--------|---------------------|-------|
| Geyser | `donor`, `fundraiser` | Citizen UX only; no Driver license / Passport / ID |
| Stack default | `associate` | Socio / Associate |
| AvalDAO | TBD | Do not change AvalDAO product schemas yet |
| Legacy | `drivers_license`, `production_registry` | Kept in Identity for old data |

Issuance schemas live in `src/ssi/inMemoryRepositories/credentialsSchemas-in-memory.ts`.
Registry: `src/ssi/credentialTypes.registry.ts` (default = `associate`).
