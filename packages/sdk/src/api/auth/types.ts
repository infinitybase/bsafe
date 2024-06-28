export enum TypeUser {
  FUEL = 'FUEL',
  WEB_AUTHN = 'WEB_AUTHN',
}

export enum AuthRequestHeaders {
  AUTHORIZATION = 'Authorization',
  SIGNER_ADDRESS = 'Signeraddress',
}

export interface Workspace {
  id: string;
  name: string;
  avatar: string;
}

export interface IBakoSafeAuth {
  address: string;
  token: string;
  workspace?: string;
}

export interface IAuthCreateRequest {
  address: string;
  provider: string;
  type: TypeUser;
}

export interface IAuthCreateResponse {
  code: string;
  validAt: string;
  origin: string;
}

export interface IAuthSignRequest {
  digest: string;
  encoder: TypeUser;
  signature: string;
}

export interface IAuthSignResponse {
  accessToken: string;
  address: string;
  avatar: string;
  user_id: string;
  workspace: Workspace;
}

export interface ISelectWorkspaceResponse extends Workspace {}

export interface IAuthService {
  auth: (params: IAuthCreateRequest) => Promise<IAuthCreateResponse>;
  sign: (params: IAuthSignRequest) => Promise<IAuthSignResponse>;
  setAuth: (auth: IBakoSafeAuth) => void;
  selectWorkspace: (workspaceId: string) => Promise<ISelectWorkspaceResponse>;
  getWorkspaces: () => Promise<ISelectWorkspaceResponse[]>;
}
