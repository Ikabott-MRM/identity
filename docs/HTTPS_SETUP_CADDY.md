## Goal
Expose the Identity API (`identity` service `api`) over **HTTPS** for mobile testers.

This uses **Caddy** (automatic Let’s Encrypt TLS) as a reverse proxy in front of the NestJS API that listens on port `3000`.

### Why
Many Android devices and networks are hostile to plain `http://<ip>:3000` (cleartext, captive portals, enterprise policies, firewalls). A standard `https://api.<domain>` on port `443` is more reliable for testers.

## Prerequisites
- A domain you control (example: `api.example.com`)
- The server running `identity` is reachable from the internet
- Docker + Docker Compose installed on the server

## 1) DNS
Create an **A record**:
- **Name**: `api` (or whatever you choose)
- **Value**: your server public IPv4 (e.g. the EC2 public IP)

Wait until it resolves:
```bash
nslookup api.example.com
```

## 2) Open firewall / security group
Allow inbound:
- TCP **80** (for ACME HTTP-01 challenge)
- TCP **443** (HTTPS)

Keep TCP **3000** **closed** to the internet if possible (only needed internally between Caddy and the API container).

## 3) Configure environment on the server
In the `identity/` folder on the server, set:
- `API_DOMAIN=api.example.com`
- `ACME_EMAIL=devops@example.com`

Example (Linux):
```bash
export API_DOMAIN="api.example.com"
export ACME_EMAIL="devops@example.com"
```

## 4) Start the stack with HTTPS
From `identity/`:
```bash
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build
```

## 5) Verify HTTPS
```bash
curl -I "https://api.example.com/api"
```

You should see a `200`/`301` and a valid TLS certificate.

## Current production/staging domain (already configured)
Your EC2 instance `i-078b4aa20a1efac2a` is already serving HTTPS via **nginx + Certbot** at:
- `https://api-ssi.iovf.org/` → proxies to `http://localhost:3000`

If you use this existing domain, you **do not need Caddy**. Just point the mobile apps to:
- `EXPO_PUBLIC_API_BASE_URL=https://api-ssi.iovf.org/`

## 6) Point the mobile app to HTTPS
Update the mobile app base URL to your HTTPS endpoint:
- `EXPO_PUBLIC_API_BASE_URL=https://api.example.com/`

Where to set it:
- `IDA-Ciudadano-App/eas.json` build profile `preview.env.EXPO_PUBLIC_API_BASE_URL`
- optionally `IDA-Ciudadano-App/app.json` `expo.extra.publicEnv.EXPO_PUBLIC_API_BASE_URL` for local builds

Then rebuild the APK (EAS preview or local).

