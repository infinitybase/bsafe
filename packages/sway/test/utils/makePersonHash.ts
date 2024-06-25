import {
  Address,
  BigNumberCoder,
  BN,
  bn,
  CoinTransactionRequestInput,
  CoinTransactionRequestOutput,
  concat,
  hexlify,
  InputType,
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
    | 'id'
    | 'txPointer'
    | 'witnessIndex'
    | 'predicateGasUsed'
    | 'predicate'
    | 'predicateData'
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
  inputs: BakoSafeInputCoin[];

  // outputs: BakoSafeOutputCoin[];
}

export const makePersonHash = (tx: TransactionRequest) => {
  const hash_payload: BakoSafeSwayTransactionHash = {
    type: tx.type,
    //script: .script,
    // scriptData: this.BakoSafeScript.scriptData,
    inputsCount: tx.inputs.length,
    outputsCount: tx.outputs.length,
    inputs: tx.inputs
      .filter((item) => item.type === InputType.Coin)
      .map((item) => {
        return {
          type: item.type,
          amount: item.amount,
          assetId: Address.fromString(item.assetId as string).toB256(),
          owner: item.owner,
        };
      }),
    // outputs: this.transactionRequest.outputs.filter(
    //   (item) => item.type === OutputType.Coin,
    // ),
  };

  // let inputs_hash = new Uint8Array(0);

  let inputs_hash = new Uint8Array(0);
  hash_payload.inputs.forEach((input) => {
    if (input.type === InputType.Coin) {
      inputs_hash = concat([
        inputs_hash,
        new BigNumberCoder('u64').encode(input.type),
        new BigNumberCoder('u64').encode(input.amount),
        Address.fromString(input.assetId as string).toBytes(),
        Address.fromString(input.owner as string).toBytes(),
        // new BigNumberCoder('u64').encode(input.owner),
      ]);
    }
  });

  console.log('[MAKED_HASH]: ', {
    hash_payload,
    inputs: hash_payload.inputs,
    inputs_hash,
    inputs_hash_sha: sha256(hexlify(inputs_hash)),
    // diff: {
    //   sha: sha256(hexlify(inputs_hash)),
    //   // normal: sha256(hexlify(concat([new BigNumberCoder('u64').encode(0)]))),
    // },
    // assetId: Address.fromString(
    //   hash_payload.inputs[0].assetId as string,
    // ).toBytes(),
  });

  const hash = concat([
    new BigNumberCoder('u64').encode(hash_payload.type), //number
    // hash_payload.script,
    // hash_payload.scriptData,
    new BigNumberCoder('u64').encode(hash_payload.inputsCount), //number
    new BigNumberCoder('u64').encode(hash_payload.outputsCount), //number
  ]);

  return sha256(hexlify(hash));
};
