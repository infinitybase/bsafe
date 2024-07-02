import {
  Address,
  InputType,
  Predicate,
  Resource,
  ScriptTransactionRequest,
  arrayify,
  hexlify,
  BN,
  BytesLike,
  bn,
} from 'fuels';
import { IAssetGroupByTo } from '../../utils/assets';
import { BakoSafe } from '../../../configurables';
import { transactionScript } from './helpers';

interface BakoSafeScriptTransactionConstructor {
  gasLimit: BN;
  maxFee: BN;
  script: BytesLike;
}

export class BakoSafeScriptTransaction extends ScriptTransactionRequest {
  constructor(
    { script, gasLimit, maxFee }: BakoSafeScriptTransactionConstructor = {
      script: transactionScript,
      gasLimit: bn(BakoSafe.getGasConfig('GAS_LIMIT')),
      maxFee: bn(BakoSafe.getGasConfig('MAX_FEE')),
    },
  ) {
    super({
      gasLimit,
      script,
      maxFee,
    });
  }

  public async instanceTransaction(
    _coins: Resource[],
    vault: Predicate<[]>,
    outputs: IAssetGroupByTo,
    witnesses?: string[],
  ) {
    Object.entries(outputs).map(([, value]) => {
      this.addCoinOutput(
        Address.fromString(value.to),
        value.amount,
        value.assetId,
      );
    });
    console.log('outputs', outputs);

    //todo: invalidate used coins [make using BakoSafe api assets?] UTXO PROBLEM
    this.addResources(_coins);

    this.inputs?.forEach((input) => {
      if (
        input.type === InputType.Coin &&
        hexlify(input.owner) === vault.address.toB256()
      ) {
        input.predicate = arrayify(vault.bytes);
      }
    });

    if (witnesses) {
      this.witnesses = [...this.witnesses, ...witnesses];
    }
  }
}
