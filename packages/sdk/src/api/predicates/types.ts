import { GetTransactionParams, ITransaction } from '../transactions';
import { IPagination } from '../utils/pagination';

export enum SortOption {
  asc = 'ASC',
  desc = 'DESC',
}

export interface IPredicatePayload {
  name: string;
  description?: string;
  predicateAddress: string;
  minSigners: number;
  addresses: string[];
  configurable: string;
  provider: string;
  chainId?: number;
  versionCode?: string;
}

export interface GetPredicateVersionParams {
  q?: string;
  code?: string;
  active?: boolean;
  perPage?: number;
  page?: number;
  orderBy?: string;
  sort?: SortOption;
}

export interface IListTransactions
  extends GetTransactionParams,
    Omit<GetTransactionParams, 'predicateId'> {}

export interface IPredicateVersion {
  id: string;
  name: string;
  description?: string;
  code: string;
  bytes: string;
  abi: string;
  active: boolean;
}

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
  version: Partial<IPredicateVersion>;
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

  //Version
  findVersionByCode: (code: string) => Promise<IPredicateVersion>;
  findCurrentVersion: () => Promise<IPredicateVersion>;
  listVersions: (
    params: GetPredicateVersionParams,
  ) => Promise<IPagination<IPredicateVersion>>;
}
