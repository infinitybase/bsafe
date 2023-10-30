import { Predicate, Provider } from 'fuels';
import { predicateABI, predicateBIN } from '@infinitybase/sway';

import { IListTransactions, IPredicate, IPredicateService, IBSAFEAuth, PredicateService } from '../api';
import { IPayloadTransfer, Transfer, makeHashPredicate, makeSubscribers, IConfVault, IPayloadVault, IVault, IBSAFEApi } from '../';
import { v4 as uuidv4 } from 'uuid';

/**
 * `Vault` are extension of predicates, to manager transactions, and sends.
 */

export class Vault extends Predicate<[]> implements IVault {
    private bin: string;
    public BSAFEVaultId!: string;
    private configurable: IConfVault;
    private abi: { [name: string]: unknown };
    private api!: IPredicateService;
    private auth!: IBSAFEAuth;

    public transactionRecursiveTimeout: number;
    public name!: string;
    public description?: string;
    public BSAFEVault!: IPredicate;
    public provider: Provider;
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
     **/

    protected constructor({ configurable, provider, abi, bytecode, transactionRecursiveTimeout, name, description, BSAFEVaultId }: IPayloadVault) {
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
            chainId: _chainId
        };
        this.provider = provider;
        this.name = name ? name : `Random Vault Name - ${uuidv4()}`;
        this.description = description ? description : undefined;
        this.BSAFEVaultId = BSAFEVaultId!;
        this.transactionRecursiveTimeout = transactionRecursiveTimeout ? transactionRecursiveTimeout : 1000;
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
     *
     * Constructor method to instance a vault from BSAFE API.
     *
     * @param BSAFEAuth - Auth of bsafe API.
     * @param BSAFEPredicateId - id of vault on BSAFE API. [optional]
     * @param predicateAddress - address of vault on BSAFE API. [optional]
     * @returns thire is no return, but if an error is detected it is trigged
     */
    static async create(params: IPayloadVault | IBSAFEApi) {
        const isWithApi = ('predicateAddress' in params || 'id' in params) && 'address' in params && 'token' in params;
        const isNew = 'configurable' in params && 'provider';
        if (isWithApi) {
            const { id, predicateAddress, token, address } = params;
            const hasId = 'id' in params && id;

            if (predicateAddress == undefined && id == undefined) {
                throw new Error('predicateAddress or BSAFEPredicateId is required');
            }

            const api = new PredicateService({
                address,
                token
            });

            const result = hasId ? await api.findById(id) : predicateAddress && (await api.findByAddress(predicateAddress));
            if (!result) {
                throw new Error('BSAFEVault not found');
            }

            const { configurable, abi, bytes, name, description, id: BSAFEVaultId, provider } = result;
            return new Vault({
                configurable: JSON.parse(configurable),
                provider: await Provider.create(provider),
                abi,
                bytecode: bytes,
                name,
                description,
                BSAFEVaultId
            });
        } else if (isNew) {
            const { configurable, provider, name, description, abi, bytecode, BSAFEAuth, BSAFEVaultId } = params;
            const aux = new Vault({
                configurable,
                provider,
                abi,
                bytecode,
                name,
                description,
                BSAFEAuth,
                BSAFEVaultId
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
            addresses: this.configurable.SIGNERS,
            owner: this.auth.address,
            bytes: this.bin,
            abi: JSON.stringify(this.abi),
            configurable: JSON.stringify(this.configurable),
            provider: this.provider.url
        });
        this.BSAFEVault = {
            ...rest,
            id
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
            HASH_PREDICATE: hasExists ? configurable.HASH_PREDICATE : makeHashPredicate()
        };

        return _configurable;
    }

    /**
     * Include new transaction to vault
     *
     * @param assets - Output assets of transaction
     * @param witnesses - witnesses of predicate [transaction id signed to address signer]
     * @returns return a new transaction and include in vault states
     */

    public async BSAFEIncludeTransaction(params: IPayloadTransfer | string) {
        const _transfer = new Transfer(this, this.auth);
        await _transfer.instanceTransaction(params);

        return _transfer;
    }

    /**
     * Return an list of transaction of this vault
     *
     * @returns an transaction list
     */
    public async BSAFEGetTransactions(params?: IListTransactions) {
        this.verifyAuth();
        const result: Transfer[] = [];

        const BSAFEtransactions = await this.api.listPredicateTransactions({
            predicateId: [this.BSAFEVaultId],
            ...params
        });

        for await (const BSAFEtransaction of BSAFEtransactions) {
            const _transfer = new Transfer(this, this.auth);
            await _transfer.instanceTransaction(BSAFEtransaction);
            result.push(_transfer);
        }

        return result;
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
