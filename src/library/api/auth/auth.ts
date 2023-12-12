import axios, { AxiosInstance } from 'axios';
import { Provider, Wallet } from 'fuels';
import { IAuthService, IBSAFEAuth, IBSAFEAuthPayload } from './types';
import { defaultConfigurable } from '../../../configurables';
import {
  FuelWalletLocked,
  FuelWalletConnector,
  FuelWalletProvider,
} from '@fuel-wallet/sdk';
import { v4 as uuidv4 } from 'uuid';
import { ITransaction } from '../transactions';

// woking to local node just fine
export class AuthService implements IAuthService {
  private client: AxiosInstance;
  private payloadSession: IBSAFEAuthPayload;
  private type: 'pk' | 'account';
  private sn: string;
  public BSAFEAuth: IBSAFEAuth;

  protected constructor(payload: IBSAFEAuthPayload) {
    this.BSAFEAuth = payload.BSAFEAuth;
    this.client = axios.create({
      baseURL: defaultConfigurable.api_url,
      headers: {
        Authorization: this.BSAFEAuth.token,
        Signeraddress: this.BSAFEAuth.address,
      },
    });
    this.payloadSession = payload;
    this.type = payload.type;
    this.sn = payload.sn;
  }
  /**
   * Sign transaction using BSAFEApi
   *
   * @param BSAFETransactionId
   * @param approve
   *
   * @returns a boolean to true if the transaction was signed or false if not
   */
  async signTransaction(BSAFETransactionId: string, approve?: boolean) {
    const { data } = await this.client.get<ITransaction>(
      `/transaction/${BSAFETransactionId}`,
    );
    const wallet =
      this.type === 'pk'
        ? Wallet.fromPrivateKey(
            this.sn,
            await Provider.create(defaultConfigurable['provider']),
          )
        : new FuelWalletLocked(
            this.sn,
            new FuelWalletConnector(),
            await FuelWalletProvider.create(defaultConfigurable['provider']),
          );

    const msg = await wallet.signMessage(data.hash);

    await this.client
      .put(`/transaction/signer/${BSAFETransactionId}`, {
        account: wallet.address.toString(),
        signer: msg,
        confirm: approve ?? true,
      })
      .then(() => true)
      .catch(() => false);
  }

  /**
   * Refresh your session signed by pk or account a new token
   *
   * @returns a void
   */
  async refresh() {
    this.payloadSession = {
      ...this.payloadSession,
      hash: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    let token: string;
    if (this.type === 'pk') {
      token = await AuthService.signerByPk(
        this.sn,
        JSON.stringify(this.payloadSession),
      );
    } else {
      token = await AuthService.signerByAccount(
        this.sn,
        JSON.stringify(this.payloadSession),
      );
    }

    const { data: _session } = await axios.post('/auth/sign-in', {
      ...this.payloadSession,
      signature: token,
    });

    this.BSAFEAuth = {
      ...this.BSAFEAuth,
      token: _session.accessToken,
    };

    this.client = axios.create({
      baseURL: defaultConfigurable.api_url,
      headers: {
        Authorization: _session.accessToken,
        Signeraddress: _session.address,
      },
    });

    return;
  }

  /**
   * Format a ner session payload
   *
   * @returns a void
   */
  private static makePayloadSession(
    user: string,
    provider: string,
    user_id: string,
  ) {
    return {
      address: user,
      hash: uuidv4(),
      createdAt: new Date().toISOString(),
      provider,
      encoder: 'fuel',
      user_id: user_id,
    };
  }

  /**
   * Create a new session on BSAFEApi using a factory method
   *
   * @param user - The user address
   * @param provider - The provider url
   * @param pk - The private key
   *
   * @returns a new instance of AuthService
   */
  static async createByPk(user: string, provider: string, pk: string) {
    try {
      const _axios = axios.create({
        baseURL: defaultConfigurable.api_url,
      });
      const { data: _user } = await _axios.post('/user', {
        address: user,
        provider,
      });

      const payload = AuthService.makePayloadSession(user, provider, _user.id);

      const { data: _session } = await _axios.post('/auth/sign-in', {
        ...payload,
        signature: await AuthService.signerByPk(pk, JSON.stringify(payload)),
      });

      const result: IBSAFEAuth = {
        address: user,
        token: _session.accessToken,
      };

      return new AuthService({
        address: user,
        hash: uuidv4(),
        createdAt: new Date().toISOString(),
        provider,
        encoder: 'fuel',
        user_id: _user.id,
        BSAFEAuth: result,
        type: 'pk',
        sn: pk,
      });
    } catch (e) {
      //console.log(e);
      console.log(defaultConfigurable.api_url);
    }
  }

  /**
   * Create a new session on BSAFEApi using a factory method
   *
   * @param user - The user address
   * @param provider - The provider url
   * @param account - Address of the account
   *
   * @returns a new instance of AuthService
   */
  static async createByAccount(
    user: string,
    provider: string,
    account: string,
  ) {
    const _axios = axios.create({
      baseURL: defaultConfigurable.api_url,
    });
    const { data: _user } = await _axios.post('/user', {
      address: user,
      provider,
    });
    const payload = AuthService.makePayloadSession(user, provider, _user.id);

    const { data: _session } = await _axios.post('/auth/sign-in', {
      ...payload,
      signature: await AuthService.signerByAccount(
        account,
        JSON.stringify(payload),
      ),
    });

    const result: IBSAFEAuth = {
      address: user,
      token: _session.accessToken,
    };

    return new AuthService({
      address: user,
      hash: uuidv4(),
      createdAt: new Date().toISOString(),
      provider,
      encoder: 'fuel',
      user_id: _user.id,
      BSAFEAuth: result,
      type: 'account',
      sn: account,
    });
  }

  /**
   * Sign a message using a private key
   *
   * @param message - The message to sign
   * @param pk - The private key
   *
   * @returns a signed message
   */
  static async signerByPk(pk: string, message: string) {
    const signer = Wallet.fromPrivateKey(
      pk,
      await Provider.create(defaultConfigurable['provider']),
    );
    return await signer.signMessage(message);
  }

  /**
   * Sign a message using a private key
   *
   * @param message - The message to sign
   * @param wallet - The private key
   *
   * @returns a signed message
   */
  static async signerByAccount(wallet: string, message: string) {
    const _wallet = new FuelWalletLocked(
      wallet,
      new FuelWalletConnector(),
      await FuelWalletProvider.create(defaultConfigurable['provider']),
    );
    return await _wallet.signMessage(message);
  }
}
