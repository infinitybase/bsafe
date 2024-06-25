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
  OutputType,
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
  inputs: TransactionRequestInput[];

  outputs: TransactionRequestOutput[];
}

export const makePersonHash = (tx: TransactionRequest) => {
  console.log('[TX]: ', tx.outputs);
  const hash_payload: BakoSafeSwayTransactionHash = {
    type: tx.type,
    //script: .script,
    // scriptData: this.BakoSafeScript.scriptData,
    inputsCount: tx.inputs.length,
    outputsCount: tx.outputs.length,
    inputs: tx.inputs,
    outputs: tx.outputs,
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
      ]);
    }
    if (input.type === InputType.Contract) {
      inputs_hash = concat([
        inputs_hash,
        new BigNumberCoder('u64').encode(input.type),
        // Address.fromString(input.contractId as string).toBytes(), nao incluido no sway
      ]);
    }
    if (input.type === InputType.Message) {
      inputs_hash = concat([
        inputs_hash,
        new BigNumberCoder('u64').encode(input.type),
        Address.fromString(input.sender as string).toBytes(),
        Address.fromString(input.recipient as string).toBytes(),
        new BigNumberCoder('u64').encode(input.amount),
        // Address.fromString(input.nonce as string).toBytes(), // nao incluido no sway
      ]);
    }
  });

  let outputs_hash = new Uint8Array(0);
  hash_payload.outputs.forEach((output) => {
    if (output.type === OutputType.Coin) {
      outputs_hash = concat([
        outputs_hash,
        new BigNumberCoder('u64').encode(output.type),
        new BigNumberCoder('u64').encode(output.amount),
        Address.fromString(output.assetId as string).toBytes(),
        Address.fromString(output.to as string).toBytes(),
      ]);
    }
    if (output.type === OutputType.Contract) {
      outputs_hash = concat([
        outputs_hash,
        new BigNumberCoder('u64').encode(output.type),
        // new BigNumberCoder('u64').encode(output.inputIndex), nao é possivel recuperar pelo sway
      ]);
    }
    if (output.type === OutputType.Change) {
      outputs_hash = concat([
        outputs_hash,
        new BigNumberCoder('u64').encode(output.type),
        // Address.fromString(output.assetId as string).toBytes(), não é possivel recuperar pelo sway
        // Address.fromString(output.to as string).toBytes(), não é possivel recuperar pelo sway
      ]);
    }
  });

  //concat order
  //  type: TransactionType;
  //  inputsCount: number;
  //  outputsCount: number;
  //  inputs: TransactionRequestInput[];
  //  outputs: TransactionRequestOutput[];
  //  witnessSalt: Address.fromRandom().toBytes();

  const hash = concat([
    new BigNumberCoder('u64').encode(hash_payload.type), //number
    // hash_payload.script,
    // hash_payload.scriptData,
    new BigNumberCoder('u64').encode(hash_payload.inputsCount), //number
    new BigNumberCoder('u64').encode(hash_payload.outputsCount), //number
    inputs_hash,
    outputs_hash,
    // hash_payload.witnessSalt,
  ]);

  console.log('[MAKED_HASH]: ', {
    hash_payload,
    inputs_hash_sha: sha256(hexlify(inputs_hash)),
    outputs_hash_sha: sha256(hexlify(outputs_hash)),
    hash: sha256(hexlify(hash)),
  });

  return sha256(hexlify(hash));
};
