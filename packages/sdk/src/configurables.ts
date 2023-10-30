import { bn } from 'fuels';
const { ENCODER, API_URL, REFETCH_TIMEOUT } = process.env;
export const defaultConfigurable = {
    encoder: ENCODER || 'fuel',
    api_url: API_URL || 'http://localhost:3333',
    provider: 'http://localhost:4000/graphql',
    gasPrice: bn(1_000_000),
    gasLimit: bn(100000),
    refetchTimeout: REFETCH_TIMEOUT || 1000
};
