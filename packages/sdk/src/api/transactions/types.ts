import { Operation, TransactionRequest } from 'fuels';
import { ITransferAsset } from '../../utils/assets';

export enum SortOptionTx {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum TransactionStatus {
  AWAIT_REQUIREMENTS = 'await_requirements', // -> AWAIT SIGNATURES
  PENDING_SENDER = 'pending_sender', // -> AWAIT SENDER, BEFORE AWAIT STATUS
  PROCESS_ON_CHAIN = 'process_on_chain', // -> AWAIT DONE ON CHAIN
  SUCCESS = 'success', // -> SENDED
  DECLINED = 'declined', // -> DECLINED
  FAILED = 'failed', // -> FAILED
}

export interface ICreateTransactionPayload {
  predicateAddress: string; // ADDRESS OF PREDICATE
  name?: string;
  hash: string; // HASH OF TRANSACTION
  txData: TransactionRequest;
  status: TransactionStatus;
  assets: ITransferAsset[];
  sendTime?: Date;
  gasUsed?: string;
}

export enum WitnessStatus {
  REJECTED = 'REJECTED',
  DONE = 'DONE',
  PENDING = 'PENDING',
}

export interface IWitnesses {
  id: string;
  signature: string;
  account: string;
  status: WitnessStatus;
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
  sort?: SortOptionTx;
}

export enum TransactionProcessStatus {
  SUCCESS = 'SuccessStatus',
  SQUIZED = 'SqueezedOutStatus',
  SUBMITED = 'SubmittedStatus',
  FAILED = 'FailureStatus',
}

export interface ITransactionResume {
  hash: string;
  totalSigners: number;
  requiredSigners: number;
  predicate: {
    id: string;
    address: string;
  };
  outputs: ITransferAsset[];
  status: TransactionStatus;
  BakoSafeID: string;
  witnesses?: string[];
  gasUsed?: string;
  sendTime?: Date;
}

export interface ITransactionSummary {
  origin: string;
  name: string;
  image?: string;
  operations?: Operation[];
}

export interface ITransaction extends ICreateTransactionPayload {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  predicateId: string;
  witnesses: IWitnesses[];
  resume: ITransactionResume; // RESULT
  assets: ITransferAsset[];
  summary?: ITransactionSummary;
}

export interface ITransactionService {
  create: (payload: ICreateTransactionPayload) => Promise<ITransaction>;
  findByHash: (hash: string) => Promise<ITransaction>;
  findByTransactionID: (transactionId: string) => Promise<ITransaction>;
  sign: (
    BakoSafeTransactionId: string,
    account: string,
    signer: string,
    approve?: boolean,
  ) => Promise<ITransaction>;
  send: (BakoSafeTransactionId: string) => Promise<ITransactionResume>;
  verify: (BakoSafeTransactionId: string) => Promise<ITransactionResume>;
}
