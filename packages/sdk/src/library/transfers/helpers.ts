import { Signer, arrayify, hashMessage } from 'fuels';
import { defaultValues } from '../predicates/helpers';

export const transactionScript = arrayify('0x9000000447000000000000000000003c5dfcc00110fff3001a485000910000201a440000724000202849140072400020340004902400000047000000');

export function recoverSigner(signer: string, tx_id: string) {
    if (tx_id == '0x') return;

    const a = Signer.recoverAddress(hashMessage(tx_id), signer);
    return a ? a.toString() : defaultValues['address'];
}
