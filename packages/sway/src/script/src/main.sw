script;

use std::tx::{
    tx_witness_data,
    tx_witnesses_count,
};

use std::b512::{B512};

fn main() {
    log("Hello, World!");
    

    let mut i_witnesses = 0;
    while i_witnesses < tx_witnesses_count() {
        let witness = tx_witness_data::<B512>(i_witnesses);
        log(witness);
        i_witnesses += 1;
    }

}