import { AuthService } from '../../api/auth';

import {
  IAuthCreateRequest,
  IAuthService,
  IBakoSafeAuth,
  TypeUser,
  ISelectWorkspaceResponse,
  Workspace,
} from './types';

export class Auth {
  public BakoSafeAuth?: IBakoSafeAuth;
  client: IAuthService;
  code: string;
  address: string;
  type: TypeUser;
  workspace?: Workspace;

  protected constructor(address: string, code: string, type: TypeUser) {
    this.code = code;
    this.client = new AuthService();
    this.address = address;
    this.type = type;
  }

  static async create({
    address,
    provider,
    type = TypeUser.FUEL,
  }: IAuthCreateRequest) {
    const client = new AuthService();
    const { code } = await client.auth({ address, provider, type });
    return new Auth(address, code, type);
  }

  async sign(signature: string) {
    const { accessToken, workspace } = await this.client.sign({
      digest: this.code,
      encoder: this.type,
      signature,
    });

    this.BakoSafeAuth = {
      address: this.address,
      token: accessToken,
      worksapce: workspace.id,
    };

    this.client.setAuth(this.BakoSafeAuth);

    return this.BakoSafeAuth;
  }

  async selectWorkspace(
    workspaceId: string,
  ): Promise<ISelectWorkspaceResponse> {
    const workspace = await this.client.selectWorkspace(workspaceId);

    this.workspace = workspace;

    if (this.BakoSafeAuth) this.BakoSafeAuth.worksapce = workspace.id;
    return workspace;
  }

  async getWorkspaces() {
    return this.client.getWorkspaces();
  }
}
