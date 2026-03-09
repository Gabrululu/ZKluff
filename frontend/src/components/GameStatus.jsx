import React from "react";

const PHASES = ["WaitingForPlayers", "CommitPhase", "DeclarationPhase", "ChallengePhase", "Resolved"];
const PHASE_LABELS = ["Waiting", "Commit", "Declare", "Challenge", "Done"];
const PHASE_ICONS = ["⏳", "🔒", "📢", "⚔️", "🏆"];

const DECLARATION_LABELS = [
  "High Card","One Pair","Two Pair","Three of a Kind",
  "Straight","Flush","Full House","Four of a Kind","Straight Flush",
];
const DECLARATION_ICONS = ["🃏","👫","👫👫","🎯","📈","🌊","🏠","4️⃣","⚡"];

function addr(a) {
  if (!a || a === "0x0" || a === "0") return null;
  return a.slice(0, 8) + "…" + a.slice(-4);
}

function PhaseStep({ label, icon, state }) {
  // state: "done" | "active" | "pending"
  return (
    <div className={`phase-step ${state}`}>
      <div className="step-dot">{state === "done" ? "✓" : icon}</div>
      <span className="step-label">{label}</span>
    </div>
  );
}

export default function GameStatus({ room, roomId, playerAddress }) {
  const phaseIndex = PHASES.indexOf(room.phase);
  const isPlayerA = playerAddress && room.player_a === playerAddress;
  const isPlayerB = playerAddress && room.player_b === playerAddress;

  const potFormatted = room.pot
    ? (BigInt(room.pot) / 10n ** 18n).toString()
    : "0";

  return (
    <div style={{ display: "grid", gap: "0.85rem" }} className="fade-up">

      {/* Winner banner */}
      {room.phase === "Resolved" && room.winner && room.winner !== "0x0" && (
        <div className="winner-banner">
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🏆</div>
          <h2 style={{ fontSize: "1.4rem", fontFamily: "'Playfair Display', serif", color: "var(--gold)" }}>
            {room.winner === playerAddress ? "You won!" : "Game Over"}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.35rem" }}>
            Winner: <span className="addr">{addr(room.winner)}</span>
          </p>
        </div>
      )}

      {/* Main panel */}
      <div className="panel">
        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <span style={{ color: "var(--text-dim)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Room
            </span>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, fontFamily: "'Playfair Display', serif" }}>
              #{roomId}
            </div>
          </div>
          <div className="pot-display" style={{ padding: "0.75rem 1.25rem" }}>
            <div className="pot-label">Pot</div>
            <div className="pot-amount" style={{ fontSize: "1.8rem" }}>{potFormatted}</div>
            <div className="pot-unit">TKN</div>
          </div>
        </div>

        {/* Phase stepper */}
        <div className="phase-steps" style={{ marginBottom: "1.5rem" }}>
          {PHASES.slice(0, -1).map((p, i) => {
            const state = i < phaseIndex ? "done" : i === phaseIndex ? "active" : "pending";
            return <PhaseStep key={p} label={PHASE_LABELS[i]} icon={PHASE_ICONS[i]} state={state} />;
          })}
        </div>

        <div className="divider" style={{ marginBottom: "1.25rem" }} />

        {/* Players */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          {[
            { label: "Player A", isYou: isPlayerA, addr: addr(room.player_a), committed: room.commitment_a && room.commitment_a !== "0x0" },
            { label: "Player B", isYou: isPlayerB, addr: addr(room.player_b), committed: room.commitment_b && room.commitment_b !== "0x0" },
          ].map(({ label, isYou, addr: a, committed }) => (
            <div key={label} style={{
              padding: "0.85rem",
              borderRadius: "var(--radius)",
              border: `1.5px solid ${isYou ? "var(--accent)" : "var(--border)"}`,
              background: isYou ? "var(--accent-dim)" : "var(--surface-2)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {label}
                </span>
                {isYou && <span className="badge badge-green" style={{ fontSize: "0.62rem" }}>You</span>}
              </div>
              <div className="addr" style={{ display: "block", marginBottom: "0.4rem" }}>
                {a ?? <span style={{ color: "var(--text-dim)" }}>Waiting…</span>}
              </div>
              {a && (
                committed
                  ? <span className="badge badge-green">✓ Committed</span>
                  : <span className="badge badge-muted">Not committed</span>
              )}
            </div>
          ))}
        </div>

        {/* Active declaration */}
        {(room.phase === "ChallengePhase" || room.phase === "Resolved") &&
          room.declaration_type_felt !== undefined && room.declaration_type_felt !== null && (
          <div style={{
            marginTop: "1rem",
            padding: "0.85rem 1rem",
            background: "var(--gold-dim)",
            borderRadius: "var(--radius)",
            border: "1px solid rgba(245,200,66,0.25)",
            display: "flex", alignItems: "center", gap: "0.75rem",
          }}>
            <span style={{ fontSize: "1.5rem" }}>
              {DECLARATION_ICONS[Number(room.declaration_type_felt)] ?? "🃏"}
            </span>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Declaration on chain
              </div>
              <div style={{ fontWeight: 700, color: "var(--gold)" }}>
                {DECLARATION_LABELS[Number(room.declaration_type_felt)] ?? "Unknown"}
              </div>
            </div>
            <span className="badge badge-green" style={{ marginLeft: "auto" }}>ZK Verified ✓</span>
          </div>
        )}
      </div>
    </div>
  );
}
