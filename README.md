# Identity


IOV Foundation's Identity API allows governments to handle Decentralized Identifiers (DIDs) and Self-Sovereign Identity (SSI). Designed for scale.


## Getting Started

### Prerequisites

- Node.js (version compatible with NestJS 10)
- npm
- Docker

### Installation

1. Clone the repository:
`git clone https://github.com/IOV-Foundation/identity`

2. Install dependencies:
`npm install`

### Running the application

- To run the MySQL database
`docker-compose up -d database`

- To run migrations
This is needed to start the project for the first time.
`npx knex migrate:up`

- For development:
`npm run start:dev`

- For production:
`npm run build`
`npm run start:prod`

## About persistence 

To encrypt the portable DID, the Node.js crypto module is used with the AES (Advanced Encryption Standard) algorithm in CTR mode (aes-256-ctr).

The password entered by the user to encrypt/decrypt the file will not be stored anywhere in the system. Each time the backend is started, it will check if a file containing the encrypted portable DID exists.

If this file exists, a user will need to enter the password used the first time the issuer was initialized, along with the salt used to derive the encryption key, which was sent to their email when the issuer was first set up. Using this password and salt, the encryption key will be derived again and used to decrypt the file containing the portable DID.

If the file does not exist, the user will be prompted to enter a password (with an explanation that it will not be stored in the system and should be kept secure) and an email address to send the encrypted file and the salt. With the encrypted file, knowledge of the algorithm used, and the salt, the user will be able to decrypt the file externally if needed.

For sending emails, the MailerModule is used. In this case, emails are sent from a Gmail account. To configure the mail transport, the following environment variables were added, defining the transport host, the user (the account from which emails will be sent), and the password for that account:

- MAILER_TRANSPORT_HOST='smtp.gmail.com'
- MAIL_USER='*******@gmail.com'
- MAIL_PASSWORD='*************'

It is important to note that when using Gmail as the mail server, the password used is not the usual login password for the account. A specific "APP PASSWORD" needs to be created for the account, which allows its use in external applications like this one.

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
- [TBD](https://www.tbd.website/)
- MySQL
- Jest for testing

## Contributing

Our goal is to continuously improve. We develop IDA openly on GitHub and welcome contributions from the open source community. Whether you're fixing bugs, suggesting improvements, or adding new features, your input is valuable.

## License

Apache License 2.0.

## Contact
For information purposes: info@iovf.org
For support purposes: support@iovf.org