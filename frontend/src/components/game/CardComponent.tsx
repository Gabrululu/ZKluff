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

const suitColor = (suit: string) => {
  if (suit === "♥" || suit === "♦") return "text-crimson";
  return "text-foreground";
};

const suitGlow = (suit: string) => {
  if (suit === "♥" || suit === "♦") return "drop-shadow-[0_0_6px_hsl(0,100%,27%)]";
  return "drop-shadow-[0_0_6px_hsl(0,0%,80%)]";
};

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
    sm: "w-14 h-20 text-xs",
    md: "w-20 h-28 text-sm",
    lg: "w-28 h-40 text-base",
  };

  const centerSuitSize = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-5xl",
  };

  // Generate unique pattern id to avoid SVG conflicts
  const patternId = useMemo(() => `circuit-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <motion.div
      whileHover={!disabled ? { y: -10, scale: 1.06, rotateZ: -1 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={!disabled ? onClick : undefined}
      className={`
        ${sizeClasses[size]} rounded-xl cursor-pointer select-none relative
        transition-shadow duration-300
        ${selected ? "glow-green ring-2 ring-primary" : ""}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
      style={{ perspective: "1000px" }}
    >
      <motion.div
        className="w-full h-full relative"
        initial={false}
        animate={{ rotateY: faceUp ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* ─── FACE-UP CARD ─── */}
        <div className="absolute inset-0 w-full h-full rounded-xl overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "linear-gradient(145deg, hsl(0 0% 92%), hsl(0 0% 98%) 40%, hsl(0 0% 88%))",
            boxShadow: selected
              ? undefined
              : "inset 0 1px 0 hsl(0 0% 100% / 0.6), 0 4px 20px hsl(0 0% 0% / 0.5), 0 1px 3px hsl(0 0% 0% / 0.3)",
          }}
        >
          {/* Inner border */}
          <div className="absolute inset-[3px] rounded-lg border border-muted-foreground/20 pointer-events-none" />

          {/* Subtle ZK watermark in center */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none">
            <span className="font-display font-black tracking-tighter text-black" style={{ fontSize: size === "sm" ? "1.2rem" : size === "lg" ? "2.4rem" : "1.7rem", letterSpacing: "-0.05em" }}>ZK</span>
          </div>

          {/* Top-left rank & suit */}
          <div className={`absolute top-1.5 left-1.5 font-bold font-mono ${suitColor(suit || "♠")} leading-none flex flex-col items-center`}>
            <span className="text-[1em] font-black">{rank}</span>
            <span className={`text-[0.85em] ${suitGlow(suit || "♠")}`}>{suit}</span>
          </div>

          {/* Center suit — large with neon glow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`${centerSuitSize[size]} ${suitColor(suit || "♠")} ${suitGlow(suit || "♠")}`}>
              {suit}
            </span>
          </div>

          {/* Bottom-right rank & suit (inverted) */}
          <div className={`absolute bottom-1.5 right-1.5 font-bold font-mono ${suitColor(suit || "♠")} leading-none flex flex-col items-center rotate-180`}>
            <span className="text-[1em] font-black">{rank}</span>
            <span className={`text-[0.85em] ${suitGlow(suit || "♠")}`}>{suit}</span>
          </div>

          {/* Corner decorative pips for face cards */}
          {["J", "Q", "K", "A"].includes(rank || "") && (
            <>
              <div className="absolute top-1 right-1.5 opacity-20">
                <span className={`text-[0.5em] ${suitColor(suit || "♠")}`}>{suit}</span>
              </div>
              <div className="absolute bottom-1 left-1.5 opacity-20 rotate-180">
                <span className={`text-[0.5em] ${suitColor(suit || "♠")}`}>{suit}</span>
              </div>
            </>
          )}
        </div>

        {/* ─── FACE-DOWN CARD ─── */}
        <div className="absolute inset-0 w-full h-full rounded-xl border border-primary/30 overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            background: "linear-gradient(160deg, hsl(0 0% 4%), hsl(132 20% 6%) 50%, hsl(0 0% 2%))",
            boxShadow: "inset 0 0 30px hsl(132 100% 50% / 0.05), 0 4px 20px hsl(0 0% 0% / 0.5)",
          }}
        >
          {/* ZK circuit pattern */}
          <svg viewBox="0 0 80 112" className="w-full h-full absolute inset-0 opacity-25">
            <defs>
              <pattern id={patternId} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="8" cy="8" r="1" fill="hsl(132,100%,50%)" opacity="0.8" />
                <line x1="8" y1="0" x2="8" y2="6.5" stroke="hsl(132,100%,50%)" strokeWidth="0.4" opacity="0.5" />
                <line x1="8" y1="9.5" x2="8" y2="16" stroke="hsl(132,100%,50%)" strokeWidth="0.4" opacity="0.5" />
                <line x1="0" y1="8" x2="6.5" y2="8" stroke="hsl(132,100%,50%)" strokeWidth="0.4" opacity="0.5" />
                <line x1="9.5" y1="8" x2="16" y2="8" stroke="hsl(132,100%,50%)" strokeWidth="0.4" opacity="0.5" />
                <line x1="0" y1="0" x2="6" y2="6" stroke="hsl(132,100%,50%)" strokeWidth="0.2" opacity="0.3" />
                <line x1="16" y1="0" x2="10" y2="6" stroke="hsl(132,100%,50%)" strokeWidth="0.2" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="80" height="112" fill={`url(#${patternId})`} />
          </svg>

          {/* Inner border frame */}
          <div className="absolute inset-[4px] rounded-lg border border-primary/15 pointer-events-none" />

          {/* Center ZK emblem */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="relative flex items-center justify-center">
              <div className="absolute rounded-full border border-primary/20 opacity-50" style={{ width: "140%", height: "140%" }} />
              <span className={`font-display font-black text-primary/40 tracking-tighter ${size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-2xl"}`} style={{ letterSpacing: "-0.05em", textShadow: "0 0 12px hsl(132 100% 50% / 0.3)" }}>ZK</span>
            </div>
          </div>

          {/* Corner suit silhouettes */}
          <div className="absolute top-1.5 left-1.5 text-primary/15 text-[0.6em] font-bold">♠</div>
          <div className="absolute top-1.5 right-1.5 text-primary/15 text-[0.6em] font-bold">♦</div>
          <div className="absolute bottom-1.5 left-1.5 text-primary/15 text-[0.6em] font-bold rotate-180">♣</div>
          <div className="absolute bottom-1.5 right-1.5 text-primary/15 text-[0.6em] font-bold rotate-180">♥</div>

          {/* Scanline overlay */}
          <div className="absolute inset-0 scanline pointer-events-none opacity-40" />

          {/* Animated pulse border */}
          <motion.div
            className="absolute inset-0 rounded-xl border border-primary/10 pointer-events-none"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CardComponent;
