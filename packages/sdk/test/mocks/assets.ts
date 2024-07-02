import { bn } from 'fuels';

export const assets = {
  ETH: '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07', // local node has configured with this baseAssetId
  BTC: '0xccceae45a7c23dcd4024f4083e959a0686a191694e76fa4fb76c449361ca01f7',
  USDC: '0xfed3ee85624c79cb18a3a848092239f2e764ed6b0aa156ad10a18bfdbe74269f',
  UNI: '0xb3238af388ac05188e342b1801db79d358e4a162734511316c937b00c8687fe9',
};

export const VALUES_DEFAULT_TO_MUL = {
  min: 0.0001,
  1: 1,
  2: 2,
  3: 3,
  5: 5,
  10: 10,
  100: 100,
  1000: 1000,
  10000: 10000,
  5000000: 5000000,
};

export const DEFAULT_BALANCE_VALUE = bn.parseUnits(
  VALUES_DEFAULT_TO_MUL.min.toString(),
);

export const DEFAULT_BALANCES = [
  { assetId: assets['ETH'], amount: DEFAULT_BALANCE_VALUE },
];

export const DEFAULT_MULTI_ASSET_BALANCES = [
  { assetId: assets['ETH'], amount: bn(VALUES_DEFAULT_TO_MUL['10000']) },
  { assetId: assets['BTC'], amount: DEFAULT_BALANCE_VALUE },
  { assetId: assets['USDC'], amount: DEFAULT_BALANCE_VALUE },
  { assetId: assets['UNI'], amount: DEFAULT_BALANCE_VALUE },
];
