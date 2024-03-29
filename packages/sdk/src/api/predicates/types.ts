import {
  GetTransactionParams,
  ITransaction,
  SortOption,
} from '../transactions';
import { IPagination } from '../utils/pagination';

export interface IPredicatePayload {
  name: string;
  description?: string;
  predicateAddress: string;
  minSigners: number;
  addresses: string[];
  bytes: string;
  abi: string;
  configurable: string;
  provider: string;
  chainId?: number;
}

export interface IListTransactions
  extends GetTransactionParams,
    Omit<GetTransactionParams, 'predicateId'> {}

export interface IPredicate extends IPredicatePayload {
  id: string;
  members: {
    id: string;
    avatar: string;
    address: string;
    nickname: string;
  }[];
  owner: {
    id: string;
    address: string;
  };
  createdAt: string;
  updatedAt: string;
}
export interface IPredicateService {
  create: (payload: IPredicatePayload) => Promise<IPredicate>;
  findByAddress: (predicateAddress: string) => Promise<IPredicate>;
  findById: (predicateAddress: string) => Promise<IPredicate>;
  hasReservedCoins: (predicateAddress: string) => Promise<string[]>;
  listPredicateTransactions: (
    params: GetTransactionParams,
  ) => Promise<IPagination<ITransaction>>;
}
