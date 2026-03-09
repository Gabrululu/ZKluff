import React, { useState } from "react";
import { useCreateRoom, useJoinRoom } from "../hooks/useGame";
import { useAccount } from "@starknet-react/core";

const HOW_IT_WORKS = [
  { icon: "🔒", title: "Commit", desc: "Pick 5 cards. Only a hash goes on-chain — your cards stay private." },
  { icon: "📢", title: "Declare", desc: "Claim a hand rank. A ZK proof is generated in your browser to back it up." },
  { icon: "⚔️", title: "Challenge", desc: "Your opponent challenges or folds. On-chain proof decides the winner." },
];

export default function GameLobby({ onRoomSelected }) {
  const { address } = useAccount();
  const [tab, setTab] = useState("create");
  const [betAmount, setBetAmount] = useState("10");
  const [joinRoomId, setJoinRoomId] = useState("");
  const { createRoom, loading: creating, error: createErr } = useCreateRoom(address);
  const { joinRoom, loading: joining, error: joinErr } = useJoinRoom(address);

  const handleCreate = async () => {
    const id = await createRoom(BigInt(betAmount) * 10n ** 18n);
    if (id) onRoomSelected(id);
  };

  const handleJoin = async () => {
    const ok = await joinRoom(Number(joinRoomId));
    if (ok) onRoomSelected(Number(joinRoomId));
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }} className="fade-up">

      {/* Hero */}
      <div className="panel-felt" style={{ textAlign: "center", padding: "2.5rem 2rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>♠ ♥ ♦ ♣</div>
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "2rem", marginBottom: "0.5rem",
          background: "linear-gradient(90deg, var(--accent), var(--gold))",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Liar's Poker · On-Chain
        </h2>
        <p style={{ color: "var(--text-muted)", maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
          Bluff with zero-knowledge proofs. Your cards never leave the browser —
          only cryptographic commitments go on Starknet.
        </p>
      </div>

      {/* How it works */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
        {HOW_IT_WORKS.map((s, i) => (
          <div key={i} className="panel" style={{ textAlign: "center", padding: "1.25rem 1rem" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>{s.icon}</div>
            <div style={{ fontWeight: 700, marginBottom: "0.3rem", fontSize: "0.9rem" }}>{s.title}</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", lineHeight: 1.5 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Game actions */}
      <div className="panel">
        {/* Tabs */}
        <div style={{
          display: "flex", gap: "0.25rem",
          background: "var(--surface-2)", borderRadius: "var(--radius)", padding: "0.25rem",
          marginBottom: "1.5rem",
        }}>
          {["create", "join"].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1 }}
              className={tab === t ? "btn-primary" : "btn-ghost"}
            >
              {t === "create" ? "Create Room" : "Join Room"}
            </button>
          ))}
        </div>

        {tab === "create" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>
                Bet Amount (tokens)
              </label>
              <input
                type="number" min="1" value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="10"
                style={{ fontSize: "1.1rem", fontWeight: 700 }}
              />
            </div>
            {createErr && <p style={{ color: "var(--danger)", fontSize: "0.82rem" }}>{createErr}</p>}
            <button
              className="btn-primary"
              style={{ padding: "0.85rem", fontSize: "1rem" }}
              onClick={handleCreate}
              disabled={creating || !betAmount || Number(betAmount) <= 0}
            >
              {creating
                ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating…</>
                : `Create Room · ${betAmount} TKN`}
            </button>
            <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.5 }}>
              A matching bet is required from your opponent. The pot is locked in the smart contract until the game resolves.
            </p>
          </div>
        )}

        {tab === "join" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>
                Room ID
              </label>
              <input
                type="number" min="1" value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="Enter room ID from your opponent"
                style={{ fontSize: "1.1rem", fontWeight: 700 }}
              />
            </div>
            {joinErr && <p style={{ color: "var(--danger)", fontSize: "0.82rem" }}>{joinErr}</p>}
            <button
              className="btn-gold"
              style={{ padding: "0.85rem", fontSize: "1rem" }}
              onClick={handleJoin}
              disabled={joining || !joinRoomId}
            >
              {joining
                ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Joining…</>
                : "Join Room"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
