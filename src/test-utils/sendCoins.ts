import { BN, WalletUnlocked } from 'fuels';

import { assets } from '../mocks';
import { Vault } from '../library';
import { defaultConfigurable } from '../configurables';

export const txParams = {
  gasPrice: defaultConfigurable.gasPrice,
};

export const sendPredicateCoins = async (
  predicate: Vault,
  amount: BN,
  asset: 'ETH' | 'DAI' | 'sETH',
  rootWallet: WalletUnlocked,
) => {
  const { provider } = predicate;
  const { gasPriceFactor, minGasPrice } = provider.getGasConfig();
  const deposit = await rootWallet.transfer(
    predicate.address,
    amount,
    assets[asset],
    {
      gasPrice: minGasPrice,
      gasLimit: gasPriceFactor,
    },
  );
  await deposit.wait();
};
