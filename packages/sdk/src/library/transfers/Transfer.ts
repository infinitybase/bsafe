import { ScriptTransactionRequest, TransactionRequest, TransactionResponse, bn, hashTransaction, hexlify, transactionRequestify } from 'fuels';
import { ICreateTransactionPayload, ITransaction, ITransactionService, TransactionService, TransactionStatus, IBSAFEAuth, ITransactionResume } from '../api';
import { Asset, Vault, IAssetGroupById, IAssetTransaction } from '../';
import { delay } from '../../test-utils';
import { defaultConfigurable } from '../../configurables';
import { IPayloadTransfer, ITransfer } from './types';
import { BSAFEScriptTransaction } from './ScriptTransaction';
import { v4 as uuidv4 } from 'uuid';

/**
 * `Transfer` are extension of ScriptTransactionRequest, to create and send transactions
 */
export class Transfer implements ITransfer {
    public name!: string;
    private vault!: Vault;
    private chainId!: number;
    private assets!: IAssetTransaction[];
    private service!: ITransactionService;
    public BSAFETransactionId!: string;
    public BSAFEScript!: ScriptTransactionRequest;
    public BSAFETrsanction!: ITransaction;
    /**
     * Creates an instance of the Transfer class.
     *
     * @param vault - Vault to which this transaction belongs
     * @param assets - Asset output of transaction
     * @param witnesses - Signatures on the hash of this transaction, signed by the vault subscribers
     */
    constructor(vault: Vault, auth?: IBSAFEAuth) {
        this.vault = vault;
        if (auth) {
            this.service = new TransactionService(auth);
        }

        const _configurable = this.vault.getConfigurable();
        this.chainId = _configurable.chainId;
    }

    /**
     * Instance a transaction, if you have the transaction id, instance old transaction, if not instance new transaction
     *
     * @param params - If string, instance old transaction, if object, instance new transaction
     */
    public async instanceTransaction(params: IPayloadTransfer | ITransaction | string) {
        if (typeof params === 'string') {
            // find on API
            this.BSAFETransactionId = params;
            await this.instanceOldTransaction();
        } else if ('id' in params && 'assets' in params && 'witnesses' in params) {
            const { witnesses, assets } = params;
            const _witnesses: string[] = [];
            witnesses.map((item) => {
                item.signature && _witnesses.push(item.signature);
            });

            await this.instanceNewTransaction({
                witnesses: _witnesses,
                assets: assets.map((assest) => {
                    return {
                        assetId: assest.assetId,
                        amount: assest.amount.toString(),
                        to: assest.to
                    };
                })
            });
        } else {
            // instance new transaction
            await this.instanceNewTransaction(params);
        }
    }

    /**
     * Create the url to consult the fuel block explorer
     *
     * @returns link of transaction block
     */
    public makeBlockUrl(block: string | undefined) {
        return block ? `https://fuellabs.github.io/block-explorer-v2/transaction/${this.getHashTxId()}?providerUrl=${encodeURIComponent(this.vault.provider.url)}` : '';
    }

    /**
     * Generates and formats the transaction hash
     *
     * @returns hash of this transaction
     */
    public getHashTxId() {
        const txHash = hashTransaction(transactionRequestify(this.BSAFEScript), this.chainId);
        return txHash.slice(2);
    }

    /**
     * Encapsulation of this transaction
     *
     * @returns this transaction
     */
    public getScript() {
        return this.BSAFEScript;
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
     * To use bsafe API, auth is required
     *
     * @returns if auth is not defined, throw an error
     */
    private verifyAuth() {
        if (!this.service) {
            throw new Error('Auth is required');
        }
    }

    /**
     * Configure outputs and parameters of transaction instance.
     *
     * @returns this transaction configured and your hash
     */
    private async instanceNewTransaction({ assets, witnesses, name }: IPayloadTransfer) {
        const outputs = await Asset.assetsGroupByTo(assets);
        const coins = await Asset.assetsGroupById(assets);
        const transactionCoins = await Asset.addTransactionFee(coins, defaultConfigurable['gasPrice']);

        await this.validtateBalance(coins);
        const _coins = await this.vault.getResourcesToSpend(transactionCoins);

        this.assets = _coins.length > 0 ? Asset.includeSpecificAmount(_coins, assets) : [];
        const script_t = new BSAFEScriptTransaction();
        await script_t.instanceTransaction(_coins, this.vault, outputs, witnesses);
        this.BSAFEScript = script_t;
        this.name = name ? name : `Random Vault Name - ${uuidv4()}`;
        if (this.service) {
            await this.createTransaction();
        }
    }

    /**
     * if you have the transaction id, this function called to find on BSAFE API and instance this transaction
     *
     * @param params - If string, instance old transaction, if object, instance new transaction
     */
    private async instanceOldTransaction() {
        this.verifyAuth();
        const { witnesses, assets } = await this.service.findByTransactionID(this.BSAFETransactionId);
        const _witnesses: string[] = [];
        witnesses.map((item) => {
            item.signature && _witnesses.push(item.signature);
        });

        await this.instanceNewTransaction({
            witnesses: _witnesses,
            assets: assets.map((assest) => {
                return {
                    assetId: assest.assetId,
                    amount: assest.amount.toString(),
                    to: assest.to
                };
            })
        });
    }

    /**
     * Send a caller to BSAFE API to save transaction
     *
     * @returns if auth is not defined, throw an error
     */
    private async createTransaction() {
        this.verifyAuth();
        const transaction: ICreateTransactionPayload = {
            predicateAddress: this.vault.address.toString(),
            name: this.name,
            hash: this.getHashTxId(),
            status: TransactionStatus.AWAIT_REQUIREMENTS,
            assets: this.assets
        };
        if (this.BSAFETransactionId) {
            this.BSAFETrsanction = await this.service.findByTransactionID(this.BSAFETransactionId);
        } else {
            this.BSAFETrsanction = await this.service.create(transaction);
        }

        this.BSAFETransactionId = this.BSAFETrsanction.id;
    }

    /**
     * Validates all coins in the vault
     *
     * @param _coins - Vault to which this transaction belongs
     * @returns If one of the assets is not enough, an error will be returned
     */
    private async validtateBalance(_coins: IAssetGroupById) {
        const balances = await this.vault.getBalances();
        const coins = await Asset.assetsGroupById(
            balances.map((item) => {
                return {
                    assetId: item.assetId,
                    amount: item.amount.format(),
                    to: ''
                };
            })
        );
        Object.entries(_coins).map(([key, value]) => {
            if (bn(coins[key]).lt(value)) {
                throw new Error(`Insufficient balance for ${key}`);
            }
        });
    }

    /**
     * Using BSAFEauth, send this transaction to chain
     *
     * @returns an resume for transaction
     */
    public async send() {
        if (!this.service) {
            const tx: TransactionRequest = transactionRequestify(this.BSAFEScript);
            const tx_est = await this.vault.provider.estimatePredicates(tx);
            const encodedTransaction = hexlify(tx_est.toTransactionBytes());
            const {
                submit: { id: transactionId }
            } = await this.vault.provider.operations.submit({ encodedTransaction });
            return new TransactionResponse(transactionId, this.vault.provider);
        } else {
            const transaction = await this.service.findByTransactionID(this.BSAFETransactionId);
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
                bsafeID: transaction.id
            };
        }
    }

    /**
     * An recursive function, to wait for transaction to be processed
     *
     * @returns an resume for transaction
     */
    public async wait() {
        let transaction = await this.service.findByTransactionID(this.BSAFETransactionId);
        while (transaction.status !== TransactionStatus.SUCCESS && transaction.status !== TransactionStatus.FAILED) {
            await delay(this.vault.transactionRecursiveTimeout); // todo: make time to dynamic
            transaction = await this.service.findByTransactionID(this.BSAFETransactionId);

            if (transaction.status == TransactionStatus.PENDING_SENDER) await this.send();

            if (transaction.status == TransactionStatus.PROCESS_ON_CHAIN) await this.service.verify(this.BSAFETransactionId);
        }

        const result: ITransactionResume = {
            ...JSON.parse(transaction.resume),
            status: transaction.status,
            bsafeID: transaction.id
        };
        return result;
    }
}
