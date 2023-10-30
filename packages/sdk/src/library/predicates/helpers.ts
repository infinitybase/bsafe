import { Address } from 'fuels';

export const defaultValues: { [name: string]: string } = {
    signature: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    address: '0x0000000000000000000000000000000000000000000000000000000000000000'
};

export const makeHashPredicate = () => {
    const array = [];

    const random = () => {
        return Math.round(Math.random() * 10);
    };

    for (let i = 0; i < 20; i++) {
        array.push(random());
    }

    return array;
};

export const makeSubscribers = (subscribers: string[]) => {
    const array = [];
    const signatures_length = subscribers.length;
    for (let i = 0; i < 10; i++) {
        if (i < signatures_length) {
            array.push(Address.fromString(subscribers[i]).toHexString());
        } else {
            array.push(defaultValues['address']);
        }
    }

    return array;
};
