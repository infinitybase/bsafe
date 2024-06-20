import { BakoSafe } from '../../configurables';
import { Auth, IAuthCreateRequest, TypeUser } from '../../src/modules/auth';
import { accounts, networks } from '../mocks';
import { AuthTestUtil } from '../utils';

describe('[AUTH]', () => {
  beforeAll(() => {
    // set up BakoSafe
    BakoSafe.setProviders({
      CHAIN_URL: networks['LOCAL'],
      SERVER_URL: 'http://localhost:3333',
      CLIENT_URL: 'http://localhost:5174',
    });
  });

  test('Authenticate', async () => {
    const params: IAuthCreateRequest = {
      address: accounts['USER_1'].address,
      provider: BakoSafe.getProviders('CHAIN_URL'),
      type: TypeUser.FUEL,
    };

    const auth = await Auth.create(params);
    const signature = await AuthTestUtil.signerByPk(
      accounts['USER_1'].privateKey,
      auth.code,
    );

    const { token: sig } = await auth.sign(signature);

    expect(sig).toBe(auth.BakoSafeAuth?.token);

    expect(auth.BakoSafeAuth?.address).toBe(accounts['USER_1'].address);
  });

  test('Select workspace', async () => {
    const params: IAuthCreateRequest = {
      address: accounts['USER_1'].address,
      provider: BakoSafe.getProviders('CHAIN_URL'),
      type: TypeUser.FUEL,
    };

    const auth = await Auth.create(params);
    const signature = await AuthTestUtil.signerByPk(
      accounts['USER_1'].privateKey,
      auth.code,
    );

    await auth.sign(signature);

    const workspaces = await auth.getWorkspaces();
    const workspace = workspaces[0];

    await auth.selectWorkspace(workspace.id);

    expect(auth.workspace?.id).toBe(auth.BakoSafeAuth?.workspace);
  });

  test('Sign by PK', async () => {
    const params: IAuthCreateRequest = {
      address: accounts['USER_1'].address,
      provider: BakoSafe.getProviders('CHAIN_URL'),
      type: TypeUser.FUEL,
    };

    const auth = await Auth.create(params);
    const signature = await Auth.signerByPk(
      accounts['USER_1'].privateKey,
      auth.code,
    );

    const { token: sig } = await auth.sign(signature);

    expect(auth.BakoSafeAuth?.address).toBe(accounts['USER_1'].address);
    expect(sig).toBe(auth.BakoSafeAuth?.token);
  });
});
