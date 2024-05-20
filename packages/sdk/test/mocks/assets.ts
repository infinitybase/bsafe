import { bn } from 'fuels';

export const assets = {
  ETH: '0x0000000000000000000000000000000000000000000000000000000000000000',
  DAI: '0x0d9be25f6bef5c945ce44db64b33da9235fbf1a9f690298698d899ad550abae1',
  sETH: '0x1bdeed96ee1e5eca0bd1d7eeeb51d03b0202c1faf764fec1b276ba27d5d61d89',
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
};

export const DEFAULT_BALANCE_VALUE = bn.parseUnits(
  VALUES_DEFAULT_TO_MUL.min.toString(),
);
export const DEFAULT_BALANCES = [
  { assetId: assets['ETH'], amount: DEFAULT_BALANCE_VALUE },
  { assetId: assets['sETH'], amount: DEFAULT_BALANCE_VALUE },
];
