import { assets } from '../../mocks';
import { IAsset } from './types';
const assetsList: IAsset[] = [
    {
        name: 'Etherum',
        slug: 'ETH',
        assetId: assets['ETH']
    },
    {
        name: 'Dai',
        slug: 'DAI',
        assetId: assets['DAI']
    },
    {
        name: 'sEther',
        slug: 'sETH',
        assetId: assets['sETH']
    }
];

export { assetsList };
