import { Address, ZeroBytes32, isB256 } from 'fuels';
import {
  EConfigTypes,
  IConfVault,
  JsonAbiConfigurable,
  JsonAbiType,
} from './types';

export const formatConfigTypeDeclaration = (type: string) => {
  const hasSquareBracketsPair = /\[.*?\]/.test(type);

  if (hasSquareBracketsPair) {
    const formattedType = type.replace(/\[.*?\]/g, '[]');
    return formattedType;
  }

  return type;
};

export const validateConfigTypeArray = (
  value: unknown,
  key: string,
  versionTypes: JsonAbiType[],
) => {
  if (!Array.isArray(value)) {
    throw new Error(`${key} must be an array`);
  }

  const itemTypeId = versionTypes.find(
    (item) => formatConfigTypeDeclaration(item.type) === EConfigTypes.array,
  )?.components![0].type;
  const itemType = versionTypes.find(
    (item) => item.typeId === itemTypeId,
  )!.type;

  value.forEach((item) => {
    try {
      validateConfigTypes(item, key, itemType, versionTypes);
    } catch {
      throw new Error(`${key} must be an array of ${itemType}`);
    }
  });
};

export const validateConfigTypeB256 = (value: unknown, key: string) => {
  let _value = value;

  if (typeof value === 'string' && !isB256(value)) {
    try {
      _value = Address.fromString(value).toB256();
    } catch {
      throw new Error(`${key} must be a b256`);
    }
  }
  if (typeof _value !== 'string' || !isB256(_value)) {
    throw new Error(`${key} must be a b256`);
  }
};

export const validateConfigTypeBoolean = (value: unknown, key: string) => {
  if (typeof value !== 'boolean') {
    throw new Error(`${key} must be a boolean`);
  }
};

export const validateConfigTypeU64 = (value: unknown, key: string) => {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`${key} must be an integer`);
  }
};

export const validateConfigTypes = (
  value: unknown,
  key: string,
  type: string,
  versionTypes: JsonAbiType[],
) => {
  switch (type) {
    case EConfigTypes.array:
      return validateConfigTypeArray(value, key, versionTypes);
    case EConfigTypes.b256:
      return validateConfigTypeB256(value, key);
    case EConfigTypes.boolean:
      return validateConfigTypeBoolean(value, key);
    case EConfigTypes.u64:
      return validateConfigTypeU64(value, key);
    default:
      return;
  }
};

export const validateConfigurable = (
  configurable: Omit<IConfVault, 'chainId'>,
  abi: string,
) => {
  const optionalConfigs = ['HASH_PREDICATE'];
  const configsNotInAbi = ['network', 'chainId'];

  const configurableKeys = Object.keys(configurable).filter(
    (key) => !configsNotInAbi.includes(key),
  );

  const versionAbi = JSON.parse(abi);
  const versionTypes: JsonAbiType[] = versionAbi.types;
  const versionConfigs: JsonAbiConfigurable[] = versionAbi.configurables;
  const versionConfigKeys = versionConfigs.map(
    (config: JsonAbiConfigurable) => config.name,
  );
  const requiredVersionConfigKeys = versionConfigKeys.filter(
    (key) => !optionalConfigs.includes(key),
  );

  //Validates unwanted params
  configurableKeys.forEach((key) => {
    if (!versionConfigKeys.includes(key)) {
      throw new Error(`${key} is an invalid parameter`);
    }
  });

  //Validates required params
  requiredVersionConfigKeys.forEach((key) => {
    if (!(key in configurable)) {
      throw new Error(`${key} is required`);
    }
  });

  //Validates params values
  versionConfigs.forEach((config: JsonAbiConfigurable) => {
    const key = config.name;
    const typeId = config.configurableType.type;
    const type = versionTypes.find((type) => type.typeId === typeId)!.type;
    const formattedType = formatConfigTypeDeclaration(type);
    const value = configurable[key];

    if (!optionalConfigs.includes(key) || value) {
      validateConfigTypes(value, key, formattedType, versionTypes);
    }
  });
};

export const validations = (
  configurable: Omit<IConfVault, 'chainId'>,
  abi: string,
) => {
  validateConfigurable(configurable, abi);

  //TO DO: adicionar validações dinâmicas baseadas no registro de versão da API
  const { SIGNATURES_COUNT, SIGNERS } = configurable;
  const _SIGNERS = SIGNERS.filter((value: string) => value !== ZeroBytes32);

  if (!SIGNATURES_COUNT || Number(SIGNATURES_COUNT) == 0) {
    throw new Error('SIGNATURES_COUNT is required must be granter than zero');
  }
  if (!_SIGNERS || _SIGNERS.length === 0) {
    throw new Error('SIGNERS must be greater than zero');
  }
  if (_SIGNERS.length < Number(SIGNATURES_COUNT)) {
    throw new Error('Required Signers must be less than signers');
  }

  const unique = new Set(_SIGNERS);
  if (unique.size !== _SIGNERS.length) {
    throw new Error('SIGNERS must be unique');
  }
};
