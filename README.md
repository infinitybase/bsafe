# BAKO SAFE

This repo is part of [Bako ecossistem](https://www.bako.global/)

### Fuel Shared Wallet

A streamlined solution within the Fuel ecosystem, enabling seamless implementation and effortless coin transfers in a collaborative wallet environment.
On this repo, we have:

#### 📦 Bako Safe SDK : [This](https://github.com/infinitybase/bako-safe/blob/master/packages/sdk/README.md) package have all implementations of vaults, transactions and auth.

#### 🔗 Bako Safe Connector: [This](https://github.com/infinitybase/bako-safe/blob/master/packages/connector/README.md) package to implements an connector to use BAKO SAFE on other apps, to implement use [Fuel Providers](https://wallet.fuel.network/docs/dev/connectors).

#### 📑 Bako Safe Contracts: [This](https://github.com/infinitybase/bako-safe/blob/master/packages/sway/README.md) package have the contract used by sdk to implement a multsig based on predicates.

## Tests
1. Install [Fuel Toolchain](https://docs.fuel.network/guides/installation/)
2. Install dependencies with pnpm: `pnpm install`
3. Run the Bako Safe API
4. Set up the .env files in `packages/sdk` and `packages/sway`
5. Run the tests: `pnpm test`