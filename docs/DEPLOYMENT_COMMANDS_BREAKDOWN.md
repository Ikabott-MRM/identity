# Deployment Commands: Local vs Server Breakdown

This document clarifies which commands should be executed on your **local laptop** (where you have the repo) versus on the **remote server/node** (where the system is running).

## Local Laptop Commands (Development/One-Time Setup)

These commands are run on your local machine where you have the repository cloned:

### 1. Contract Deployment (One-Time)
```bash
cd identity/contracts
npm install
npm run deploy:testnet
```
**Purpose**: Deploy the smart contract to Rootstock testnet  
**When**: Once, to get the contract address  
**Output**: Contract address (e.g., `0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F`)

### 2. Local Development/Testing
```bash
# Test the backend locally
cd identity
npm install
npm run start:dev

# Test migrations locally (if you have local MySQL)
npx knex migrate:up
```

**Purpose**: Development and testing before deploying to server  
**When**: During development

---

## Server/Node Commands (Production/Deployment)

These commands are run on the remote server where your application is deployed (e.g., EC2 instance, Azure Container Apps, etc.):

### 1. Environment Variables Setup
**Location**: Server's `.env` file (e.g., `/home/ubuntu/identity/.env`)

Add/update these variables on the **server**:
```bash
# Database (already configured)
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password

# Web3 Configuration (NEW - add these)
WEB3_ENABLED=true
WEB3_CHAIN_ID=31
WEB3_RPC_URL=https://public-node.testnet.rsk.co
WEB3_CONTRACT_ADDRESS=0x657b5B93e07Add7B0dA58043B68f5Ddc57af467F
WEB3_PRIVATE_KEY=0x...your_private_key_here
WEB3_CONFIRMATIONS=1
WEB3_TX_TIMEOUT_MS=60000
```

**How to update**: 
- SSH into your server
- Edit `/home/ubuntu/identity/.env` (or wherever your deployment is)
- Or use your deployment automation (GitHub Actions, etc.)

### 2. Database Migration (Server)
```bash
cd /home/ubuntu/identity  # or your deployment path
npx knex migrate:up
```
**Purpose**: Create the `web3_manifest_outbox` table in the production database  
**When**: After deploying new code that includes the migration  
**Where**: On the server, connected to the production database

### 3. Start/Restart Application (Server)
```bash
# If using Docker Compose
cd /home/ubuntu/identity
docker compose up -d --build api

# Or if using PM2/systemd
npm run start:prod
# or
systemctl restart identity-api
```
**Purpose**: Start the backend service with new Web3Registry functionality  
**When**: After updating code and environment variables

---

## Summary Table

| Command | Location | Purpose | Frequency |
|---------|----------|---------|-----------|
| `npm run deploy:testnet` | **Local** | Deploy contract to blockchain | Once |
| Update `.env` with `WEB3_*` vars | **Server** | Configure backend | Once (then update as needed) |
| `npx knex migrate:up` | **Server** | Create database tables | After code deployment |
| `docker compose up -d` | **Server** | Start/restart services | After deployment |
| `npm run start:dev` | **Local** | Local development | During development |

---

## Typical Deployment Flow

### Initial Setup (One-Time)

1. **On Local Laptop**:
   ```bash
   # Deploy contract
   cd identity/contracts
   npm run deploy:testnet
   # Note the contract address
   ```

2. **On Server** (via SSH or deployment script):
   ```bash
   # Add Web3 config to .env
   nano /home/ubuntu/identity/.env
   # Add: WEB3_ENABLED=true, WEB3_CONTRACT_ADDRESS=0x..., etc.
   
   # Run migration
   cd /home/ubuntu/identity
   npx knex migrate:up
   
   # Restart service
   docker compose up -d --build api
   ```

### Regular Updates (After Code Changes)

1. **On Local Laptop**: 
   - Make code changes
   - Commit and push to Git

2. **On Server** (via GitHub Actions or manual):
   ```bash
   # Pull latest code
   git pull
   
   # Run new migrations (if any)
   npx knex migrate:up
   
   # Restart service
   docker compose up -d --build api
   ```

---

## Important Notes

1. **Contract Address**: Once deployed, the contract address is permanent. You only deploy the contract once (unless you need a new one).

2. **Database Migrations**: Always run on the **server** where your production database is located.

3. **Environment Variables**: 
   - Local `.env` is for local development
   - Server `.env` is for production
   - Never commit `.env` files to Git

4. **Private Keys**: 
   - `DEPLOYER_PRIVATE_KEY`: Used once on local laptop for contract deployment
   - `WEB3_PRIVATE_KEY`: Used on server for signing transactions (should be same or different account with ownership transferred)

5. **GitHub Actions**: If you're using automated deployment (like `deploy-sbweb3.yml`), the server commands might be automated. Check your workflow file.

---

## Your Current Situation

Based on your setup with `deploy-sbweb3.yml`:

- **Local**: Contract deployment (`npm run deploy:testnet`) - ✅ Already done
- **Server**: 
  - Add `WEB3_*` environment variables to server's `.env`
  - Run `npx knex migrate:up` on server
  - Restart the service (GitHub Actions does this automatically on tag push)

The migration command you tried to run (`npx knex migrate:up`) should be executed on the **server**, not on your local laptop (unless you're testing with a local database).
