import {
  hexlify,
  ScriptTransactionRequest,
  TransactionRequest,
  transactionRequestify,
  TransactionResponse,
} from 'fuels';
import {
  ITransaction,
  ITransactionResume,
  ITransactionService,
  TransactionStatus,
} from '../../api';
import {
  ECreationTransactiontype,
  TransferConstructor,
  TransferFactory,
} from './types';
import { Vault } from '../vault/Vault';
import { delay } from '../../../test/utils';
import { identifyCreateTransactionParams } from './helpers';

/**
 * `Transfer` are extension of ScriptTransactionRequest, to create and send transactions
 */
export class Transfer {
  public name!: string;
  public witnesses: string[];
  public BakoSafeTransaction!: ITransaction;
  public transactionRequest: TransactionRequest;
  public BakoSafeTransactionId!: string;

  private vault!: Vault;
  private service?: ITransactionService;

  protected constructor({
    vault,
    name,
    transactionRequest,
    service,
    BakoSafeTransaction,
    BakoSafeTransactionId,
  }: TransferConstructor) {
    this.name = name!;
    this.vault = vault;
    this.service = service;
    this.witnesses = [];
    this.transactionRequest = transactionRequest;
    this.BakoSafeTransaction = BakoSafeTransaction!;
    this.BakoSafeTransactionId = BakoSafeTransactionId!;
  }

  /**
   * Create a new transaction instance
   *
   * @param {TransferFactory} param - TransferFactory params
   *        @param {string | ITransfer | ITransaction} transfer - Transaction ID or ITransfer or ITransaction
   *        @param {IBakoSafeAuth} auth - BakoSafeAuth instance
   *        @param {Vault} vault - Vault instance
   *        @param {boolean} isSave - Save transaction on BakoSafeAPI
   * @returns return a new Transfer instance
   */
  public static async instance(param: TransferFactory): Promise<Transfer> {
    const item = await identifyCreateTransactionParams(param);

    switch (item.type) {
      case ECreationTransactiontype.IS_OLD: {
        const { payload } = item;
        return new Transfer(payload);
      }
      case ECreationTransactiontype.IS_NEW: {
        const { payload } = item;
        return new Transfer(payload);
      }
      case ECreationTransactiontype.IS_SCRIPT: {
        const { payload } = item;
        console.log('[IS_SCRIPT]', payload);
        return new Transfer(payload);
      }

      default:
        throw new Error('Invalid param type to create a transfer');
    }
  }

  /**
   * Create the url to consult the fuel block explorer
   *
   * @returns link of transaction block
   */
  public makeBlockUrl(block: string | undefined): string {
    return block
      ? `https://fuellabs.github.io/block-explorer-v2/transaction/${this.getHashTxId()}?providerUrl=${encodeURIComponent(
          this.vault.provider.url,
        )}`
      : '';
  }

  /**
   * Generates and formats the transaction hash of transaction instance
   *
   * @returns Hash of this transaction
   */
  public getHashTxId(): string {
    const txHash = this.transactionRequest.getTransactionId(
      this.vault.provider.getChainId(),
    );
    return txHash.slice(2);
  }

  /**
   * Configure outputs and parameters of transaction instance.
   *
   * @returns this transaction configured and your hash
   */

  /**
   * Using BakoSafe auth or default send of predicate, send this transaction to chain
   *
   * @returns an resume for transaction
   */
  public async send(): Promise<ITransactionResume | TransactionResponse> {
    if (!this.service) {
      const tx: TransactionRequest = this.transactionRequest;
      tx.witnesses = this.witnesses;
      console.log('[TX_SEND]: ', tx.witnesses);

      const tx_est = await this.vault.provider.estimatePredicates(tx);

      console.log('[TX_EST]: ', tx_est);

      const encodedTransaction = hexlify(tx_est.toTransactionBytes());
      const {
        submit: { id: transactionId },
      } = await this.vault.provider.operations.submit({ encodedTransaction });
      return new TransactionResponse(transactionId, this.vault.provider);
    }

    this.BakoSafeTransaction = await this.service.findByTransactionID(
      this.BakoSafeTransactionId,
    );
    switch (this.BakoSafeTransaction.status) {
      case TransactionStatus.PENDING_SENDER:
        await this.service.send(this.BakoSafeTransactionId);
        break;

      case TransactionStatus.PROCESS_ON_CHAIN:
        return await this.wait();

      case TransactionStatus.FAILED || TransactionStatus.SUCCESS:
        break;

      default:
        break;
    }
    return {
      ...this.BakoSafeTransaction.resume,
      BakoSafeID: this.BakoSafeTransactionId,
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
  public async wait(): Promise<ITransactionResume> {
    if (!this.service) {
      throw Error('Implement this.');
    }

    let transaction = await this.service.findByTransactionID(
      this.BakoSafeTransactionId,
    );
    while (
      transaction.status !== TransactionStatus.SUCCESS &&
      transaction.status !== TransactionStatus.FAILED
    ) {
      await delay(this.vault.transactionRecursiveTimeout); // todo: make time to dynamic
      transaction = await this.service.findByTransactionID(
        this.BakoSafeTransactionId,
      );

      if (transaction.status == TransactionStatus.PENDING_SENDER)
        await this.send();

      if (transaction.status == TransactionStatus.PROCESS_ON_CHAIN)
        await this.service.verify(this.BakoSafeTransactionId);
    }

    const result: ITransactionResume = {
      ...transaction.resume,
      status: transaction.status,
    };
    return result;
  }
}
