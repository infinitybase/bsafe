script;

enum Inputs {
   input_type: u8,// 0 to coin, 1 from contract
   owner: b256, // address of predicate
   amount: u64,
   asset_id: b256,
}

enum Outputs {
   output_type: u8, // 0 to coin, 1 to contract
   owner: b256, // address of predicate
   amount: u64,
   asset_id: b256,
}


enum TxData {
   tx_type: u8,
   gas_limit: u64,
   policy_types: u8, //0 probably means no policy
   inputs: Vec<Inputs>,
   outputs: Vec<Outputs>,
   policy: Vec<Policy>,
}



fn main(tx: b256) {
   
}