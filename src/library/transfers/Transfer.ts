import {
  bn,
  hashTransaction,
  hexlify,
  Provider,
  ScriptTransactionRequest,
  TransactionRequest,
  transactionRequestify,
  TransactionRequestLike,
  TransactionResponse,
} from 'fuels';
import {
  ITransaction,
  ITransactionResume,
  ITransactionService,
  TransactionService,
  TransactionStatus,
} from '../api';
import {
  Asset,
  IFormatTransfer,
  TransferConstructor,
  TransferFactory,
  TransferInstanceError,
  Vault,
} from '../';
import { delay } from '../../test-utils';
import { BSAFEScriptTransaction } from './ScriptTransaction';
import { v4 as uuidv4 } from 'uuid';

/**
 * `Transfer` are extension of ScriptTransactionRequest, to create and send transactions
 */
export class Transfer {
  public name!: string;
  public witnesses!: string[];
  public BSAFEScript: ScriptTransactionRequest;
  public BSAFETransaction!: ITransaction;
  public transactionRequest: TransactionRequest;
  public BSAFETransactionId!: string;

  private vault!: Vault;
  private service?: ITransactionService;

  protected constructor({
    vault,
    name,
    witnesses,
    transactionRequest,
    BSAFEScript,
    service,
    BSAFETransaction,
    BSAFETransactionId,
  }: TransferConstructor) {
    this.name = name!;
    this.vault = vault;
    this.service = service;
    this.witnesses = witnesses!;
    this.BSAFEScript = BSAFEScript;
    this.transactionRequest = transactionRequest;
    this.BSAFETransaction = BSAFETransaction!;
    this.BSAFETransactionId = BSAFETransactionId!;
  }
  /**
   * Create a new transaction instance
   *
   * @param {TransferFactory} param - TransferFactory params
   *        @param {string | ITransfer | ITransaction} transfer - Transaction ID or ITransfer or ITransaction
   *        @param {IBSAFEAuth} auth - BSAFEAuth instance
   *        @param {Vault} vault - Vault instance
   *        @param {boolean} isSave - Save transaction on BSAFEAPI
   * @returns return a new Transfer instance
   */
  public static async instance({
    transfer,
    auth,
    vault,
    isSave,
  }: TransferFactory) {
    const getHashTxId = (script: TransactionRequestLike, chainId: number) => {
      const txHash = hashTransaction(transactionRequestify(script), chainId);
      return txHash.slice(2);
    };

    const service = auth && new TransactionService(auth!);
    const transactionName = `Random Vault Name - ${uuidv4()}`;

    const isOld = typeof transfer === 'string';
    if (isOld) {
      if (!auth || !service) {
        throw new Error(TransferInstanceError.REQUIRED_AUTH);
      }

      //if transfer min length is 36, is an transaction id
      //else is an hash
      const transaction =
        transfer.length <= 36
          ? await service.findByTransactionID(transfer)
          : await service.findByHash(transfer);

      const scriptTransactionRequest = await Transfer.formatTransaction({
        name: transaction.name!,
        vault: vault,
        assets: transaction.assets,
        witnesses: transaction.witnesses
          .map((witness) => witness.signature)
          .filter((witness) => !!witness),
      });

      return new Transfer({
        vault,
        service,
        name: transaction.name!,
        BSAFEScript: scriptTransactionRequest,
        transactionRequest: transactionRequestify(scriptTransactionRequest),
        witnesses: transaction.witnesses.map((witness) => witness.account),
        BSAFETransactionId: transaction.id,
        BSAFETransaction: transaction,
      });
    }

    const isNew =
      transfer &&
      Object.entries(transfer).length <= 3 &&
      Object.entries(transfer).length > 0 &&
      'assets' in transfer &&
      !!vault;
    if (isNew) {
      const assets = transfer.assets.map((assest) => ({
        assetId: assest.assetId,
        amount: assest.amount.toString(),
        to: assest.to,
      }));

      const scriptTransaction = await Transfer.formatTransaction({
        name: transfer.name ? transfer.name : `Random Vault Name - ${uuidv4()}`,
        vault: vault,
        assets: assets,
      });

      const txData = transactionRequestify(scriptTransaction);
      const hashTxId = getHashTxId(txData, vault.provider.getChainId());

      const BSAFETransaction =
        auth &&
        service &&
        (await service.create({
          assets: assets.map((asset) => ({
            ...asset,
            utxo: '',
          })),
          hash: hashTxId,
          txData: txData,
          name: transfer.name ?? transactionName,
          status: TransactionStatus.AWAIT_REQUIREMENTS,
          predicateAddress: vault.address.toString(),
        }));

      return new Transfer({
        vault,
        service,
        BSAFETransaction,
        name: transfer.name ?? transactionName,
        transactionRequest: txData,
        BSAFEScript: scriptTransaction,
        witnesses: [],
        BSAFETransactionId: BSAFETransaction?.id,
      });
    }

    const isRequestLike =
      transfer && Object.entries(transfer).length > 3 && 'type' in transfer;
    if (isRequestLike) {
      vault.populateTransactionPredicateData(transfer);
      const txData = transactionRequestify(transfer);
      const hashTxId = getHashTxId(txData, vault.provider.getChainId());
      const assets = txData.getCoinOutputs().map((coin) => ({
        assetId: coin.assetId.toString(),
        to: coin.to.toString(),
        amount: bn(coin.amount).format().toString(),
        utxo: '',
      }));

      let transaction: ITransaction | undefined = undefined;
      if (auth && service && isSave) {
        transaction = await service.create({
          assets,
          hash: hashTxId,
          txData: txData,
          name: transactionName,
          status: TransactionStatus.AWAIT_REQUIREMENTS,
          predicateAddress: vault.address.toString(),
        });
      }

      const witnesses =
        transaction && transaction.witnesses
          ? transaction.witnesses
              .map((witness) => witness.signature)
              .filter((signature) => !!signature)
          : [];

      return new Transfer({
        vault,
        service,
        witnesses: witnesses,
        name: transactionName,
        transactionRequest: txData,
        BSAFEScript: new ScriptTransactionRequest(), // TODO: Remove this one
        BSAFETransaction: transaction,
        BSAFETransactionId: transaction?.id,
      });
    }

    throw new Error(TransferInstanceError.INVALID_PARAMETER);
  }

  /**
   * Create the url to consult the fuel block explorer
   *
   * @returns link of transaction block
   */
  public makeBlockUrl(block: string | undefined) {
    return block
      ? `https://fuellabs.github.io/block-explorer-v2/transaction/${this.getHashTxId()}?providerUrl=${encodeURIComponent(
          this.vault.provider.url,
        )}`
      : '';
  }

  // /**
  //  * Generates and formats the transaction hash
  //  *
  //  * @param script Script of transaction request
  //  * @param chainId Chain ID of provider
  //  *
  //  * @returns Hash of this transaction
  //  */
  // public static getHashTxId(script: TransactionRequestLike, chainId: number) {
  //   const txHash = hashTransaction(transactionRequestify(script), chainId);
  //   return txHash.slice(2);
  // }

  // public static toTransactionRequest(transaction: ITransaction) {
  //   return BSAFEScriptTransaction.from({
  //     script: `0x${transaction.hash}`,
  //   });
  // }

  /**
   * Generates and formats the transaction hash of transaction instance
   *
   * @returns Hash of this transaction
   */
  public getHashTxId() {
    const txHash = hashTransaction(
      this.transactionRequest,
      this.vault.provider.getChainId(),
    );
    return txHash.slice(2);
  }

  // /**
  //  * Encapsulation of this transaction
  //  *
  //  * @returns this transaction
  //  */
  // public getScript() {
  //   return this.BSAFEScript!;
  // }

  // /**
  //  * Encapsulation of this transaction assets
  //  *
  //  * @returns this transaction assets
  //  */
  // public getAssets() {
  //   return this.assets;
  // }

  /**
   * Configure outputs and parameters of transaction instance.
   *
   * @returns this transaction configured and your hash
   */
  private static async formatTransaction({
    vault,
    assets,
    witnesses,
  }: IFormatTransfer & { vault: Vault }) {
    const outputs = await Asset.assetsGroupByTo(assets);
    const coins = await Asset.assetsGroupById(assets);
    const fee = (await Provider.create(vault.provider.url)).getGasConfig();
    const transactionCoins = await Asset.addTransactionFee(
      coins,
      fee.maxGasPerPredicate,
    );

    // await this.validateBalance(coins, vault).catch((error) => {
    //   return undefined;
    // });
    const _coins = await vault.getResourcesToSpend(transactionCoins);

    // const _assets = _coins.length > 0 ? Asset.includeSpecificAmount(_coins, assets) : [];
    const script_t = new BSAFEScriptTransaction();
    await script_t.instanceTransaction(_coins, vault, outputs, witnesses);

    return script_t;
  }

  // /**
  //  * Validates all coins in the vault
  //  *
  //  * @param _coins - Vault to which this transaction belongs
  //  * @returns If one of the assets is not enough, an error will be returned
  //  */
  // private static async validateBalance(_coins: IAssetGroupById, vault: Vault) {
  //   const balances = await vault.getBalances();
  //   const coins = await Asset.assetsGroupById(
  //     balances.map((item) => {
  //       return {
  //         assetId: item.assetId,
  //         amount: item.amount.format(),
  //         to: '',
  //       };
  //     }),
  //   );
  //   Object.entries(_coins).map(([key, value]) => {
  //     if (bn(coins[key]).lt(value)) {
  //       throw new Error(`Insufficient balance for ${key}`);
  //     }
  //   });
  // }

  /**
   * Using BSAFEauth or default send of predicate, send this transaction to chain
   *
   * @returns an resume for transaction
   */
  public async send() {
    if (!this.service) {
      const tx: TransactionRequest = transactionRequestify(this.BSAFEScript!);
      const tx_est = await this.vault.provider.estimatePredicates(tx);
      const encodedTransaction = hexlify(tx_est.toTransactionBytes());
      const {
        submit: { id: transactionId },
      } = await this.vault.provider.operations.submit({ encodedTransaction });
      return new TransactionResponse(transactionId, this.vault.provider);
    }

    this.BSAFETransaction = await this.service.findByTransactionID(
      this.BSAFETransactionId,
    );
    switch (this.BSAFETransaction.status) {
      case TransactionStatus.PENDING_SENDER:
        await this.service.send(this.BSAFETransactionId);
        break;

      case TransactionStatus.FAILED || TransactionStatus.SUCCESS:
        break;

      default:
        break;
    }
    return {
      ...this.BSAFETransaction.resume,
      bsafeID: this.BSAFETransactionId,
    };
  }

  /**
   * Promise to return result of function
   *
   * todo: monitore send with an socket server
   * Connect to api socket using name: [TRANSACTION_WAIT]:${transactionId}
   * Await an message on event [TRANSACTION_WAIT]:${transactionId}
   * and resolves a promise returns a result (returned on content of message)
   *
   * @returns an resume for transaction
   */
  public async wait() {
    if (!this.service) {
      throw Error('Implement this.');
    }

    let transaction = await this.service.findByTransactionID(
      this.BSAFETransactionId,
    );
    while (
      transaction.status !== TransactionStatus.SUCCESS &&
      transaction.status !== TransactionStatus.FAILED
    ) {
      await delay(this.vault.transactionRecursiveTimeout); // todo: make time to dynamic
      transaction = await this.service.findByTransactionID(
        this.BSAFETransactionId,
      );

      if (transaction.status == TransactionStatus.PROCESS_ON_CHAIN)
        await this.service.verify(this.BSAFETransactionId);
    }

    const result: ITransactionResume = {
      ...transaction.resume,
      status: transaction.status,
    };
    return result;
  }
}
