import { bn } from 'fuels';
const { ENCODER, API_URL, PROVIDER, GAS_PRICE, GAS_LIMIT, REFETCH_TIMEOUT } = process.env;

export const defaultConfigurable = {
    encoder: ENCODER || 'fuel',
    api_url: API_URL || 'http://localhost:3333',
    provider: PROVIDER || 'http://localhost:4000/graphql',
    gasPrice: bn(GAS_PRICE) || bn(1_000_000),
    gasLimit: bn(GAS_LIMIT) || bn(100000),
    refetchTimeout: REFETCH_TIMEOUT || 1000
};
