import { RpcProvider } from "starknet";

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

// ── Low-level read helpers (bypass Contract class to avoid starknet.js v8 ABI issues) ──

/** Call get_next_room_id — returns the next room id as a number. */
export async function callGetNextRoomId() {
  const res = await provider.callContract({
    contractAddress: GAME_ADDRESS,
    entrypoint: "get_next_room_id",
    calldata: [],
  });
  return Number(BigInt(res[0]));
}

/** Call get_room — returns a parsed Room object. */
export async function callGetRoom(roomId) {
  const res = await provider.callContract({
    contractAddress: GAME_ADDRESS,
    entrypoint: "get_room",
    calldata: ["0x" + Number(roomId).toString(16)],
  });
  return parseRoomFromFelts(res);
}

/** Call balance_of — returns balance as a number divided by 1e18 (formatted string). */
export async function callBalanceOf(address) {
  const res = await provider.callContract({
    contractAddress: TOKEN_ADDRESS,
    entrypoint: "balance_of",
    calldata: [address],
  });
  // u256 = low (res[0]) + high (res[1]) * 2^128
  const raw = BigInt(res[0]) + (BigInt(res[1]) << 128n);
  return (Number(raw) / 1e18).toFixed(2);
}

// ── Room parsing from raw felt array ─────────────────────────────────────────

const PHASE_NAMES = [
  "WaitingForPlayers",
  "CommitPhase",
  "DeclarationPhase",
  "ChallengePhase",
  "Resolved",
];

/**
 * Parse a Room from the raw felt array returned by provider.callContract.
 * Cairo serialization order (14 felts total):
 *  [0]  player_a
 *  [1]  player_b
 *  [2]  bet_amount.low
 *  [3]  bet_amount.high
 *  [4]  pot.low
 *  [5]  pot.high
 *  [6]  phase (enum variant index)
 *  [7]  commitment_a
 *  [8]  commitment_b
 *  [9]  active_player_index
 *  [10] declaration (enum variant index)
 *  [11] declaration_commitment
 *  [12] declaration_type_felt
 *  [13] winner
 */
/** Normalize a Starknet address felt to "0x" + no-leading-zeros hex, matching wallet format. */
function normAddr(felt) {
  if (!felt) return "0x0";
  try { return "0x" + BigInt(felt).toString(16); } catch { return felt; }
}

function parseRoomFromFelts(f) {
  return {
    player_a: normAddr(f[0]),
    player_b: normAddr(f[1]),
    bet_amount: BigInt(f[2]) + (BigInt(f[3]) << 128n),
    pot: BigInt(f[4]) + (BigInt(f[5]) << 128n),
    phase: PHASE_NAMES[Number(BigInt(f[6]))] ?? "Unknown",
    commitment_a: f[7],
    commitment_b: f[8],
    active_player_index: Number(BigInt(f[9])),
    declaration: Number(BigInt(f[10])),
    declaration_commitment: f[11],
    declaration_type_felt: f[12],
    winner: normAddr(f[13]),
  };
}

/** Legacy wrapper — kept for callers that pass a decoded object from old Contract calls. */
export function parseRoom(raw) {
  // If it looks like a raw felt array (indexed numbers), parse as felts
  if (Array.isArray(raw)) return parseRoomFromFelts(raw);
  // Otherwise it's already a decoded object
  return {
    player_a: raw.player_a,
    player_b: raw.player_b,
    bet_amount: raw.bet_amount,
    pot: raw.pot,
    phase: typeof raw.phase === "string" ? raw.phase
      : Array.isArray(raw.phase) ? parseRoomFromFelts(raw).phase
      : (PHASE_NAMES[Number(raw.phase)] ?? "Unknown"),
    commitment_a: raw.commitment_a,
    commitment_b: raw.commitment_b,
    active_player_index: Number(raw.active_player_index),
    declaration: raw.declaration,
    declaration_commitment: raw.declaration_commitment,
    declaration_type_felt: raw.declaration_type_felt,
    winner: raw.winner,
  };
}

/** Convert a Groth16 proof (snarkjs output) to the tuples expected by Cairo. */
export function formatProofForCairo(proof) {
  const { pi_a, pi_b, pi_c } = proof;
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
