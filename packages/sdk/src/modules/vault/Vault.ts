import { arrayify, Predicate } from 'fuels';

import {
  defaultListParams,
  GetPredicateVersionParams,
  IBakoSafeAuth,
  IListTransactions,
  IPagination,
  IPredicate,
  IPredicateService,
  IPredicateVersion,
  PredicateService,
} from '../../api';
import {
  ECreationtype,
  IBakoSafeApi,
  IBakoSafeGetTransactions,
  IBakoSafeIncludeTransaction,
  IConfVault,
  ICreationPayload,
  IPayloadVault,
  IVault,
} from './types';
import {
  identifyCreateVaultParams,
  makeHashPredicate,
  makeSubscribers,
} from './helpers';
import { Transfer } from '../transfers';
import { v4 as uuidv4 } from 'uuid';
import { AddressUtils } from '../../utils/address/Address';

/**
 * `Vault` are extension of predicates, to manager transactions, and sends.
 */
export class Vault extends Predicate<[]> implements IVault {
  // private readonly RECURSIVE_TIMEOUT = 10000;

  private bin: string;
  private abi: { [name: string]: unknown };
  private api!: IPredicateService;
  private auth!: IBakoSafeAuth;
  private configurable: IConfVault;

  public name!: string;
  //@ts-ignore
  public BakoSafeVault!: IPredicate;
  public BakoSafeVaultId!: string;
  public description?: string;
  public transactionRecursiveTimeout: number;
  public version?: string;

  protected constructor({
    configurable,
    provider,
    abi,
    bytecode,
    name,
    description,
    BakoSafeVaultId,
    BakoSafeVault,
    BakoSafeAuth,
    transactionRecursiveTimeout = 1000,
    api,
    version,
  }: ICreationPayload) {
    const _abi = typeof abi === 'string' ? JSON.parse(abi) : abi;
    const _bin = bytecode;

    const { network: _network, chainId: _chainId } = configurable;
    const _configurable = Vault.makePredicate(configurable);
    super(arrayify(_bin), provider, _abi, _configurable);

    this.bin = _bin;
    this.abi = _abi;
    this.configurable = {
      ..._configurable,
      network: _network,
      chainId: _chainId,
    };
    this.provider = provider;
    this.name = name || `Vault - ${uuidv4()}`;
    this.description = description;
    this.BakoSafeVaultId = BakoSafeVaultId!;
    this.transactionRecursiveTimeout = transactionRecursiveTimeout;
    this.BakoSafeVault = BakoSafeVault!;
    this.auth = BakoSafeAuth!;
    this.api = api!;
    this.version = version;
  }

  /**
   * Creates an instance of the Predicate class.
   *
   * @param configurable - The parameters of signature requirements.
   *      @param HASH_PREDICATE - Hash to works an unic predicate, is not required, but to instance old predicate is an number array
   *      @param SIGNATURES_COUNT - Number of signatures required of predicate
   *      @param SIGNERS - Array string of predicate signers
   * @param transactionRecursiveTimeout - The time to refetch transaction on BakoSafe API.
   * @param BakoSafeAuth - The auth to BakoSafe API.
   * @param version - The identifier of predicate version to BakoSafe API.
   *
   * @returns an instance of Vault
   **/
  static async create(params: IPayloadVault | IBakoSafeApi): Promise<Vault> {
    try {
      const _params = await identifyCreateVaultParams(params);
      switch (_params.type) {
        case ECreationtype.IS_OLD:
          return new Vault(_params.payload);
        case ECreationtype.IS_NEW:
          const vault = new Vault(_params.payload);
          !!vault.api && (await vault.createOnService());
          return vault;
        default:
          throw new Error('Invalid param type to create a vault');
      }
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  /**
   * To use BakoSafe API, auth is required
   *
   * @returns if auth is not defined, throw an error
   */
  private verifyAuth(): void {
    if (!this.auth) {
      throw new Error('Auth is required');
    }
  }

  /**
   * Send a caller to BakoSafe API to save predicate
   * Set BakoSafeVaultId and BakoSafeVault
   *
   *
   * @returns if auth is not defined, throw an error
   */
  private async createOnService(): Promise<void> {
    this.verifyAuth();
    const { id, ...rest } = await this.api.create({
      name: this.name,
      description: this.description,
      predicateAddress: this.address.toString(),
      minSigners: this.configurable.SIGNATURES_COUNT,
      addresses: AddressUtils.hex2string(this.configurable.SIGNERS),
      configurable: JSON.stringify(this.configurable),
      provider: this.provider.url,
      versionCode: this.version,
    });
    this.BakoSafeVault = {
      ...rest,
      id,
    };
    this.BakoSafeVaultId = id;
  }

  /**
   * Make configurable of predicate
   *
   * @param {IConfVault} configurable - The parameters of signature requirements.
   * @returns an formatted object to instance a new predicate
   */
  private static makePredicate(configurable: IConfVault) {
    return {
      SIGNATURES_COUNT: configurable.SIGNATURES_COUNT,
      SIGNERS: makeSubscribers(configurable.SIGNERS),
      HASH_PREDICATE: configurable.HASH_PREDICATE ?? makeHashPredicate(),
    };
  }

  /**
   * Include new transaction to vault
   *
   * @param {IFormatTransfer} param - IFormatTransaction or TransactionRequestLike
   * @param {TransactionRequestLike} param - IFormatTransaction or TransactionRequestLike
   * @returns return a new Transfer instance
   */
  public async BakoSafeIncludeTransaction(
    param: IBakoSafeIncludeTransaction,
  ): Promise<Transfer> {
    return Transfer.instance({
      auth: this.auth,
      vault: this,
      transfer: param,
      isSave: true,
    });
  }

  /**
   * Return an list of transaction of this vault
   *
   *
   * @param {IListTransactions} params - The params to list transactions
   *  - has optional params
   *  - by default, it returns the first 10 transactions
   *
   *
   * @returns {Promise<IPagination<IBakoSafeGetTransactions>>} an transaction paginated transaction list
   *
   *
   */
  public async BakoSafeGetTransactions(
    params?: IListTransactions,
  ): Promise<IPagination<IBakoSafeGetTransactions>> {
    this.verifyAuth();

    const tx = await this.api
      .listPredicateTransactions({
        predicateId: [this.BakoSafeVaultId],
        ...(params ?? defaultListParams),
      })
      .then((data) => {
        return {
          ...data,
          data: data.data.map((tx) => {
            return {
              resume: tx.resume,
              witnesses: tx.witnesses,
            };
          }),
        };
      });

    return tx;
  }

  /**
   * Return an list of transaction of this vault
   * @param transactionId - The transaction id on BakoSafeApi
   *
   * @returns an transaction list
   *
   *
   */
  public async BakoSafeGetTransaction(
    transactionId: string,
  ): Promise<Transfer> {
    return Transfer.instance({
      vault: this,
      auth: this.auth,
      transfer: transactionId,
    });
  }

  /**
   * Return an instance of predicate service
   *
   * @returns an instance of predicate service
   */
  private static getPredicateServiceInstance(): PredicateService {
    return new PredicateService();
  }

  /**
   * Return the last predicate version created
   *
   * @returns details of predicate version
   */
  static async BakoSafeGetCurrentPredicateVersion(): Promise<IPredicateVersion> {
    const api = this.getPredicateServiceInstance();
    return await api.findCurrentVersion();
  }

  /**
   * Return the predicate version that has a given code
   *
   * @param code - The predicate version code on BakoSafeApi
   *
   * @returns details of predicate version
   */
  static async BakoSafeGetPredicateVersionByCode(
    code: string,
  ): Promise<IPredicateVersion> {
    const api = this.getPredicateServiceInstance();
    return await api.findVersionByCode(code);
  }

  /**
   * Return an list of predicate versions
   *
   * @param {GetPredicateVersionParams} params - The params to list predicate versions
   *  - has optional params
   *  - by default, it returns the first 10 predicate version details
   *
   * @returns a paginated list of predicate version details
   */
  static async BakoSafeGetPredicateVersions(
    params?: GetPredicateVersionParams,
  ): Promise<IPagination<Partial<IPredicateVersion>>> {
    const _params = {
      page: 0,
      perPage: 10,
    };
    const api = this.getPredicateServiceInstance();
    const predicateVersions = await api
      .listVersions(params ?? _params)
      .then((data) => {
        return {
          ...data,
          data: data.data.map((version: IPredicateVersion) => {
            return {
              name: version.name,
              description: version.description,
              code: version.code,
              abi: version.abi,
            };
          }),
        };
      });

    return predicateVersions;
  }

  /**
   * Return abi of this vault
   *
   * @returns an abi
   */
  public getAbi(): { [name: string]: unknown } {
    return this.abi;
  }

  /**
   * Return binary of this vault
   *
   * @returns an binary
   */
  public getBin(): string {
    return this.bin;
  }

  /**
   * Return this vault configurables state
   *
   * @returns configurables [signers, signers requested, hash]
   */
  public getConfigurable(): IConfVault {
    return this.configurable;
  }
}
