import { Wallet, Address } from 'fuels';
import { IBSAFEAuth, TransactionService } from '../library';
import { accounts } from '../mocks';
import { LocalProvider } from './provider';

export const signin = async (tx_hash: string, account: 'FULL' | 'USER_1' | 'USER_2' | 'USER_3' | 'USER_4' | 'USER_5', auth?: IBSAFEAuth, BSAFETransactionId?: string) => {
    const fuelProvider = new LocalProvider();

    const signer = Wallet.fromPrivateKey(accounts[account].privateKey, fuelProvider);
    const tx = await signer.signMessage(tx_hash);
    if (!!auth && BSAFETransactionId) {
        const acc = Address.fromString(accounts[account].address).toHexString();
        const serviceTransactions = new TransactionService(auth);
        return await serviceTransactions.sign(BSAFETransactionId, acc, tx);
    }
    return tx;
};
