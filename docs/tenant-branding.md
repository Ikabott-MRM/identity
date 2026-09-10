# Tenant branding checklist (Emisor + Citizen + Verifier)

**Goal:** every customer tenant ships with *their* institutional look. Never leave Zijin Mining / IOV Foundation as production defaults for customer tenants.

## Emisor (IDA-Emisor-Web / Amplify)

Branding is **tenant-driven** via Amplify bake-time `NEXT_PUBLIC_*` (from CloudFormation + optional branch extras).

### CloudFormation parameters (`infra/tenant-stack`)

| Parameter | Purpose | Example Geyser | Example AvalDAO |
|-----------|---------|----------------|-----------------|
| `DisplayName` | Portal title / `NEXT_PUBLIC_TENANT_NAME` | `Geyser` | `AvalDAO` |
| `PrimaryColor` | Header / primary CTA | `#00F5DC` | `#292A6D` |
| `LogoHeaderUrl` | Header logo (HTTPS URL preferred) | GCS `logo-name-dark.svg` | `https://avaldao.com/images/avaldao.svg` |

### Amplify branch extras (set after stack create if not in CFN yet)

| Env var | Purpose |
|---------|---------|
| `NEXT_PUBLIC_PRIMARY_DARK_COLOR` | Footer / dark surfaces |
| `NEXT_PUBLIC_ACCENT_COLOR` | Secondary actions |
| `NEXT_PUBLIC_TEXT_COLOR` | Body text |
| `NEXT_PUBLIC_BACKGROUND_COLOR` | Page background |
| `NEXT_PUBLIC_LOGO_FOOTER_URL` | Footer logo (client institutional) |

Code defaults in `lib/brand/tenant.ts` are **neutral** (`Issuer Portal`, `/images/logo-issuer.svg`). Do **not** reintroduce Zijin paths as defaults.

`next.config.mjs` must allow logo CDN hostnames (`NEXT_PUBLIC_LOGO_*` URLs + known hosts).

### Verify before handoff

1. Open Amplify portal `/login` — title `{DisplayName} Issuer Portal` / `Portal Emisor — {DisplayName}`.
2. Header + footer logos load (no Zijin SVG).
3. Cognito button uses `PrimaryColor`.
4. Redeploy Amplify **after** changing env (RELEASE job).

## Citizen + Verifier (EAS)

| Item | How |
|------|-----|
| App name | `app.config.js` from `EXPO_PUBLIC_TENANT_SLUG` |
| Package / bundle id | `com.ikabott.ssi.{citizen\|verifier}.{slug}` |
| Header logo | `constants/brand.ts` → `assets/images/tenants/{slug}-logo.png` |
| Theme primary / header bg | `constants/brand.ts` |
| Splash / adaptive icon bg | `app.config.js` per tenant |
| EAS profile | `production-geyser` / `production-avaldao` **must** set `EXPO_PUBLIC_TENANT_SLUG` |

Remove visible IOVF / Zijin strings and `logo-iovf.png` from headers/splash/about for customer builds.

API keys stay in EAS Environment secrets — never in `eas.json`.

## Parameters files

- `parameters.example.json` — neutral demo (`Acme Demo`), **not** Zijin logos.
- Per-tenant: `parameters.<slug>.json` + `BRANDING.<slug>.md` with scraped institutional colors/logos.
- Record outcomes in `tenants/<slug>/<slug>.md`.

## Never again

- [ ] No Zijin / IOVF production defaults for customer tenants
- [ ] CFN `DisplayName` / `PrimaryColor` / `LogoHeaderUrl` set before go-live
- [ ] Amplify extras (footer logo, dark/accent) set + RELEASE succeeded
- [ ] Apps built with correct `EXPO_PUBLIC_TENANT_SLUG`
- [ ] Portal title + app header logos checked before handoff

See also: [tenant-stack-onboarding.md](./tenant-stack-onboarding.md), `infra/tenant-stack/BRANDING.*.md`.


## Credential types (per tenant)

| Tenant | Citizen request schemas (`schema_id`) | Notes |
|--------|----------------------------------------|-------|
| **Geyser** | `donor`, `fundraiser` | Labels: Donor/Donante, Fundraiser. No Driver license / Passport / Identification in UX. |
| **Stack default / pilot** | `associate` | Socio / Associate — single type for new non-Geyser tenants. |
| **AvalDAO** | TBD | Do not change AvalDAO product schemas yet; interim UI may show Associate. |
| Legacy (Identity only) | `drivers_license` → `DriversLicense`, `production_registry` → `ProductionRegistry` | Kept in Identity for old data; apps must not offer them for Geyser. |

Identity registry: `identity/src/ssi/credentialTypes.registry.ts`. Issuance schemas: `credentialsSchemas-in-memory.ts`.

Citizen `constants/brand.ts` exposes `credentials: [{ id, labelKey }]` per tenant — Fab menu + identity submission use that list only.
