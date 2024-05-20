import {
  AbstractAddress,
  Address,
  BN,
  BaseAssetId,
  InputType,
  InputValue,
  Predicate,
  Provider,
  ScriptTransactionRequest,
  TransactionRequest,
  TransactionResponse,
  Wallet,
  WalletUnlocked,
  ZeroBytes32,
  arrayify,
  bn,
  hexlify,
} from 'fuels';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

import { PredicateAbi__factory } from '../../../sdk/src/sway/predicates';
import { MyCounterProjectAbi__factory } from '../../../sdk/src/sway/contracts/factories/MyCounterProjectAbi__factory';
import { ScriptAbi__factory } from '../../../sdk/src/sway/scripts/';
import { BakoSafe } from '../../../sdk/configurables';

import { PRIVATE_KEY, GAS_LIMIT, GAS_PRICE } from '../constants';
import { BakoContractDeploy } from '../../../sdk/src/modules/deploy';

async function seedAccount(
  address: AbstractAddress,
  amount: BN,
  provider: Provider,
) {
  try {
    const genisesWallet = Wallet.fromPrivateKey(PRIVATE_KEY, provider);
    const resp = await genisesWallet.transfer(address, amount, BaseAssetId, {
      gasLimit: Number(GAS_LIMIT),
      gasPrice: Number(GAS_PRICE),
    });
    await resp.waitForResult();
  } catch (e) {
    throw new Error(e.response.errors[0].message ?? 'Seed Account Error');
  }
}

async function sendTransaction(
  provider: Provider,
  tx: TransactionRequest,
  signatures: Array<string>,
) {
  try {
    tx.witnesses = signatures;
    await provider.estimatePredicates(tx);
    const encodedTransaction = hexlify(tx.toTransactionBytes());
    const {
      submit: { id: transactionId },
    } = await provider.operations.submit({ encodedTransaction });

    const response = new TransactionResponse(transactionId, provider);
    return response;
  } catch (e) {
    throw new Error(e.response.errors[0].message ?? 'Send Transaction Error');
  }
}

async function signTransaction(
  wallet: WalletUnlocked,
  tx: TransactionRequest,
  provider: Provider,
) {
  const txHash = tx.getTransactionId(provider.getChainId());
  const hash = txHash.slice(2).toLowerCase();
  const signature = await wallet.signMessage(hash);

  return signature;
}

async function createTransaction(predicate: Predicate<InputValue[]>) {
  try {
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

    tx.inputs?.forEach((input) => {
      if (
        input.type === InputType.Coin &&
        hexlify(input.owner) === predicate.address.toB256()
      ) {
        input.predicate = arrayify(predicate.bytes);
      }
    });

    return tx;
  } catch (e) {
    throw new Error(e.response.errors[0].message ?? 'Create Transaction Error');
  }
}

async function createTransactionWithScriptCall(
  predicate: Predicate<InputValue[]>,
) {
  try {
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
    tx.script = arrayify(ScriptAbi__factory.bin);

    tx.inputs?.forEach((input) => {
      if (
        input.type === InputType.Coin &&
        hexlify(input.owner) === predicate.address.toB256()
      ) {
        input.predicate = arrayify(predicate.bytes);
      }
    });

    return tx;
  } catch (e) {
    throw new Error(e.response.errors[0].message ?? 'Create Transaction Error');
  }
}

describe('[SWAY_PREDICATE]', () => {
  let provider: Provider;

  beforeAll(async () => {
    provider = await Provider.create(BakoSafe.getProviders('CHAIN_URL'));
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

    const response = await sendTransaction(provider, tx, [
      await signTransaction(wallet, tx, provider),
    ]);
    const result = await response.waitForResult();

    expect(result.status).toBe('success');
  });

  test('Send transfer by predicate with duplicated witnesses', async () => {
    const wallet = Wallet.generate({
      provider,
    });

    const predicate = PredicateAbi__factory.createInstance(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: [
        wallet.address.toB256(),
        Address.fromRandom().toB256(),
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

    await sendTransaction(provider, tx, [
      await signTransaction(wallet, tx, provider),
      await signTransaction(wallet, tx, provider),
    ]).catch((e) => {
      expect(e.message).toBe(
        'PredicateVerificationFailed(Panic(PredicateReturnedNonOne))',
      );
    });
  });

  test('Send transfer by predicate with duplicated signers', async () => {
    const wallet = Wallet.generate({
      provider,
    });

    const predicate = PredicateAbi__factory.createInstance(provider, {
      SIGNATURES_COUNT: 2,
      SIGNERS: [
        wallet.address.toB256(),
        wallet.address.toB256(),
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

    await sendTransaction(provider, tx, [
      await signTransaction(wallet, tx, provider),
      await signTransaction(wallet, tx, provider),
    ]).catch((e) => {
      expect(e.message).toBe(
        'PredicateVerificationFailed(Panic(PredicateReturnedNonOne))',
      );
    });
  });

  test('Send transfer with script log result', async () => {
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

    const res = await sendTransaction(provider, tx, [
      await signTransaction(wallet, tx, provider),
      await signTransaction(wallet, tx, provider),
    ]);

    const r = await res.waitForResult();
    // console.log({
    //   receipts: r.receipts,
    //   status: r.status,
    //   id: r.id,
    // });
  });

  test('Send transfer create type', async () => {
    const wallet = Wallet.generate({
      provider,
    });

    const predicate = PredicateAbi__factory.createInstance(provider, {
      SIGNATURES_COUNT: 0,
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
    const _path = join(
      __dirname,
      '../../src/contract/out/debug/my_counter_project.bin',
    );

    const bin = readFileSync(_path);
    const _abi = MyCounterProjectAbi__factory.abi;
    //criando contrato
    const contract = new BakoContractDeploy(
      bin,
      _abi,
      provider,
      predicate.address.toString(),
    );

    const { transactionRequest, contractId } = await contract.deploy();

    const sig: string = await signTransaction(
      wallet,
      transactionRequest,
      provider,
    );

    transactionRequest.witnesses.push(sig);

    console.log({
      witnesses: transactionRequest.witnesses,
    });
    try {
      // equal to .found() on wallet class
      const coins = await predicate.getResourcesToSpend([
        {
          amount: bn(1000),
          assetId: BaseAssetId,
        },
      ]);
      transactionRequest.addResources(coins);

      transactionRequest.inputs?.forEach((input) => {
        if (
          input.type === InputType.Coin &&
          hexlify(input.owner) === predicate.address.toB256()
        ) {
          input.predicate = arrayify(predicate.bytes);
        }
      });

      // todo: calc exact maxFee and gasPrice
      transactionRequest.maxFee = bn(10000);
      transactionRequest.gasPrice = bn(1);

      console.log(transactionRequest.toTransaction());

      await provider.estimatePredicates(transactionRequest);
      const encodedTransaction = hexlify(
        transactionRequest.toTransactionBytes(),
      );

      const {
        submit: { id: transactionId },
      } = await provider.operations.submit({ encodedTransaction });

      const response = new TransactionResponse(transactionId, provider);
      return response;
    } catch (e) {
      console.log(e);
    }
    // const response = new TransactionResponse(transactionId, provider);
    // return response;
  });
});
