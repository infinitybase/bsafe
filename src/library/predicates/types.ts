import { Provider, TransactionRequestLike } from 'fuels';
import { IBSAFEAuth } from '../api/auth/types';
import { IListTransactions, IPredicate } from '../api/predicates';
import { ITransferAsset } from '../assets';
import { IFormatTransfer, Transfer } from '../transfers';
import { ITransactionResume, IWitnesses } from '../api';

export interface IConfVault {
  HASH_PREDICATE?: number[];
  SIGNATURES_COUNT: number;
  SIGNERS: string[];
  network: string;
  chainId: number;
}

export interface ITransferList {
  [id: string]: Transfer;
}

export interface IInstanceNewTransfer {
  assets: ITransferAsset[];
  witnesses: string[];
}

export type IBSAFEIncludeTransaction = IFormatTransfer | TransactionRequestLike;

export interface IPayloadVault {
  configurable: IConfVault;
  provider: Provider;
  name?: string;
  description?: string;
  transactionRecursiveTimeout?: number;
  abi?: string;
  bytecode?: string;
  BSAFEAuth?: IBSAFEAuth;
  BSAFEVaultId?: string;
  BSAFEVault?: IPredicate;
}
export interface IBSAFEApi extends IBSAFEAuth {
  id?: string;
  predicateAddress?: string;
}
export interface IBSAFEGetTransactions {
  resume: ITransactionResume;
  witnesses: IWitnesses[];
}
export interface IVault {
  getAbi: () => { [name: string]: unknown };
  getBin: () => string;
  getConfigurable: () => IConfVault;
  BSAFEGetTransactions: (
    params?: IListTransactions,
  ) => Promise<IBSAFEGetTransactions[]>;
  BSAFEIncludeTransaction: (
    params: IBSAFEIncludeTransaction,
  ) => Promise<Transfer>;
}
