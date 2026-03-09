import { useState, useEffect, useCallback } from "react";
import { useAccount, useContract, useSendTransaction } from "@starknet-react/core";
import { GAME_ADDRESS, TOKEN_ADDRESS, GAME_ABI, TOKEN_ABI, parseRoom } from "../utils/starknet";
import { computeCommitment } from "../utils/proof";
import { provider } from "../utils/starknet";

// ── Poll interval for room state ─────────────────────────────────────────────
const POLL_INTERVAL_MS = 5000;

/**
 * Main hook for interacting with the ZKluff game contract.
 * Polls room state every POLL_INTERVAL_MS.
 */
export function useGame(roomId, playerAddress) {
  const [room, setRoom] = useState(null);
  const [hand, setHand] = useState([]); // private — never sent to chain
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
      const contract = new (await import("starknet")).Contract(GAME_ABI, GAME_ADDRESS, provider);
      const raw = await contract.get_room(roomId);
      setRoom(parseRoom(raw));
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

      const { Contract } = await import("starknet");
      const gameContract = new Contract(GAME_ABI, GAME_ADDRESS, account);
      const tx = await gameContract.commit_hand(roomId, commitment);
      await provider.waitForTransaction(tx.transaction_hash);
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
        const { Contract, cairo } = await import("starknet");
        const gameContract = new Contract(GAME_ABI, GAME_ADDRESS, account);

        // Cairo enum variant as felt
        const declarationEnum = { variant: { [declarationEnumVariant(declarationType)]: {} } };

        const tx = await gameContract.declare(
          roomId,
          declarationEnum,
          cairoProof.proof_a,
          cairoProof.proof_b,
          cairoProof.proof_c
        );
        await provider.waitForTransaction(tx.transaction_hash);
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
      const { Contract } = await import("starknet");
      const gameContract = new Contract(GAME_ABI, GAME_ADDRESS, account);
      const tx = await gameContract.challenge(roomId);
      await provider.waitForTransaction(tx.transaction_hash);
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
      const { Contract } = await import("starknet");
      const gameContract = new Contract(GAME_ABI, GAME_ADDRESS, account);
      const tx = await gameContract.fold(roomId);
      await provider.waitForTransaction(tx.transaction_hash);
      await fetchRoom();
    } catch (e) {
      setError(e.message ?? "Failed to fold");
    } finally {
      setLoading(false);
    }
  }, [account, roomId, fetchRoom]);

  return { room, hand, setHand, commitHand, declare, challenge, fold, loading, error, salt };
}

// ── Create room hook ─────────────────────────────────────────────────────────
export function useCreateRoom(playerAddress) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { account } = useAccount();

  const createRoom = useCallback(
    async (betAmount) => {
      if (!account) return null;
      setLoading(true);
      setError(null);
      try {
        const { Contract } = await import("starknet");

        // Approve token spend first
        const tokenContract = new Contract(TOKEN_ABI, TOKEN_ADDRESS, account);
        const approveTx = await tokenContract.approve(GAME_ADDRESS, betAmount);
        await provider.waitForTransaction(approveTx.transaction_hash);

        // Create room
        const gameContract = new Contract(GAME_ABI, GAME_ADDRESS, account);
        const tx = await gameContract.create_room(betAmount);
        const receipt = await provider.waitForTransaction(tx.transaction_hash);

        // Extract room_id from events
        const roomEvent = receipt.events?.find((e) =>
          e.keys?.[0]?.includes("RoomCreated")
        );
        const roomId = roomEvent ? Number(roomEvent.keys[1]) : null;
        return roomId;
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
export function useJoinRoom(playerAddress) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { account } = useAccount();

  const joinRoom = useCallback(
    async (roomId) => {
      if (!account) return false;
      setLoading(true);
      setError(null);
      try {
        const { Contract } = await import("starknet");

        // Fetch room to get bet amount for approval
        const gameContractView = new Contract(GAME_ABI, GAME_ADDRESS, provider);
        const raw = await gameContractView.get_room(roomId);
        const betAmount = raw.bet_amount;

        // Approve token spend
        const tokenContract = new Contract(TOKEN_ABI, TOKEN_ADDRESS, account);
        const approveTx = await tokenContract.approve(GAME_ADDRESS, betAmount);
        await provider.waitForTransaction(approveTx.transaction_hash);

        // Join
        const gameContract = new Contract(GAME_ABI, GAME_ADDRESS, account);
        const tx = await gameContract.join_room(roomId);
        await provider.waitForTransaction(tx.transaction_hash);
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

// ── Helpers ──────────────────────────────────────────────────────────────────
function declarationEnumVariant(type) {
  return [
    "HighCard", "OnePair", "TwoPair", "ThreeOfAKind",
    "Straight", "Flush", "FullHouse", "FourOfAKind", "StraightFlush",
  ][type] ?? "HighCard";
}
