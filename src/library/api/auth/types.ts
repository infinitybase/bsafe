export interface IAuthService {
  refresh: () => Promise<void>;
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

export interface IBSAFEAuthPayload {
  address: string;
  hash: string;
  createdAt: string;
  provider: string;
  encoder: string;
  user_id: string;
  BSAFEAuth: IBSAFEAuth;
  type: 'pk' | 'account';
  sn: string;
}
