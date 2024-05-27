import { createConfig } from 'fuels';

import dotenv from 'dotenv';

dotenv.config();

export default createConfig({
  contracts: ['./src/contract'],
  useBuiltinForc: false,
  providerUrl: process.env.PROVIDER_URL,
  privateKey: process.env.PRIVATE_KEY,
  output: './src/contract',
});
