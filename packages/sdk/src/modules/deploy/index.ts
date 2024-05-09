import {
  BytesLike,
  ContractFactory,
  DeployContractOptions,
  JsonAbi,
  Provider,
} from 'fuels';
// Instanciar o contrato usando a factory
//[https://github.com/FuelLabs/fuels-ts/blob/f7616b7aac943f903852814920c556fdea6657bc/packages/contract/src/contract-factory.ts]

// Extender a factory, sobrescrever apenas o método deploy
//** importante nessa parte usar a funcao para gerar a tx da mesma instancia factoryContract
// devolver o id do contrato

export class BakoContractDeploy extends ContractFactory {
  readonly abi: JsonAbi;
  readonly predicate: string;

  constructor(
    bytecode: BytesLike,
    abi: JsonAbi,
    provider: Provider,
    predicate: string,
  ) {
    super(bytecode, abi, provider);
    this.predicate = predicate;
    this.abi = abi;
  }

  async deploy(deployContractOptions: DeployContractOptions = {}) {
    if (!this.predicate) {
      throw new Error('Predicate not set');
    }

    const { configurableConstants } = deployContractOptions;

    if (configurableConstants) {
      this.setConfigurableConstants(configurableConstants);
    }

    const { contractId, transactionRequest } = this.createTransactionRequest(
      deployContractOptions,
    );

    return {
      contractId,
      transactionRequest,
    };
  }
}

// criar uma conta e autenticar
// criar um predicate
// instanciar a classe BakoContractDeploy
// inserir uma tx
