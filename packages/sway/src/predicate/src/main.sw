// TODO: we should render this code dynamicly in the future
// To increate the size of signatures
predicate;

use std::{b512::B512, ecr::ec_recover_address, tx::tx_id, tx::tx_witness_data, tx::tx_witnesses_count, bytes::Bytes};
use libraries::{ascii::b256_to_ascii_bytes};


/*
    Configurable params:

    - SIGNERS: address of required signatures
    - SIGNATURES_COUNT: required signatures to approval
    - HASH_PREDICATE: hash of the predicate 
*/

configurable {
    SIGNERS: [b256; 10] = [
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
        0x0000000000000000000000000000000000000000000000000000000000000000,
    ],
    SIGNATURES_COUNT: u64 = 0,
    HASH_PREDICATE: [u64; 20] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
}

/*
    Validate signature:

    params: 
        - INDEX: position of signature
        - TX_HASH: hash of signature
*/

fn check_signature(index: u64, tx_hash: b256) -> u64 {
    if (index >= tx_witnesses_count()) {
        return 0;
    }

    // Get the singature from the witness field
    let signature = tx_witness_data::<B512>(index);

    // Check if the signature is valid and if the address
    // is one of the signers list
    if let Result::Ok(pub_key_sig) = ec_recover_address(signature, tx_hash) {
        let address = pub_key_sig.value;
        let mut i = 0;

        while i < 10 {
            if (address == SIGNERS[i]) {
                return 1;
            }
            i += 1;
        }
    
    }
    return 0;
}

fn main() -> bool {
    let mut verified = 0;

    // this line existis with use and include configurable HASH_PREDICATE on build
    let hash_predicate = HASH_PREDICATE;
    let tx_id_hash = tx_id();
    let tx_hash = b256_to_ascii_bytes(tx_id_hash).sha256();
    let witness_count = tx_witnesses_count();

    if (HASH_PREDICATE[0] != hash_predicate[0]) {
        return false;
    }

    // If there are no signatures, return false
    if (witness_count < SIGNATURES_COUNT) {
        return false;
    }

    // If there are more signatures
    // check if wich ones are valid
    // We need to check if the signature exists before
    // trying to access it
    let mut i = 0;
    while i < 10 {
        verified += check_signature(i, tx_hash);
        i += 1;
    }

    return verified >= SIGNATURES_COUNT;
}
