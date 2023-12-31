import { Api } from '../api';
import { IBSAFEAuth } from '../auth/types';
import {
  ICreateTransactionPayload,
  ITransaction,
  ITransactionService,
} from './types';

export class TransactionService extends Api implements ITransactionService {
  constructor(auth: IBSAFEAuth) {
    super(auth);
  }

  public async create(payload: ICreateTransactionPayload) {
    try {
      const { data } = await this.client.post<ITransaction>(
        '/transaction',
        payload,
      );

      return data;
    } catch (e) {
      throw new Error('ERRO AO CRIAR');
    }
  }

  public async findByHash(hash: string) {
    const { data } = await this.client.get<ITransaction>(
      `/transaction/by-hash/${hash}`,
    );

    return data;
  }

  public async findByTransactionID(transactionId: string) {
    const { data } = await this.client.get<ITransaction>(
      `/transaction/${transactionId}`,
    );

    return data;
  }

  public async sign(
    BSAFETransactionId: string,
    account: string,
    signer: string,
    approve?: boolean,
  ) {
    const { data } = await this.client.put(
      `/transaction/signer/${BSAFETransactionId}`,
      {
        account,
        signer,
        confirm: approve ?? true,
      },
    );

    return data;
  }

  public async send(BSAFETransactionId: string) {
    const { data } = await this.client.post(
      `/transaction/send/${BSAFETransactionId}`,
    );

    return data;
  }

  public async verify(BSAFETransactionId: string) {
    const { data } = await this.client.post(
      `/transaction/verify/${BSAFETransactionId}`,
    );

    return data;
  }
}
