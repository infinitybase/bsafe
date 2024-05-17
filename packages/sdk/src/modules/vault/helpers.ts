import { Address, B256Address, Provider, ZeroBytes32 } from 'fuels';
import {
  ECreationtype,
  IBakoSafeApi,
  ICreation,
  ICreationPayload,
  IPayloadVault,
} from './types';
import { PredicateService } from '../../api/predicates';
import { BakoSafe } from '../../../configurables';
import { Vault } from './Vault';
import { validations } from './validations';

export const defaultValues: { [name: string]: string } = {
  signature:
    '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  address: '0x0000000000000000000000000000000000000000000000000000000000000000',
};

export const makeHashPredicate = () => Address.fromRandom().toB256();

export const makeSubscribers = (subscribers: string[]) => {
  const array: B256Address[] = Array(10).fill(ZeroBytes32);
  subscribers.forEach((value, index) => {
    array[index] = Address.fromString(value).toB256();
  });
  return array;
};

export const instanceByOldUtil = async (
  params: IBakoSafeApi,
): Promise<ICreationPayload> => {
  const { id, predicateAddress, token, address } = params;
  const hasId = 'id' in params && id;

  if (predicateAddress == undefined && id == undefined) {
    throw new Error('predicateAddress or BakoSafePredicateId is required');
  }

  const api = new PredicateService({
    address,
    token,
  });

  const result = hasId
    ? await api.findById(id)
    : await api.findByAddress(predicateAddress!);

  if (!result) {
    throw new Error('BakoSafeVault not found');
  }

  return {
    configurable: JSON.parse(result.configurable),
    provider: await Provider.create(result.provider),
    name: result.name,
    description: result.description,
    abi: result.version.abi,
    bytecode: result.version.bytes,
    BakoSafeAuth: {
      address,
      token,
    },
    BakoSafeVaultId: result.id,
    BakoSafeVault: result,
    api,
    version: result.version.code,
  };
};

export const instanceByNewUtil = async (
  params: IPayloadVault,
): Promise<ICreationPayload> => {
  const hasAuth = 'BakoSafeAuth' in params && params.BakoSafeAuth;
  let api;
  if (hasAuth) {
    const { address, token } = params.BakoSafeAuth!;
    api = new PredicateService({
      address,
      token,
    });
  }
  const provider = await Provider.create(
    params.configurable.network ?? BakoSafe.getProviders('CHAIN_URL'),
  );
  const hasVersion = !!params.version;
  const { code, abi, bytes } = hasVersion
    ? await Vault.BakoSafeGetPredicateVersionByCode(params.version!)
        .then((data) => data)
        .catch(() => {
          throw new Error('Invalid predicate version');
        })
    : await Vault.BakoSafeGetCurrentPredicateVersion();
  return {
    ...params,
    api,
    configurable: {
      ...params.configurable,
      chainId: await provider.getChainId(),
      network: params.configurable.network,
    },
    provider,
    abi,
    bytecode: bytes,
    version: code,
  };
};

export const isOldPredicate = async (
  param: IBakoSafeApi | IPayloadVault,
): Promise<{ is: boolean; data: ICreationPayload | undefined }> => {
  const is =
    ('predicateAddress' in param || 'id' in param) &&
    'address' in param &&
    'token' in param;

  return {
    is,
    data: is ? await instanceByOldUtil(param) : undefined,
  };
};

export const isNewPredicate = async (
  param: IBakoSafeApi | IPayloadVault,
): Promise<{
  is: boolean;
  data: ICreationPayload | undefined;
}> => {
  const is = 'configurable' in param;
  return {
    is,
    data: is ? await instanceByNewUtil(param) : undefined,
  };
};

export const identifyCreateVaultParams = async (
  param: IPayloadVault | IBakoSafeApi,
): Promise<ICreation> => {
  try {
    const { data: oldData, is: isOld } = await isOldPredicate(param);
    const { data: newData } = await isNewPredicate(param);

    const abi = isOld ? oldData?.abi : newData?.abi;
    const configurable = isOld ? oldData?.configurable : newData?.configurable;
    validations(configurable!, abi!);

    if (isOld && !!oldData) {
      return {
        type: ECreationtype.IS_OLD,
        payload: oldData!,
      };
    }
    return {
      type: ECreationtype.IS_NEW,
      payload: newData!,
    };
  } catch (e: any) {
    throw new Error(e.message);
  }
};
