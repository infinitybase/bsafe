import { Wallet } from 'fuels';
import { accounts } from '../mocks/accounts';
import { LocalProvider } from './provider';

export const rootWallet = Wallet.fromPrivateKey(accounts['FULL'].privateKey, new LocalProvider());
