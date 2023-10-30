import axios, { AxiosInstance } from 'axios';
import { Wallet } from 'fuels';
import { IAuthService, IBSAFEAuth } from './types';
import { IDefaultAccount } from '../../../mocks/accounts';
import { v4 as uuidv4 } from 'uuid';
import { defaultConfigurable } from '../../../configurables';
import { LocalProvider } from '../../../test-utils';

// woking to local node just fine
export class AuthService implements IAuthService {
    private client: AxiosInstance;
    private user?: IDefaultAccount;
    private auth?: {
        id: string;
        address: string;
        provider: string;
        token?: string;
    };
    public BSAFEAuth?: IBSAFEAuth;

    constructor() {
        this.client = axios.create({
            baseURL: defaultConfigurable.api_url
        });
    }

    async createUser(user: IDefaultAccount, provider: string) {
        this.user = user;

        const { data } = await this.client.post('/user', {
            address: user.address,
            provider
        });
        this.auth = {
            address: user.address,
            id: data.id,
            provider
        };

        return;
    }

    async createSession() {
        if (!this.auth) return;
        const { address, provider, id } = this.auth;
        const message = {
            address,
            hash: uuidv4(),
            createdAt: new Date().toISOString(),
            provider,
            encoder: defaultConfigurable.encoder,
            user_id: id
        };

        const tx = await this.signer(JSON.stringify(message));

        const { data } = await this.client.post('/auth/sign-in', {
            ...message,
            signature: tx
        });

        this.auth.token = data.token;
        this.BSAFEAuth = {
            address,
            token: data.accessToken
        };
    }

    private async signer(message: string) {
        if (!this.user || !this.auth || !this.user.privateKey) return;

        const signer = Wallet.fromPrivateKey(this.user.privateKey, new LocalProvider());
        return await signer.signMessage(message);
    }
}
