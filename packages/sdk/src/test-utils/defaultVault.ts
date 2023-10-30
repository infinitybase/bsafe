import { Provider, bn } from 'fuels';
import { IBSAFEAuth, IPayloadVault, Vault } from '../library';
import { rootWallet } from './rootWallet';
import { sendPredicateCoins } from './sendCoins';

export const newVault = async (signers: string[], fuelProvider: Provider, auth?: IBSAFEAuth) => {
    const VaultPayload: IPayloadVault = {
        configurable: {
            SIGNATURES_COUNT: 3,
            SIGNERS: signers,
            network: fuelProvider.url,
            chainId: await fuelProvider.getChainId()
        },
        provider: fuelProvider,
        BSAFEAuth: auth
    };
    const vault = await Vault.create(VaultPayload);

    await sendPredicateCoins(vault, bn(1_000_000_000), 'sETH', rootWallet);
    await sendPredicateCoins(vault, bn(1_000_000_000), 'ETH', rootWallet);

    return vault;
};
