import { bn, Provider } from 'fuels';
import { BakoSafe } from '../../configurables';
import { accounts } from '../mocks';
import { IUserAuth, authService, newVault, signin } from '../utils';
import path from 'path';
import { readFileSync } from 'fs';
import { BakoContractDeploy } from '../../src/modules/deploy';
import abi from '../../src/modules/deploy/contract/out/debug/my_counter_project-abi.json';

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
      const vault = await newVault([signers[2]], provider, undefined, 100);
      const bin = readFileSync(_path);

      //criando contrato
      const contract = new BakoContractDeploy(
        bin,
        abi,
        provider,
        vault.address.toString(),
      );

      //criar tx do deploy
      const { transactionRequest, contractId } = await contract.deploy();
      console.log(
        transactionRequest.witnesses[transactionRequest.bytecodeWitnessIndex],
      );
      console.log('[CONTRACT_ID]: ', contractId);

      //adicionar fees
      const fee = await provider.getTransactionCost(transactionRequest);
      transactionRequest.maxFee = fee.maxFee;
      transactionRequest.gasPrice = bn(10);

      //criar a tx pelo vault
      const tx = await vault.BakoSafeIncludeTransaction(transactionRequest);
      const sig: string = await signin(tx.getHashTxId(), 'USER_3');
      tx.witnesses.push(
        //@ts-ignore
        transactionRequest.witnesses[transactionRequest.bytecodeWitnessIndex],
      );
      tx.witnesses.push(sig);

      //enviar a tx
      const tx_send = await tx.send();
      console.log('[TX_SEND]: ', tx_send);

      const result = await tx.wait();

      console.log('[RESULT]: ', result);

      expect(vault).toBeDefined();
    },
    10 * 1000,
  );
});
