import { useState, useEffect, useCallback } from "react";
import { useAccount } from "@starknet-react/core";
import {
  GAME_ADDRESS, TOKEN_ADDRESS,
  callGetNextRoomId, callGetRoom, callBalanceOf,
  normalizeAddress,
  provider,
} from "../utils/starknet";
import { computeCommitment } from "../utils/proof";

const POLL_INTERVAL_MS = 2000;
const POLL_INTERVAL_SLOW_MS = 5000;

// ── Fee / resource bounds applied to every transaction ───────────────────────
const RESOURCE_BOUNDS = {
  resourceBounds: {
    l1_gas: { max_amount: "0x2710", max_price_per_unit: "0x2540be400" },
    l2_gas: { max_amount: "0x0", max_price_per_unit: "0x0" },
    l1_data_gas: { max_amount: "0x2710", max_price_per_unit: "0x2540be400" },
  },
  tip: "0x0",
};

console.log("ENV check - GAME:", GAME_ADDRESS, "TOKEN:", TOKEN_ADDRESS);

const FELT_MOD = BigInt("3618502788666131213697322783095070105623107215331596699973092056135872020481");

/** Convert a BN254 field element decimal string to a "0x"-prefixed hex felt252. */
function toHexFelt(val) {
  try {
    return "0x" + (BigInt(val || 0) % FELT_MOD).toString(16);
  } catch {
    return val;
  }
}

async function executeWithOurFees(account, calls) {
  return account.execute(calls, undefined, RESOURCE_BOUNDS);
}

/** Poll until room phase changes (or maxRetries exhausted), then return latest room. */
async function waitForPhaseChange(roomId, currentPhase, maxRetries = 15) {
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const room = await callGetRoom(roomId);
      console.log(`Poll ${i + 1}: phase=${room.phase}, waiting for change from ${currentPhase}`);
      if (room.phase !== currentPhase) return room;
    } catch (e) {
      console.warn("Poll error:", e);
    }
  }
  return callGetRoom(roomId);
}

async function waitForTx(txHash, maxAttempts = 60, intervalMs = 3000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt) { await new Promise((r) => setTimeout(r, intervalMs)); continue; }
      const execStatus = receipt.execution_status ?? "";
      const finalityStatus = receipt.finality_status ?? receipt.status ?? "";
      if (execStatus === "REVERTED") {
        throw new Error(`Transaction reverted: ${receipt.revert_reason ?? "unknown reason"}`);
      }
      if (
        finalityStatus === "ACCEPTED_ON_L2" ||
        finalityStatus === "ACCEPTED_ON_L1" ||
        execStatus === "SUCCEEDED"
      ) return receipt;
    } catch (e) {
      if (e.message?.includes("reverted")) throw e;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Transaction timeout — check Starkscan for status");
}

export function useGame(roomId, playerAddress) {
  const [room, setRoom] = useState(null);
  const [hand, setHand] = useState([]);
  // Small random salt — always fits in felt252, no overflow possible.
  const [salt] = useState(() => Math.floor(Math.random() * 1_000_000_000).toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { account } = useAccount();

  // ── Fetch room state ───────────────────────────────────────────────────────
  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      const fresh = await callGetRoom(roomId);
      console.log("Fresh room data:", fresh);
      setRoom(fresh);
      return fresh;
    } catch (e) {
      console.error("fetchRoom error:", e);
    }
  }, [roomId]);

  // Initial fetch
  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  // Dynamic polling — 2 s during active phases, 5 s while waiting/resolved
  useEffect(() => {
    const interval =
      !room || room.phase === "WaitingForPlayers" || room.phase === "Resolved"
        ? POLL_INTERVAL_SLOW_MS
        : POLL_INTERVAL_MS;
    const id = setInterval(fetchRoom, interval);
    return () => clearInterval(id);
  }, [fetchRoom, room?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Commit hand ────────────────────────────────────────────────────────────
  const commitHand = useCallback(async () => {
    if (!account || hand.length !== 5) return;
    setLoading(true);
    setError(null);
    try {
      console.log("commitHand - hand:", hand, "salt:", salt, "roomId:", roomId);
      const commitment = await computeCommitment(hand, salt);
      console.log("commitHand - commitment:", commitment);
      console.log("commitHand - toHexFelt:", toHexFelt(commitment));
      const { CallData } = await import("starknet");
      const calldata = CallData.compile({
        room_id: "0x" + Number(roomId).toString(16),
        commitment: toHexFelt(commitment),
      });
      console.log("commitHand - calldata:", calldata);
      const tx = await executeWithOurFees(account, [{
        contractAddress: GAME_ADDRESS,
        entrypoint: "commit_hand",
        calldata,
      }]);
      await waitForTx(tx.transaction_hash);
      const updatedRoom = await waitForPhaseChange(roomId, "CommitPhase");
      setRoom(updatedRoom);
    } catch (e) {
      console.error("commitHand full error:", e);
      console.error("commitHand error message:", e.message);
      setError(e.message ?? "Failed to commit hand");
    } finally {
      setLoading(false);
    }
  }, [account, hand, salt, roomId, fetchRoom]);

  // ── Declare ────────────────────────────────────────────────────────────────
  const declare = useCallback(
    async (declarationType, cairoProof) => {
      if (!account) return;
      setLoading(true);
      setError(null);
      try {
        // ── Pre-flight checks ──────────────────────────────────────────────
        const currentRoom = await callGetRoom(roomId);
        console.log("Pre-declare room phase:", currentRoom.phase);
        console.log("Pre-declare active_player_index:", currentRoom.active_player_index);
        console.log("Pre-declare account:", account.address);

        if (currentRoom.phase !== "DeclarationPhase") {
          setError(`Wrong phase: ${currentRoom.phase}. Expected DeclarationPhase.`);
          setLoading(false);
          return;
        }

        const isPlayerA = normalizeAddress(account.address) === normalizeAddress(currentRoom.player_a);
        const activeIndex = Number(currentRoom.active_player_index ?? 0);
        const isActivePlayer = (isPlayerA && activeIndex === 0) || (!isPlayerA && activeIndex === 1);
        console.log("isPlayerA:", isPlayerA, "activeIndex:", activeIndex, "isActive:", isActivePlayer);

        if (!isActivePlayer) {
          setError("Not your turn to declare");
          setLoading(false);
          return;
        }

        // ── Submit ─────────────────────────────────────────────────────────
        const { CallData } = await import("starknet");
        const compiledCalldata = CallData.compile({
          room_id: "0x" + Number(roomId).toString(16),
          declaration: String(declarationType),
          proof_a_x: toHexFelt(cairoProof?.a?.x),
          proof_a_y: toHexFelt(cairoProof?.a?.y),
          proof_b_x0: toHexFelt(cairoProof?.b?.x?.real),
          proof_b_x1: toHexFelt(cairoProof?.b?.x?.imag),
          proof_b_y0: toHexFelt(cairoProof?.b?.y?.real),
          proof_b_y1: toHexFelt(cairoProof?.b?.y?.imag),
          proof_c_x: toHexFelt(cairoProof?.c?.x),
          proof_c_y: toHexFelt(cairoProof?.c?.y),
        });
        console.log("Declare calldata length:", compiledCalldata.length);
        console.log("Declare calldata:", compiledCalldata);

        const tx = await executeWithOurFees(account, [{
          contractAddress: GAME_ADDRESS,
          entrypoint: "declare",
          calldata: compiledCalldata,
        }]);
        await waitForTx(tx.transaction_hash);
        const updatedRoom = await waitForPhaseChange(roomId, "DeclarationPhase");
        setRoom(updatedRoom);
      } catch (e) {
        console.error("Declare error full:", e);
        console.error("Declare error data:", e.data);
        console.error("Declare error cause:", e.cause);
        const msg = e.message ?? "";
        const match = msg.match(/0x[0-9a-f]+\s+\('([^']+)'\)/);
        setError(match ? `Contract error: ${match[1]}` : msg || "Failed to declare");
      } finally {
        setLoading(false);
      }
    },
    [account, roomId, fetchRoom]
  );

  // ── Challenge ──────────────────────────────────────────────────────────────
  const challenge = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    setError(null);
    try {
      const { CallData } = await import("starknet");
      const tx = await executeWithOurFees(account, [{
        contractAddress: GAME_ADDRESS,
        entrypoint: "challenge",
        calldata: CallData.compile({ room_id: "0x" + Number(roomId).toString(16) }),
      }]);
      await waitForTx(tx.transaction_hash);
      const updatedRoom = await waitForPhaseChange(roomId, "ChallengePhase");
      setRoom(updatedRoom);
    } catch (e) {
      setError(e.message ?? "Failed to challenge");
    } finally {
      setLoading(false);
    }
  }, [account, roomId, fetchRoom]);

  // ── Fold ───────────────────────────────────────────────────────────────────
  const fold = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    setError(null);
    try {
      const { CallData } = await import("starknet");
      const tx = await executeWithOurFees(account, [{
        contractAddress: GAME_ADDRESS,
        entrypoint: "fold",
        calldata: CallData.compile({ room_id: "0x" + Number(roomId).toString(16) }),
      }]);
      await waitForTx(tx.transaction_hash);
      const updatedRoom = await waitForPhaseChange(roomId, "ChallengePhase");
      setRoom(updatedRoom);
    } catch (e) {
      setError(e.message ?? "Failed to fold");
    } finally {
      setLoading(false);
    }
  }, [account, roomId, fetchRoom]);

  return { room, hand, setHand, commitHand, declare, challenge, fold, loading, error, salt };
}

// ── Fetch all open rooms hook ─────────────────────────────────────────────────
export function useRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRooms = useCallback(async () => {
    if (GAME_ADDRESS === "0x0") return;
    setLoading(true);
    try {
      const nextId = await callGetNextRoomId();
      console.debug("[useRooms] nextId:", nextId);
      const results = [];
      for (let id = 1; id < nextId; id++) {
        try {
          const room = await callGetRoom(id);
          console.debug(`[useRooms] room ${id}:`, room.phase, "player_a:", room.player_a);
          results.push({ id, ...room });
        } catch (e) {
          console.debug(`[useRooms] skip room ${id}:`, e?.message);          
        }
      }
      setRooms(results);
    } catch (e) {
      console.error("fetchRooms error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  return { rooms, loading, refetch: fetchRooms };
}

// ── Create room hook ─────────────────────────────────────────────────────────
export function useCreateRoom() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { account } = useAccount();

  const createRoom = useCallback(
    async (betAmount) => {
      if (!account) return null;
      setLoading(true);
      setError(null);
      try {
        const { CallData, cairo } = await import("starknet");
        
        const expectedRoomId = await callGetNextRoomId();

        const betUint256 = cairo.uint256(BigInt(betAmount));
        const calls = [
          {
            contractAddress: TOKEN_ADDRESS,
            entrypoint: "approve",
            calldata: CallData.compile({ spender: GAME_ADDRESS, amount: betUint256 }),
          },
          {
            contractAddress: GAME_ADDRESS,
            entrypoint: "create_room",
            calldata: CallData.compile({ bet_amount: betUint256 }),
          },
        ];
        console.log("createRoom calls:", JSON.stringify(calls, (_, v) => typeof v === "bigint" ? v.toString() : v, 2));
        console.log("TOKEN_ADDRESS:", TOKEN_ADDRESS);
        console.log("GAME_ADDRESS:", GAME_ADDRESS);
        console.log("betUint256:", betUint256);
        console.log("account.address:", account.address);
        const tx = await executeWithOurFees(account, calls);
        await waitForTx(tx.transaction_hash);

        return expectedRoomId;
      } catch (e) {
        console.error("createRoom full error:", e);
        console.error("createRoom error cause:", e.cause);
        setError(e.message ?? "Failed to create room");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [account]
  );

  return { createRoom, loading, error };
}

// ── Join room hook ───────────────────────────────────────────────────────────
export function useJoinRoom() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { account } = useAccount();

  const joinRoom = useCallback(
    async (roomId) => {
      if (!account) return false;
      setLoading(true);
      setError(null);
      try {
        const { CallData, cairo } = await import("starknet");
        
        const room = await callGetRoom(roomId);
        console.log("joinRoom - room data:", room);
        console.log("joinRoom - bet_amount raw:", room.bet_amount?.toString());
        console.log("joinRoom - TOKEN_ADDRESS:", TOKEN_ADDRESS);
        console.log("joinRoom - GAME_ADDRESS:", GAME_ADDRESS);

        if (normalizeAddress(room.player_a) === normalizeAddress(account.address)) {
          throw new Error("Cannot join your own room");
        }
        const betBigInt = BigInt(room.bet_amount ?? 0);
        console.log("joinRoom - betBigInt:", betBigInt.toString());
        const betUint256 = cairo.uint256(betBigInt);
        console.log("joinRoom - betUint256:", betUint256);

        const tx = await executeWithOurFees(account, [
          {
            contractAddress: TOKEN_ADDRESS,
            entrypoint: "approve",
            calldata: CallData.compile({ spender: GAME_ADDRESS, amount: betUint256 }),
          },
          {
            contractAddress: GAME_ADDRESS,
            entrypoint: "join_room",
            calldata: CallData.compile({ room_id: roomId }),
          },
        ]);
        await waitForTx(tx.transaction_hash);
        return true;
      } catch (e) {
        setError(e.message ?? "Failed to join room");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [account]
  );

  return { joinRoom, loading, error };
}

// ── Mint tokens hook ─────────────────────────────────────────────────────────
export function useMintTokens() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { account } = useAccount();

  const mintTokens = useCallback(async () => {
    if (!account) return;
    if (TOKEN_ADDRESS === "0x0") {
      setError("Token contract not configured. Check VITE_TOKEN_CONTRACT in .env and restart the dev server.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { CallData, cairo } = await import("starknet");
      const amount = cairo.uint256(BigInt("1000000000000000000000"));
      const tx = await executeWithOurFees(account, [{
        contractAddress: TOKEN_ADDRESS,
        entrypoint: "mint",
        calldata: CallData.compile({ recipient: account.address, amount }),
      }]);
      await waitForTx(tx.transaction_hash);
    } catch (e) {
      setError(e.message ?? "Failed to mint tokens");
    } finally {
      setLoading(false);
    }
  }, [account]);

  return { mintTokens, loading, error };
}

// ── Token balance hook ────────────────────────────────────────────────────────
export function useTokenBalance(address) {
  const [balance, setBalance] = useState(null);

  const fetchBalance = useCallback(async () => {
    if (!address || TOKEN_ADDRESS === "0x0") return;
    try {
      const bal = await callBalanceOf(address);
      setBalance(bal);
    } catch {      
    }
  }, [address]);

  useEffect(() => {
    fetchBalance();
    const id = setInterval(fetchBalance, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchBalance]);

  return { balance, refetch: fetchBalance };
}