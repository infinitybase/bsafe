import { Provider, getRandomB256 } from 'fuels';
import { signin, newVault, IUserAuth, authService } from '../utils';
import { IConfVault, IPayloadVault, Vault } from '../../src/modules';
import { BakoSafe } from '../../configurables';
import {
  DEFAULT_BALANCES,
  accounts,
  DEFAULT_TRANSACTION_PAYLOAD,
} from '../mocks';
import { IPredicateVersion } from '../../src/api';

describe('[PREDICATES]', () => {
  let auth: IUserAuth;
  let provider: Provider;
  let signers: string[];
  let currentVersion: IPredicateVersion;
  let oldVersions: Partial<IPredicateVersion>[];

  beforeAll(async () => {
    provider = await Provider.create(BakoSafe.getProviders('CHAIN_URL'));
    auth = await authService(
      ['USER_1', 'USER_2', 'USER_3', 'USER_5', 'USER_4'],
      provider.url,
    );
    signers = [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
      accounts['USER_3'].address,
    ];
    currentVersion = await Vault.BakoSafeGetCurrentPredicateVersion();
    const { data: versions } = await Vault.BakoSafeGetPredicateVersions();
    oldVersions = versions.filter(
      (version) => version.code !== currentVersion.code,
    );
  }, 20 * 1000);

  test('Create an inválid vault', async () => {
    const VaultPayload: IPayloadVault = {
      configurable: {
        SIGNATURES_COUNT: 3,
        SIGNERS: signers,
        network: provider.url,
      },
      BakoSafeAuth: auth['USER_1'].BakoSafeAuth,
    };

    await expect(
      Vault.create({ ...VaultPayload, version: 'fake_version' }),
    ).rejects.toThrow('Invalid predicate version');

    //Validations
    const duplicated = [
      ...VaultPayload.configurable.SIGNERS.slice(0, 2),
      VaultPayload.configurable.SIGNERS[0],
    ];
    VaultPayload.configurable.SIGNERS = duplicated;
    await expect(Vault.create(VaultPayload)).rejects.toThrow(
      'SIGNERS must be unique',
    );

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
    const vault = await newVault(
      signers,
      provider,
      auth['USER_1'].BakoSafeAuth,
    );
    expect(await vault.getBalances()).toStrictEqual(DEFAULT_BALANCES);
  });

  test('Create vault missing configurable params', async () => {
    const VaultPayload: IPayloadVault = {
      configurable: {
        network: provider.url,
      },
      BakoSafeAuth: auth['USER_1'].BakoSafeAuth,
    };

    await expect(
      Vault.create({
        ...VaultPayload,
        configurable: {
          ...VaultPayload.configurable,
          SIGNERS: signers,
        },
      }),
    ).rejects.toThrow('SIGNATURES_COUNT is required');

    await expect(
      Vault.create({
        ...VaultPayload,
        configurable: {
          ...VaultPayload.configurable,
          SIGNATURES_COUNT: 3,
        },
      }),
    ).rejects.toThrow('SIGNERS is required');
  });

  test('Create vault with invalid configurable params', async () => {
    const VaultPayload: IPayloadVault = {
      configurable: {
        SIGNATURES_COUNT: 3,
        SIGNERS: signers,
        network: provider.url,
      },
      BakoSafeAuth: auth['USER_1'].BakoSafeAuth,
    };

    VaultPayload.configurable.HASH_PREDICATE = 'hash_predicate';
    await expect(Vault.create(VaultPayload)).rejects.toThrow(
      'HASH_PREDICATE must be a b256',
    );

    delete VaultPayload.configurable.HASH_PREDICATE;
    VaultPayload.configurable.SIGNATURES_COUNT = undefined;
    await expect(Vault.create(VaultPayload)).rejects.toThrow(
      'SIGNATURES_COUNT must be an integer',
    );

    VaultPayload.configurable.SIGNATURES_COUNT = 0.5;
    await expect(Vault.create(VaultPayload)).rejects.toThrow(
      'SIGNATURES_COUNT must be an integer',
    );

    VaultPayload.configurable.SIGNATURES_COUNT = 3;
    VaultPayload.configurable.SIGNERS = undefined;
    await expect(Vault.create(VaultPayload)).rejects.toThrow(
      'SIGNERS must be an array',
    );

    VaultPayload.configurable.SIGNERS = ['signer', 'signer2', 'signer3'];
    await expect(Vault.create(VaultPayload)).rejects.toThrow(
      'SIGNERS must be an array of b256',
    );

    VaultPayload.configurable.TEST = null;
    await expect(Vault.create(VaultPayload)).rejects.toThrow(
      'TEST is an invalid parameter',
    );
  });

  test('Create vault with valid configurable params', async () => {
    const VaultPayload: IPayloadVault = {
      configurable: {
        HASH_PREDICATE: getRandomB256(),
        SIGNATURES_COUNT: 3,
        SIGNERS: signers,
        network: provider.url,
      },
      BakoSafeAuth: auth['USER_1'].BakoSafeAuth,
    };

    const vault = await Vault.create(VaultPayload);
    expect(vault).toHaveProperty('address');
    expect(vault).toHaveProperty('version');
    expect(vault.version).toStrictEqual(currentVersion.code);

    VaultPayload.configurable.HASH_PREDICATE = undefined;
    const auxVault = await Vault.create(VaultPayload);
    expect(auxVault).toHaveProperty('address');
    expect(auxVault).toHaveProperty('version');
    expect(auxVault.version).toStrictEqual(currentVersion.code);
  });

  test('Create vault with predicate version', async () => {
    const vaultVersion = oldVersions[0].code;
    const VaultPayload: IPayloadVault = {
      configurable: {
        SIGNATURES_COUNT: 3,
        SIGNERS: signers,
        network: provider.url,
      },
      BakoSafeAuth: auth['USER_1'].BakoSafeAuth,
      version: vaultVersion,
    };
    const vault = await Vault.create(VaultPayload);
    const auxVault = await Vault.create({
      ...auth['USER_1'].BakoSafeAuth,
      id: vault.BakoSafeVaultId,
    });

    expect(vault.version).not.toEqual(currentVersion.code);
    expect(vault.version).toStrictEqual(auxVault.version);
    expect(vault.version).toStrictEqual(auxVault.BakoSafeVault.version.code);
  });

  test('Create vault without predicate version', async () => {
    const VaultPayload: IPayloadVault = {
      configurable: {
        SIGNATURES_COUNT: 3,
        SIGNERS: signers,
        network: provider.url,
      },
      BakoSafeAuth: auth['USER_1'].BakoSafeAuth,
    };
    const vault = await Vault.create(VaultPayload);

    expect(vault.version).toEqual(currentVersion.code);
  });

  test(
    'Instance an old Vault by BakoSafe Predicate ID',
    async () => {
      const vault = await newVault(
        signers,
        provider,
        auth['USER_1'].BakoSafeAuth,
      );
      const auxVault = await Vault.create({
        ...auth['USER_1'].BakoSafeAuth,
        id: vault.BakoSafeVaultId,
      });
      expect(auxVault.BakoSafeVaultId).toStrictEqual(vault.BakoSafeVaultId);
      expect(auxVault.BakoSafeVault.id).toStrictEqual(vault.BakoSafeVaultId);
      expect(auxVault.version).toStrictEqual(vault.version);
      expect(auxVault.BakoSafeVault.version).toStrictEqual(
        vault.BakoSafeVault.version,
      );
      expect(auxVault.BakoSafeVault.predicateAddress).toStrictEqual(
        vault.BakoSafeVault.predicateAddress,
      );
    },
    20 * 1000,
  );

  test(
    'Instance an old Vault by predicate address',
    async () => {
      const vault = await newVault(
        signers,
        provider,
        auth['USER_1'].BakoSafeAuth,
      );
      const auxVault = await Vault.create({
        ...auth['USER_1'].BakoSafeAuth,
        predicateAddress: vault.address.toString(),
      });
      expect(auxVault.BakoSafeVaultId).toStrictEqual(vault.BakoSafeVaultId);
      expect(auxVault.version).toStrictEqual(vault.version);
      expect(auxVault.BakoSafeVault.version).toStrictEqual(
        vault.BakoSafeVault.version,
      );
      expect(auxVault.BakoSafeVault.predicateAddress).toStrictEqual(
        vault.BakoSafeVault.predicateAddress,
      );
    },
    10 * 1000,
  );

  test(
    'Recover equal Vault by payload',
    async () => {
      const vault = await newVault(signers, provider, undefined, 2);

      const vaultByPayload = await Vault.create({
        configurable: vault.getConfigurable(),
        version: vault.version,
      });

      const [vaultAddress, vaultByPayloadAddress] = [
        vault.address.toString(),
        vaultByPayload.address.toString(),
      ];

      expect(vaultAddress).toEqual(vaultByPayloadAddress);
      expect(vaultByPayload.version).toStrictEqual(vault.version);
      expect(await vaultByPayload.getBalances()).toStrictEqual(
        await vault.getBalances(),
      );
    },
    10 * 1000,
  );

  test(
    'Find a transactions of predicate and return an list of Transfer instances',
    async () => {
      const vault = await newVault(
        signers,
        provider,
        auth['USER_1'].BakoSafeAuth,
        5,
      );
      const tx_1 = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);
      const tx_2 = DEFAULT_TRANSACTION_PAYLOAD(accounts['STORE'].address);

      const transaction = await vault.BakoSafeIncludeTransaction(tx_1);
      await vault.BakoSafeIncludeTransaction(tx_2);

      await signin(
        transaction.getHashTxId(),
        'USER_2',
        auth['USER_2'].BakoSafeAuth,
        transaction.BakoSafeTransactionId,
      );

      //default pagination
      const transactions = await vault.BakoSafeGetTransactions();
      expect(transactions.data.length).toBe(2);
      expect(transactions.currentPage).toBe(0);
      expect(transactions.perPage).toBe(10);

      //custom pagination
      const perPage = 1;
      const page = 1;
      const ptransations = await vault.BakoSafeGetTransactions({
        perPage,
        page,
      });
      expect(ptransations.currentPage).toBe(page);
      expect(ptransations.perPage).toBe(perPage);
      expect(ptransations.data.length).toBe(1);
    },
    100 * 1000,
  );

  test('Call an method of vault depends of auth without credentials', async () => {
    const vault = await newVault(signers, provider);

    await expect(vault.getConfigurable().SIGNATURES_COUNT).toBe(3);
    await expect(vault.BakoSafeGetTransactions()).rejects.toThrow(
      'Auth is required',
    );
  });

  test('Find current predicate version', async () => {
    expect(currentVersion).toHaveProperty('id');
    expect(currentVersion).toHaveProperty('name');
    expect(currentVersion).toHaveProperty('description');
    expect(currentVersion).toHaveProperty('code');
    expect(currentVersion).toHaveProperty('abi');
    expect(currentVersion).toHaveProperty('bytes');
    expect(currentVersion).toHaveProperty('active');
  });

  test('Find current predicate version by code', async () => {
    const version = await Vault.BakoSafeGetPredicateVersionByCode(
      currentVersion.code,
    );

    expect(version).toHaveProperty('id', currentVersion.id);
    expect(version).toHaveProperty('name', currentVersion.name);
    expect(version).toHaveProperty('description', currentVersion.description);
    expect(version).toHaveProperty('code', currentVersion.code);
    expect(version).toHaveProperty('abi', currentVersion.abi);
    expect(version).toHaveProperty('bytes', currentVersion.bytes);
    expect(version).toHaveProperty('active', currentVersion.active);
  });

  test('List predicate versions with pagination', async () => {
    const page = 1;
    const perPage = 8;
    const paginatedVersions = await Vault.BakoSafeGetPredicateVersions({
      page,
      perPage,
    });

    expect(paginatedVersions).toHaveProperty('data');
    expect(paginatedVersions).toHaveProperty('total');
    expect(paginatedVersions.data.length).toBeLessThanOrEqual(perPage);
    expect(paginatedVersions).toHaveProperty('currentPage', page);
    expect(paginatedVersions).toHaveProperty('perPage', perPage);
  });
});
