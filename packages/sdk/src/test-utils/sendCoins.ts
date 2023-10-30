import { BN, WalletUnlocked } from 'fuels';

import { assets } from '../mocks';
import { Vault } from '../library';
import { defaultConfigurable } from '../configurables';

export const txParams = {
    gasPrice: defaultConfigurable.gasPrice
};

export const sendPredicateCoins = async (predicate: Vault, amount: BN, asset: 'ETH' | 'DAI' | 'sETH', rootWallet: WalletUnlocked) => {
    const deposit = await rootWallet.transfer(predicate.address, amount, assets[asset], txParams);
    await deposit.wait();
};
