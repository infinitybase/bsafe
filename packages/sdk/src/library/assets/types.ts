import { BN } from 'fuels';

export type IAsset = {
    name: string;
    slug: string;
    assetId: string;
};

export type ITransferAsset = {
    assetId: string;
    amount: string;
    to: string;
};

export interface IAssetTransaction extends ITransferAsset {
    utxo: string;
}

export type IAssetGroupById = {
    [name: string]: BN;
};

export type IAssetGroupByTo = {
    [name: string]: {
        assetId: string;
        amount: BN;
        to: string;
    };
};
