library;

use std::{bytes::Bytes};

const ASCII_MAP: [u8; 16] = [
    48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102
];

pub fn b256_to_ascii_bytes(val: b256) -> Bytes {
    let bytes = Bytes::from(val);
    let mut ascii_bytes = Bytes::with_capacity(64);
    let mut idx = 0;

    while idx < 32 {
        let b = bytes.get(idx).unwrap();
        ascii_bytes.push(ASCII_MAP[(b >> 4).as_u64()]);
        ascii_bytes.push(ASCII_MAP[(b & 15).as_u64()]);
	    idx = idx + 1;
    }

    ascii_bytes
}