import { useState, useEffect, useCallback } from "react";
import { useAccount, useContract, useSendTransaction } from "@starknet-react/core";
import { GAME_ADDRESS, TOKEN_ADDRESS, GAME_ABI, TOKEN_ABI, parseRoom, provider } from "../utils/starknet";
import { computeCommitment } from "../utils/proof";

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

// ── Fetch all open rooms hook ─────────────────────────────────────────────────
export function useRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRooms = useCallback(async () => {
    if (GAME_ADDRESS === "0x0") return;
    setLoading(true);
    try {
      const { Contract } = await import("starknet");
      const contract = new Contract(GAME_ABI, GAME_ADDRESS, provider);
      const nextId = Number(await contract.get_next_room_id());
      const results = [];
      for (let id = 1; id < nextId; id++) {
        try {
          const raw = await contract.get_room(id);
          const room = parseRoom(raw);
          results.push({ id, ...room });
        } catch {
          // skip invalid rooms
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

        // Read next_room_id BEFORE creating — that will be our new room's id
        const gameContractView = new Contract(GAME_ABI, GAME_ADDRESS, provider);
        const expectedRoomId = Number(await gameContractView.get_next_room_id());

        // Approve token spend first
        const tokenContract = new Contract(TOKEN_ABI, TOKEN_ADDRESS, account);
        const approveTx = await tokenContract.approve(GAME_ADDRESS, betAmount);
        await provider.waitForTransaction(approveTx.transaction_hash);

        // Create room
        const gameContract = new Contract(GAME_ABI, GAME_ADDRESS, account);
        const tx = await gameContract.create_room(betAmount);
        await provider.waitForTransaction(tx.transaction_hash);

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

// ── Mint tokens hook ─────────────────────────────────────────────────────────
export function useMintTokens() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { account } = useAccount();

  const mintTokens = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    setError(null);
    try {
      const { Contract } = await import("starknet");
      const tokenContract = new Contract(TOKEN_ABI, TOKEN_ADDRESS, account);
      // Mint 1000 ZKT (1000 * 10^18)
      const tx = await tokenContract.mint(account.address, BigInt("1000000000000000000000"));
      await provider.waitForTransaction(tx.transaction_hash);
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
      const { Contract } = await import("starknet");
      const tokenContract = new Contract(TOKEN_ABI, TOKEN_ADDRESS, provider);
      const raw = await tokenContract.balance_of(address);
      setBalance((Number(BigInt(raw.toString())) / 1e18).toFixed(2));
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

// ── Helpers ──────────────────────────────────────────────────────────────────
function declarationEnumVariant(type) {
  return [
    "HighCard", "OnePair", "TwoPair", "ThreeOfAKind",
    "Straight", "Flush", "FullHouse", "FourOfAKind", "StraightFlush",
  ][type] ?? "HighCard";
}
