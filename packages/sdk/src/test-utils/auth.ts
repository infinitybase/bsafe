import { AuthService, IBSAFEAuth } from '../library/api/auth';

import { IAccountKeys, IDefaultAccount, accounts } from '../mocks/accounts';
export interface IAuthAccount extends IDefaultAccount {
    BSAFEAuth: IBSAFEAuth;
}
export interface IUserAuth {
    [key: string]: IAuthAccount;
}
export const authService = async (_accounts: IAccountKeys[], provider: string) => {
    const result: { [key: string]: IAuthAccount } = {};
    for await (const acc of _accounts) {
        const account: IDefaultAccount = accounts[acc];
        const auth = new AuthService();
        await auth.createUser(account, provider);
        await auth.createSession();

        result[acc] = {
            ...account,
            BSAFEAuth: auth.BSAFEAuth!
        };
    }

    return result;
};
