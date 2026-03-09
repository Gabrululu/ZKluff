/// Stub Groth16 ZK verifier contract, compatible with Garaga library.
/// In production, replace verify_declaration with a real Garaga Groth16 call.
#[starknet::interface]
pub trait IVerifier<TContractState> {
    fn verify_declaration(
        ref self: TContractState,
        proof_a: (felt252, felt252),
        proof_b: ((felt252, felt252), (felt252, felt252)),
        proof_c: (felt252, felt252),
        public_inputs: Array<felt252>,
    ) -> bool;
}

#[starknet::contract]
pub mod Verifier {
    use super::IVerifier;
    use starknet::storage::StoragePointerWriteAccess;

    #[storage]
    struct Storage {
        // Verification key hash — set at constructor time.
        // In production this would be the Groth16 VK stored via Garaga.
        vk_hash: felt252,
    }

    #[constructor]
    fn constructor(ref self: ContractState, vk_hash: felt252) {
        self.vk_hash.write(vk_hash);
    }

    #[abi(embed_v0)]
    impl VerifierImpl of IVerifier<ContractState> {
        /// Verifies a Groth16 proof that the declared hand property is truthful.
        ///
        /// Public inputs layout (matches declaration_valid.circom):
        ///   [0] commitment   — Pedersen hash of the 5-card hand
        ///   [1] declaration  — numeric encoding of DeclarationType
        ///
        /// Returns true when proof is valid.
        /// STUB: always returns true — replace body with real Garaga call.
        fn verify_declaration(
            ref self: ContractState,
            proof_a: (felt252, felt252),
            proof_b: ((felt252, felt252), (felt252, felt252)),
            proof_c: (felt252, felt252),
            public_inputs: Array<felt252>,
        ) -> bool {
            // TODO: integrate Garaga's groth16_verifier once circuit is compiled.
            // Example (Garaga API):
            //   garaga::groth16::verify(self.vk_hash.read(), proof_a, proof_b, proof_c, public_inputs)
            assert(public_inputs.len() >= 2, 'invalid public inputs length');
            true
        }
    }
}
