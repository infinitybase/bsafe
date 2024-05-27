# 📑 Bako Safe Contracts

## Multi-Signature Smart Contract Package for Fuel Ecosystem

This package is designed to operate within the Fuel ecosystem, ensuring compatibility with beta5. It utilizes a predicate contract type to construct a multi-signature mechanism. This mechanism allows for pre-configuring the individuals required to witness a transaction, along with specifying the minimum number of witnesses needed for transaction confirmation.

To integrate this multi-signature smart contract into your project, ensure you're operating within the Fuel ecosystem and your environment is compatible with beta5. For detailed instructions on setting up and using the supported wallets, please refer to their respective links provided.

## Supported Signatures

Currently, our predicate contract supports only two types of signatures:

1. **Fuel Ecosystem Native Wallets**: Signatures from the native wallets within the Fuel ecosystem are accepted. This includes:

   - [FuelWallet](https://chromewebstore.google.com/detail/fuel-wallet/dldjpboieedgcmpkchcjcbijingjcgok): A native wallet designed for seamless integration with Fuel's functionalities.
   - [Fuelet](https://chromewebstore.google.com/detail/fuelet-wallet-fuel/bifidjkcdpgfnlbcjpdkdcnbiooooblg): Another native wallet option for users within the Fuel ecosystem.

2. **WebAuthn Signatures**: We also support signatures made through WebAuthn, providing a secure and widely compatible method for authentication. More about WebAuthn can be found [here](https://webauthn.io/).

## Build your contract

- Create a new file `.env` based on `.env.example`
- Add the desired configurations to the `fuels.config.ts` file:

```
yarn fuels build
```
