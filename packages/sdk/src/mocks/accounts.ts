// -> valid accounts just to network http://localhost:4000/graphql
export const accounts = {
    FULL: {
        account: '0x94ffcc53b892684acefaebc8a3d4a595e528a8cf664eeb3ef36f1020b0809d0d',
        address: 'fuel1jnluc5acjf5y4nh6a0y28499jhjj32x0ve8wk0hndugzpvyqn5xsfsfzly',
        privateKey: '0xa449b1ffee0e2205fa924c6740cc48b3b473aa28587df6dab12abc245d1f5298'
    },
    STORE: {
        account: '0x53de37ae51fcfecb17ee3589f68904ac75bf5ec109edeb1065ccb63145287da6',
        address: 'fuel1200r0tj3lnlvk9lwxkyldzgy436m7hkpp8k7kyr9ejmrz3fg0knqndhwm6',
        privateKey: '0x61a006b78a6e9eb5aeb11df25e6444be281893875ae5fdc5fa4a0f4702995cb7'
    },
    USER_1: {
        account: '0x92dffc873b56f219329ed03bb69bebe8c3d8b041088574882f7a6404f02e2f28',
        address: 'fuel1jt0lepem2mepjv576qamdxltarpa3vzppzzhfzp00fjqfupw9u5q9gyphu',
        privateKey: '0xa349d39f614a3085b7f7f8cef63fd5189136924fc1238e6d25ccdaa43a901cd0'
    },
    USER_2: {
        account: '0x456bdaffaf74fe03521754ac445d148033c0c6acf7d593132c43f92fdbc7324c',
        address: 'fuel1g44a4la0wnlqx5sh2jkyghg5sqeup34v7l2exyevg0ujlk78xfxqr6ywcm',
        privateKey: '0x139f2cd8db62a9d64c3ed4cdc804f1fb53be98d750cd1432a308b34a42d8dcc7'
    },
    USER_3: {
        account: '0x639880ece7753a32e09164d14dad7436c57737e567f18b98f6ee30fec6b247ec',
        address: 'fuel1vwvgpm88w5ar9cy3vng5mtt5xmzhwdl9vlcchx8kacc0a34jglkqjnvpjz',
        privateKey: '0x40aaca08dac67fa0c22b51794f652e20173970cd05a8797f2d3e8393cfc44211'
    },
    USER_4: {
        account: '0xfd8c520ef8caff0ad3289aa64acecd4ef86ac8f643fd9b76bf2d163a86a66716',
        address: 'fuel1lkx9yrhcetls45egn2ny4nkdfmux4j8kg07eka4l95tr4p4xvutqmvhl2l',
        privateKey: '0xb58ad4fb072290d03fc2d81cd7534e9bf7360ccad8a48d2799b60bab357255da'
    },
    USER_5: {
        account: '0x8247104854dd733cb475901d55047f57cb3c8cafe3a9f7233de3325b8bf56a5c',
        address: 'fuel1sfr3qjz5m4enedr4jqw42prl2l9ner90uw5lwgeauve9hzl4dfwqxhyn83',
        privateKey: '0x4256a670740031e4e7cb7216c9fe8921a4485c187686b7ab0ae7c317d7de0a22'
    }
};

export type IAccountKeys = keyof typeof accounts;

export type IDefaultAccount = {
    address: string;
    account?: string;
    privateKey?: string;
};
