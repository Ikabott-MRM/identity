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