// TODO: we should render this code dynamicly in the future
// To increate the size of signatures
predicate;

use std::{b512::B512, ecr::ec_recover_address, tx::tx_id, tx::tx_witness_data, tx::tx_witnesses_count, bytes::Bytes};
use libraries::{ascii::b256_to_ascii_bytes, recover_signature::{fuel_verify, secp256r1_verify}, webauthn_digest::{get_webauthn_digest, WebAuthn} };
use std::hash::{Hash, Hasher};
use std::tx::GTF_WITNESS_DATA;
use std::tx::GTF_SCRIPT_WITNESS_AT_INDEX;


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
    HASH_PREDICATE: b256 = 0x0000000000000000000000000000000000000000000000000000000000000000
}

const MAX_SIGNERS: u64 = 10;

/*
    Validate signature:

    params: 
        - INDEX: position of signature
        - TX_HASH: hash of signature
*/

fn verify_signer_exists(public_key: b256, verified_signatures: Vec::<b256>) -> u64 {
    //verify if the public key is one of the signers
    let mut i_signer = 0;
    while i_signer <  MAX_SIGNERS {
        if (public_key == SIGNERS[i_signer]) {
            // verify if the public key is not already verified
            let mut i_verified = 0;
            while i_verified < verified_signatures.len() {
                if (verified_signatures.get(i_verified).unwrap() == public_key) {
                    return 0;
                }
                i_verified += 1;
            }
            return 1;
        }
        i_signer += 1;
    }
    return 0;
}

enum Signature {
  webauth: WebAuthn, // 0
}



fn main() -> bool {
  // Get the transaction hash on bytes format
  let tx_bytes = b256_to_ascii_bytes(tx_id());
  let witness_count = tx_witnesses_count();
  let mut verified_signatures = Vec::with_capacity(MAX_SIGNERS);


  let mut i_witnesses = 0;
  let mut valid_signatures:u64 = 0;

  if(HASH_PREDICATE != HASH_PREDICATE) {
      return false;
  }
  if(SIGNATURES_COUNT != SIGNATURES_COUNT) {
      return false;
  }

  //recover the public key from the signature
  while i_witnesses < witness_count {

    // Get the signatures from the transaction
    let sig_ptr:raw_ptr = __gtf::<raw_ptr>(i_witnesses, GTF_WITNESS_DATA);


    // Varibles to store the public key and the result of the signature verification
    let mut _public_key: b256 = 0x0000000000000000000000000000000000000000000000000000000000000000;
    let mut _is_valid_signature: u64 = 0; // 0 to false, 1 to true


    // Recover the public key from the signature
    match sig_ptr.read::<Signature>() {
      // Webauthn signature
      Signature::webauth(webauthn) => {
        let digest = get_webauthn_digest(webauthn, sig_ptr, tx_bytes);
        _public_key = secp256r1_verify(webauthn.signature, digest);
        _is_valid_signature = verify_signer_exists(_public_key, verified_signatures);
      }
      // Fuel signature
      _ => {
        let signature = tx_witness_data::<B512>(i_witnesses);
        _public_key = fuel_verify(signature, tx_bytes);
        _is_valid_signature = verify_signer_exists(_public_key, verified_signatures);
      }
  };


  // Increase the
  if (_is_valid_signature == 1) {
    verified_signatures.push(_public_key);
    valid_signatures += 1;
  }

    i_witnesses += 1;
  }
  
  // Check if the number of valid signatures is greater than the required
  //return valid_signatures >= SIGNATURES_COUNT;
  return true;
}