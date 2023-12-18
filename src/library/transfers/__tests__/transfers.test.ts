import { Provider, TransactionStatus, bn } from 'fuels';
import { IPayloadVault, IFormatTransfer, Vault } from '../..';
import { ITransferAsset } from '../../assets';
import {
  rootWallet,
  sendPredicateCoins,
  signin,
  delay,
  newVault,
} from '../../../test-utils';
import { defaultConfigurable } from '../../../configurables';

import { accounts } from '../../../mocks/accounts';
import { IUserAuth, authService, assets } from '../../../mocks';

describe('[TRANSFERS]', () => {
  let chainId: number;
  let auth: IUserAuth;
  let provider: Provider;
  let signers: string[];

  beforeAll(async () => {
    provider = await Provider.create(defaultConfigurable['provider']);
    chainId = await provider.getChainId();
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
    'Sign transactions with invalid users',
    async () => {
      const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);
      const _assets: ITransferAsset[] = [
        {
          amount: bn(1_000_000).format(),
          assetId: assets['sETH'],
          to: accounts['STORE'].address,
        },
      ];
      const newTransfer: IFormatTransfer = {
        name: 'transfer_assests',
        assets: _assets,
        witnesses: [],
      };

      const transaction = await vault.BSAFEIncludeTransaction(newTransfer);
      expect(
        await signin(
          transaction.getHashTxId(),
          'USER_2',
          auth['USER_2'].BSAFEAuth,
          transaction.BSAFETransactionId,
        ),
      ).toBe(true);
      expect(
        await signin(
          transaction.getHashTxId(),
          'USER_1',
          auth['USER_1'].BSAFEAuth,
          transaction.BSAFETransactionId,
        ),
      ).toBe(true);
      expect(
        await signin(
          transaction.getHashTxId(),
          'USER_3',
          auth['USER_3'].BSAFEAuth,
          transaction.BSAFETransactionId,
        ),
      ).toBe(true);
      expect(
        await signin(
          transaction.getHashTxId(),
          'USER_4',
          auth['USER_4'].BSAFEAuth,
          transaction.BSAFETransactionId,
        ),
      ).toBe(false);
      transaction.send();
      const result = await transaction.wait();
      expect(result.status).toBe(TransactionStatus.success);
    },
    100 * 1000,
  );

  test(
    'Created an valid transaction to vault and instance old transaction',
    async () => {
      const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);
      const _assets: ITransferAsset[] = [
        {
          amount: bn(1_000_000_00).format(),
          assetId: assets['ETH'],
          to: accounts['STORE'].address,
        },
      ];
      let newTransfer: IFormatTransfer = {
        name: 'Created an valid transaction to vault and instance old transaction',
        assets: _assets,
        witnesses: [],
      };

      let transaction = await vault.BSAFEIncludeTransaction(newTransfer);
      let transaction_aux = await vault.BSAFEIncludeTransaction({
        ...newTransfer,
        assets: [
          {
            amount: bn(1_500_000).format(),
            assetId: assets['ETH'],
            to: accounts['STORE'].address,
          },
        ],
      });

      const signTimeout = async () => {
        //sign tx_1
        await delay(5000);
        await signin(
          transaction.getHashTxId(),
          'USER_3',
          auth['USER_3'].BSAFEAuth,
          transaction.BSAFETransactionId,
        );

        await signin(
          transaction.getHashTxId(),
          'USER_2',
          auth['USER_2'].BSAFEAuth,
          transaction.BSAFETransactionId,
        );

        //sign tx_2
        await delay(5000);
        await signin(
          transaction_aux.getHashTxId(),
          'USER_3',
          auth['USER_3'].BSAFEAuth,
          transaction_aux.BSAFETransactionId,
        );

        await signin(
          transaction_aux.getHashTxId(),
          'USER_2',
          auth['USER_2'].BSAFEAuth,
          transaction_aux.BSAFETransactionId,
        );
      };

      // Signin transaction
      await signin(
        transaction.getHashTxId(),
        'USER_1',
        auth['USER_1'].BSAFEAuth,
        transaction.BSAFETransactionId,
      );

      // Signin transaction
      await signin(
        transaction_aux.getHashTxId(),
        'USER_1',
        auth['USER_1'].BSAFEAuth,
        transaction_aux.BSAFETransactionId,
      );

      // console.log(
      //   'oldTransaction: ',
      //   oldTransaction.getHashTxId(),
      //   oldTransaction.transactionRequest,
      // );
      // console.log(
      //   'transaction: ',
      //   transaction.getHashTxId(),
      //   transaction.transactionRequest,
      // );

      console.log(transaction_aux.BSAFETransactionId);
      console.log(transaction.BSAFETransactionId);

      transaction_aux.send();
      transaction.send();

      // this process isan`t async, next line is async
      signTimeout();

      const result_tx1 = await transaction.wait();
      const result_tx2 = await transaction_aux.wait();
      console.log(result_tx1);
      console.log(result_tx2);
      //expect(result.status).toBe(TransactionStatus.success);
    },
    100 * 1000,
  );

  test(
    'Instance old transaction',
    async () => {
      const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);
      const _assetsA = {
        name: 'Transaction A',
        assets: [
          {
            amount: bn(1_000).format(),
            assetId: assets['ETH'],
            to: accounts['STORE'].address,
          },
          {
            amount: bn(1_000).format(),
            assetId: assets['sETH'],
            to: accounts['STORE'].address,
          },
        ],
        witnesses: [],
      };

      // Create a transaction
      const transaction = await vault.BSAFEIncludeTransaction(_assetsA);
      const transaction_aux = await vault.BSAFEGetTransaction(
        transaction.BSAFETransactionId,
      );
      const transaction_aux_byhash = await vault.BSAFEGetTransaction(
        transaction.getHashTxId(),
      );

      expect(transaction_aux.BSAFETransactionId).toStrictEqual(
        transaction.BSAFETransactionId,
      );
      expect(transaction_aux_byhash.BSAFETransactionId).toStrictEqual(
        transaction.BSAFETransactionId,
      );
    },
    10 * 1000,
  );

  test('Send an transaction to with vault without balance', async () => {
    const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);
    const _assetsA = {
      name: 'Transaction A',
      assets: [
        {
          amount: bn(1_000_000_000_000_000).format(),
          assetId: assets['ETH'],
          to: accounts['STORE'].address,
        },
        {
          amount: bn(1_000_000_000_000_000).format(),
          assetId: assets['sETH'],
          to: accounts['STORE'].address,
        },
      ],
      witnesses: [],
    };

    const _assetsB = {
      name: '',
      assets: [
        {
          amount: bn(1_000_000_000_000_000).format(),
          assetId: assets['sETH'],
          to: accounts['STORE'].address,
        },
      ],
      witnesses: [],
    };

    await expect(vault.BSAFEIncludeTransaction(_assetsA)).rejects.toThrow(
      /not enough/,
    );
    await expect(vault.BSAFEIncludeTransaction(_assetsB)).rejects.toThrow(
      /not enough/,
    );
  });
  test('Sent a transaction without BSAFEAuth', async () => {
    const VaultPayload: IPayloadVault = {
      configurable: {
        SIGNATURES_COUNT: 3,
        SIGNERS: signers,
        network: provider.url,
        chainId: chainId,
      },
      provider,
    };
    const vault = await Vault.create(VaultPayload);

    await sendPredicateCoins(vault, bn(1_000_000_000), 'sETH', rootWallet);
    await sendPredicateCoins(vault, bn(1_000_000_000), 'ETH', rootWallet);

    const _assetsA = {
      name: 'Transaction A',
      assets: [
        {
          amount: bn(1_000).format(),
          assetId: assets['ETH'],
          to: accounts['STORE'].address,
        },
        {
          amount: bn(1_000).format(),
          assetId: assets['sETH'],
          to: accounts['STORE'].address,
        },
      ],
      witnesses: [],
    };

    const tx = await vault.BSAFEIncludeTransaction(_assetsA);
    tx.BSAFEScript.witnesses = [
      await signin(tx.getHashTxId(), 'USER_1'),
      await signin(tx.getHashTxId(), 'USER_2'),
      await signin(tx.getHashTxId(), 'USER_3'),
    ];

    const result = await tx.send().then(async (tx) => {
      if ('fetchAttempts' in tx) {
        return await tx.wait();
      }
      return {
        status: TransactionStatus.failure,
      };
    });

    expect(result.status).toBe(TransactionStatus.success);
  });
});
