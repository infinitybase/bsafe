import {
  BigNumberCoder,
  BN,
  bn,
  CoinTransactionRequestInput,
  CoinTransactionRequestOutput,
  concat,
  hexlify,
  sha256,
  TransactionRequest,
  TransactionRequestInput,
  TransactionRequestOutput,
  TransactionType,
} from 'fuels';

export interface BakoSafeTransactionHash {
  type: TransactionType;
  script: Uint8Array;
  scriptData: Uint8Array;
  inputs: TransactionRequestInput[];
  inputsCount: number;
  outputs: TransactionRequestOutput[];
  outputsCount: number;
}

export interface BakoSafeInputCoin
  extends Omit<
    CoinTransactionRequestInput,
    'id' | 'txPointer' | 'witnessIndex' | 'predicateGasUsed'
  > {}

export interface BakoSafeOutputCoin extends CoinTransactionRequestOutput {}

export interface BakoSafeSwayTransactionHash {
  type: TransactionType;
  //predicate:
  // script: Uint8Array;
  // scriptData: Uint8Array;
  inputsCount: number;
  outputsCount: number;

  // //lengths
  // scriptLength: number;
  // scriptDataLength: number;
  // inputs: BakoSafeInputCoin[];
  // outputs: BakoSafeOutputCoin[];
}

export const makePersonHash = (tx: TransactionRequest) => {
  const hash_payload: BakoSafeSwayTransactionHash = {
    type: tx.type,
    // script: this.BakoSafeScript.script,
    // scriptData: this.BakoSafeScript.scriptData,
    inputsCount: tx.inputs.length,
    outputsCount: tx.outputs.length,
    // inputs: this.transactionRequest.inputs.filter(
    //   (item) => item.type === InputType.Coin,
    // ),
    // outputs: this.transactionRequest.outputs.filter(
    //   (item) => item.type === OutputType.Coin,
    // ),
  };

  console.log('[MAKED_HASH]: ', {
    hash_payload,
  });

  const hash = concat([
    new BigNumberCoder('u64').encode(hash_payload.type),
    // hash_payload.script,
    // hash_payload.scriptData,
    new BigNumberCoder('u64').encode(hash_payload.inputsCount),
    new BigNumberCoder('u64').encode(hash_payload.outputsCount),
  ]);

  return sha256(hexlify(hash));
};
