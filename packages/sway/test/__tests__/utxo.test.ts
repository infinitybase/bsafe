/**
 *  [OBJECTIVE]:
 *      
 *      - Make a transaction
 *      - Send transaction with predicate
 *      - Validate transaction with predicate using other information, not tx_id()
 * 
 * 
 *  [REFERENCE]:
 *      - [TX_SPEC]: https://docs.fuel.network/docs/specs/tx-format/
 *      - [TX_SCRIPT_LOGS]: https://github.com/FuelLabs/fuels-ts/blob/e52dcbb8ba7715e7cf649fb068f7c2ff24b3ab88/packages/transactions/src/coders/receipt.ts#L10-L24
 * 
 *  [PROCESS]:
 *      - any transactions used in the ecosistem must be created using the `ScriptTransactionRequest` class
 *      - the class has a method `toTransaction` that returns a `TransactionScript` object
 *      - this object contains the transaction data with type [https://docs.fuel.network/docs/specs/tx-format/transaction/#transactionscript] 
 *      - all transactions has a `type` field with value `TransactionType.Script` on BAKO ecosystem
 *      - select many fields from the `TransactionScript` object to validate the transaction
 *          export type TransactionScriptValidations = {
                    type: TransactionType.Script; // any moments on 0 value, the transaction is a script
                    scriptGasLimit: BN;
                    policyTypes: number; // has a one policy, type this type is represents the policy[0]
                    inputsCount: number;
                    outputsCount: number;
                    script: string; // the script to execute
                    scriptData: string; // the script input data (parameters)
                    inputs: Input[];
                    policies: Policy[]; // the policy is array, but if the policy is only one, the array has only one element
                    outputs: Output[];
                };
 * 
 * 
 * 
 * 
 */
import {
  AbstractAddress,
  Address,
  BN,
  BaseAssetId,
  InputType,
  InputValue,
  OutputType,
  Predicate,
  Provider,
  ScriptTransactionRequest,
  TransactionRequest,
  TransactionRequestInput,
  TransactionRequestOutput,
  TransactionResponse,
  Wallet,
  WalletUnlocked,
  ZeroBytes32,
  arrayify,
  bn,
  hexlify,
  toBytes,
} from 'fuels';

import { PredicateAbi__factory } from '../../../sdk/src/predicates';
import { ScriptAbi__factory } from '../../../sdk/src/scripts';

export type IPolicy = {
  gas_price: BN;
  gas_limit: BN;
  max_fee: BN;
};

export type coin = {
  owner: string;
  amount: BN;
  asset_id: string;
};

export type fee = {
  to: string;
  asset_id: string;
};

export type contract = {
  contractId?: string;
};

export type IInput = {
  input_type: InputType;
  data: coin | contract;
};

export type IOutput = {
  output_type: number;
  data: coin | contract | fee;
};

export type TransactionResumedData = {
  tx_type: number;
  // policy_size: number;
  // inputs_size: number;
  // outputs_size: number;
  policy: IPolicy;
  inputs: IInput[];
  outputs: IOutput[];
};

const { PROVIDER, PRIVATE_KEY, GAS_LIMIT, GAS_PRICE } = process.env;
const random_address = Address.fromRandom().toB256();
async function seedAccount(
  address: AbstractAddress,
  amount: BN,
  provider: Provider,
) {
  const genisesWallet = Wallet.fromPrivateKey(PRIVATE_KEY!, provider);
  const resp = await genisesWallet.transfer(address, amount, BaseAssetId, {
    gasLimit: Number(GAS_LIMIT),
    gasPrice: Number(GAS_PRICE),
  });
  await resp.waitForResult();
}

async function sendTransaction(
  provider: Provider,
  tx: TransactionRequest,
  signatures: Array<string>,
) {
  tx.witnesses = signatures;
  await provider.estimatePredicates(tx);
  const encodedTransaction = hexlify(tx.toTransactionBytes());
  const {
    submit: { id: transactionId },
  } = await provider.operations.submit({ encodedTransaction });

  const response = new TransactionResponse(transactionId, provider);
  return response;
}

async function signTransaction(
  wallet: WalletUnlocked,
  tx: TransactionRequest,
  provider: Provider,
) {
  const txHash = tx.getTransactionId(provider.getChainId());
  const hash = txHash.slice(2).toLowerCase();
  const signature = await wallet.signMessage(hash);

  console.log('[SIG]', {
    hash,
    signature,
  });

  return signature;
}

async function createTransaction(predicate: Predicate<InputValue[]>) {
  const tx = new ScriptTransactionRequest();
  tx.gasPrice = bn(GAS_LIMIT);
  tx.gasLimit = bn(GAS_LIMIT);
  const coins = await predicate.getResourcesToSpend([
    {
      amount: bn(100),
      assetId: BaseAssetId,
    },
  ]);
  tx.addResources(coins);

  // Add predicate data to the input
  tx.inputs?.forEach((input) => {
    if (
      input.type === InputType.Coin &&
      hexlify(input.owner) === predicate.address.toB256()
    ) {
      // eslint-disable-next-line no-param-reassign
      input.predicate = arrayify(predicate.bytes);
      // eslint-disable-next-line no-param-reassign
      input.predicateData = arrayify(predicate.predicateData);
    }
  });

  tx.script = arrayify(ScriptAbi__factory.bin);
  tx.scriptData = toBytes(random_address);
  return tx;
}

const mountInputs = (inputs: TransactionRequestInput[]) => {
  return inputs.map((input) => {
    if (input.type === InputType.Coin) {
      return {
        input_type: input.type,
        data: {
          owner: hexlify(input.owner),
          amount: bn(input.amount),
          asset_id: hexlify(input.assetId),
        },
      };
    } else if (input.type === InputType.Contract) {
      return {
        input_type: input.type,
        data: {
          contractId: hexlify(input.contractId),
        },
      };
    } else throw new Error('Invalid input type');
  });
};

const mountOutputs = (outputs: TransactionRequestOutput[]) => {
  return outputs.map((output) => {
    console.log('[OUTPUT]', output.type);
    if (output.type === OutputType.Coin) {
      return {
        output_type: output.type,
        data: {
          to: hexlify(output.to),
          amount: bn(output.amount),
          asset_id: hexlify(output.assetId),
        },
      };
    } else if (output.type === OutputType.Contract) {
      return {
        output_type: output.type,
        data: {
          contractId: undefined,
        },
      };
    } else if (output.type === OutputType.Change) {
      return {
        output_type: output.type,
        data: {
          to: hexlify(output.to),
          asset_id: hexlify(output.assetId),
        },
      };
    } else throw new Error('Invalid output type');
  });
};

const formatttx = (tx: ScriptTransactionRequest) => {
  const result: TransactionResumedData = {
    tx_type: tx.type,
    policy: {
      gas_price: tx.gasPrice,
      gas_limit: tx.gasLimit,
      max_fee: tx.gasPrice.mul(tx.gasLimit),
    },
    inputs: mountInputs(tx.inputs || []),
    outputs: mountOutputs(tx.outputs || []),
  };

  console.log('[TX_RESUMED]', result);
};

describe('[SWAY_PREDICATE]', () => {
  let provider: Provider;

  beforeAll(async () => {
    provider = await Provider.create(PROVIDER!);
  });

  test('Send transfer by predicate', async () => {
    const wallet = Wallet.generate({
      provider,
    });
    const predicate = PredicateAbi__factory.createInstance(provider, {
      SIGNATURES_COUNT: 1,
      SIGNERS: [
        wallet.address.toB256(),
        ZeroBytes32,
        ZeroBytes32,
        ZeroBytes32,
        ZeroBytes32,
        ZeroBytes32,
        ZeroBytes32,
        ZeroBytes32,
        ZeroBytes32,
        ZeroBytes32,
      ],
      HASH_PREDICATE: Address.fromRandom().toB256(),
    });
    await seedAccount(predicate.address, bn.parseUnits('0.1'), provider);

    const tx = await createTransaction(predicate);
    console.log('[TX_PRE_SEND]', JSON.stringify(tx));
    const tx_id_formatted = formatttx(tx);

    const response = await sendTransaction(provider, tx, [
      await signTransaction(wallet, tx, provider),
    ]);

    const result = await response.waitForResult();
    //console.log(result.status);
    //console.log(result.receipts);
    //console.log(result.id);

    expect(result.status).toBe('success');
  });
});
