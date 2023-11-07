import {
  bn,
  hashTransaction,
  hexlify,
  ScriptTransactionRequest,
  TransactionRequest,
  transactionRequestify,
  TransactionResponse,
  TransactionType,
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
  ITransferAsset,
  TransferConstructor,
  TransferFactory,
  TransferInstanceError,
  Vault,
} from '../';
import { delay } from '../../test-utils';
import { defaultConfigurable } from '../../configurables';
import { ITransfer } from './types';
import { BSAFEScriptTransaction } from './ScriptTransaction';
import { v4 as uuidv4 } from 'uuid';

/**
 * `Transfer` are extension of ScriptTransactionRequest, to create and send transactions
 */
export class Transfer implements ITransfer {
  public name!: string;
  public witnesses!: string[];
  public BSAFEScript: ScriptTransactionRequest;
  public BSAFETransaction!: ITransaction;
  public transactionRequest: TransactionRequest;
  public BSAFETransactionId!: string;

  private vault!: Vault;
  private assets!: ITransferAsset[];
  private service?: ITransactionService;

  /**
   * Creates an instance of the Transfer class.
   *
   * @param vault - Vault to which this transaction belongs
   * @param assets - Asset output of transaction
   * @param witnesses - Signatures on the hash of this transaction, signed by the vault subscribers
   */
  // constructor(vault: Vault, auth?: IBSAFEAuth) {
  //     this.vault = vault;
  //     if (auth) {
  //         this.service = new TransactionService(auth);
  //     }
  //
  //     const _configurable = this.vault.getConfigurable();
  //     this.chainId = _configurable.chainId;
  // }

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

    const coins = transactionRequest.getCoinOutputs();
    this.assets = coins.map((coin) => ({
      to: coin.to.toString(),
      amount: coin.amount.toString(),
      assetId: coin.assetId.toString(),
    }));
  }

  public static async instance({ transfer, auth, vault }: TransferFactory) {
    const service = auth && new TransactionService(auth!);
    const transactionName = `Random Vault Name - ${uuidv4()}`;

    const isOld = typeof transfer === 'string';
    if (isOld) {
      if (!auth || !service) {
        throw new Error(TransferInstanceError.REQUIRED_AUTH);
      }

      const transaction = await service.findByTransactionID(transfer);
      const scriptTransactionRequest =
        Transfer.toTransactionRequest(transaction);

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

    const isNew = 'assets' in transfer && 'witnesses' in transfer && !!vault;
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
        witnesses: transfer.witnesses ?? [],
      });

      const txData = transactionRequestify(scriptTransaction);
      const hashTxId = Transfer.getHashTxId(
        scriptTransaction,
        vault.provider.getChainId(),
      );

      const BSAFETransaction =
        auth &&
        service &&
        (await service.create({
          assets: assets.map((asset) => ({
            ...asset,
            utxo: '',
          })),
          hash: hashTxId,
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
        witnesses: transfer.witnesses ?? [],
        BSAFETransactionId: BSAFETransaction?.id,
      });
    }

    const isRequestLike = 'type' in transfer;
    if (isRequestLike) {
      const isTransactionScript = transfer.type === TransactionType.Script;
      const bsafeScriptTransaction = isTransactionScript
        ? new BSAFEScriptTransaction({
            script: transfer.script!,
            gasLimit: bn(transfer.gasLimit),
            gasPrice: bn(transfer.gasPrice),
          })
        : new BSAFEScriptTransaction();

      const txData = transactionRequestify(bsafeScriptTransaction);
      const hashTxId = Transfer.getHashTxId(
        bsafeScriptTransaction,
        vault.provider.getChainId(),
      );
      const assets = bsafeScriptTransaction.getCoinOutputs().map((coin) => ({
        assetId: coin.assetId.toString(),
        to: coin.to.toString(),
        amount: coin.amount.toString(),
      }));

      const transaction =
        auth &&
        service &&
        (await service.create({
          assets,
          hash: hashTxId,
          name: transactionName,
          status: TransactionStatus.AWAIT_REQUIREMENTS,
          predicateAddress: vault.address.toString(),
        }));

      const witnesses = transaction?.witnesses
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
        BSAFEScript: bsafeScriptTransaction,
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
      ? `https://fuellabs.github.io/block-explorer-v2/transaction/${Transfer.getHashTxId(
          this.BSAFEScript,
          this.vault.provider.getChainId(),
        )}?providerUrl=${encodeURIComponent(this.vault.provider.url)}`
      : '';
  }

  /**
   * Generates and formats the transaction hash
   *
   * @param script Script of transaction request
   * @param chainId Chain ID of provider
   *
   * @returns Hash of this transaction
   */
  public static getHashTxId(script: ScriptTransactionRequest, chainId: number) {
    const txHash = hashTransaction(transactionRequestify(script), chainId);
    return txHash.slice(2);
  }

  public static toTransactionRequest(transaction: ITransaction) {
    return BSAFEScriptTransaction.from({
      script: `0x${transaction.hash}`,
    });
  }

  /**
   * Generates and formats the transaction hash of transaction instance
   *
   * @returns Hash of this transaction
   */
  public getHashTxId() {
    const txHash = hashTransaction(
      transactionRequestify(this.BSAFEScript),
      this.vault.provider.getChainId(),
    );
    return txHash.slice(2);
  }

  /**
   * Encapsulation of this transaction
   *
   * @returns this transaction
   */
  public getScript() {
    return this.BSAFEScript!;
  }

  /**
   * Encapsulation of this transaction assets
   *
   * @returns this transaction assets
   */
  public getAssets() {
    return this.assets;
  }

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
    const transactionCoins = await Asset.addTransactionFee(
      coins,
      defaultConfigurable['gasPrice'],
    );

    // await this.validtateBalance(coins);
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
   * Using BSAFEauth, send this transaction to chain
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
    } else {
      const transaction = await this.service.findByTransactionID(
        this.BSAFETransactionId,
      );
      switch (transaction.status) {
        case TransactionStatus.PENDING_SENDER:
          await this.service.send(this.BSAFETransactionId);
          break;

        case TransactionStatus.PROCESS_ON_CHAIN:
          return await this.wait();

        case TransactionStatus.FAILED || TransactionStatus.SUCCESS:
          break;
      }
      return {
        ...JSON.parse(transaction.resume),
        bsafeID: transaction.id,
      };
    }
  }

  /**
   * An recursive function, to wait for transaction to be processed
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

      if (transaction.status == TransactionStatus.PENDING_SENDER)
        await this.send();

      if (transaction.status == TransactionStatus.PROCESS_ON_CHAIN)
        await this.service.verify(this.BSAFETransactionId);
    }

    const result: ITransactionResume = {
      ...JSON.parse(transaction.resume),
      status: transaction.status,
      bsafeID: transaction.id,
    };
    return result;
  }
}
