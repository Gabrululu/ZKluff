import { motion } from "framer-motion";
import { useMemo } from "react";

interface CardComponentProps {
  suit?: "♠" | "♣" | "♥" | "♦";
  rank?: string;
  faceUp?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

// Strict color rules — inline styles to avoid Tailwind theme variable conflicts
const SUIT_COLOR: Record<string, string> = {
  "♥": "#CC0000",
  "♦": "#CC0000",
  "♠": "#1a1a1a",
  "♣": "#1a1a1a",
};

const getSuitColor = (suit: string) => SUIT_COLOR[suit] ?? "#1a1a1a";

const CardComponent = ({
  suit,
  rank,
  faceUp = false,
  selected = false,
  disabled = false,
  onClick,
  size = "md",
}: CardComponentProps) => {
  const sizeClasses = {
    sm: "w-14 h-20",
    md: "w-20 h-28",
    lg: "w-28 h-40",
  };

  const cornerFontSize = {
    sm: "10px",
    md: "12px",
    lg: "15px",
  };

  const centerFontSize = {
    sm: "1.6rem",
    md: "2.2rem",
    lg: "3rem",
  };

  const patternId = useMemo(() => `circuit-${Math.random().toString(36).slice(2, 8)}`, []);
  const color = getSuitColor(suit ?? "♠");

  return (
    <motion.div
      whileHover={!disabled ? { y: -10, scale: 1.06 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={!disabled ? onClick : undefined}
      className={`${sizeClasses[size]} rounded-xl cursor-pointer select-none relative transition-shadow duration-200 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      style={{
        perspective: "1000px",
        boxShadow: selected
          ? "0 0 0 2px #00FF41, 0 0 14px 2px #00FF4166"
          : "0 4px 12px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.2)",
      }}
    >
      <motion.div
        className="w-full h-full relative"
        initial={false}
        animate={{ rotateY: faceUp ? 180 : 0 }}
        transition={{ duration: 0.55, type: "spring", stiffness: 260, damping: 22 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* ─── FACE-UP CARD ─── */}
        <div
          className="absolute inset-0 w-full h-full rounded-xl overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            backgroundColor: "#FFFFFF",
            border: "1px solid #e0e0e0",
          }}
        >
          {/* Inner border */}
          <div className="absolute inset-[3px] rounded-lg pointer-events-none" style={{ border: "1px solid #e8e8e8" }} />

          {/* Subtle ZK watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.04 }}>
            <span style={{ fontWeight: 900, fontSize: size === "sm" ? "1.2rem" : size === "lg" ? "2.4rem" : "1.7rem", color: "#000", letterSpacing: "-0.05em" }}>ZK</span>
          </div>

          {/* Top-left: rank + suit */}
          <div
            className="absolute top-1 left-1.5 flex flex-col items-center leading-none"
            style={{ color, fontSize: cornerFontSize[size], fontWeight: 700, fontFamily: "Georgia, serif" }}
          >
            <span>{rank}</span>
            <span style={{ fontSize: `calc(${cornerFontSize[size]} * 0.9)` }}>{suit}</span>
          </div>

          {/* Center: large suit symbol */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ color, fontSize: centerFontSize[size], lineHeight: 1, userSelect: "none" }}>
              {suit}
            </span>
          </div>

          {/* Bottom-right: rank + suit (rotated 180°) */}
          <div
            className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180"
            style={{ color, fontSize: cornerFontSize[size], fontWeight: 700, fontFamily: "Georgia, serif" }}
          >
            <span>{rank}</span>
            <span style={{ fontSize: `calc(${cornerFontSize[size]} * 0.9)` }}>{suit}</span>
          </div>
        </div>

        {/* ─── FACE-DOWN CARD ─── */}
        <div
          className="absolute inset-0 w-full h-full rounded-xl overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            backgroundColor: "#0d1f0d",
            border: "1px solid #1a3a1a",
            boxShadow: "inset 0 0 20px rgba(0,255,65,0.05)",
          }}
        >
          {/* Circuit / ZK geometric pattern */}
          <svg viewBox="0 0 80 112" className="w-full h-full absolute inset-0" style={{ opacity: 0.3 }}>
            <defs>
              <pattern id={patternId} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="8" cy="8" r="1" fill="#1a3a1a" />
                <line x1="8" y1="0" x2="8" y2="7" stroke="#1a3a1a" strokeWidth="0.5" />
                <line x1="8" y1="9" x2="8" y2="16" stroke="#1a3a1a" strokeWidth="0.5" />
                <line x1="0" y1="8" x2="7" y2="8" stroke="#1a3a1a" strokeWidth="0.5" />
                <line x1="9" y1="8" x2="16" y2="8" stroke="#1a3a1a" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="80" height="112" fill={`url(#${patternId})`} />
          </svg>

          {/* Inner border frame */}
          <div className="absolute inset-[4px] rounded-lg pointer-events-none" style={{ border: "1px solid #1a3a1a" }} />

          {/* Center ZK watermark */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span
              style={{
                fontWeight: 900,
                fontSize: size === "sm" ? "1.1rem" : size === "lg" ? "2.2rem" : "1.5rem",
                color: "#1a5a1a",
                letterSpacing: "-0.05em",
                textShadow: "0 0 10px rgba(0,255,65,0.15)",
              }}
            >
              ZK
            </span>
          </div>

          {/* Corner ♠ symbols in dark green */}
          <div className="absolute top-1.5 left-1.5" style={{ color: "#1a3a1a", fontSize: "0.55em", fontWeight: 700 }}>♠</div>
          <div className="absolute top-1.5 right-1.5" style={{ color: "#1a3a1a", fontSize: "0.55em", fontWeight: 700 }}>♠</div>
          <div className="absolute bottom-1.5 left-1.5 rotate-180" style={{ color: "#1a3a1a", fontSize: "0.55em", fontWeight: 700 }}>♠</div>
          <div className="absolute bottom-1.5 right-1.5 rotate-180" style={{ color: "#1a3a1a", fontSize: "0.55em", fontWeight: 700 }}>♠</div>

          {/* Animated pulse border */}
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{ border: "1px solid rgba(0,255,65,0.15)" }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CardComponent;
