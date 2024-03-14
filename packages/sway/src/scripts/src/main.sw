script;

use std::tx::tx_id;

//to make this -> https://github.com/FuelLabs/sway/blob/master/sway-lib-std/src/inputs.sw
enum Inputs {
   input_type: u8,// 0 to coin, 1 from contract
   owner: b256, // address of predicate
   amount: u64,
   asset_id: b256,
}


//to make this -> [https://github.com/FuelLabs/sway/blob/master/sway-lib-std/src/outputs.sw]
enum Outputs {
   output_type: u8, // 0 to coin, 1 to contract
   to: b256, // address of predicate
   amount: u64,
   asset_id: b256,
}

enum Policy {
   gas_price: u64,
   gas_limit: u64,
   max_fee: u64,
}

enum TxData {
   tx_type: u8,
   inputs_size: u64,
   outputs_size: u64,
   inputs: Vec<Inputs>,
   outputs: Vec<Outputs>
}



fn main(tx: b256) {
   log(tx_id());
}