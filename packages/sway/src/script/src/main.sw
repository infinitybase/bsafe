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
        Input,
    },
    outputs::{
        output_count,
    },
    ecr::{
        ec_recover_address,
    },
    hash::*,
    bytes::*,
    bytes_conversions::u64::*,
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

// fn from(b: b256) -> Bytes {
//     // Artificially create bytes with capacity and len
//     let mut bytes = Self::with_capacity(32);
//     bytes.len = 32;
//     // Copy bytes from contract_id into the buffer of the target bytes
//     __addr_of(b).copy_bytes_to(bytes.buf.ptr(), 32);

//     bytes
// }


fn main() {

    let transaction_type: Bytes = match tx_type() {
        Transaction::Script => 0.to_be_bytes(),
        Transaction::Create => 1.to_be_bytes(),
        _ => 2.to_be_bytes(),
    };


    // verify version of sway, on browser this returned value is u16type
    let inputs_count:Bytes = 1_u64.to_be_bytes();
    let mut input_while_count = 0_64;
    let _input_type = match input_type(0) {
        Input::Coin => 0.to_be_bytes(),
        Input::Contract => 1.to_be_bytes(),
        Input::Message => 2.to_be_bytes(),
        _ => 5.to_be_bytes(),
    };
    let _input_amount = input_amount(0).unwrap();
    let _input_assetId = Bytes::from(input_asset_id(0).unwrap().bits());
    let _input_coin_owner = Bytes::from(input_coin_owner(0).unwrap().bits());

    // log(_input_type);
    // log(_input_amount);

    let mut _input_message = Bytes::new();
    _input_message.append(_input_type);
    _input_message.append(_input_amount.to_be_bytes());
    _input_message.append(_input_assetId);
    _input_message.append(_input_coin_owner);

    let _input_id = sha256(_input_message);

    // log(_input_assetId);
    log(_input_id);


    // while input_while_count < 1 {



    //     log(input_type(input_while_count));

    //     let input_amount = input_amount(input_while_count).unwrap().to_be_bytes();

    //     let mut input_message = Bytes::new();

    //     input_message.append(_input_type);
    //     input_message.append(input_amount);

    //     let input_id = sha256(input_message);        
    //     log(input_id);

        


    //     input_while_count += 1;
    // }
    
    


    // let u64_value = u64::from(1_u8).to_be_bytes();
    //let inputs_count = u64::from(input_count()).to_be_bytes();

    let outputs_count = output_count().to_be_bytes();



    //log(transaction_type);
    //log(inputs_count);
    // log(outputs_count);

    let mut message = Bytes::new();
    message.append(transaction_type);
    message.append(outputs_count);
    message.append(inputs_count);

    let new_id = sha256(message);

    return;

    // log(new_id);
    //message.append(input_count.to_be_bytes());
    // message.append(Bytes::outputs_count);


}