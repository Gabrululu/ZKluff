import React, { useState } from "react";
import PlayingCard, { allCardOptions, decodeCard } from "./PlayingCard";

const SUIT_GROUPS = [
  { label: "Spades ♠", suits: [3] },
  { label: "Hearts ♥", suits: [2] },
  { label: "Diamonds ♦", suits: [1] },
  { label: "Clubs ♣", suits: [0] },
];

const RANK_LABELS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

export default function HandDisplay({ hand, onHandChange, onCommit, phase, loading, committed }) {
  const [filterSuit, setFilterSuit] = useState(null);
  const canEdit = phase === "CommitPhase" && !committed;
  const allCards = allCardOptions();

  const addCard = (value) => {
    if (hand.includes(value) || hand.length >= 5) return;
    onHandChange([...hand, value]);
  };

  const removeCard = (idx) => onHandChange(hand.filter((_, i) => i !== idx));

  // Cards filtered by suit group
  const displayCards = filterSuit === null
    ? allCards
    : allCards.filter((c) => SUIT_GROUPS[filterSuit].suits.includes((c.value - 1) % 4));

  return (
    <div className="panel-felt fade-up" style={{ display: "grid", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>
          Your Hand
          <span style={{ color: "var(--text-dim)", fontWeight: 400, marginLeft: 8, fontSize: "0.85rem" }}>
            (private — never sent to chain)
          </span>
        </h3>
        <span className={`badge ${committed ? "badge-green" : canEdit ? "badge-gold" : "badge-muted"}`}>
          {committed ? "✓ Committed" : canEdit ? `${hand.length}/5 cards` : "Locked"}
        </span>
      </div>

      {/* Hand display row */}
      <div className="hand-row">
        {hand.length === 0 && (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            height: 96, border: "2px dashed var(--border)", borderRadius: 12,
            color: "var(--text-dim)", fontSize: "0.85rem", gap: "0.5rem",
          }}>
            <span style={{ fontSize: "1.2rem" }}>♠</span>
            {canEdit ? "Select up to 5 cards from the picker below" : "No cards selected"}
          </div>
        )}
        {hand.map((v, i) => (
          <PlayingCard
            key={v}
            value={v}
            onRemove={canEdit ? () => removeCard(i) : null}
          />
        ))}
        {/* Empty card slots */}
        {canEdit && hand.length > 0 && hand.length < 5 && Array.from({ length: 5 - hand.length }).map((_, i) => (
          <div key={i} style={{
            width: 68, height: 96, border: "2px dashed var(--border)", borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-dim)", fontSize: "1.4rem",
          }}>+</div>
        ))}
      </div>

      {/* Card picker */}
      {canEdit && (
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", padding: "1rem", border: "1px solid var(--border)" }}>
          {/* Suit filter */}
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            <button
              className={filterSuit === null ? "btn-outline" : "btn-ghost"}
              style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem" }}
              onClick={() => setFilterSuit(null)}
            >All</button>
            {SUIT_GROUPS.map((g, i) => (
              <button
                key={i}
                className={filterSuit === i ? "btn-outline" : "btn-ghost"}
                style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem" }}
                onClick={() => setFilterSuit(filterSuit === i ? null : i)}
              >{g.label}</button>
            ))}
          </div>

          {/* Card grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))",
            gap: "0.4rem",
            maxHeight: 260, overflowY: "auto",
          }}>
            {displayCards.map(({ value }) => {
              const inHand = hand.includes(value);
              return (
                <div
                  key={value}
                  onClick={() => !inHand && addCard(value)}
                  style={{
                    opacity: inHand ? 0.3 : 1,
                    cursor: inHand ? "not-allowed" : "pointer",
                    transform: inHand ? "scale(0.92)" : undefined,
                    transition: "all 0.15s",
                  }}
                >
                  <PlayingCard value={value} small />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Commit button */}
      {canEdit && hand.length === 5 && (
        <button
          className="btn-primary pulse-glow"
          style={{ fontSize: "1rem", padding: "0.85rem" }}
          onClick={onCommit}
          disabled={loading}
        >
          {loading
            ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Committing…</>
            : "🔒 Commit Hand to Blockchain"}
        </button>
      )}

      {committed && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.6rem",
          fontSize: "0.82rem", color: "var(--accent)",
          background: "var(--accent-dim)", borderRadius: "var(--radius)",
          padding: "0.6rem 0.85rem", border: "1px solid rgba(0,232,124,0.2)",
        }}>
          <span>✓</span>
          Hand committed on-chain. Cards remain private until the game ends.
        </div>
      )}
    </div>
  );
}
