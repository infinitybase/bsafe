import {
  arrayify,
  BaseAssetId,
  bn,
  hexlify,
  InputType,
  Provider,
  TransactionResponse,
} from 'fuels';
import { BakoSafe } from '../../configurables';
import { accounts } from '../mocks';
import { IUserAuth, authService, newVault, signin } from '../utils';
import path from 'path';
import { readFileSync } from 'fs';
import { BakoContractDeploy } from '../../src/modules/deploy';
import { MyCounterProjectAbi__factory } from '../../src/sway/contracts/factories/MyCounterProjectAbi__factory';

const _path = path.resolve(
  __dirname,
  '../../src/modules/deploy/contract/out/debug/my_counter_project.bin',
);

describe('[PREDICATES]', () => {
  let auth: IUserAuth;
  let provider: Provider;
  let signers: string[];

  beforeAll(async () => {
    provider = await Provider.create(BakoSafe.getProviders('CHAIN_URL'));
    auth = await authService(
      ['USER_1', 'USER_2', 'USER_3', 'USER_5', 'USER_4'],
      provider.url,
    );
    signers = [
      accounts['USER_1'].address,
      accounts['USER_2'].address,
      accounts['USER_3'].address,
    ];
  }, 20 * 1000);

  test(
    'Deploy contract',
    async () => {
      //criando vault
      const vault = await newVault(
        [accounts['USER_3'].address],
        provider,
        undefined,
        10000,
      );
      const bin = readFileSync(_path);
      const _abi = MyCounterProjectAbi__factory.abi;
      //criando contrato
      const contract = new BakoContractDeploy(
        bin,
        _abi,
        provider,
        vault.address.toString(),
      );

      //criar tx do deploy
      const { transactionRequest, contractId } = await contract.deploy();
      // console.log(
      //   transactionRequest.witnesses[transactionRequest.bytecodeWitnessIndex],
      // );
      // console.log('[CONTRACT_ID]: ', contractId);

      const sig: string = await signin(
        transactionRequest.getTransactionId(0),
        'USER_3',
      );

      //transactionRequest.bytecodeWitnessIndex = 0;
      transactionRequest.witnesses.push(sig);
      //transactionRequest.witnessLimit = bn(15);

      //adicionar fees

      const fee = await provider.getTransactionCost(transactionRequest);
      // console.log('[FEE]: ', fee.maxFee, fee.maxFee.toString());
      // console.log(
      //   '[PREDICATE]: ',
      //   await vault.getBalance(),
      //   (await vault.getBalance()).toString(),
      // );

      transactionRequest.maxFee = bn(fee.maxFee).add(bn(1000));
      transactionRequest.gasPrice = bn(1);
      // console.log('[PREDICATE]: ', transactionRequest.witnesses);
      const coins = await vault.getResourcesToSpend([
        {
          amount: bn(100),
          assetId: BaseAssetId,
        },
      ]);

      transactionRequest.addResources(coins);
      transactionRequest.witnesses.pop();
      //console.log('[COINS]: ', transactionRequest.witnesses);
      transactionRequest.inputs?.forEach((input) => {
        if (
          input.type === InputType.Coin &&
          hexlify(input.owner) === vault.address.toB256()
        ) {
          input.predicate = arrayify(vault.bytes);
        }
      });

      console.log('[PREDICATE]: ', {
        req: transactionRequest.getTransactionId(0),
      });

      await provider.estimatePredicates(transactionRequest);
      const encodedTransaction = hexlify(
        transactionRequest.toTransactionBytes(),
      );

      console.log('[ENCODED]: ');
      // console.log('[ENCODED]: ', transactionRequest.witnesses);
      // console.log('[PREDICATE]: ', vault.address.toString());

      const {
        submit: { id: transactionId },
      } = await provider.operations
        .submit({ encodedTransaction })
        .then((res) => res)
        .catch((err) => {
          console.log('[ERROR]: ', err);
          throw new Error(err);
        });

      console.log('[PREDICATE]: ', {
        req: transactionRequest.getTransactionId(0),
      });

      const tx = new TransactionResponse(transactionId, provider);

      //criar a tx pelo vault

      // tx.witnesses.push(sig);
      // tx.witnesses.push(
      //   //@ts-ignore
      //   transactionRequest.witnesses[transactionRequest.bytecodeWitnessIndex],
      // );

      const result = await tx.wait();

      console.log('[RESULT]: ', result);

      expect(vault).toBeDefined();
    },
    10 * 1000,
  );
});
