import { motion } from "framer-motion";

interface GameStatusProps {
  roomId: string;
  phase: "WAITING" | "COMMIT" | "DECLARE" | "CHALLENGE" | "RESOLVED";
  pot: number;
}

const phases = ["WAITING", "COMMIT", "DECLARE", "CHALLENGE", "RESOLVED"] as const;

const GameStatus = ({ roomId, phase, pot }: GameStatusProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass rounded-lg px-4 py-3">
      <span className="font-mono text-xs text-muted-foreground">
        Room: <span className="text-foreground">{roomId}</span>
      </span>

      <div className="flex gap-1.5 flex-wrap justify-center">
        {phases.map((p) => (
          <motion.span
            key={p}
            animate={phase === p ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className={`
              px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider
              ${phase === p
                ? "bg-primary text-primary-foreground glow-green"
                : phases.indexOf(p) < phases.indexOf(phase)
                  ? "bg-primary/20 text-primary/60"
                  : "bg-muted text-muted-foreground"
              }
            `}
          >
            {p}
          </motion.span>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Pot:</span>
        <span className="font-display font-bold text-gold text-glow-gold">
          {pot.toFixed(2)} ETH
        </span>
      </div>
    </div>
  );
};

export default GameStatus;
