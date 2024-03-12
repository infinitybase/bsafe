/**
 *  [OBJECTIVE]:
 *      
 *      - Make a transaction
 *      - Send transaction with predicate
 *      - Validate transaction with predicate using other information, not tx_id()
 * 
 * 
 *  [REFERENCE]:
 *      - [TX_SPEC]: https://docs.fuel.network/docs/specs/tx-format/
 *      - [TX_SCRIPT_LOGS]: https://github.com/FuelLabs/fuels-ts/blob/e52dcbb8ba7715e7cf649fb068f7c2ff24b3ab88/packages/transactions/src/coders/receipt.ts#L10-L24
 * 
 *  [PROCESS]:
 *      - any transactions used in the ecosistem must be created using the `ScriptTransactionRequest` class
 *      - the class has a method `toTransaction` that returns a `TransactionScript` object
 *      - this object contains the transaction data with type [https://docs.fuel.network/docs/specs/tx-format/transaction/#transactionscript] 
 *      - all transactions has a `type` field with value `TransactionType.Script` on BAKO ecosystem
 *      - select many fields from the `TransactionScript` object to validate the transaction
 *          export type TransactionScriptValidations = {
                    type: TransactionType.Script; // any moments on 0 value, the transaction is a script
                    scriptGasLimit: BN;
                    policyTypes: number; // has a one policy, type this type is represents the policy[0]
                    inputsCount: number;
                    outputsCount: number;
                    script: string; // the script to execute
                    scriptData: string; // the script input data (parameters)
                    inputs: Input[];
                    policies: Policy[]; // the policy is array, but if the policy is only one, the array has only one element
                    outputs: Output[];
                };
 * 
 * 
 * 
 * 
 */
