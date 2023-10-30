import { TransactionRequest, TransactionStatus } from 'fuels';
import { ITransferAsset } from '../assets/types';
import { ITransactionResume, IWitnesses } from '../api/transactions';

export interface IPayloadTransfer {
    assets: ITransferAsset[];
    witnesses?: string[];
    name?: string;
}

export interface IInstanceTransfer {
    txData: TransactionRequest;
    hash: string;
}

export interface IRequiredWitnesses {
    required: number;
    signed: number;
    witnesses: IWitnesses[];
}

export interface ITransferResult {
    status: TransactionStatus;
    block?: string;
    witnesses?: string[];
    outputs?: ITransferAsset[];
    bsafeID?: string;
    fee?: string;
    gasUsed?: string;
}

export interface ISendTransaction {
    status: string;
    block: string;
    gasUsed: string;
}

export interface ITransfer {
    send(): void;
    getHashTxId(): string;
    getScript(): TransactionRequest;
    wait(): Promise<ITransactionResume | undefined>;
}
