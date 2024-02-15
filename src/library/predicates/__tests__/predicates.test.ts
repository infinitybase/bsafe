import { Provider, bn } from 'fuels';
import { IPayloadVault, Vault } from '../..';
import {
  rootWallet,
  sendPredicateCoins,
  signin,
  newVault,
} from '../../../test-utils';
import { defaultConfigurable } from '../../../configurables';

import { accounts } from '../../../mocks/accounts';
import { IUserAuth, authService, assets } from '../../../mocks';

describe('[PREDICATES]', () => {
  let chainId: number;
  let auth: IUserAuth;
  let provider: Provider;
  let signers: string[];

  beforeAll(async () => {
    provider = await Provider.create(defaultConfigurable['provider']);
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
  }, 20 * 1000);

  test('Create an inválid vault', async () => {
    const VaultPayload: IPayloadVault = {
      configurable: {
        HASH_PREDICATE: undefined,
        SIGNATURES_COUNT: 3,
        SIGNERS: signers,
        network: provider.url,
        chainId: chainId,
      },
      provider,
      BSAFEAuth: auth['USER_1'].BSAFEAuth,
    };

    VaultPayload.configurable.SIGNATURES_COUNT = 0;

    await expect(Vault.create(VaultPayload)).rejects.toThrow(
      'SIGNATURES_COUNT is required must be granter than zero',
    );

    VaultPayload.configurable.SIGNATURES_COUNT = 3;
    VaultPayload.configurable.SIGNERS = [];
    await expect(Vault.create(VaultPayload)).rejects.toThrow(
      'SIGNERS must be greater than zero',
    );

    VaultPayload.configurable.SIGNERS = signers;
    VaultPayload.configurable.SIGNATURES_COUNT = 5;

    await expect(Vault.create(VaultPayload)).rejects.toThrow(
      'Required Signers must be less than signers',
    );
  });

  test('Created an valid vault', async () => {
    const vault = await newVault(signers, provider);
    await sendPredicateCoins(vault, bn(1_000_000), 'sETH', rootWallet);
    await sendPredicateCoins(vault, bn(1_000_000), 'ETH', rootWallet);

    expect(await vault.getBalances()).toStrictEqual([
      {
        assetId: assets['ETH'],
        amount: bn(1_000_000).add(1_000_000_000),
      },
      {
        assetId: assets['sETH'],
        amount: bn(1_000_000).add(1_000_000_000),
      },
    ]);
  });

  test(
    'Instance an old Vault by BSAFEPredicate ID',
    async () => {
      const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);
      const auxVault = await Vault.create({
        ...auth['USER_1'].BSAFEAuth,
        id: vault.BSAFEVaultId,
      });
      expect(auxVault.BSAFEVaultId).toStrictEqual(vault.BSAFEVaultId);
      expect(auxVault.BSAFEVault.id).toStrictEqual(vault.BSAFEVaultId);
    },
    20 * 1000,
  );

  test(
    'Instance an old Vault by predicate address',
    async () => {
      const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);
      const auxVault = await Vault.create({
        ...auth['USER_1'].BSAFEAuth,
        predicateAddress: vault.address.toString(),
      });
      expect(auxVault.BSAFEVaultId).toStrictEqual(vault.BSAFEVaultId);
    },
    10 * 1000,
  );

  test(
    'Instance an old Vault by payload',
    async () => {
      const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);

      const providerByPayload = await Provider.create(
        vault.BSAFEVault.provider,
      );
      const vaultByPayload = await Vault.create({
        configurable: JSON.parse(vault.BSAFEVault.configurable),
        provider: providerByPayload,
      });

      const [vaultAddress, vaultByPayloadAddress] = [
        vault.address.toString(),
        vaultByPayload.address.toString(),
      ];

      expect(vaultAddress).toEqual(vaultByPayloadAddress);
    },
    10 * 1000,
  );

  test(
    'Find a transactions of predicate and return an list of Transfer instances',
    async () => {
      const vault = await newVault(signers, provider, auth['USER_1'].BSAFEAuth);
      const _assetsA = {
        name: 'Transaction A',
        witnesses: [],
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
      };

      const _assetsB = {
        name: 'Transaction A',
        witnesses: [],
        assets: [
          {
            amount: bn(1_000_00).format(),
            assetId: assets['ETH'],
            to: accounts['STORE'].address,
          },
          {
            amount: bn(1_000_00).format(),
            assetId: assets['sETH'],
            to: accounts['STORE'].address,
          },
        ],
      };

      const transaction = await vault.BSAFEIncludeTransaction(_assetsA);
      await vault.BSAFEIncludeTransaction(_assetsB);

      await signin(
        transaction.getHashTxId(),
        'USER_2',
        auth['USER_2'].BSAFEAuth,
        transaction.BSAFETransactionId,
      );

      const transactions = await vault.BSAFEGetTransactions();

      expect(transactions.length).toBe(2);
    },
    100 * 1000,
  );

  test('Call an method of vault depends of auth without credentials', async () => {
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

    await expect(vault.getConfigurable().SIGNATURES_COUNT).toBe(3);
    await expect(vault.BSAFEGetTransactions()).rejects.toThrow(
      'Auth is required',
    );
  });
});
