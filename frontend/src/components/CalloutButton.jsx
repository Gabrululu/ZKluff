import React, { useState } from "react";

const DECLARATION_LABELS = [
  "High Card","One Pair","Two Pair","Three of a Kind",
  "Straight","Flush","Full House","Four of a Kind","Straight Flush",
];
const DECLARATION_ICONS = ["🃏","👫","✌️","🎯","📈","🌊","🏠","4️⃣","⚡"];

export default function CalloutButton({ declaration, onChallenge, onFold, loading }) {
  const [confirming, setConfirming] = useState(null);
  const declIndex = Number(declaration);
  const declLabel = DECLARATION_LABELS[declIndex] ?? "Unknown";
  const declIcon = DECLARATION_ICONS[declIndex] ?? "🃏";

  if (confirming === "challenge") return (
    <div className="panel fade-up" style={{ borderColor: "var(--danger)", border: "1.5px solid" }}>
      <div style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--danger)" }}>
        ⚠ Challenge the declaration?
      </div>
      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.55 }}>
        The ZK proof was already verified on-chain — if valid, you will lose the pot.
        Challenge only if you believe the contract accepted a fraudulent proof (should not happen with Garaga).
      </p>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button className="btn-danger" style={{ flex: 1 }} disabled={loading}
          onClick={() => { setConfirming(null); onChallenge(); }}>
          {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : "Yes, Challenge"}
        </button>
        <button className="btn-ghost" onClick={() => setConfirming(null)}>Cancel</button>
      </div>
    </div>
  );

  if (confirming === "fold") return (
    <div className="panel fade-up">
      <div style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem" }}>Fold and concede?</div>
      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.55 }}>
        You'll forfeit your share of the pot to your opponent.
      </p>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button className="btn-ghost" style={{ flex: 1 }} disabled={loading}
          onClick={() => { setConfirming(null); onFold(); }}>
          {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : "Yes, Fold"}
        </button>
        <button className="btn-primary" onClick={() => setConfirming(null)}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="panel fade-up" style={{ borderColor: "var(--gold-dim)" }}>
      {/* Declaration shown */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.85rem",
        padding: "1rem",
        background: "var(--gold-dim)", borderRadius: "var(--radius)",
        border: "1px solid rgba(245,200,66,0.2)",
        marginBottom: "1.25rem",
      }}>
        <span style={{ fontSize: "2rem" }}>{declIcon}</span>
        <div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Opponent declared
          </div>
          <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--gold)" }}>{declLabel}</div>
          <span className="badge badge-green" style={{ marginTop: "0.3rem" }}>ZK proof verified ✓</span>
        </div>
      </div>

      <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Your move</h3>
      <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", marginBottom: "1.25rem", lineHeight: 1.55 }}>
        The ZK proof has been verified on-chain — your opponent's declaration is cryptographically proven.
        Challenge is risky. Fold to concede the round.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <button className="btn-danger" disabled={loading} onClick={() => setConfirming("challenge")}
          style={{ padding: "0.85rem" }}>
          ⚔ Challenge
        </button>
        <button className="btn-ghost" disabled={loading} onClick={() => setConfirming("fold")}
          style={{ padding: "0.85rem" }}>
          🏳 Fold
        </button>
      </div>
    </div>
  );
}
