import { Api } from '../api';
import { IBakoSafeAuth } from '../auth/types';
import { GetTransactionParams } from '../transactions';
import {
  GetPredicateVersionParams,
  IPredicatePayload,
  IPredicateService,
} from './types';

export class PredicateService extends Api implements IPredicateService {
  constructor(auth?: IBakoSafeAuth) {
    super(auth);
  }

  public async create(payload: IPredicatePayload) {
    const { data } = await this.client.post('/predicate', payload);

    return data;
  }

  public async findByAddress(predicateAddress: string) {
    const { data } = await this.client.get(
      `/predicate/by-address/${predicateAddress}`,
    );
    return data;
  }

  public async findById(predicateId: string) {
    const { data } = await this.client.get(`/predicate/${predicateId}`);

    return data;
  }

  public async hasReservedCoins(predicateAddress: string) {
    const { data } = await this.client.get(
      `/predicate/reserved-coins/${predicateAddress}`,
    );

    return data;
  }

  public async listPredicateTransactions(params: GetTransactionParams) {
    const { data } = await this.client.get('/transaction', {
      params: {
        ...params,
      },
    });

    return data;
  }

  // Version
  public async findVersionByCode(predicateVersionCode: string) {
    const { data } = await this.client.get(
      `/predicate/version/${predicateVersionCode}`,
    );
    return data;
  }

  public async findCurrentVersion() {
    const { data } = await this.client.get('/predicate/version/current');
    return data;
  }

  public async listVersions(params: GetPredicateVersionParams) {
    const { data } = await this.client.get('/predicate/version', {
      params: {
        ...params,
      },
    });

    return data;
  }
}
