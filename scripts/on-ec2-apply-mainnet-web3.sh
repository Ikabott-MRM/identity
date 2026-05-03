#!/usr/bin/env bash
# Run on the NEW prod EC2 as ubuntu (after AMI clone), before restarting api.
# Usage:
#   export MAINNET_CONTRACT=0xCc8dfB72BA18f6cBd626A1e609F8864707d77EdF
#   bash /home/ubuntu/identity/scripts/on-ec2-apply-mainnet-web3.sh

set -euo pipefail
ROOT="${IDENTITY_ROOT:-/home/ubuntu/identity}"
ENV_FILE="$ROOT/.env"
CONTRACT="${MAINNET_CONTRACT:?Set MAINNET_CONTRACT to the mainnet DidManifestRegistry address}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

cp -a "$ENV_FILE" "${ENV_FILE}.bak.$(date +%Y%m%d%H%M%S)"

sed -i 's/^WEB3_CHAIN_ID=.*/WEB3_CHAIN_ID=30/' "$ENV_FILE"
sed -i 's|^WEB3_RPC_URL=.*|WEB3_RPC_URL=https://public-node.rsk.co|' "$ENV_FILE"
sed -i "s/^WEB3_CONTRACT_ADDRESS=.*/WEB3_CONTRACT_ADDRESS=$CONTRACT/" "$ENV_FILE"

if grep -q '^WEB3_CONFIRMATIONS=' "$ENV_FILE"; then
  sed -i 's/^WEB3_CONFIRMATIONS=.*/WEB3_CONFIRMATIONS=3/' "$ENV_FILE"
else
  echo 'WEB3_CONFIRMATIONS=3' >> "$ENV_FILE"
fi

echo "Updated $ENV_FILE — diff vs backup left in ${ENV_FILE}.bak.*"
grep -E '^WEB3_(ENABLED|CHAIN_ID|RPC_URL|CONTRACT_ADDRESS|CONFIRMATIONS|TX_TIMEOUT_MS)=' "$ENV_FILE" || true

cd "$ROOT"
docker compose up -d --force-recreate api
docker compose logs --tail=80 api | grep -E 'Web3Registry|Chain ID|Contract address' || true
