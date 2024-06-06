library;

use std::result::Result;
use std::b512::B512;
use std::bytes::Bytes;
use std::hash::*;
use std::{ecr::{ec_recover_address, ec_recover_r1}};



const INVALID_SIGNER: b256 = 0x1111111111111111111111111111111111111111111111111111111111111111;

pub fn fuel_verify(signature: B512, tx_hash_bytes: Bytes) -> b256 {
    let mut hasher = Hasher::new();
    tx_hash_bytes.hash(hasher);
    let tx_hash = hasher.sha256();
    

    if let Result::Ok(pub_key_sig) = ec_recover_address(signature, tx_hash) {
      return pub_key_sig.value
  }
  return INVALID_SIGNER;
}

pub fn secp256r1_verify(signature: B512, digest:b256 ) -> b256 {
      let public_key = ec_recover_r1(signature, digest).unwrap();
      return sha256(public_key.into());
}

