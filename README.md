# Identity

IOV Foundation's Identity API allows governments to handle Decentralized Identifiers (DIDs) and Self-Sovereign Identity (SSI). Designed for scale.

## Getting Started

### Prerequisites

- Node.js (version compatible with NestJS 10)
- npm
- Docker

### Installation

1. Clone the repository:
   `git clone https://github.com/Ikabott-MRM/identity`

2. Install dependencies:
   `npm install`

### Running the application

- To run the MySQL database (if the configured database is the one booted up from docker)
  `docker-compose up -d database`

- To run migrations
  This is needed to start the project for the first time.
  `npx knex migrate:up`

- For development:
  `npm run start:dev`

- For production:
  `npm run build`
  `npm run start:prod`

## About how issuer persistence is handled

Encryption and Email Configuration
To encrypt the portableDid, the Node.js crypto module is used with the AES (Advanced Encryption Standard) algorithm in CTR mode (aes-256-ctr).

For sending emails, the MailerModule is used. In this case, emails are sent from a Gmail account. To configure the email transport, the following environment variables were added, which define the transport host, the user (the account from which the emails will be sent), and the password for that account:

```
MAILER_TRANSPORT_HOST='smtp.gmail.com'
MAIL_USER='*******@gmail.com'
MAIL_PASSWORD='*************'
```

It is important to note that when using Gmail as the mail server, the password used is not the account’s regular login password. Instead, you must create an “APP PASSWORD” specifically for the account, which allows it to be used in external applications like this one.

**Deployment Options: Interactive and Automated**
The issuer is designed to support two types of deployments: interactive and automated.

#### Interactive Deployment

 Each time the backend starts, it will check whether an environment variable containing the CID of the encrypted portable DID uploaded to IPFS is defined. This variable is named ISSUER_PORTABLE_DID_CID.

If this variable exists, the user must enter the same password that was used when the issuer was first initialized, along with the salt used to derive the encryption key. This salt was sent to their email address during the initial setup. Using the provided password and salt, the encryption key will be derived again and used to decrypt the file containing the portableDid.

The user will also be prompted to enter the salt used to derive the encryption key for encrypting credentials before uploading them to IPFS. This salt was also sent to their email when the issuer was first initialized.

If the environment variable is not defined, it will be assumed that no issuer needs to be recovered, and a new issuer will be initialized from scratch. In this case, the user will be prompted to enter a password (with a clear explanation that it will not be stored in the system and must be kept securely) and an email address where the encrypted file and salts will be sent.

The password entered by the user to encrypt/decrypt the file will not be stored anywhere in the system.

With the encrypted file, knowledge of the encryption algorithm, and the corresponding salt, the user can decrypt the file externally if needed.

#### Automated Deployment

The deployment method for the issuer will depend on each entity that wishes to implement it. At the code level, it is possible to bypass an interactive deployment, meaning that the person responsible for setting up the issuer does not need to enter data via command line. However, how an automated deployment is achieved will depend on each entity. In this project, GitHub Actions was used to automate the deployment.

This section does not explain how to automate the deployment, but rather what is necessary at the configuration level to allow for an automated deployment.

When initializing the issuer for the first time, the following environment variables must be defined: MAIL_ADDRESS and SECRET_PWD.

MAIL_ADDRESS: This is the email address to which the salt, the encrypted content, and the initialization vector will be sent, as explained earlier. This email address, as in the interactive approach, will be validated before being used. If the address entered in the environment variable is invalid, the issuer will not initialize.

SECRET_PWD: This is the password that will be used to encrypt/decrypt the file.

It is important to note that, for any variables that the system detects as defined, the user will not have the option to enter them manually. If you want the system to prompt for any of these variables, or both, via the command line, those variables should not be defined.

Later, if for any reason it is necessary to restart the issuer to recover the DID from the initially initialized issuer, the following environment variables must be defined: ISSUER_PORTABLE_DID_CID, SECRET_PWD, SALT_ISSUER_DID and SALT_ISSUER_CREDENTIALS.

ISSUER_PORTABLE_DID_CID must be defined with the CID string sent to the user’s email after the issuer was first initialized.
SECRET_PWD must have the same value as the password used the first time the issuer was initialized.
SALT_ISSUER_DID and SALT_ISSUER_CREDENTIALS must be defined with the salt values sent to the user’s email after the issuer was first initialized. It is important to use the correct salt for each case: one will be used to derive the encryption key needed to decrypt the portable DID, and the other will be used to derive the encryption key required to encrypt credentials issued by the issuer before they are uploaded to IPFS and decrypt them when needed to be fetched. The purpose of each key is clearly explained in the email sent when the issuer was first initialized.

If ISSUER_PORTABLE_DID_CID variable is defined, it will be assumed that you want to attempt to recover the issuer that was previously initialized. If one of the above mentioned variables is not defined but ISSUER_PORTABLE_DID_CID is, the system will ask the user via command line for the missing values, and the system will wait for a response.

Therefore, if you want to fully automate the deployment process without interaction, it is crucial to correctly define the necessary environment variables for each case.

## API Keys & Endpoints Protection

### Runtime Authentication
Endpoint protection is enforced using the ApiKeyAuthGuard, which is based on the strategy implemented in: `src/auth/strategies/header-api-key-strategy.ts`
Every incoming request must include a valid x-api-key in the headers to be authenticated and passed to the route handler.

All endpoints of the issuer's API are protected via **API keys**. There is no visual interface or UI component for managing these keys. Instead, API key management is performed through command-line **scripts**. There must be at least one active api key ; otherwise, requests will be rejected with an UNAUTHORIZED error.

> **Important**  
> Before running any script, ensure that the database has been initialized using the following command:
>
> ```bash
> npx knex migrate:up
> ```
> This will create the necessary tables:  
> - `requests`: required for the issuer's internal operations.  
> - `api_keys`: used for managing API keys.

These scripts interact with the database using **Knex**, so the following environment variables must be properly set:

- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`

The **same database** must be used both by the issuer API and by the scripts to ensure access to the same set of API keys.

###  Available Scripts

Scripts are located in the `/src/auth/api-key-scripts` folder:

- `create-api-key.ts`
- `delete-api-key.ts`
- `list-api-keys.ts`

They allow continuous management of API keys (creation, listing, revocation) without requiring a server restart.

### create-api-key.ts

Use this script to create a new API key, which will be accepted for accessing protected endpoints. After a successful insert, the script **prints the plaintext key once** so you can copy it into **Amplify** (`NEXT_PUBLIC_API_KEY` on the issuer web branch) or another secrets store. Never commit that value.

- API keys are **encrypted** before being stored in the database using the `crypto` module from Node.js.
- The encryption uses **AES-256-CTR**, and each stored key includes its IV, salt, and ciphertext in a single `encrypted_key` field.
- The script also stores a `hashed_pwd` (bcrypt hash of the password used for encryption) to ensure that all keys are encrypted with the same password.

> **Note:** All API keys must be encrypted using the same password. If the password doesn't match previously stored ones, the script will terminate with:
>
> ```
> The provided password does not match the encryption password for existing API keys. All API keys must be encrypted with the same password.
> ```

##### Arguments

1. `description`: a short description of the API key (e.g., client name or purpose).
2. `password`: encryption password (used to derive the key for encryption).

Example (from `identity/` with `DB_*` set in `.env` or `.env.production`; use `NODE_ENV=production` when targeting the prod database):

```bash
npx ts-node src/auth/api-key-scripts/create-api-key.ts "IDA Emisor Web prod" "your-encryption-password"
```

Optional npm wrapper:

```bash
npm run api-key:create -- "IDA Emisor Web prod" "your-encryption-password"
```

### delete-api-key.ts
Use this script to revoke access by deleting one or more API keys.

The script first validates the provided password by comparing it (with bcrypt) against the hash stored in the database.
After validation, you can delete keys either by description or by providing an explicit list of keys.

#### Delete by Description
Deletes all API keys associated with the given description.

Example
```bash
npx ts-node src/auth/api-key-scripts/delete-api-key.ts your-password --desc="Customer ABC"
```

#### Delete Specific Keys
Deletes only the specified keys, passed as a JSON array.

Example
```bash
npx ts-node src/auth/api-key-scripts/delete-api-key.ts your-password --keys='["abc123", "def456"]'
```

### list-api-keys.ts
This script lists all active API keys.

Requires the encryption password to verify and decrypt stored keys.
Outputs the decrypted API keys along with their associated descriptions.

Example
```bash
npx ts-node src/auth/api-key-scripts/list-api-keys.ts your-password
```

## Scripts

- `npm run build`: Build the application
- `npm run format`: Format code using Prettier
- `npm run start`: Start the application
- `npm run start:dev`: Start the application in watch mode
- `npm run start:debug`: Start the application in debug mode
- `npm run start:prod`: Start the production build
- `npm run lint`: Lint and fix files
- `npm test`: Run tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:cov`: Run tests with coverage
- `npm run test:debug`: Debug tests
- `npm run test:e2e`: Run end-to-end tests

## Features

- Self-sovereign identity
  - DID Creation
  - Creation of credentials via templates
    - Driver License
    - More coming soon
  - Credential requests by end users
  - Credential approval or rejection

## Technology Stack

- NestJS
- TypeScript
- MySQL
- Jest for testing

## Contributing

Our goal is to continuously improve. We develop IDA openly on GitHub and welcome contributions from the open source community. Whether you're fixing bugs, suggesting improvements, or adding new features, your input is valuable.

## License

Apache License 2.0.

## Contact

For information purposes: info@iovf.org
For support purposes: support@iovf.org
