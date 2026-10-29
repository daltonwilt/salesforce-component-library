# Salesforce Component Library

A library of reusable Lightning Web Components (LWC) and supporting Apex for the Salesforce Platform.

## Prerequisites

- [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli)
- [Node.js](https://nodejs.org/) (LTS)
- [VS Code](https://code.visualstudio.com/) with the [Salesforce Extension Pack](https://developer.salesforce.com/docs/platform/sfvscode-extensions/guide/install.html)
- A Salesforce org: a free [Developer Edition](https://developer.salesforce.com/signup) org, or a Dev Hub for scratch orgs

## Getting Started

```sh
git clone https://github.com/daltonwilt/salesforce-component-library.git
cd salesforce-component-library
npm install
```

### Deploy to an org

```sh
sf org login web --alias my-org
sf project deploy start --target-org my-org
```

### Or use a scratch org

```sh
sf org login web --set-default-dev-hub --alias devhub
sf org create scratch --definition-file config/project-scratch-def.json --alias scl-scratch --set-default
sf project deploy start
sf org open
```

## Project Structure

| Path                              | Contents                     |
| --------------------------------- | ---------------------------- |
| `force-app/main/default/lwc/`     | Lightning Web Components     |
| `force-app/main/default/classes/` | Apex classes                 |
| `config/project-scratch-def.json` | Scratch org definition       |
| `manifest/package.xml`            | Metadata manifest            |
| `scripts/`                        | Sample Apex and SOQL scripts |

## Development

| Command                      | Description                              |
| ---------------------------- | ---------------------------------------- |
| `npm run lint`               | Lint Aura and LWC JavaScript with ESLint |
| `npm test`                   | Run LWC Jest unit tests                  |
| `npm run test:unit:watch`    | Run Jest tests in watch mode             |
| `npm run test:unit:coverage` | Run Jest tests with a coverage report    |
| `npm run prettier`           | Format all source files                  |
| `npm run prettier:verify`    | Check formatting without writing         |

A pre-commit hook (Husky + lint-staged) lints and tests staged LWC files automatically.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started, and please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Please do not report security vulnerabilities through public issues. See [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
