#!/usr/bin/env bash
# Post-deploy for a tenant Identity stack: env from Secrets Manager, migrate,
# API keys, issuer init, Amplify env update, smoke test.
#
# Usage:
#   bash scripts/tenant-post-deploy.sh --from-env-file /etc/ssi-tenant.env
#   # or export RuntimeSecretArn DbSecretArn NextAuthSecretArn ApiHostname ...
#
# Requires: aws CLI, docker, jq, node/npm on the golden AMI; IAM to read/write secrets + Amplify.

set -euo pipefail

IDENTITY_ROOT="${IDENTITY_ROOT:-/home/ubuntu/identity}"
FROM_ENV_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --from-env-file)
      FROM_ENV_FILE="$2"
      shift 2
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -n "$FROM_ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$FROM_ENV_FILE"
  set +a
fi

: "${RuntimeSecretArn:?}"
: "${DbSecretArn:?}"
: "${ApiHostname:?}"
: "${GatewayUri:?}"
: "${IssuerAdminEmail:?}"
: "${DisplayName:?}"

AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
NextAuthSecretArn="${NextAuthSecretArn:-}"
Web3Enabled="${Web3Enabled:-false}"
CorsOriginOverride="${CorsOriginOverride:-}"
AMPLIFY_APP_ID="${AMPLIFY_APP_ID:-}"
AMPLIFY_BRANCH="${AMPLIFY_BRANCH:-main}"
COGNITO_CLIENT_ID="${COGNITO_CLIENT_ID:-}"

cd "$IDENTITY_ROOT"

echo "==> Fetching secrets"
RUNTIME_JSON=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "$RuntimeSecretArn" --query SecretString --output text)
DB_JSON=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "$DbSecretArn" --query SecretString --output text)

SECRET_PWD=$(echo "$RUNTIME_JSON" | jq -r '.secretPwd // .SECRET_PWD // empty')
DB_PASSWORD=$(echo "$DB_JSON" | jq -r '.password')
DB_USER=$(echo "$DB_JSON" | jq -r '.username // "user"')
API_KEY_ENC_PWD=$(echo "$RUNTIME_JSON" | jq -r '.apiKeyEncryptionPassword // empty')
if [[ -z "$API_KEY_ENC_PWD" || "$API_KEY_ENC_PWD" == "null" ]]; then
  API_KEY_ENC_PWD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
fi

if [[ -z "$SECRET_PWD" || "$SECRET_PWD" == "null" ]]; then
  echo "ERROR: secretPwd missing in runtime secret" >&2
  exit 1
fi

NEXTAUTH_SECRET_VALUE=""
if [[ -n "$NextAuthSecretArn" ]]; then
  NEXTAUTH_SECRET_VALUE=$(aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "$NextAuthSecretArn" --query SecretString --output text)
  # Generated secret may be a raw string, not JSON
  if echo "$NEXTAUTH_SECRET_VALUE" | jq -e . >/dev/null 2>&1; then
    NEXTAUTH_SECRET_VALUE=$(echo "$NEXTAUTH_SECRET_VALUE" | jq -r '.password // .secret // .')
  fi
fi

PORTAL_ORIGIN="$CorsOriginOverride"
if [[ -z "$PORTAL_ORIGIN" && -n "$AMPLIFY_APP_ID" ]]; then
  DEFAULT_DOMAIN=$(aws amplify get-app --region "$AWS_REGION" --app-id "$AMPLIFY_APP_ID" --query 'app.defaultDomain' --output text)
  PORTAL_ORIGIN="https://${AMPLIFY_BRANCH}.${DEFAULT_DOMAIN}"
fi
PORTAL_ORIGIN="${PORTAL_ORIGIN:-https://localhost}"

echo "==> Writing .env"
MAIL_USER="${MAIL_USER:-$IssuerAdminEmail}"
MAIL_PASSWORD="${MAIL_PASSWORD:-changeme-set-in-secrets}"
MAILER_TRANSPORT_HOST="${MAILER_TRANSPORT_HOST:-smtp.gmail.com}"
PINATA_JWT_TOKEN=$(echo "$RUNTIME_JSON" | jq -r '.pinataJwt // empty')
DID_AUTH_JWT_SECRET=$(echo "$RUNTIME_JSON" | jq -r '.didAuthJwtSecret // empty')
DOCUMENT_URL_SIGNING_SECRET=$(echo "$RUNTIME_JSON" | jq -r '.documentUrlSigningSecret // empty')
VERIFIER_SESSION_JWT_SECRET=$(echo "$RUNTIME_JSON" | jq -r '.verifierSessionJwtSecret // empty')
PUBLIC_API_BASE_URL=$(echo "$RUNTIME_JSON" | jq -r '.publicApiBaseUrl // empty')
if [[ -z "$PUBLIC_API_BASE_URL" || "$PUBLIC_API_BASE_URL" == "null" ]]; then
  PUBLIC_API_BASE_URL="https://${ApiHostname}"
fi
DID_AUTH_JWT_TTL_SEC=$(echo "$RUNTIME_JSON" | jq -r '.didAuthJwtTtlSec // "1800"')
DOCUMENT_URL_TTL_SEC=$(echo "$RUNTIME_JSON" | jq -r '.documentUrlTtlSec // "600"')
DID_AUTH_REQUIRED=$(echo "$RUNTIME_JSON" | jq -r '.didAuthRequired // "true"')
VERIFIER_SESSION_TTL_SEC=$(echo "$RUNTIME_JSON" | jq -r '.verifierSessionTtlSec // "43200"')

# Generate + persist JWT/signing secrets if CFN placeholders left them empty
RUNTIME_UPDATED=0
gen_secret() {
  openssl rand -base64 48 | tr -d '/+=' | head -c 64
}
if [[ -z "$DID_AUTH_JWT_SECRET" || "$DID_AUTH_JWT_SECRET" == "null" ]]; then
  DID_AUTH_JWT_SECRET=$(gen_secret)
  RUNTIME_UPDATED=1
fi
if [[ -z "$DOCUMENT_URL_SIGNING_SECRET" || "$DOCUMENT_URL_SIGNING_SECRET" == "null" ]]; then
  DOCUMENT_URL_SIGNING_SECRET=$(gen_secret)
  RUNTIME_UPDATED=1
fi
if [[ -z "$VERIFIER_SESSION_JWT_SECRET" || "$VERIFIER_SESSION_JWT_SECRET" == "null" ]]; then
  VERIFIER_SESSION_JWT_SECRET=$(gen_secret)
  RUNTIME_UPDATED=1
fi
if [[ "$RUNTIME_UPDATED" -eq 1 ]]; then
  echo "==> Persisting generated didAuth/documentUrl/verifierSession secrets"
  RUNTIME_JSON=$(echo "$RUNTIME_JSON" | jq \
    --arg d "$DID_AUTH_JWT_SECRET" \
    --arg u "$DOCUMENT_URL_SIGNING_SECRET" \
    --arg v "$VERIFIER_SESSION_JWT_SECRET" \
    '. + {didAuthJwtSecret:$d, documentUrlSigningSecret:$u, verifierSessionJwtSecret:$v}')
  aws secretsmanager put-secret-value --region "$AWS_REGION" --secret-id "$RuntimeSecretArn" --secret-string "$RUNTIME_JSON" >/dev/null
fi

cat > .env <<EOF
NODE_ENV=production
CORS_ORIGIN=${PORTAL_ORIGIN}
CORS_METHODS=GET,POST,PUT,DELETE
CORS_PREFLIGHT=true
CORS_OPT_SUCCESS_STATUS=204
CORS_MAX_AGE=60
RL_TTL=60
RL_LIMIT=10
SSI_PROJECT_NAME=TBD
GATEWAY_URI=${GatewayUri}
DB_HOST=database
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=iovf-identity
MYSQL_ROOT_PASSWORD=${DB_PASSWORD}
MAILER_TRANSPORT_HOST=${MAILER_TRANSPORT_HOST}
MAIL_USER=${MAIL_USER}
MAIL_PASSWORD=${MAIL_PASSWORD}
MAIL_ADDRESS=${IssuerAdminEmail}
SECRET_PWD=${SECRET_PWD}
CACHE_TTL=360000
PINATA_JWT_TOKEN=${PINATA_JWT_TOKEN}
PINATA_GATEWAY=https://gateway.pinata.cloud
DID_AUTH_JWT_SECRET=${DID_AUTH_JWT_SECRET}
DOCUMENT_URL_SIGNING_SECRET=${DOCUMENT_URL_SIGNING_SECRET}
PUBLIC_API_BASE_URL=${PUBLIC_API_BASE_URL}
DID_AUTH_JWT_TTL_SEC=${DID_AUTH_JWT_TTL_SEC}
DOCUMENT_URL_TTL_SEC=${DOCUMENT_URL_TTL_SEC}
DID_AUTH_REQUIRED=${DID_AUTH_REQUIRED}
VERIFIER_SESSION_JWT_SECRET=${VERIFIER_SESSION_JWT_SECRET}
VERIFIER_SESSION_TTL_SEC=${VERIFIER_SESSION_TTL_SEC}
WEB3_ENABLED=${Web3Enabled}
EOF
chmod 600 .env

echo "==> Starting database"
docker compose up -d database
echo "Waiting for MySQL..."
for i in $(seq 1 60); do
  if docker compose exec -T database mysqladmin ping -h localhost -u"$DB_USER" -p"$DB_PASSWORD" --silent 2>/dev/null; then
    break
  fi
  sleep 2
done

echo "==> Migrations"
# Join compose network so DB_HOST=database resolves (do not use --no-deps).
docker compose run --rm \
  -e NODE_ENV=production \
  -e DB_HOST=database \
  -e DB_USER="$DB_USER" \
  -e DB_PASSWORD="$DB_PASSWORD" \
  api npx knex migrate:latest || \
docker compose run --rm \
  -e NODE_ENV=production \
  -e DB_HOST=database \
  -e DB_USER="$DB_USER" \
  -e DB_PASSWORD="$DB_PASSWORD" \
  api npx knex migrate:up

TENANT_SLUG=$(echo "$RUNTIME_JSON" | jq -r '.tenantSlug // "tenant"')

extract_plaintext_key() {
  # Last non-empty line of script output after banners
  echo "$1" | awk 'NF{line=$0} END{print line}'
}

echo "==> Creating API keys"
EMISOR_OUT=$(docker compose run --rm \
  -e NODE_ENV=production -e DB_HOST=database -e DB_USER -e DB_PASSWORD \
  api npx ts-node src/auth/api-key-scripts/create-api-key.ts "${TENANT_SLUG}-emisor" "$API_KEY_ENC_PWD" 2>&1) || true
MOBILE_OUT=$(docker compose run --rm \
  -e NODE_ENV=production -e DB_HOST=database -e DB_USER -e DB_PASSWORD \
  api npx ts-node src/auth/api-key-scripts/create-api-key.ts "${TENANT_SLUG}-mobile" "$API_KEY_ENC_PWD" 2>&1) || true

API_KEY_EMISOR=$(extract_plaintext_key "$EMISOR_OUT")
API_KEY_MOBILE=$(extract_plaintext_key "$MOBILE_OUT")

if [[ -z "$API_KEY_EMISOR" || ${#API_KEY_EMISOR} -lt 16 ]]; then
  echo "WARN: could not parse emisor API key; check create-api-key output:" >&2
  echo "$EMISOR_OUT" >&2
fi

echo "==> Persisting keys into Secrets Manager (no plaintext in logs)"
MERGED=$(echo "$RUNTIME_JSON" | jq \
  --arg e "$API_KEY_EMISOR" \
  --arg m "$API_KEY_MOBILE" \
  --arg p "$API_KEY_ENC_PWD" \
  '. + {apiKeyEmisor:$e, apiKeyMobile:$m, apiKeyEncryptionPassword:$p}')
aws secretsmanager put-secret-value --region "$AWS_REGION" --secret-id "$RuntimeSecretArn" --secret-string "$MERGED" >/dev/null

echo "==> Starting API (issuer automated init via MAIL_ADDRESS + SECRET_PWD)"
docker compose up -d --build api
sleep 15

echo "==> Smoke GET /requests"
SMOKE_CODE=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' \
  -H "x-api-key: ${API_KEY_EMISOR}" \
  "http://127.0.0.1:3000/requests" || echo "000")
echo "Smoke HTTP $SMOKE_CODE"
cat /tmp/smoke.json 2>/dev/null || true

if [[ -n "$AMPLIFY_APP_ID" && -n "$API_KEY_EMISOR" ]]; then
  echo "==> Updating Amplify branch env (IDENTITY_API_KEY, NEXTAUTH_SECRET, Cognito secret)"
  COGNITO_SECRET=""
  if [[ -n "$COGNITO_CLIENT_ID" ]]; then
    POOL_ID=$(aws cognito-idp list-user-pools --region "$AWS_REGION" --max-results 60 \
      --query "UserPools[?contains(Name, '${TENANT_SLUG}')].Id | [0]" --output text 2>/dev/null || true)
    if [[ -n "$POOL_ID" && "$POOL_ID" != "None" ]]; then
      COGNITO_SECRET=$(aws cognito-idp describe-user-pool-client \
        --region "$AWS_REGION" \
        --user-pool-id "$POOL_ID" \
        --client-id "$COGNITO_CLIENT_ID" \
        --query 'UserPoolClient.ClientSecret' --output text 2>/dev/null || true)
    fi
  fi

  ENV_ARGS=(
    "IDENTITY_API_KEY=${API_KEY_EMISOR}"
    "NEXT_PUBLIC_API_BASE_URL=https://${ApiHostname}"
    "NEXT_PUBLIC_TENANT_NAME=${DisplayName}"
    "NEXTAUTH_URL=${PORTAL_ORIGIN}"
  )
  if [[ -n "$NEXTAUTH_SECRET_VALUE" ]]; then
    ENV_ARGS+=("NEXTAUTH_SECRET=${NEXTAUTH_SECRET_VALUE}")
  fi
  if [[ -n "$COGNITO_CLIENT_ID" ]]; then
    ENV_ARGS+=("COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}")
  fi
  if [[ -n "$COGNITO_SECRET" && "$COGNITO_SECRET" != "None" ]]; then
    ENV_ARGS+=("COGNITO_CLIENT_SECRET=${COGNITO_SECRET}")
  fi

  # Merge with existing branch env via get-branch
  aws amplify update-branch \
    --region "$AWS_REGION" \
    --app-id "$AMPLIFY_APP_ID" \
    --branch-name "$AMPLIFY_BRANCH" \
    --environment-variables $(printf '%s ' "${ENV_ARGS[@]}") \
    >/dev/null || echo "WARN: amplify update-branch failed; set env in console" >&2

  aws amplify start-job \
    --region "$AWS_REGION" \
    --app-id "$AMPLIFY_APP_ID" \
    --branch-name "$AMPLIFY_BRANCH" \
    --job-type RELEASE \
    >/dev/null 2>&1 || echo "WARN: amplify start-job failed" >&2
fi

echo "==> Post-deploy complete for ${DisplayName} (${ApiHostname})"
echo "Record InstanceId / secret ARNs in tenants/<slug>.md on the ops workstation."
