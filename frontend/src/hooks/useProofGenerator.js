import { useState, useCallback } from "react";
import { computeCommitment, proveDeclaration, verifyProofLocally } from "../utils/proof";
import { formatProofForCairo } from "../utils/starknet";

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
      // 1. Compute commitment from private inputs
      const commitment = await computeCommitment(cards, salt);

      // 2. Generate the real Groth16 declaration proof
      const { proof, publicSignals, provingMs } = await proveDeclaration({
        cards,
        salt,
        commitment,
        declarationType,
      });

      // 3. Local verification before paying gas
      const valid = await verifyProofLocally("declaration_valid", proof, publicSignals);
      if (!valid) {
        setProofError("Local proof verification failed — declaration may be false.");
        return null;
      }

      // 4. Format proof for Cairo contract call
      const cairoProof = formatProofForCairo(proof);

      return { cairoProof, commitment, publicSignals, proof, provingMs };
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
