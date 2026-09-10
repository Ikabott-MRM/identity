#!/usr/bin/env bash
# Prepare a machine for a Golden AMI used by the SSI tenant stack.
# Run on an EC2 that already has Docker + the identity repo cloned.
# Result: software present, NO customer DID / DB / API keys / documents.
#
# Usage (on the instance, as the deploy user):
#   cd /home/ubuntu/identity
#   bash scripts/prepare-golden-ami.sh
#
# Then create the AMI with --no-reboot (or stop instance) from your workstation.

set -euo pipefail

IDENTITY_ROOT="${IDENTITY_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$IDENTITY_ROOT"

echo "==> Identity root: $IDENTITY_ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is required" >&2
  exit 1
fi

echo "==> Stopping compose services (if any)"
docker compose down --remove-orphans 2>/dev/null || true

echo "==> Removing MySQL volume data (db-data) and DWN volume if present"
# Named volumes from docker-compose.yml
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-$(basename "$IDENTITY_ROOT" | tr '[:upper:]' '[:lower:]')}"
for vol in "${PROJECT_NAME}_db-data" "${PROJECT_NAME}_dwn-data" "identity_db-data" "identity_dwn-data" "db-data" "dwn-data"; do
  if docker volume inspect "$vol" >/dev/null 2>&1; then
    echo "    removing volume $vol"
    docker volume rm -f "$vol" || true
  fi
done

echo "==> Clearing local documents/"
mkdir -p documents
find documents -mindepth 1 -maxdepth 1 -exec rm -rf {} +

echo "==> Removing tenant env files (keep examples)"
rm -f .env .env.production .env.staging .env.local || true
# Never ship issuer recovery secrets in the AMI
for f in .env*; do
  if [[ -f "$f" && "$f" != *.example && "$f" != *.stack.example ]]; then
    echo "    removing $f"
    rm -f "$f"
  fi
done

if [[ -f .env.stack.example ]]; then
  echo "==> Installing clean .env.stack.example as reference only (not active .env)"
else
  echo "WARN: .env.stack.example missing; copy from repo before baking AMI" >&2
fi

echo "==> Removing issuer recovery / api-key password artifacts"
rm -f api-keys-password.txt issuer-did-encrypted.json issuer-recovery.json issuer-recovery*.json || true

echo "==> Sanity: no secret assignments in active env files"
hits=$(grep -RIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=scripts \
  -E '^(ISSUER_PORTABLE_DID_CID|SECRET_PWD)=' . 2>/dev/null | grep -v '\.example' | grep -v 'prepare-golden-ami' | head -n 20 || true)
if [[ -n "${hits}" ]]; then
  echo "$hits"
  echo "ERROR: found secret-like assignments outside examples; clean them before AMI" >&2
  exit 1
fi


echo "==> Docker images retained (software). Volumes wiped."
echo ""
echo "Golden AMI checklist:"
echo "  [ ] MySQL volume empty / removed"
echo "  [ ] documents/ empty"
echo "  [ ] no .env with customer secrets"
echo "  [ ] no ISSUER_PORTABLE_DID_CID in active config"
echo "  [ ] docker compose config still present"
echo ""
echo "Next (from workstation):"
echo "  aws ec2 create-image --instance-id <i-...> --name \"ssi-identity-golden-\$(date +%Y%m%d)\" --no-reboot"
echo "  Tag AMI: TenantStack=identity-golden, Version=v1"
echo "  Create Launch Template TenantStack-Identity-v1 pointing at that AMI"
