library;

use std::{
  b512::B512,
  hash::*,
  bytes::Bytes,
  constants::ZERO_B256,  
  result::Result,
  ecr::{
    ec_recover_address, 
    ec_recover_address_r1
  },
};

use ::webauthn_digest::{
  WebAuthn,
};

pub const INVALID_ADDRESS = 0x0000000000000000000000000000000000000000000000000000000000000001;

pub enum Signature {
  webauth: WebAuthn,
}

/// Verify a signature using the FUEL curve [Secp256k1]

///     - params: 
///         - signature: the signature to verify
///         - tx_hash: the hash of the transaction

///     - returns: the address of the signer
pub fn fuel_verify(signature: B512, tx_bytes: b256) -> Address {
  if let Result::Ok(pub_key_sig) = ec_recover_address(signature, tx_bytes) {
      return pub_key_sig;
  }

  return Address::from(INVALID_ADDRESS);
}

/// Verify a signature using the secp256r1 curve [Secp256r1]

///     - params:
///         - signature: the signature to verify
///         - digest: the digest of the message

///     - returns: the address of the signer
pub fn secp256r1_verify(signature: B512, digest:b256 ) -> Address {
  if let Result::Ok(pub_key_sig) = ec_recover_address_r1(signature, digest) {
      return pub_key_sig;
  }

  return Address::from(INVALID_ADDRESS);
}