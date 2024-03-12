import {
  Address,
  BaseAssetId,
  hashMessage,
  InputValue,
  Predicate,
  Provider,
  Wallet,
  WalletUnlocked,
  Signer,
  bn,
  ScriptTransactionRequest,
  transactionRequestify,
  arrayify,
} from 'fuels';
import { PredicateAbi__factory } from '../../../sdk/src/predicates';
import {
  ScriptAbi__factory,
  bin,
} from '../../../sdk/src/scripts/factories/ScriptAbi__factory';
const { PROVIDER, PRIVATE_KEY, GAS_PRICE, GAS_LIMIT } = process.env;

describe('[PREDICATE]', () => {
  let provider: Provider;
  let wallet: WalletUnlocked;
  let predicate: Predicate<InputValue[]>;

  beforeAll(async () => {
    //console.log(PROVIDER, PRIVATE_KEY, GAS_PRICE, GAS_LIMIT);
    provider = await Provider.create(PROVIDER!, {});
    wallet = await Wallet.fromPrivateKey(PRIVATE_KEY!, provider);

    predicate = PredicateAbi__factory.createInstance(provider, {
      HASH_PREDICATE: [
        // todo: fix to use a salt
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      ],
      SIGNATURES_COUNT: 1,
      //@ts-ignore
      SIGNERS: [
        wallet.address.toHexString(),
        ...Array.from({ length: 9 }, () => Address.fromRandom().toHexString()),
      ],
    });

    //predicate.predicateData[0] = bin;

    //send coins to predicate
    const w_tx = await wallet.transfer(
      predicate.address,
      bn.parseUnits('1'),
      BaseAssetId,
      {
        gasPrice: Number(GAS_PRICE),
        gasLimit: Number(GAS_LIMIT),
      },
    );
    await w_tx.wait();
  });

  test('Send a valid transaction ', async () => {
    const { minGasPrice, maxGasPerPredicate, gasPriceFactor, maxGasPerTx } =
      provider.getGasConfig();

    // console.log({
    //   minGasPrice: minGasPrice.toString(),
    //   maxGasPerPredicate: maxGasPerPredicate.toString(),
    //   gasPriceFactor: gasPriceFactor.toString(),
    // });
    // const tx = await predicate.createTransfer(
    //   Address.fromRandom(),
    //   bn.parseUnits('0.01'),
    //   BaseAssetId,
    //   {
    //     gasPrice: minGasPrice,
    //     gasLimit: 2000,
    //     // gasLimit: Number(GAS_LIMIT),
    //     // witnessLimit: bn.parseUnits('2'),
    //     maxFee: maxGasPerTx,
    //     //witnessLimit: bn.parseUnits('10'),
    //   },
    // );

    const script = new ScriptTransactionRequest();
    script.script = arrayify(ScriptAbi__factory.bin);
    script.gasPrice = bn(1);
    script.gasLimit = bn(10000);

    const sig = await wallet.signMessage(
      script.getTransactionId(provider.getChainId()),
    );
    script.witnesses = [sig];
    //script.witnessLimit = bn(script.witnesses.length.toString());

    //script.maxFee = maxGasPerTx;
    //script.witnessLimit = bn.parseUnits('2');

    // const s_tx = new ScriptTransactionRequest(tx);
    // s_tx.script = bin;

    // const tx_id = transactionRequestify(s_tx).getTransactionId(
    //   provider.getChainId(),
    // );

    script.witnesses = [sig];
    await wallet.fund(
      script,
      [
        {
          amount: bn.parseUnits('1'),
          assetId: BaseAssetId,
        },
      ],
      bn(1),
    );

    console.log((await provider.call(script)).receipts);

    console.log({
      sig,
      tx_id: script.getTransactionId(provider.getChainId()),
    });

    // const tx = await transactionRequestify(script);

    //console.log(Signer.recoverAddress(hashMessage(tx_id), sig), wallet.address);

    // tx.witnesses.push(sig);

    // console.log((await wallet.sendTransaction(tx)).wait());

    // tx.witnessLimit = bn.parseUnits(tx.witnesses.length.toString());

    //console.log('->', tx.witnesses);
    //const res = (await provider.sendTransaction(tx)).wait();
    //console.log((await res).receipts);
  });
});
