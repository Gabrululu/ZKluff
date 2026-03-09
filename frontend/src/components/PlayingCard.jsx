import React from "react";

const SUIT_SYMBOLS = { "♠": true, "♣": true, "♥": false, "♦": false };
const SUITS = ["♣", "♦", "♥", "♠"]; // index 0-3, matches encoding
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

export function decodeCard(value) {
  if (!value || value < 1 || value > 52) return null;
  const suitIndex = (value - 1) % 4;
  const rankIndex = Math.floor((value - 1) / 4);
  const suit = SUITS[suitIndex];
  return {
    rank: RANKS[rankIndex],
    suit,
    isRed: !SUIT_SYMBOLS[suit],
  };
}

export function allCardOptions() {
  const options = [];
  for (let rank = 0; rank < 13; rank++) {
    for (let suit = 0; suit < 4; suit++) {
      const value = rank * 4 + suit + 1;
      const s = SUITS[suit];
      options.push({ value, label: `${RANKS[rank]}${s}`, isRed: !SUIT_SYMBOLS[s] });
    }
  }
  return options;
}

// ── Visual playing card ──────────────────────────────────────────────────────

export default function PlayingCard({ value, selected, onRemove, faceDown, small }) {
  const card = value ? decodeCard(value) : null;
  const colorClass = card?.isRed ? "card-red" : "card-black";
  const w = small ? 52 : 68;
  const h = small ? 74 : 96;

  if (faceDown || !card) {
    return (
      <div className="playing-card card-back" style={{ width: w, height: h }}>
        <div className="card-back-pattern" style={{ width: w - 16, height: h - 20 }} />
      </div>
    );
  }

  return (
    <div
      className={`playing-card ${colorClass} ${selected ? "card-selected" : ""}`}
      style={{ width: w, height: h }}
    >
      <div className="card-corner">
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit-small">{card.suit}</span>
      </div>
      <span className="card-suit-center">{card.suit}</span>
      <div className="card-corner card-corner-bottom">
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit-small">{card.suit}</span>
      </div>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            position: "absolute", top: -8, right: -8,
            width: 20, height: 20, borderRadius: "50%",
            background: "var(--danger)", color: "#fff",
            border: "2px solid var(--bg)",
            fontSize: "0.65rem", fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 0, lineHeight: 1, zIndex: 2,
            boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
