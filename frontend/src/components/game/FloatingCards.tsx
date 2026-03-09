import { motion } from "framer-motion";

const suits = ["♠", "♣", "♥", "♦"];

const FloatingCards = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.span
          key={i}
          className={`absolute text-4xl ${
            suits[i % 4] === "♥" || suits[i % 4] === "♦"
              ? "text-crimson/[0.06]"
              : "text-foreground/[0.04]"
          }`}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 10, -10, 0],
            rotate: [0, 15, -15, 0],
          }}
          transition={{
            duration: 8 + Math.random() * 6,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "easeInOut",
          }}
        >
          {suits[i % 4]}
        </motion.span>
      ))}
    </div>
  );
};

export default FloatingCards;
