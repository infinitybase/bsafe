import { Address, InputType, Predicate, Resource, ScriptTransactionRequest, arrayify, hexlify } from 'fuels';
import { transactionScript } from './helpers';
import { IAssetGroupByTo } from '../assets';
import { defaultConfigurable } from '../../configurables';

export class BSAFEScriptTransaction extends ScriptTransactionRequest {
    constructor() {
        super({
            gasPrice: defaultConfigurable.gasPrice,
            gasLimit: defaultConfigurable.gasLimit,
            script: transactionScript
        });
    }

    public async instanceTransaction(_coins: Resource[], vault: Predicate<[]>, outputs: IAssetGroupByTo, witnesses?: string[]) {
        Object.entries(outputs).map(([, value]) => {
            this.addCoinOutput(Address.fromString(value.to), value.amount, value.assetId);
        });

        //todo: invalidate used coins [make using bsafe api assets?]
        this.addResources(_coins);

        this.inputs?.forEach((input) => {
            if (input.type === InputType.Coin && hexlify(input.owner) === vault.address.toB256()) {
                input.predicate = arrayify(vault.bytes);
                input.predicateData = arrayify(vault.predicateData);
            }
        });

        if (witnesses) {
            this.witnesses = [...this.witnesses, ...witnesses];
        }
    }
}
