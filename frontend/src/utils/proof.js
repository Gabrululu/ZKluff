/**
 * proof.js — client-side Groth16 proof generation helpers.
 *
 * All proof generation runs in the browser using snarkjs.
 * The compiled circuit artifacts (*.wasm and *.zkey) must be placed in
 * /public/circuits/ after running the compilation steps described in README.md.
 */

import * as snarkjs from "snarkjs";

// Paths to compiled circuit artifacts served from /public/
const CIRCUITS_BASE = "/circuits";

const CIRCUIT_PATHS = {
  hand_commitment: {
    wasm: `${CIRCUITS_BASE}/hand_commitment.wasm`,
    zkey: `${CIRCUITS_BASE}/hand_commitment_final.zkey`,
    vkey: `${CIRCUITS_BASE}/hand_commitment_vk.json`,
  },
  declaration_valid: {
    wasm: `${CIRCUITS_BASE}/declaration_valid.wasm`,
    zkey: `${CIRCUITS_BASE}/declaration_valid_final.zkey`,
    vkey: `${CIRCUITS_BASE}/declaration_valid_vk.json`,
  },
};

/**
 * Generate a Poseidon commitment for a 5-card hand.
 * This mirrors the circom circuit's hash computation.
 * Returns the commitment as a decimal string (felt252-compatible).
 *
 * Note: uses snarkjs's built-in Poseidon, which matches Starknet's Poseidon
 * parameters (same BN254 curve, same round constants).
 */
export async function computeCommitment(cards, salt) {
  if (cards.length !== 5) throw new Error("Need exactly 5 cards");
  const { buildPoseidon } = await import("circomlibjs");
  const poseidon = await buildPoseidon();
  const inputs = [...cards.map(BigInt), BigInt(salt)];
  const hash = poseidon(inputs);
  return poseidon.F.toString(hash);
}

/**
 * Generate a Groth16 proof that commitment = Poseidon(cards, salt).
 * Returns { proof, publicSignals } from snarkjs.
 */
export async function proveHandCommitment({ cards, salt, commitment }) {
  const input = {
    cards: cards.map(String),
    salt: String(salt),
    commitment: String(commitment),
  };

  const { wasm, zkey } = CIRCUIT_PATHS.hand_commitment;
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    wasm,
    zkey
  );
  return { proof, publicSignals };
}

/**
 * Generate a Groth16 proof that the declared hand rank is truthful.
 * Returns { proof, publicSignals } from snarkjs.
 *
 * @param {number[]} cards        — 5 card values [1..52]
 * @param {string|bigint} salt    — blinding factor used in commitment
 * @param {string} commitment     — Poseidon(cards, salt) as decimal string
 * @param {number} declarationType — 0-8, matches DeclarationType enum
 */
export async function proveDeclaration({ cards, salt, commitment, declarationType }) {
  const input = {
    cards: cards.map(String),
    salt: String(salt),
    commitment: String(commitment),
    declaration_type: String(declarationType),
  };

  const { wasm, zkey } = CIRCUIT_PATHS.declaration_valid;
  const t0 = performance.now();
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasm, zkey);
  const provingMs = Math.round(performance.now() - t0);
  return { proof, publicSignals, isDummy: false, provingMs };
}

/**
 * Verify a proof client-side (optional sanity check before submitting to chain).
 */
export async function verifyProofLocally(circuitName, proof, publicSignals) {
  const { vkey: vkeyPath } = CIRCUIT_PATHS[circuitName];
  const vkey = await fetch(vkeyPath).then((r) => r.json());
  return snarkjs.groth16.verify(vkey, publicSignals, proof);
}
