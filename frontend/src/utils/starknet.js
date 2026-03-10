import { Contract, RpcProvider, cairo } from "starknet";
import GameAbi from "../abis/game.json";
import TokenAbi from "../abis/token.json";

// ── Contract addresses ───────────────────────────────────────────────────────
export const GAME_ADDRESS =
  import.meta.env.VITE_GAME_CONTRACT ?? import.meta.env.VITE_GAME_ADDRESS ?? "0x0";
export const TOKEN_ADDRESS =
  import.meta.env.VITE_TOKEN_CONTRACT ?? import.meta.env.VITE_TOKEN_ADDRESS ?? "0x0";
export const VERIFIER_ADDRESS =
  import.meta.env.VITE_VERIFIER_CONTRACT ?? import.meta.env.VITE_VERIFIER_ADDRESS ?? "0x0";

export const STARKNET_RPC =
  import.meta.env.VITE_STARKNET_RPC ??
  "https://starknet-sepolia.public.blastapi.io/rpc/v0_7";

export const provider = new RpcProvider({ nodeUrl: STARKNET_RPC });

// ── ABIs from compiled Scarb artifacts ───────────────────────────────────────
export const GAME_ABI = GameAbi;
export const TOKEN_ABI = TokenAbi;


// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a Room struct from contract call result into a JS object. */
export function parseRoom(raw) {
  return {
    player_a: raw.player_a,
    player_b: raw.player_b,
    bet_amount: raw.bet_amount,
    pot: raw.pot,
    phase: parsePhase(raw.phase),
    commitment_a: raw.commitment_a,
    commitment_b: raw.commitment_b,
    active_player_index: Number(raw.active_player_index),
    declaration: raw.declaration,
    declaration_commitment: raw.declaration_commitment,
    declaration_type_felt: raw.declaration_type_felt,
    winner: raw.winner,
  };
}

const PHASE_MAP = {
  0: "WaitingForPlayers",
  1: "CommitPhase",
  2: "DeclarationPhase",
  3: "ChallengePhase",
  4: "Resolved",
};

function parsePhase(raw) {
  // Cairo enums come back as { variant: "...", ... } or as a number
  if (typeof raw === "object" && raw !== null) {
    return Object.keys(raw)[0] ?? "Unknown";
  }
  return PHASE_MAP[Number(raw)] ?? "Unknown";
}

/** Convert a Groth16 proof (snarkjs output) to the tuples expected by Cairo. */
export function formatProofForCairo(proof) {
  const { pi_a, pi_b, pi_c } = proof;
  // snarkjs returns strings; Cairo expects felt252 hex strings
  const toFelt = (n) => BigInt(n).toString();
  return {
    proof_a: [toFelt(pi_a[0]), toFelt(pi_a[1])],
    proof_b: [
      [toFelt(pi_b[0][0]), toFelt(pi_b[0][1])],
      [toFelt(pi_b[1][0]), toFelt(pi_b[1][1])],
    ],
    proof_c: [toFelt(pi_c[0]), toFelt(pi_c[1])],
  };
}
