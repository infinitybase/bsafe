import { Predicate, Provider } from 'fuels';

import {
  IBSAFEAuth,
  IListTransactions,
  IPredicate,
  IPredicateService,
  PredicateService,
} from '../api';
import {
  IBSAFEApi,
  IBSAFEIncludeTransaction,
  IConfVault,
  IPayloadVault,
  IVault,
  makeHashPredicate,
  makeSubscribers,
  predicateABI,
  predicateBIN,
  Transfer,
} from '../';
import { v4 as uuidv4 } from 'uuid';
import { AddressUtils } from '../address/Address';

/**
 * `Vault` are extension of predicates, to manager transactions, and sends.
 */
export class Vault extends Predicate<[]> implements IVault {
  // private readonly RECURSIVE_TIMEOUT = 10000;

  private bin: string;
  private abi: { [name: string]: unknown };
  private api!: IPredicateService;
  private auth!: IBSAFEAuth;
  private configurable: IConfVault;

  public name!: string;
  public BSAFEVault!: IPredicate;
  public BSAFEVaultId!: string;
  public description?: string;
  public transactionRecursiveTimeout: number;

  protected constructor({
    configurable,
    provider,
    abi,
    bytecode,
    name,
    description,
    BSAFEVaultId,
    BSAFEVault,
    BSAFEAuth,
    transactionRecursiveTimeout,
  }: IPayloadVault) {
    const _abi = abi ? JSON.parse(abi) : predicateABI;
    const _bin = bytecode ? bytecode : predicateBIN;
    const _network = configurable.network;
    const _chainId = configurable.chainId;
    Vault.validations(configurable);

    const _configurable = Vault.makePredicate(configurable);
    super(_bin, provider, _abi, _configurable);

    this.bin = _bin;
    this.abi = _abi;
    this.configurable = this.configurable = {
      HASH_PREDICATE: _configurable.HASH_PREDICATE as number[],
      SIGNATURES_COUNT: _configurable.SIGNATURES_COUNT as number,
      SIGNERS: _configurable.SIGNERS as string[],
      network: _network,
      chainId: _chainId,
    };
    this.provider = provider;
    this.name = name ? name : `Random Vault Name - ${uuidv4()}`;
    this.description = description ? description : undefined;
    this.BSAFEVaultId = BSAFEVaultId!;
    this.transactionRecursiveTimeout = transactionRecursiveTimeout
      ? transactionRecursiveTimeout
      : 1000;
    this.BSAFEVault = BSAFEVault!;
    this.auth = BSAFEAuth!;
  }

  /**
   *
   * Validate creation parameters.
   *
   * @param configurable - The parameters of signature requirements.
   * @returns thire is no return, but if an error is detected it is trigged
   */
  private static validations(configurable: IConfVault) {
    const { SIGNATURES_COUNT, SIGNERS } = configurable;
    if (!SIGNATURES_COUNT || Number(SIGNATURES_COUNT) == 0) {
      throw new Error('SIGNATURES_COUNT is required must be granter than zero');
    }
    if (!SIGNERS || SIGNERS.length === 0) {
      throw new Error('SIGNERS must be greater than zero');
    }
    if (SIGNERS.length < Number(SIGNATURES_COUNT)) {
      throw new Error('Required Signers must be less than signers');
    }
  }

  /**
   * Creates an instance of the Predicate class.
   *
   * @param configurable - The parameters of signature requirements.
   *      @param HASH_PREDICATE - Hash to works an unic predicate, is not required, but to instance old predicate is an number array
   *      @param SIGNATURES_COUNT - Number of signatures required of predicate
   *      @param SIGNERS - Array string of predicate signers
   * @param abi - The JSON abi to BSAFE multisig.
   * @param bytecode - The binary code of preficate BSAFE multisig.
   * @param transactionRecursiveTimeout - The time to refetch transaction on BSAFE API.
   * @param BSAFEAuth - The auth to BSAFE API.
   *
   * @returns an instance of Vault
   **/
  static async create(params: IPayloadVault | IBSAFEApi) {
    const isWithApi =
      ('predicateAddress' in params || 'id' in params) &&
      'address' in params &&
      'token' in params;
    const isNew = 'configurable' in params && 'provider';
    if (isWithApi) {
      const { id, predicateAddress, token, address } = params;
      const hasId = 'id' in params && id;
      if (predicateAddress == undefined && id == undefined) {
        throw new Error('predicateAddress or BSAFEPredicateId is required');
      }

      const api = new PredicateService({
        address,
        token,
      });

      const result = hasId
        ? await api.findById(id)
        : await api.findByAddress(predicateAddress!);

      if (!result) {
        throw new Error('BSAFEVault not found');
      }

      const {
        configurable,
        abi,
        bytes,
        name,
        description,
        id: BSAFEVaultId,
        provider,
      } = result;
      const vault = new Vault({
        configurable: JSON.parse(configurable),
        provider: await Provider.create(provider),
        abi,
        bytecode: bytes,
        name,
        description,
        BSAFEVaultId,
        BSAFEVault: result,
      });

      vault.api = api;
      vault.auth = {
        address,
        token,
      };

      return vault;
    } else if (isNew) {
      const {
        configurable,
        provider,
        name,
        description,
        abi,
        bytecode,
        BSAFEAuth,
        BSAFEVaultId,
      } = params;
      const aux = new Vault({
        configurable,
        provider,
        abi,
        bytecode,
        name,
        description,
        BSAFEAuth,
        BSAFEVaultId,
      });
      if (BSAFEAuth) {
        const _auth = BSAFEAuth;
        aux.auth = _auth;
        aux.api = new PredicateService(_auth);
        await aux.createOnService();
      }

      return aux;
    } else {
      throw new Error('Required props to instance a vault');
    }
  }

  /**
   * To use bsafe API, auth is required
   *
   * @returns if auth is not defined, throw an error
   */
  private verifyAuth() {
    if (!this.auth) {
      throw new Error('Auth is required');
    }
  }

  /**
   * Send a caller to BSAFE API to save predicate
   * Set BSAFEVaultId and BSAFEVault
   *
   *
   * @returns if auth is not defined, throw an error
   */
  private async createOnService() {
    this.verifyAuth();
    const { id, ...rest } = await this.api.create({
      name: this.name,
      description: this.description,
      predicateAddress: this.address.toString(),
      minSigners: this.configurable.SIGNATURES_COUNT,
      addresses: AddressUtils.hex2string(this.configurable.SIGNERS),
      bytes: this.bin,
      abi: JSON.stringify(this.abi),
      configurable: JSON.stringify(this.configurable),
      provider: this.provider.url,
    });
    this.BSAFEVault = {
      ...rest,
      id,
    };
    this.BSAFEVaultId = id;
  }

  /**
   * Make configurable of predicate
   *
   * @param configurable - The parameters of signature requirements.
   * @returns an formatted object to instance a new predicate
   */
  private static makePredicate(configurable: IConfVault) {
    const hasExists = configurable.HASH_PREDICATE;
    const _configurable: { [name: string]: unknown } = {
      SIGNATURES_COUNT: configurable.SIGNATURES_COUNT,
      SIGNERS: makeSubscribers(configurable.SIGNERS),
      HASH_PREDICATE: hasExists
        ? configurable.HASH_PREDICATE
        : makeHashPredicate(),
    };

    return _configurable;
  }

  /**
   * Include new transaction to vault
   *
   * @param {IFormatTransfer} param - IFormatTransaction or TransactionRequestLike
   * @param {TransactionRequestLike} param - IFormatTransaction or TransactionRequestLike
   * @returns return a new Transfer instance
   */
  public async BSAFEIncludeTransaction(param: IBSAFEIncludeTransaction) {
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
   * @returns an transaction list
   *
   * TODO:
   * return a complete transaction, without instance
   * implement default pagintation ({perPage: 10, page: 1, orderBy: 'createdAt', order: 'DESC'})
   */
  public async BSAFEGetTransactions(params?: IListTransactions) {
    this.verifyAuth();

    const transactions = await this.api.listPredicateTransactions({
      predicateId: [this.BSAFEVaultId],
      ...params,
    });
    return Promise.all(
      transactions.map((transaction) => ({
        resume: transaction.resume,
        witnesses: transaction.witnesses,
      })),
    );
  }

  /**
   * Return an list of transaction of this vault
   * @param transactionId - The transaction id on BSAFEApi
   *
   * @returns an transaction list
   *
   *
   * TODO:
   * split this function in others:
   * - create a class extended of TransactionRequest, and implement the save in BSAFEApi method
   *
   * - newTransaction -> (IPayload) => TransactionRequest
   *
   * - BSAFETransaction -> (TransactionRequest | string[bsafeId, hash]) => TransactionRequest
   *       - Save the transaction in BSAFEApi if it is of type TransactionRequest
   *       - If the vault has not been instantiated with the Auth, it doesn't save in BSAFEApi
   *       - If it receives a string, it fetches from the API and returns the TransactionRequest
   */
  public async BSAFEGetTransaction(transactionId: string) {
    return Transfer.instance({
      vault: this,
      auth: this.auth,
      transfer: transactionId,
    });
  }

  /**
   * Return abi of this vault
   *
   * @returns an abi
   */
  public getAbi() {
    return this.abi;
  }

  /**
   * Return binary of this vault
   *
   * @returns an binary
   */
  public getBin() {
    return this.bin;
  }

  /**
   * Return this vault configurables state
   *
   * @returns configurables [signers, signers requested, hash]
   */
  public getConfigurable() {
    return this.configurable;
  }
}
