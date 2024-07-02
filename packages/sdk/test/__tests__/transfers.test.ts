import { Provider, TransactionStatus, Wallet, bn } from 'fuels';
import { authService, delay, IUserAuth, newVault, signin } from '../utils';
import { BakoSafe } from '../../configurables';
import { accounts, assets, DEFAULT_BALANCE_VALUE, networks } from '../mocks';
import {
  DEFAULT_MULTI_ASSET_TRANSACTION_PAYLOAD,
  DEFAULT_TRANSACTION_PAYLOAD,
} from '../mocks/transactions';
import { Vault } from '../../src/modules/vault/Vault';
import { IPayloadVault } from '../../src/modules/vault/types';
import { v4 as uuidv4 } from 'uuid';

describe('[TRANSFERS]', () => {
  let chainId: number;
  let auth: IUserAuth;
  let provider: Provider;
  let signers: string[];

  //example to sett up the provider
  BakoSafe.setProviders({
    CHAIN_URL: 'http://localhost:4000/v1/graphql',
    SERVER_URL: 'http://localhost:3333',
    CLIENT_URL: 'http://localhost:5174',
  });

  beforeAll(async () => {
    provider = await Provider.create(BakoSafe.getProviders('CHAIN_URL'));
    chainId = provider.getChainId();
    auth = await authService(
      ['USER_1', 'USER_2', 'USER_3', 'USER_5', 'USER_4'],
      provider.url,
    );

    signers = [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
      accounts['USER_3'].address,
    ];
  }, 30 * 1000);

  test(
    'Created an valid transaction to vault and instance old transaction',
    async () => {
      const vault = await newVault(
        signers,
        provider,
        auth['USER_1'].BakoSafeAuth,
        100,
      );
      const tx = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);

      const transaction = await vault.BakoSafeIncludeTransaction(tx);

      const signTimeout = async () => {
        await delay(5000);
        await signin(
          transaction.getHashTxId(),
          'USER_3',
          auth['USER_3'].BakoSafeAuth,
          transaction.BakoSafeTransactionId,
        );

        await delay(5000);
        await signin(
          transaction.getHashTxId(),
          'USER_2',
          auth['USER_2'].BakoSafeAuth,
          transaction.BakoSafeTransactionId,
        );
      };

      // Signin transaction
      await signin(
        transaction.getHashTxId(),
        'USER_1',
        auth['USER_1'].BakoSafeAuth,
        transaction.BakoSafeTransactionId,
      );

      const oldTransaction = await vault.BakoSafeGetTransaction(
        transaction.BakoSafeTransactionId,
      );

      oldTransaction.send();

      // this process isan`t async, next line is async
      signTimeout();
      const result = await transaction.wait();

      expect(result.status).toBe(TransactionStatus.success);
    },
    100 * 1000,
  );

  test(
    'Sign transactions with invalid users',
    async () => {
      const vault = await newVault(
        signers,
        provider,
        auth['USER_1'].BakoSafeAuth,
        100,
      );
      const tx = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);

      const transaction = await vault.BakoSafeIncludeTransaction(tx);
      expect(
        await signin(
          transaction.getHashTxId(),
          'USER_2',
          auth['USER_2'].BakoSafeAuth,
          transaction.BakoSafeTransactionId,
        ),
      ).toBe(true);
      expect(
        await signin(
          transaction.getHashTxId(),
          'USER_1',
          auth['USER_1'].BakoSafeAuth,
          transaction.BakoSafeTransactionId,
        ),
      ).toBe(true);
      expect(
        await signin(
          transaction.getHashTxId(),
          'USER_3',
          auth['USER_3'].BakoSafeAuth,
          transaction.BakoSafeTransactionId,
        ),
      ).toBe(true);
      expect(
        await signin(
          transaction.getHashTxId(),
          'USER_4',
          auth['USER_4'].BakoSafeAuth,
          transaction.BakoSafeTransactionId,
        ),
      ).toBe(false);
      transaction.send();
      const result = await transaction.wait();
      expect(result.status).toBe(TransactionStatus.success);
    },
    100 * 1000,
  );

  test(
    'Instance old transaction',
    async () => {
      const vault = await newVault(
        signers,
        provider,
        auth['USER_1'].BakoSafeAuth,
        100,
      );
      const tx = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);

      // Create a transaction
      const transaction = await vault.BakoSafeIncludeTransaction(tx);
      const transaction_aux = await vault.BakoSafeGetTransaction(
        transaction.BakoSafeTransactionId,
      );
      const transaction_aux_byhash = await vault.BakoSafeGetTransaction(
        transaction.getHashTxId(),
      );

      expect(transaction_aux.BakoSafeTransactionId).toStrictEqual(
        transaction.BakoSafeTransactionId,
      );
      expect(transaction_aux_byhash.BakoSafeTransactionId).toStrictEqual(
        transaction.BakoSafeTransactionId,
      );
    },
    10 * 1000,
  );

  test('Send an transaction to with vault without balance', async () => {
    const vault = await newVault(
      signers,
      provider,
      auth['USER_1'].BakoSafeAuth,
    );
    const tx_a = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);
    tx_a.assets[0].amount = '100';

    await expect(vault.BakoSafeIncludeTransaction(tx_a)).rejects.toThrow(
      'FuelError: not enough coins to fit the target',
    );
  });

  test('Sent a transaction without BakoSafeAuth', async () => {
    const vault = await newVault(signers, provider, undefined, 100);
    const tx = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);

    const transaction = await vault.BakoSafeIncludeTransaction(tx);
    transaction.witnesses = [
      await signin(transaction.getHashTxId(), 'USER_1'),
      await signin(transaction.getHashTxId(), 'USER_2'),
      await signin(transaction.getHashTxId(), 'USER_3'),
    ];

    const result = await transaction.send().then(async (tx) => {
      if ('wait' in tx) {
        return await tx.wait();
      }
      return {
        status: TransactionStatus.failure,
      };
    });

    expect(result.status).toBe(TransactionStatus.success);
  });

  test(
    'Send a transaction with production fuel node',
    async () => {
      const _provider = await Provider.create(networks['DEVNET']);
      //valid only for devnet
      const HASH_PREDICATE =
        '0xb2bf0410c0574e5a9abf4ac5579cdcbf5bd33c1015b2a74bb34acc9069b7dc8a';
      const tx_name = 'Test Transaction on DEVNET';
      const VaultPayload: IPayloadVault = {
        configurable: {
          SIGNATURES_COUNT: 1,
          SIGNERS: signers,
          network: _provider.url,
          HASH_PREDICATE,
        },
        BakoSafeAuth: auth['USER_1'].BakoSafeAuth,
      };

      const _vault = await Vault.create(VaultPayload);

      await expect(
        await _vault
          .BakoSafeIncludeTransaction({
            name: tx_name,
            assets: [
              {
                assetId: _provider.getBaseAssetId(),
                to: accounts['STORE'].address,
                amount: DEFAULT_BALANCE_VALUE.format(),
              },
            ],
          })
          .then((tx) => {
            return tx.name;
          }),
      ).toBe(tx_name);

      await expect(
        _vault.BakoSafeIncludeTransaction({
          name: tx_name,
          assets: [
            {
              assetId: _provider.getBaseAssetId(),
              to: accounts['STORE'].address,
              amount: '0.5',
            },
          ],
        }),
      ).rejects.toThrow('FuelError: not enough coins to fit the target');
    },
    100 * 1000,
  );

  test(
    'Send transaction with same asset ids and recipients',
    async () => {
      const vault = await newVault(
        signers,
        provider,
        auth['USER_1'].BakoSafeAuth,
        100,
        1,
      );
      const wallet = Wallet.generate({ provider });
      const walletBalance = await wallet.getBalance(provider.getBaseAssetId());

      const numAssets = 3;
      const transaction = await vault.BakoSafeIncludeTransaction({
        name: `tx_${uuidv4()}`,
        assets: Array.from({ length: numAssets }, () => ({
          assetId: provider.getBaseAssetId(),
          to: wallet.address.toString(),
          amount: DEFAULT_BALANCE_VALUE.format(),
        })),
      });

      await signin(
        transaction.getHashTxId(),
        'USER_1',
        auth['USER_1'].BakoSafeAuth,
        transaction.BakoSafeTransactionId,
      );

      transaction.send();
      const result = await transaction.wait();

      const newWalletBalance = (
        await wallet.getBalance(provider.getBaseAssetId())
      ).format();
      const expectedWalletBalance = walletBalance
        .add(DEFAULT_BALANCE_VALUE.mul(numAssets))
        .format();

      expect(result.status).toBe(TransactionStatus.success);
      expect(newWalletBalance).toBe(expectedWalletBalance);
    },
    100 * 1000,
  );

  test(
    'Send transaction with same asset ids and multiple recipients',
    async () => {
      const vault = await newVault(
        signers,
        provider,
        auth['USER_1'].BakoSafeAuth,
        100,
        1,
      );
      const wallet = Wallet.generate({ provider });
      const walletBalance = await wallet.getBalance(provider.getBaseAssetId());

      const wallet2 = Wallet.generate({ provider });
      const walletBalance2 = await wallet2.getBalance(
        provider.getBaseAssetId(),
      );

      const numRecipients = 2;
      const transaction = await vault.BakoSafeIncludeTransaction({
        name: `tx_${uuidv4()}`,
        assets: Array.from({ length: numRecipients * 2 }, (_, index) => ({
          assetId: provider.getBaseAssetId(),
          to:
            index % 2 === 0
              ? wallet.address.toString()
              : wallet2.address.toString(),
          amount: DEFAULT_BALANCE_VALUE.format(),
        })),
      });

      await signin(
        transaction.getHashTxId(),
        'USER_1',
        auth['USER_1'].BakoSafeAuth,
        transaction.BakoSafeTransactionId,
      );

      transaction.send();
      const result = await transaction.wait();

      const newWalletBalance = (
        await wallet.getBalance(provider.getBaseAssetId())
      ).format();
      const expectedWalletBalance = walletBalance
        .add(DEFAULT_BALANCE_VALUE.mul(numRecipients))
        .format();

      const newWalletBalance2 = (
        await wallet2.getBalance(provider.getBaseAssetId())
      ).format();
      const expectedWalletBalance2 = walletBalance2
        .add(DEFAULT_BALANCE_VALUE.mul(numRecipients))
        .format();

      expect(result.status).toBe(TransactionStatus.success);
      expect(newWalletBalance).toBe(expectedWalletBalance);
      expect(newWalletBalance2).toBe(expectedWalletBalance2);
    },
    100 * 1000,
  );

  test(
    'Send transaction with multiple asset ids',
    async () => {
      const txAssets = Object.values(assets);
      const vault = await newVault(
        signers,
        provider,
        auth['USER_1'].BakoSafeAuth,
        100,
        1,
        txAssets,
      );
      const wallet = Wallet.generate({ provider });
      const walletBalance = await wallet.getBalance(assets.ETH);

      const tx = DEFAULT_MULTI_ASSET_TRANSACTION_PAYLOAD(
        wallet.address.toString(),
      );

      const transaction = await vault.BakoSafeIncludeTransaction(tx);

      await signin(
        transaction.getHashTxId(),
        'USER_1',
        auth['USER_1'].BakoSafeAuth,
        transaction.BakoSafeTransactionId,
      );
      transaction.send();
      const result = await transaction.wait();

      expect(result.status).toBe(TransactionStatus.success);
      expect((await wallet.getBalance(assets.ETH)).format()).toBe(
        walletBalance.add(DEFAULT_BALANCE_VALUE).format(),
      );
      expect((await wallet.getBalance(assets.BTC)).format()).toBe(
        DEFAULT_BALANCE_VALUE.format(),
      );
      expect((await wallet.getBalance(assets.USDC)).format()).toBe(
        DEFAULT_BALANCE_VALUE.format(),
      );
      expect((await wallet.getBalance(assets.UNI)).format()).toBe(
        DEFAULT_BALANCE_VALUE.format(),
      );
    },
    100 * 1000,
  );

  test(
    'Send transaction with multiple asset ids without sending ETH',
    async () => {
      const txAssets = [assets.BTC, assets.USDC, assets.UNI];
      const vault = await newVault(
        signers,
        provider,
        auth['USER_1'].BakoSafeAuth,
        100,
        1,
        Object.values(assets),
      );
      const wallet = Wallet.generate({ provider });

      const tx = DEFAULT_MULTI_ASSET_TRANSACTION_PAYLOAD(
        wallet.address.toString(),
        txAssets,
      );
      const transaction = await vault.BakoSafeIncludeTransaction(tx);

      await signin(
        transaction.getHashTxId(),
        'USER_1',
        auth['USER_1'].BakoSafeAuth,
        transaction.BakoSafeTransactionId,
      );
      transaction.send();
      const result = await transaction.wait();

      expect(result.status).toBe(TransactionStatus.success);
      expect((await wallet.getBalance(assets.BTC)).format()).toBe(
        DEFAULT_BALANCE_VALUE.format(),
      );
      expect((await wallet.getBalance(assets.USDC)).format()).toBe(
        DEFAULT_BALANCE_VALUE.format(),
      );
      expect((await wallet.getBalance(assets.UNI)).format()).toBe(
        DEFAULT_BALANCE_VALUE.format(),
      );
    },
    100 * 1000,
  );

  test('Send transaction with multiple asset ids without ETH on vault', async () => {
    const txAssets = [assets.BTC, assets.USDC, assets.UNI];
    const vault = await newVault(
      signers,
      provider,
      auth['USER_1'].BakoSafeAuth,
      100,
      1,
      txAssets,
    );
    const wallet = Wallet.generate({ provider });

    const tx = DEFAULT_MULTI_ASSET_TRANSACTION_PAYLOAD(
      wallet.address.toString(),
      txAssets,
    );

    await expect(vault.BakoSafeIncludeTransaction(tx)).rejects.toThrow(
      'FuelError: not enough coins to fit the target',
    );
  });

  // |
  test.only('Outro', async () => {
    // Criar um vault e adicionar balance: ETH e USDC
    // criar um segundo vault com nome: Store Vault
    // Criar uma tx no primeiro vault com endereço das moedas para Store Vault
    // Verificar o saldo em Store vault se é igual ao valor depositado da tx criada pelo primeiro vault.
    const txAssets = [assets.ETH, assets.USDC];

    const primeiroVault = await newVault(
      signers,
      provider,
      auth['USER_1'].BakoSafeAuth,
      100,
      1,
      txAssets,
    );

    const storeVault = await newVault(
      signers,
      provider,
      auth['USER_1'].BakoSafeAuth,
      100,
      1,
    );

    const tx = DEFAULT_MULTI_ASSET_TRANSACTION_PAYLOAD(
      storeVault.address.toString(),
      txAssets,
    );

    const tx_bako = await primeiroVault.BakoSafeIncludeTransaction(tx);

    await signin(
      tx_bako.getHashTxId(),
      'USER_1',
      auth['USER_1'].BakoSafeAuth,
      tx_bako.BakoSafeTransactionId,
    );

    const result = await tx_bako.send();

    console.log('tx', result);

    const balances = (await primeiroVault.getBalances()).map((balance) => ({
      ...balance,
      amount: balance.amount.format(),
    }));

    console.log('balance após tx assinada', await storeVault.getBalances());

    const aux = await Vault.create({
      id: tx_bako.BakoSafeTransactionId,
      address: auth['USER_1'].address,
      token: auth['USER_1'].BakoSafeAuth.token,
    });

    console.log(aux);

    const history = await storeVault.BakoSafeGetTransactions();
    console.log(history);

    // console.log(JSON.stringify(tx));
    // console.log('tx_bako:', JSON.stringify(tx_bako.transactionRequest));
  });
});
