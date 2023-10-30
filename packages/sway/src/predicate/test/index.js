const { Wallet, Predicate, ScriptTransactionRequest, arrayify, bn, NativeAssetId, hashTransaction, transactionRequestify, hexlify, InputType, TransactionResponse, Provider } = require('fuels');
const { readFileSync } = require('fs');
const { join } = require('path');

function getSwayFiles(root, contractName) {
    const projectsDir = join(__dirname, root);
    const binaryPath = join(projectsDir, '/out/debug/', `${contractName}.bin`);
    const abiPath = join(projectsDir, '/out/debug/', `${contractName}-abi.json`);
    const fileBytes = readFileSync(binaryPath);
    return {
        abi: require(abiPath),
        bin: hexlify(arrayify(fileBytes))
    };
}

async function sendTransaction(provider, tx) {
    const encodedTransaction = hexlify(tx.toTransactionBytes());
    const {
        submit: { id: transactionId }
    } = await provider.operations.submit({ encodedTransaction });

    const response = new TransactionResponse(transactionId, provider);
    return response;
}

const PROVIDER_URL = 'http://localhost:4000/graphql';

async function init() {
    const provider = new Provider(PROVIDER_URL);
    const gasPrice = bn(2000000);
    const wallet = Wallet.fromPrivateKey('0x0f44a619bf8c19f3eb903be38d1d26d36d08a10341e1a4282ffa87214da0cea8', provider);
    const _predicate = getSwayFiles('../', 'project-predicate');
    const predicate = new Predicate(_predicate.bin, _predicate.abi, provider, {
        SIGNERS: [wallet.address.toB256(), NativeAssetId, NativeAssetId, NativeAssetId, NativeAssetId, NativeAssetId, NativeAssetId, NativeAssetId, NativeAssetId, NativeAssetId],
        SIGNATURES_COUNT: 1
    });

    console.log(wallet.address.toB256());
    console.log(predicate.address.toB256());

    const resp2 = await wallet.transfer(predicate.address, bn(100), NativeAssetId, {
        gasPrice
    });
    await resp2.waitForResult();
    console.log('Predicate balance:', (await predicate.getBalance()).format());

    console.log('Create transaction');
    const tx = new ScriptTransactionRequest();
    tx.gasPrice = gasPrice;
    tx.gasLimit = bn(100_001);
    const coins = await predicate.getResourcesToSpend([
        {
            amount: bn(100),
            assetId: NativeAssetId
        }
    ]);
    tx.addResources(coins);

    // Add predicate data to the input
    tx.inputs?.forEach((input) => {
        if (input.type === InputType.Coin && hexlify(input.owner) === predicate.address.toB256()) {
            // eslint-disable-next-line no-param-reassign
            input.predicate = arrayify(predicate.bytes);
            // eslint-disable-next-line no-param-reassign
            input.predicateData = arrayify(predicate.predicateData);
        }
    });

    // Add signatures
    console.log('Sign message');
    const txHash = hashTransaction(transactionRequestify(tx));
    const hash = txHash.slice(2).toLowerCase();
    console.log('hash:', hash);
    const signature = await wallet.signMessage(hash);
    console.log('signature: ', signature);

    // Apend to witnesses
    // Clen tx witnesses field
    console.log('Add signatures');
    tx.witnesses = [];
    tx.witnesses.push(signature);

    const resp = await predicate.provider.getTransactionCost(tx);
    console.log(resp);

    // gasUsed: <BN: 0x3d>,

    // try {
    //     console.log('Send transaction');
    //     // const resp = await sendTransaction(provider, tx);
    //     const resp = await predicate.sendTransaction(tx);
    //     const txResp = await resp.waitForResult();

    //     console.log('\n\n\n');
    //     console.log(`TX -- (${txResp.status.type})`);
    //     console.log('\n Receipts:');
    //     console.log(JSON.stringify(txResp.receipts, null, 2));
    // } catch (err) {
    //     console.log(err);
    //     console.log('\n\n\n');
    //     console.log('TX -- Failed');
    //     console.log(err.message.split(':')[0]);
    // }
}

init();
