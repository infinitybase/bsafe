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






fn main() {

    let transaction_type: Bytes = match tx_type() {
        Transaction::Script => 0.to_be_bytes(),
        Transaction::Create => 1.to_be_bytes(),
        _ => 2.to_be_bytes(),
    };
    // verify version of sway, on browser this returned value is u16type
    //let inputs_count:Bytes = 1_u64.to_be_bytes(); 
    //let u64_value = u64::from(1_u8).to_be_bytes();
    //let inputs_count = u64::from(input_count()).to_be_bytes();

    let outputs_count = output_count().to_be_bytes();



    log(transaction_type);
    //log(inputs_count);
    log(outputs_count);

    let mut message = Bytes::new();
    message.append(transaction_type);
    message.append(outputs_count);
    //message.append(Bytes::from());

    let new_id = sha256(message);

    log(new_id);
    //message.append(input_count.to_be_bytes());
    // message.append(Bytes::outputs_count);


}