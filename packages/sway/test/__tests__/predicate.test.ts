import { Address, Provider, Wallet, arrayify, bn } from 'fuels';

import { ScriptAbi__factory } from '../../../sdk/src/sway/scripts/';
import { ContractAbi__factory } from '../../../sdk/src/sway/contracts';

import { accounts } from '../../../sdk/test/mocks';
import { signin } from '../../../sdk/test/utils/signin';
import {
  createTransactionScript,
  sendTransaction,
  signTransaction,
  CHAIN_URL,
  createPredicate,
  ERROR_DUPLICATED_WITNESSES,
  WEBAUTHN,
  GAS_LIMIT,
} from '../utils';
import { createTransactionDeploy } from '../utils/createTransactionDeploy';

describe('[SWAY_PREDICATE] Send transfers', () => {
  let provider: Provider;

  beforeAll(async () => {
    //todo: move to dynamic url of chain and remove of the BakoSafe
    //provider = await Provider.create(BakoSafe.getProviders('CHAIN_URL'));
    provider = await Provider.create(CHAIN_URL);
  });

  test('By predicate', async () => {
    const predicate = await createPredicate({
      amount: '0.1',
      minSigners: 3,
      signers: [
        accounts['USER_1'].account,
        accounts['USER_3'].account,
        accounts['USER_4'].account,
      ],
    });

    //@ts-ignore
    const tx = await createTransactionScript(predicate);
    const id = tx.getTransactionId(provider.getChainId()).slice(2);

    const response = await sendTransaction(provider, tx, [
      await signin(id, 'USER_1', undefined),
      await signin(id, 'USER_3', undefined),
      await signin(id, 'USER_4', undefined),
    ]);
    const result = await response.waitForResult();

    expect(result.status).toBe('success');
  });

  test('With duplicated witnesses', async () => {
    const wallet = Wallet.generate({
      provider,
    });

    const predicate = await createPredicate({
      amount: '0.1',
      minSigners: 2,
      signers: [wallet.address.toB256(), Address.fromRandom().toB256()],
    });

    //@ts-ignore
    const tx = await createTransactionScript(predicate);

    await sendTransaction(provider, tx, [
      await signTransaction(wallet, tx, provider),
      await signTransaction(wallet, tx, provider),
    ]).catch((e) => {
      expect(e.message).toBe(ERROR_DUPLICATED_WITNESSES);
    });
  });

  test('With duplicated signers', async () => {
    const wallet = Wallet.generate({
      provider,
    });

    const predicate = await createPredicate({
      amount: '0.1',
      minSigners: 2,
      signers: [wallet.address.toB256(), wallet.address.toB256()],
    });

    //@ts-ignore
    const tx = await createTransactionScript(predicate);

    await sendTransaction(provider, tx, [
      await signTransaction(wallet, tx, provider),
      await signTransaction(wallet, tx, provider),
    ]).catch((e) => {
      expect(e.message).toBe(ERROR_DUPLICATED_WITNESSES);
    });
  });

  // this test is an adptation, becouse we dont sign messages on node using webauthn
  // add, to validate this, whe have a constants with values signed by webauthn
  // and this transaction, recives a script with this constants and check
  test('By webauthn', async () => {
    const predicate = await createPredicate({
      amount: '0.1',
      minSigners: 1,
      signers: [accounts['USER_1'].account],
    });

    //@ts-ignore
    const tx = await createTransactionScript(predicate);

    tx.script = arrayify(ScriptAbi__factory.bin);

    const id = tx.getTransactionId(provider.getChainId()).slice(2);

    const result = await sendTransaction(provider, tx, [
      await signin(id, 'USER_1', undefined),
      WEBAUTHN.signature,
    ]);

    const res = await result.waitForResult();
    expect(res.status).toBe('success');

    // verify if on the script, recover of static signature is equal to the static address
    //@ts-ignore
    expect(res.receipts[0]['data']).toBe('0x01');
  });

  // Create an tx with type create (1) and send to the chain to deploy a new contract
  //https://github.com/FuelLabs/fuels-ts/blob/018efe96bde4fec5d49964fc55a725ecf9f7632e/packages/account/src/providers/transaction-request/hash-transaction.ts
  test('To deploy new contract on chain', async () => {
    const predicate = await createPredicate({
      amount: '0.1',
      minSigners: 1,
      signers: [accounts['USER_1'].account],
    });

    const { tx, contractId } = await createTransactionDeploy(
      provider,
      predicate,
    );

    const id = tx.getTransactionId(provider.getChainId()).slice(2);

    tx.witnesses.push(await signin(id, 'USER_1', undefined));

    const result = await sendTransaction(provider, tx, [
      ...tx.witnesses, // we have an bytecode of contract, dont move this position
      await signin(id, 'USER_1', undefined),
    ]);

    const res = await result.waitForResult();
    expect(res.status).toBe('success');

    //verify if the contract was deployed
    const wallet = Wallet.fromPrivateKey(accounts['FULL'].privateKey, provider);

    const contract = ContractAbi__factory.connect(contractId, wallet);

    const call_seven = await contract.functions
      .seven()
      .txParams({
        gasLimit: bn(GAS_LIMIT),
      })
      .get()
      .then((res) => res.callResult.receipts);

    const call_zero = await contract.functions
      .zero()
      .txParams({
        gasLimit: bn(GAS_LIMIT),
      })
      .get()
      .then((res) => res.callResult.receipts);

    const isZeroCalled = call_zero.find(
      (c) => c.type === 2 && parseInt(c.data, 16) == 0,
    );
    const isSevenCalled = call_seven.find(
      (c) => c.type === 2 && parseInt(c.data, 16) == 7,
    );

    expect(isZeroCalled).toBeDefined();
    expect(isSevenCalled).toBeDefined();
  });

  //TODO:
  //vm deploy
  //github.com/FuelLabs/fuels-ts/blob/018efe96bde4fec5d49964fc55a725ecf9f7632e/packages/transactions/src/coders/transaction.ts#L1-L2

  //TODO:
  // create a predicate
  // create a transaction
  // create a person hash using tx infos, and sign this hash

  // send transaction with predicate

  // on sway, make a function to recover the person hash and verify if the signature is valid
});
