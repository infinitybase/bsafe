import { arrayify, Provider } from 'fuels';
import { accounts } from '../../../sdk/test/mocks';
import {
  CHAIN_URL,
  createPredicate,
  createTransactionScript,
  sendTransaction,
} from '../utils';
import { ScriptAbi__factory } from '../../../sdk/src/sway/scripts/factories/ScriptAbi__factory';
import { signin } from '../../../sdk/test/utils/signin';
import { createTransactionDeploy } from '../utils/createTransactionDeploy';
import { makePersonHash } from '../utils/makePersonHash';

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
      minSigners: 1,
      signers: [
        accounts['USER_1'].account,
        accounts['USER_3'].account,
        accounts['USER_4'].account,
      ],
    });

    console.log(predicate.address.toHexString());

    const tx = await createTransactionScript(predicate);

    tx.script = arrayify(ScriptAbi__factory.bin);

    console.log('tx', makePersonHash(tx));

    const id = tx.getTransactionId(provider.getChainId()).slice(2);

    const response = await sendTransaction(provider, tx, [
      await signin(id, 'USER_1', undefined),
    ]);

    const result = await response.waitForResult();

    console.log('result', result.receipts);

    expect(result.status).toBe('success');
  });
});
