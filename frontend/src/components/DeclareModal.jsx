import React, { useState } from "react";
import { useProofGenerator } from "../hooks/useProofGenerator";
import PlayingCard from "./PlayingCard";

const DECLARATIONS = [
  { id: 0, icon: "🃏", label: "High Card",       desc: "Any hand — always true",              example: "A K Q J 9" },
  { id: 1, icon: "👫", label: "One Pair",         desc: "Two cards of the same rank",          example: "A A K Q J" },
  { id: 2, icon: "✌️", label: "Two Pair",         desc: "Two different pairs",                 example: "A A K K Q" },
  { id: 3, icon: "🎯", label: "Three of a Kind",  desc: "Three cards of the same rank",        example: "A A A K Q" },
  { id: 4, icon: "📈", label: "Straight",         desc: "Five consecutive ranks",              example: "5 6 7 8 9" },
  { id: 5, icon: "🌊", label: "Flush",            desc: "All five cards same suit",            example: "2 5 7 J A ♠" },
  { id: 6, icon: "🏠", label: "Full House",       desc: "Three of a kind + a pair",            example: "A A A K K" },
  { id: 7, icon: "4️⃣", label: "Four of a Kind",  desc: "Four cards of the same rank",         example: "A A A A K" },
  { id: 8, icon: "⚡", label: "Straight Flush",   desc: "Straight + all same suit",            example: "5 6 7 8 9 ♠" },
];

export default function DeclareModal({ hand, onDeclare, onClose, loading }) {
  const [selected, setSelected] = useState(null);
  const [salt] = useState(() =>
    BigInt("0x" + Array.from(crypto.getRandomValues(new Uint8Array(31)))
      .map((b) => b.toString(16).padStart(2, "0")).join("")).toString()
  );
  const { generateProof, proving, proofError } = useProofGenerator();

  const handleDeclare = async () => {
    if (selected === null || hand.length !== 5) return;
    const result = await generateProof({ cards: hand, salt, declarationType: selected });
    if (!result) return;
    await onDeclare(selected, result.cairoProof);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem" }}>Make a Declaration</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 2 }}>
              A ZK proof will be generated in your browser
            </p>
          </div>
          <button className="btn-ghost" style={{ width: 36, height: 36, padding: 0, borderRadius: "50%", fontSize: "1rem" }} onClick={onClose}>✕</button>
        </div>

        {/* Your hand preview */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Your hand (private)
          </div>
          <div style={{ display: "flex", gap: "0.45rem" }}>
            {hand.length === 5
              ? hand.map((v) => <PlayingCard key={v} value={v} small />)
              : <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>You need 5 cards selected.</p>
            }
          </div>
        </div>

        <div className="divider" style={{ marginBottom: "1.25rem" }} />

        {/* Declaration grid */}
        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Choose declaration
        </div>
        <div style={{ display: "grid", gap: "0.4rem", maxHeight: 340, overflowY: "auto", marginBottom: "1.25rem", paddingRight: "0.25rem" }}>
          {DECLARATIONS.map((d) => (
            <label key={d.id} className={`rank-card ${selected === d.id ? "selected" : ""}`} onClick={() => setSelected(d.id)}>
              <input type="radio" name="decl" value={d.id} checked={selected === d.id} onChange={() => setSelected(d.id)} style={{ display: "none" }} />
              <span className="rank-icon">{d.icon}</span>
              <div style={{ flex: 1 }}>
                <div className="rank-name">{d.label}</div>
                <div className="rank-desc">{d.desc}</div>
              </div>
              <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "monospace", flexShrink: 0 }}>
                {d.example}
              </span>
              {selected === d.id && (
                <span style={{ color: "var(--accent)", fontSize: "1rem", flexShrink: 0 }}>✓</span>
              )}
            </label>
          ))}
        </div>

        {/* ZK proof notice */}
        <div style={{
          padding: "0.75rem 1rem", borderRadius: "var(--radius)",
          background: "var(--accent-dim)", border: "1px solid rgba(0,232,124,0.2)",
          fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1.25rem",
          display: "flex", gap: "0.5rem",
        }}>
          <span style={{ color: "var(--accent)", flexShrink: 0 }}>🔐</span>
          The ZK proof is generated locally using snarkjs + Groth16. It cryptographically
          proves your declaration is true without revealing your cards.
        </div>

        {proofError && (
          <div style={{ color: "var(--danger)", fontSize: "0.83rem", marginBottom: "0.75rem", padding: "0.6rem", background: "var(--danger-dim)", borderRadius: "var(--radius)" }}>
            {proofError}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="btn-gold"
            style={{ flex: 1, fontSize: "1rem", padding: "0.85rem" }}
            onClick={handleDeclare}
            disabled={selected === null || hand.length !== 5 || loading || proving}
          >
            {proving
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Generating ZK proof…</>
              : loading
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Submitting…</>
              : "✦ Declare on Chain"}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
