/**
 * proof.js — client-side Groth16 proof generation helpers.
 *
 * Commitment = Poseidon(cards[0..4], salt) computed via circomlibjs,
 * which matches circomlib's Poseidon EXACTLY (same field, same round constants).
 * Both hand_commitment and declaration_valid circuits take commitment as a
 * PUBLIC INPUT and verify: commitment === Poseidon(cards, salt).
 *
 * Circuit artifacts must be placed in /public/circuits/ after compilation.
 */

import * as snarkjs from "snarkjs";
import { buildPoseidon } from "circomlibjs";

const CIRCUITS_BASE = "/circuits";

const CIRCUIT_PATHS = {
  hand_commitment: {
    wasm: `${CIRCUITS_BASE}/hand_commitment.wasm`,
    zkey: `${CIRCUITS_BASE}/hand_commitment.zkey`,
  },
  declaration_valid: {
    wasm: `${CIRCUITS_BASE}/declaration_valid.wasm`,
    zkey: `${CIRCUITS_BASE}/declaration_valid.zkey`,
    vkey: `${CIRCUITS_BASE}/declaration_valid_vkey.json`,
  },
};

// Singleton — buildPoseidon is expensive; build once and reuse.
let poseidonInstance = null;
async function getPoseidon() {
  if (!poseidonInstance) {
    poseidonInstance = await buildPoseidon();
  }
  return poseidonInstance;
}

/**
 * Compute Poseidon(cards[0..4], salt) using circomlibjs.
 * Output is converted from Montgomery form with F.toString(), producing the
 * exact decimal string the Circom circuit expects as a public input.
 */
export async function computeCommitment(cards, salt) {
  if (cards.length !== 5) throw new Error("Need exactly 5 cards");
  const poseidon = await getPoseidon();
  const inputs = [...cards.map((c) => BigInt(c)), BigInt(salt)];
  const hash = poseidon(inputs);
  // F.toString converts from Montgomery/internal form to the plain field element string
  return poseidon.F.toString(hash);
}

/**
 * Run the hand_commitment circuit with the pre-computed JS commitment as the
 * public input. Useful for verifying the JS and circuit Poseidon agree.
 *
 * Returns { commitment, proof, publicSignals }.
 */
export async function computeAndProveCommitment(cards, salt) {
  const commitment = await computeCommitment(cards, salt);
  console.log("Commitment for hand_commitment proof:", commitment);

  const { wasm, zkey } = CIRCUIT_PATHS.hand_commitment;
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    {
      cards: cards.map((c) => c.toString()),
      salt: String(salt),
      commitment, // public input — circuit verifies Poseidon(cards,salt) == this
    },
    wasm,
    zkey,
  );
  return { commitment, proof, publicSignals };
}

/**
 * Generate a Groth16 proof that the declared hand rank is truthful.
 *
 * 1. Compute commitment in JS via circomlibjs (matches circuit's Poseidon).
 * 2. Pass commitment as the required public input to declaration_valid.
 *
 * Returns { proof, publicSignals, commitment, provingMs }.
 */
export async function proveDeclaration({ cards, salt, declarationType }) {
  const safeCards = cards.map((c) => c.toString());
  const safeSalt = String(salt);

  // Compute commitment with the same Poseidon the circuit uses
  const commitment = await computeCommitment(cards, salt);
  console.log("Commitment for proof:", commitment);

  const { wasm, zkey } = CIRCUIT_PATHS.declaration_valid;
  const t0 = performance.now();
  const origError = console.error;
  console.error = () => {};
  let proof, publicSignals;
  try {
    ({ proof, publicSignals } = await snarkjs.groth16.fullProve(
      {
        cards: safeCards,
        salt: safeSalt,
        commitment,                          // public input — must match circuit
        declaration_type: String(declarationType),
      },
      wasm,
      zkey,
    ));
  } finally {
    console.error = origError;
  }
  const provingMs = Math.round(performance.now() - t0);

  return { proof, publicSignals, commitment, provingMs };
}

/**
 * Verify a proof client-side (optional sanity check before submitting to chain).
 */
export async function verifyProofLocally(proof, publicSignals) {
  const vkey = await fetch(CIRCUIT_PATHS.declaration_valid.vkey).then((r) => r.json());
  return snarkjs.groth16.verify(vkey, publicSignals, proof);
}
