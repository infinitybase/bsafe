script;

use std::{
    tx::{
        tx_witness_data,
        tx_witnesses_count,
        tx_id,
        tx_type,
        Transaction,
        GTF_WITNESS_DATA,
    },
    inputs::{
        input_count,
        input_type,
        input_amount,
        input_asset_id,
        input_coin_owner,
        input_message_sender,
        input_message_recipient,
        Input,
    },
    outputs::{
        output_count,
        output_type,
        output_amount,
        output_asset_id,
        output_asset_to,
        Output,
    },
    ecr::{
        ec_recover_address,
    },
    hash::*,
    bytes::*,
    bytes_conversions::u64::*,
    primitive_conversions::u64::*,
};

use libraries::{
    ascii::b256_to_ascii_bytes,
    recover_signature::{
        fuel_verify, 
        secp256r1_verify, 
        INVALID_ADDRESS,
        Signature,  
    },
    webauthn_digest::{
      WebAuthn,
      get_webauthn_digest, 
    } 
};

use std::b512::{B512};

const INVALID_VALUE_INPUT_TYPE: u64 = 77;
const INVALID_VALUE_OUTPUT_TYPE: u64 = 76;
const INVALID_VALUE_TRANSACTION_TYPE: u64 = 75;

const VALID_VALUE_INPUT_TYPE_COIN: u64 = 0;
const VALID_VALUE_INPUT_TYPE_CONTRACT: u64 = 1;
const VALID_VALUE_INPUT_TYPE_MESSAGE: u64 = 2;

const VALID_VALUE_OUTPUT_TYPE_COIN: u64 = 0;
const VALID_VALUE_OUTPUT_TYPE_CONTRACT: u64 = 1;
const VALID_VALUE_OUTPUT_TYPE_CHANGE: u64 = 2;

const VALID_VALUE_TRANSACTION_TYPE_SCRIPT: u64 = 0;
const VALID_VALUE_TRANSACTION_TYPE_CREATE: u64 = 1;

// fn from(b: b256) -> Bytes {
//     // Artificially create bytes with capacity and len
//     let mut bytes = Self::with_capacity(32);
//     bytes.len = 32;
//     // Copy bytes from contract_id into the buffer of the target bytes
//     __addr_of(b).copy_bytes_to(bytes.buf.ptr(), 32);

//     bytes
// }

fn make_input_coin_hash(index: u64) -> Bytes {
    let _input_type = VALID_VALUE_INPUT_TYPE_COIN.to_be_bytes();
    let _input_amount = input_amount(index).unwrap().to_be_bytes();
    let _input_asset_id = Bytes::from(input_asset_id(index).unwrap().bits());
    let _input_coin_owner = Bytes::from(input_coin_owner(index).unwrap().bits());

    let mut _input_message = Bytes::new();
    _input_message.append(_input_type); // type of input: Coin
    _input_message.append(_input_amount); // amount of input
    _input_message.append(_input_asset_id); // asset id of input
    _input_message.append(_input_coin_owner); // owner of input

    log(sha256(_input_message));

    return _input_message;
}

fn make_input_contract_hash(index: u64) -> Bytes {
    let _input_type = VALID_VALUE_INPUT_TYPE_CONTRACT.to_be_bytes();

    let mut _input_message = Bytes::new();
    _input_message.append(_input_type); // type of input: Contract

    log(sha256(_input_message));

    return _input_message;
}

fn make_input_message_hash(index: u64) -> Bytes {
    let _input_type = VALID_VALUE_INPUT_TYPE_MESSAGE.to_be_bytes();
    let _input_sender = Bytes::from(input_message_sender(index).bits());
    let _input_recipient = Bytes::from(input_message_recipient(index).bits());
    let _input_amount = input_amount(index).unwrap().to_be_bytes();

    let mut _input_message = Bytes::new();
    _input_message.append(_input_type); // type of input: Message
    _input_message.append(_input_sender); // sender of message
    _input_message.append(_input_recipient); // recipient of message
    _input_message.append(_input_amount); // amount of message

    log(sha256(_input_message));

    return _input_message;
}

fn make_inputs_hash(inputs_length: u64) -> Bytes {
    let mut input_counter = 0;
    let mut input_message = Bytes::new();

    while input_counter < inputs_length {
        let _input = match input_type(input_counter) {
            Input::Coin => make_input_coin_hash(input_counter),
            Input::Contract => make_input_contract_hash(input_counter),
            Input::Message => make_input_message_hash(input_counter),
            _ => INVALID_VALUE_INPUT_TYPE.to_be_bytes(), // just inválid value
        };

        input_message.append(_input);

        input_counter += 1;
    }

    return input_message;
}

fn make_output_coin_hash(index: u64) -> Bytes {
    let _output_type = VALID_VALUE_OUTPUT_TYPE_COIN.to_be_bytes();
    let _output_amount = output_amount(index).to_be_bytes();
    let _output_asset_id = Bytes::from(output_asset_id(index).unwrap().bits());
    let _output_asset_to = Bytes::from(output_asset_to(index).unwrap().bits());

    let mut _output_message = Bytes::new();
    _output_message.append(_output_type); // type of output: Coin
    _output_message.append(_output_amount); // amount of output
    _output_message.append(_output_asset_id); // asset id of output
    _output_message.append(_output_asset_to); // owner of output

    log(sha256(_output_message));

    return _output_message;
}

fn make_output_contract_hash(index: u64) -> Bytes {
    let _output_type = VALID_VALUE_OUTPUT_TYPE_CONTRACT.to_be_bytes();

    let mut _output_message = Bytes::new();
    _output_message.append(_output_type); // type of output: Contract

    log(sha256(_output_message));

    return _output_message;
}

fn make_output_change_hash(index: u64) -> Bytes {
    let _output_type = VALID_VALUE_OUTPUT_TYPE_CHANGE.to_be_bytes();

    let mut _output_message = Bytes::new();
    _output_message.append(_output_type); // type of output: Change

    log(sha256(_output_message));

    return _output_message;
}

fn make_output_hash(outputs_length: u64) -> Bytes {
    let mut output_counter = 0;
    let mut output_message = Bytes::new();

    while output_counter < outputs_length {
        let _output = match output_type(output_counter) {
            Output::Coin => make_output_coin_hash(output_counter),
            Output::Contract => make_output_contract_hash(output_counter),
            Output::Change => make_output_change_hash(output_counter),
            _ => INVALID_VALUE_OUTPUT_TYPE.to_be_bytes(), // just inválid value
        };

        output_message.append(_output);

        output_counter += 1;
    }

    return output_message;
}



fn main() {
    // get transaction info
    let _transaction_type: u64 = match tx_type() {
        Transaction::Script => VALID_VALUE_TRANSACTION_TYPE_SCRIPT,
        Transaction::Create => VALID_VALUE_TRANSACTION_TYPE_CREATE,
        _ => INVALID_VALUE_TRANSACTION_TYPE,
    };
    let _transaction_type_message = _transaction_type.to_be_bytes();

    // get inputs info
    let _inputs_count = u64::from(input_count());
    let _input_message = make_inputs_hash(_inputs_count);

    // get outputs info
    let _outputs_count = u64::from(output_count());
    let _output_message = make_output_hash(_outputs_count);



    // create message
    let mut message = Bytes::new();
    message.append(_transaction_type_message);
    message.append(_inputs_count.to_be_bytes());
    message.append(_outputs_count.to_be_bytes());
    message.append(_input_message);
    message.append(_output_message);

    let new_id = sha256(message);
    log(new_id);

    return;
}