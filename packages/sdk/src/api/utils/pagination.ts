import { SortOptionTx } from '../transactions';

export interface IPagination<T> {
  currentPage: number;
  totalPages: number;
  nextPage: number;
  prevPage: number;
  perPage: number;
  total: number;
  data: T[];
}

export interface PaginationParams {
  page: string;
  perPage: string;
}

export const defaultListParams = {
  perPage: 10,
  page: 0,
  orderBy: 'createdAt',
  sort: SortOptionTx.DESC,
};
