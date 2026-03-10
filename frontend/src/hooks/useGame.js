import { useState, useEffect, useCallback } from "react";
import { useAccount } from "@starknet-react/core";
import {
  GAME_ADDRESS, TOKEN_ADDRESS,
  callGetNextRoomId, callGetRoom, callBalanceOf,
  provider,
} from "../utils/starknet";
import { computeCommitment } from "../utils/proof";

// ── Poll interval for room state ─────────────────────────────────────────────
const POLL_INTERVAL_MS = 5000;

/**
 * waitForTx — polls until tx is accepted, compatible with RPC v0_7 and v0_10.
 */
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

/**
 * Main hook for interacting with the ZKluff game contract.
 * Polls room state every POLL_INTERVAL_MS.
 */
export function useGame(roomId, playerAddress) {
  const [room, setRoom] = useState(null);
  const [hand, setHand] = useState([]);
  const [salt] = useState(() =>
    BigInt("0x" + Array.from(crypto.getRandomValues(new Uint8Array(31)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")).toString()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { account } = useAccount();

  // ── Fetch room state ───────────────────────────────────────────────────────
  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      const parsed = await callGetRoom(roomId);
      setRoom(parsed);
    } catch (e) {
      console.error("fetchRoom error:", e);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoom();
    const id = setInterval(fetchRoom, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchRoom]);

  // ── Commit hand ────────────────────────────────────────────────────────────
  const commitHand = useCallback(async () => {
    if (!account || hand.length !== 5) return;
    setLoading(true);
    setError(null);
    try {
      const commitment = await computeCommitment(hand, salt);
      const { CallData } = await import("starknet");
      const tx = await account.execute([{
        contractAddress: GAME_ADDRESS,
        entrypoint: "commit_hand",
        calldata: CallData.compile({ room_id: roomId, commitment }),
      }]);
      await waitForTx(tx.transaction_hash);
      await fetchRoom();
    } catch (e) {
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
        const tx = await account.execute([{
          contractAddress: GAME_ADDRESS,
          entrypoint: "declare",
          calldata: [
            roomId,
            declarationType,
            ...cairoProof.proof_a,
            ...cairoProof.proof_b[0],
            ...cairoProof.proof_b[1],
            ...cairoProof.proof_c,
          ],
        }]);
        await waitForTx(tx.transaction_hash);
        await fetchRoom();
      } catch (e) {
        setError(e.message ?? "Failed to declare");
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
      const tx = await account.execute([{
        contractAddress: GAME_ADDRESS,
        entrypoint: "challenge",
        calldata: CallData.compile({ room_id: roomId }),
      }]);
      await waitForTx(tx.transaction_hash);
      await fetchRoom();
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
      const tx = await account.execute([{
        contractAddress: GAME_ADDRESS,
        entrypoint: "fold",
        calldata: CallData.compile({ room_id: roomId }),
      }]);
      await waitForTx(tx.transaction_hash);
      await fetchRoom();
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
      const results = [];
      for (let id = 1; id < nextId; id++) {
        try {
          const room = await callGetRoom(id);
          results.push({ id, ...room });
        } catch {
          // skip rooms that fail to fetch
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

        // Read next_room_id before creating — that will be the new room's id
        const expectedRoomId = await callGetNextRoomId();

        const betUint256 = cairo.uint256(BigInt(betAmount));
        const tx = await account.execute([
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
        ]);
        await waitForTx(tx.transaction_hash);

        return expectedRoomId;
      } catch (e) {
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

        // Fetch room and validate before sending tx
        const room = await callGetRoom(roomId);
        if (room.player_a?.toLowerCase() === account.address?.toLowerCase()) {
          throw new Error("Cannot join your own room");
        }
        const betUint256 = cairo.uint256(BigInt(room.bet_amount));

        const tx = await account.execute([
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
      const tx = await account.execute([{
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
      // silent
    }
  }, [address]);

  useEffect(() => {
    fetchBalance();
    const id = setInterval(fetchBalance, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchBalance]);

  return { balance, refetch: fetchBalance };
}
