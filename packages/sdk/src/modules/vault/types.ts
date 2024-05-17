import { Provider, TransactionRequestLike } from 'fuels';
import { IBakoSafeAuth } from '../../api/auth/types';
import {
  IListTransactions,
  IPredicate,
  IPredicateService,
} from '../../api/predicates';
import { IFormatTransfer, Transfer } from '../transfers';
import { ITransactionResume, IWitnesses } from '../../api';
import { IPagination } from '../../api/utils/pagination';

export interface JsonAbiType {
  typeId: number;
  type: string;
  components: JsonAbiArgument[] | null;
  typeParameters: number[] | null;
}

export interface JsonAbiArgument {
  type: number;
  name: string;
  typeArguments: JsonAbiArgument[] | null;
}

export interface JsonAbiConfigurable {
  name: string;
  configurableType: JsonAbiArgument;
  offset: number;
}

export enum EConfigTypes {
  array = '[]',
  b256 = 'b256',
  boolean = 'bool',
  u64 = 'u64',
}

export interface IConfVault {
  network: string;
  chainId: number;
  [key: string]: any;
}

export enum ECreationtype {
  IS_OLD = 'IS_OLD',
  IS_NEW = 'IS_NEW',
}

export interface ICreationPayload extends IPayloadVault {
  provider: Provider;
  configurable: IConfVault;
  BakoSafeVaultId?: string;
  BakoSafeVault?: IPredicate;
  api?: IPredicateService;
  abi: string;
  bytecode: string;
}

export interface ICreationOldVault {
  type: ECreationtype.IS_NEW;
  payload: ICreationPayload;
}

export interface ICreationNewVault {
  type: ECreationtype.IS_OLD;
  payload: ICreationPayload;
}

export type ICreation = ICreationOldVault | ICreationNewVault;

export type IBakoSafeIncludeTransaction =
  | IFormatTransfer
  | TransactionRequestLike;

export interface IPayloadVault {
  configurable: Omit<IConfVault, 'chainId'>;
  name?: string;
  description?: string;
  transactionRecursiveTimeout?: number;
  BakoSafeAuth?: IBakoSafeAuth;
  version?: string;
}
export interface IBakoSafeApi extends IBakoSafeAuth {
  id?: string;
  predicateAddress?: string;
}
export interface IBakoSafeGetTransactions {
  resume: ITransactionResume;
  witnesses: IWitnesses[];
}
export interface IVault {
  getAbi: () => { [name: string]: unknown };
  getBin: () => string;
  getConfigurable: () => IConfVault;
  BakoSafeGetTransactions: (
    params?: IListTransactions,
  ) => Promise<IPagination<IBakoSafeGetTransactions>>;
  BakoSafeIncludeTransaction: (
    params: IBakoSafeIncludeTransaction,
  ) => Promise<Transfer>;
}
