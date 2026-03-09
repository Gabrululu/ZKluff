import { motion } from "framer-motion";

interface CalloutButtonProps {
  onCallBluff: () => void;
  onFold: () => void;
}

const CalloutButton = ({ onCallBluff, onFold }: CalloutButtonProps) => {
  return (
    <div className="flex gap-3">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onCallBluff}
        className="px-6 py-3 rounded-lg bg-crimson text-crimson-foreground font-display font-bold uppercase tracking-wider glow-crimson transition-all hover:brightness-125"
      >
        Call Bluff 🃏
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onFold}
        className="px-6 py-3 rounded-lg bg-muted text-muted-foreground font-display font-bold uppercase tracking-wider transition-all hover:bg-muted/80"
      >
        Fold
      </motion.button>
    </div>
  );
};

export default CalloutButton;
