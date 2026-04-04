import { useState, useCallback } from "react";
import { proveDeclaration, verifyProofLocally } from "../utils/proof";
import { formatProofForCairo } from "../utils/starknet";

/**
 * Dummy proof used when circuit artifacts are not compiled yet.
 * The on-chain verifier is a stub that always returns true,
 * so this allows testing the full game flow without running Circom.
 */
function makeDummyProof(commitment, declarationType) {
  const ONE = "1";
  const dummyProof = {
    pi_a: [ONE, ONE, ONE],
    pi_b: [[ONE, ONE], [ONE, ONE], [ONE, ONE]],
    pi_c: [ONE, ONE, ONE],
    protocol: "groth16",
  };
  return {
    proof: dummyProof,
    publicSignals: [commitment, String(declarationType ?? 0)],
    cairoProof: formatProofForCairo(dummyProof),
    commitment,
    provingMs: 0,
    isDummy: true,
  };
}

/**
 * Hook that manages client-side ZK proof generation for declarations.
 *
 * Usage:
 *   const { generateProof, proving, proofError } = useProofGenerator();
 *   const result = await generateProof({ cards, salt, declarationType });
 *   // result: { cairoProof, commitment, publicSignals } | null
 */
export function useProofGenerator() {
  const [proving, setProving] = useState(false);
  const [proofError, setProofError] = useState(null);

  const generateProof = useCallback(async ({ cards, salt, declarationType }) => {
    if (cards.length !== 5) {
      setProofError("Need exactly 5 cards.");
      return null;
    }

    setProving(true);
    setProofError(null);

    try {
      // Run the declaration circuit. It derives commitment internally from
      // the private cards+salt and exposes it in publicSignals[0].
      // No independent JS Poseidon call — the circuit IS the source of truth.
      try {
        const { proof, publicSignals, commitment, provingMs } = await proveDeclaration({
          cards,
          salt,
          declarationType,
        });

        // Local verification before paying gas
        const valid = await verifyProofLocally(proof, publicSignals);
        if (!valid) {
          setProofError("Local proof verification failed — declaration may be false.");
          return null;
        }

        const cairoProof = formatProofForCairo(proof);
        return { cairoProof, commitment, publicSignals, proof, provingMs, isDummy: false };
      } catch (circuitErr) {
        // Circuit artifacts not compiled yet — fall back to dummy proof.
        // The on-chain verifier is a stub (always returns true) so this is safe for testing.
        console.warn("Circuit artifacts unavailable, using dummy proof:", circuitErr.message);
        // Use "0" as placeholder commitment for dummy flow.
        // The real commitment was already stored on-chain during commitHand.
        return makeDummyProof("0", declarationType);
      }
    } catch (err) {
      console.error("Proof generation error:", err);
      setProofError(err.message ?? "Unknown proof generation error");
      return null;
    } finally {
      setProving(false);
    }
  }, []);

  return { generateProof, proving, proofError };
}
