import { IAssetTransaction, ITransferAsset } from '../../assets';

export enum SortOption {
    ASC = 'ASC',
    DESC = 'DESC'
}

export enum TransactionStatus {
    AWAIT_REQUIREMENTS = 'await_requirements', // -> AWAIT SIGNATURES
    PENDING_SENDER = 'pending_sender', // -> AWAIT SENDER, BEFORE AWAIT STATUS
    PROCESS_ON_CHAIN = 'process_on_chain', // -> AWAIT DONE ON CHAIN
    SUCCESS = 'success', // -> SENDED
    FAILED = 'failed' // -> FAILED
}

export interface ICreateTransactionPayload {
    predicateAddress: string; // ADDRESS OF PREDICATE
    name?: string;
    hash: string; // HASH OF TRANSACTION
    status: TransactionStatus;
    assets: ITransferAsset[];
    sendTime?: Date;
    gasUsed?: string;
}

export interface IWitnesses {
    id: string;
    signature: string;
    account: string;
    createdAt: string;
    updatedAt: string;
}

export interface GetTransactionParams {
    predicateId?: string[];
    to?: string;
    hash?: string;
    status?: TransactionStatus[];
    perPage?: number;
    page?: number;
    orderBy?: string;
    sort?: SortOption;
}

export enum TransactionProcessStatus {
    SUCCESS = 'SuccessStatus',
    SQUIZED = 'SqueezedOutStatus',
    SUBMITED = 'SubmittedStatus',
    FAILED = 'FailureStatus'
}

export interface ITransactionResume {
    status: TransactionProcessStatus;
    hash?: string;
    gasUsed?: string;
    sendTime?: Date;
    witnesses?: string[];
}
export interface ITransaction extends ICreateTransactionPayload {
    id: string;
    createdAt: string;
    updatedAt: string;
    predicateID: string;
    assets: IAssetTransaction[];
    witnesses: IWitnesses[];
    resume: string; // RESULT
}

export interface ITransactionService {
    create: (payload: ICreateTransactionPayload) => Promise<ITransaction>;
    findByHash: (hash: string) => Promise<ITransaction>;
    findByTransactionID: (transactionId: string) => Promise<ITransaction>;
    sign: (BSAFETransactionId: string, account: string, signer: string) => Promise<ITransaction>;
    send: (BSAFETransactionId: string) => Promise<ITransactionResume>;
    verify: (BSAFETransactionId: string) => Promise<ITransactionResume>;
}
