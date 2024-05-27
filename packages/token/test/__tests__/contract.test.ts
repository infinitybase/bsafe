import { Wallet, Provider, ContractFactory, JsonAbi } from 'fuels';
import { readFileSync } from 'fs';
import { join } from 'path';

const binaryPath = join(
  __dirname,
  '../../src/contract/out/debug/contract-counter.bin',
);
const abiPath = join(
  __dirname,
  '../../src/contract/out/debug/contract-counter-abi.json',
);

const binary = readFileSync(binaryPath);
const abi = JSON.parse(readFileSync(abiPath, 'utf8')) as JsonAbi;

import { PRIVATE_KEY } from '../constants';

async function getContractInstance(): Promise<{ instance: any; id: string }> {
  const provider = await Provider.create('https://beta-5.fuel.network/graphql');
  const wallet = Wallet.fromPrivateKey(PRIVATE_KEY, provider);

  const factory = new ContractFactory(binary, abi, wallet);
  const contract = await factory.deployContract();
  const id = contract.id.toB256();

  return { instance: contract, id };
}

describe('Counter Contract', () => {
  it('should get contract id', async () => {
    const { instance, id } = await getContractInstance();
    expect(typeof id).toBe('string');
  });

  it.only('should increment', async () => {
    const { instance } = await getContractInstance();
    console.log('instance:', instance);

    await instance.functions.increment().call();

    const result = await instance.functions.count().get();

    expect(result.value).toBe(1);
  });
});
