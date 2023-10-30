import { BN, Coin, Resource, bn } from 'fuels';
import { assets } from '../../mocks';
import { IAssetGroupById, IAssetGroupByTo, IAssetTransaction, ITransferAsset } from './types';

export class Asset {
    /**
     *  Asset: provides utils to organize assets
     */

    public static async assetsGroupById(list: ITransferAsset[]) {
        /**
         * Groupe assest by id
         *
         * @param ITransferAsset[] - An array of assets to transfer.
         * @returns An object with n unique keys, each key being an asset and the value of each key is equivalent to the sum of the equivalent assets received.
         */
        return list.reduce((acc: IAssetGroupById, asset: ITransferAsset) => {
            const { assetId, amount }: { assetId: string; amount: string } = asset;

            if (!acc[assetId]) {
                acc[assetId] = bn.parseUnits(amount);
            } else {
                acc[assetId] = acc[assetId].add(bn.parseUnits(amount));
            }

            return acc;
        }, {});
    }
    public static async assetsGroupByTo(list: ITransferAsset[]) {
        /**
         * Group assets by transaction destination
         *
         * @param ITransferAsset[] - An array of assets to transfer.
         * @returns An object with n unique keys, each key being a destination address and the value of each key is equivalent to the sum of the equivalent assets received.
         */

        return list.reduce((acc: IAssetGroupByTo, asset: ITransferAsset) => {
            const { to, amount, assetId }: ITransferAsset = asset;
            const key = `${to}${assetId}`;
            if (!acc[key]) {
                acc[key] = {
                    assetId,
                    amount: bn.parseUnits(amount),
                    to
                };
            } else {
                acc[key].amount.add(bn.parseUnits(amount));
            }
            return acc;
        }, {}) as IAssetGroupByTo;
    }

    public static async addTransactionFee(_assets: IAssetGroupById, _fee: BN) {
        /**
         * Checks if there is an eth asset in the transaction to pay for the gas and inserts a minimum amount
         *
         * @param _fee - value in BN to add on amount of eth of transaction
         * @param assets - group of assets to sended of transaction
         * @returns An object with n unique keys, each key being a destination address and the value of each key is equivalent to the sum of the equivalent assets received.
         */

        let _assets_aux = _assets;
        let containETH = !!_assets_aux[assets['ETH']];

        if (containETH) {
            let value = bn(_fee).add(_assets_aux[assets['ETH']]);
            _assets_aux[assets['ETH']] = value;
        } else {
            _assets_aux[assets['ETH']] = bn().add(_fee);
        }

        return Object.entries(_assets_aux).map(([key, value]) => {
            return {
                amount: value,
                assetId: key
            };
        });
    }

    public static includeSpecificAmount(predicateCoins: Resource[], assets: ITransferAsset[]): IAssetTransaction[] {
        return assets.map((asset: ITransferAsset) => {
            const predicateCoin: Coin = predicateCoins.find((coin: Resource) => coin) as Coin;
            if (predicateCoin) {
                return {
                    ...asset,
                    utxo: predicateCoin.id
                };
            } else {
                return {
                    ...asset,
                    onPredicate: '',
                    utxo: ''
                };
            }
        });
    }
}
