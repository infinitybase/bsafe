
library;

use std::{b512::B512};
use std::hash::*;
use std::bytes::Bytes;


pub struct WebAuthn {
  signature: B512,
  prefix_size: u64,
  suffix_size: u64,
  auth_data_size: u64,
  prefix: raw_slice,
  suffix: raw_slice,
  auth_data: raw_slice,
}

pub fn get_webauthn_digest(webauthn: WebAuthn, sig_ptr: raw_ptr, tx_id: Bytes) -> b256 {
  // enum + signature + prefix_size + suffix_size + auth_data_size
  let offset_data = __size_of::<u64>() + __size_of::<B512>() + __size_of::<u64>() + __size_of::<u64>() + __size_of::<u64>();
  let offset_data_ptr = sig_ptr.add::<u8>(offset_data);
  // Get prefix bytes
  let prefix_buf = raw_slice::from_parts::<u8>(offset_data_ptr, webauthn.prefix_size);
  let prefix_bytes = Bytes::from(prefix_buf);
  // Get suffix bytes
  let suffix_ptr = offset_data_ptr.add::<u8>(webauthn.prefix_size);
  let suffix_buf = raw_slice::from_parts::<u8>(suffix_ptr, webauthn.suffix_size);
  let suffix_bytes = Bytes::from(suffix_buf);
  // Get Auth bytes
  let auth_data_ptr = offset_data_ptr.add::<u8>(webauthn.prefix_size).add::<u8>(webauthn.suffix_size);
  let auth_data_buf = raw_slice::from_parts::<u8>(auth_data_ptr, webauthn.auth_data_size);
  let auth_data_bytes = Bytes::from(auth_data_buf);
  // Create client hash
  let mut client_data = Bytes::new();
  client_data.append(prefix_bytes);
  client_data.append(tx_id);
  client_data.append(suffix_bytes);
  let client_hash = sha256(client_data);
  // Create message data
  let mut message = Bytes::new();
  message.append(auth_data_bytes);
  message.append(Bytes::from(client_hash));
  // Create digest return
  return sha256(message);
}