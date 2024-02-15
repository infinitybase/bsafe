/* eslint-disable @typescript-eslint/no-unused-vars */
import { EventEmitter } from 'events';
import { io, Socket } from 'socket.io-client';
import axios, { AxiosInstance } from 'axios';
import { JsonAbi, TransactionRequestLike } from 'fuels';
import { Asset } from '@fuel-wallet/types';
import { defaultConfigurable } from '../../configurables';
import { BSAFEConnectorEvents } from './types';
import { DAppWindow } from './DAPPWindow';

const URL = defaultConfigurable['api_url'];

type FuelABI = JsonAbi;
type Network = {
  url: string;
  chainId: number;
};

export class BSafeConnector extends EventEmitter {
  name = 'BSafe';
  metadata = {
    image: {
      ligth: 'https://app.bsafe.pro/assets/logoDark-97c52b43.svg',
      dark: 'https://app.bsafe.pro/assets/logo-294a5e40.svg',
    },
    install: {
      action: 'https://app.bsafe.pro',
      link: 'https://app.bsafe.pro',
      description:
        'BSafe is a connector to app.bsafe.pro, a non-custodial vault for your crypto assets.',
    },
  };
  installed: boolean = true;
  connected: boolean = false;

  private readonly socket: Socket;
  private readonly sessionId: string;
  private readonly api: AxiosInstance = axios.create({
    baseURL: URL,
  });
  private dAppWindow: DAppWindow;

  constructor() {
    super();
    let sessionId: string = localStorage.getItem('sessionId') || '';
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('sessionId', sessionId);
    }

    this.sessionId = sessionId;

    this.socket = io(URL, {
      auth: {
        username: `${'[WALLET]'}`,
        data: new Date(),
        sessionId: this.sessionId,
        origin: window.origin,
      },
    });

    this.dAppWindow = new DAppWindow({
      sessionId,
      name: document.title,
      origin: window.origin,
      popup: {
        top: 0,
        left: 2560,
        width: 450,
        height: 1280,
      },
    });

    this.socket.on(BSAFEConnectorEvents.DEFAULT, (message) => {
      this.emit(message.type, ...message.data);
    });
  }

  async connect() {
    return new Promise((resolve) => {
      const w = this.dAppWindow.open('/');
      w?.addEventListener('close', () => {
        resolve(false);
      });
      this.on(BSAFEConnectorEvents.CONNECTION, (connection) => {
        this.connected = connection;
        resolve(connection);
      });
    });
  }

  /*
   * @param {string} address - The address to sign the transaction
   * @param {Transaction} transaction - The transaction to send
   *
   * @returns {string} - The transaction id
   */
  async sendTransaction(
    _address: string,
    _transaction: TransactionRequestLike,
  ) {
    return new Promise((resolve, reject) => {
      const w = this.dAppWindow.open(`/dapp/transaction`);
      w?.addEventListener('close', () => {
        reject('closed');
      });
      this.on(BSAFEConnectorEvents.POPUP_TRANSFER, () => {
        this.socket.emit(BSAFEConnectorEvents.TRANSACTION_SEND, {
          to: `${this.sessionId}:${window.origin}`,
          content: {
            address: _address,
            transaction: _transaction,
          },
        });
      });
      this.on(BSAFEConnectorEvents.TRANSACTION_CREATED, (content) => {
        resolve(`0x${content}`);
      });
    });
  }

  async ping() {
    return true;
  }

  //todo: make a file on sdk, to return this object
  async version() {
    return {
      app: '0.0.1',
      network: '>=0.12.4',
    };
  }

  async isConnected() {
    const { data } = await this.api.get(
      `${URL}/connections/${this.sessionId}/state`,
    );

    return data;
  }

  async accounts() {
    const { data } = await this.api.get(
      `${URL}/connections/${this.sessionId}/accounts`,
    );
    return data;
  }

  async currentAccount() {
    const { data } = await this.api.get(
      `${URL}/connections/${this.sessionId}/currentAccount`,
    );
    return data;
  }

  async disconnect() {
    this.socket.emit(BSAFEConnectorEvents.AUTH_DISCONECT_DAPP, {
      to: `${this.sessionId}:${window.origin}`,
      content: {
        sessionId: this.sessionId,
      },
    });
    this.emit(BSAFEConnectorEvents.CONNECTION, false);
    this.emit(BSAFEConnectorEvents.ACCOUNTS, []);
    this.emit(BSAFEConnectorEvents.CURRENT_ACCOUNT, null);
    return false;
  }

  async currentNetwork() {
    const { data } = await this.api.get(
      `${URL}/connections/${this.sessionId}/currentNetwork`,
    );
    return data;
  }

  async assets(): Promise<Array<Asset>> {
    return [];
  }

  async signMessage(address: string, message: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  async addAssets(assets: Asset[]): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async addAsset(assets: Asset): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async addNetwork(networkUrl: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async selectNetwork(network: Network): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
  async networks(): Promise<Array<Network>> {
    throw new Error('Method not implemented.');
  }

  async addABI(contractId: string, abi: FuelABI): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async getABI(id: string): Promise<FuelABI | null> {
    throw new Error('Method not implemented.');
  }

  async hasABI(id: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
}
