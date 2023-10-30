import { IDefaultAccount } from '../../../mocks/accounts';

export interface IAuthService {
    createUser: (user: IDefaultAccount, provider: string) => Promise<void>;
    createSession: () => Promise<void>;
}

export interface IApiConfig {
    apiUrl: string;
    authToken?: string;
    account?: string;
}

export interface IBSAFEAuth {
    address: string;
    token: string;
}
