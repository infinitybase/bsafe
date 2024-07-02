import { Provider } from 'fuels';
import { IPayloadVault, Vault } from '../../src/modules';
import { rootWallet } from './rootWallet';
import { sendPredicateCoins } from './sendCoins';
import { IBakoSafeAuth } from '../../src/api';
import { DEFAULT_BALANCE_VALUE, VALUES_DEFAULT_TO_MUL } from '../mocks/assets';

export const newVault = async (
  signers: string[],
  fuelProvider: Provider,
  auth?: IBakoSafeAuth,
  reason?: keyof typeof VALUES_DEFAULT_TO_MUL,
  signersCount?: number,
  assetIds?: string[],
) => {
  const VaultPayload: IPayloadVault = {
    configurable: {
      SIGNATURES_COUNT: signersCount ?? signers.length,
      SIGNERS: signers,
      network: fuelProvider.url,
    },
    BakoSafeAuth: auth,
  };

  const vault = await Vault.create(VaultPayload);
  const new_balance = DEFAULT_BALANCE_VALUE.mul(
    VALUES_DEFAULT_TO_MUL[reason ?? 1],
  );

  // if (assetIds) {
  // @ts-ignore
  if (!assetIds || assetIds?.length === 0) return vault;

  for await (const assetId of assetIds) {
    await sendPredicateCoins(vault!, new_balance, assetId, rootWallet);
  }
  // }
  //  else {
  //   const baseAssetId = vault.provider.getBaseAssetId();
  //   await sendPredicateCoins(vault!, new_balance, baseAssetId, rootWallet);
  // }

  return vault;
};
