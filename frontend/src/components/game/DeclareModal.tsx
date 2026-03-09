import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Declaration =
  | "HIGH_CARD"
  | "HAS_PAIR"
  | "TWO_PAIR"
  | "THREE_OF_A_KIND"
  | "STRAIGHT"
  | "FLUSH"
  | "FULL_HOUSE"
  | "FOUR_OF_A_KIND"
  | "STRAIGHT_FLUSH";

interface DeclareModalProps {
  isOpen: boolean;
  onDeclare: (declaration: Declaration) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const declarations: { value: Declaration; label: string }[] = [
  { value: "HIGH_CARD", label: "High Card" },
  { value: "HAS_PAIR", label: "Pair" },
  { value: "TWO_PAIR", label: "Two Pair" },
  { value: "THREE_OF_A_KIND", label: "Three of a Kind" },
  { value: "STRAIGHT", label: "Straight" },
  { value: "FLUSH", label: "Flush" },
  { value: "FULL_HOUSE", label: "Full House" },
  { value: "FOUR_OF_A_KIND", label: "Four of a Kind" },
  { value: "STRAIGHT_FLUSH", label: "Straight Flush" },
];

const DeclareModal = ({ isOpen, onDeclare, onClose, isLoading }: DeclareModalProps) => {
  const [selected, setSelected] = useState<Declaration | null>(null);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass rounded-xl p-6 max-w-sm w-full mx-4"
          >
            <h2 className="font-display text-xl font-bold text-foreground mb-4">
              Declare Your Hand
            </h2>

            <div className="space-y-2 mb-6">
              {declarations.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setSelected(d.value)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg font-mono text-sm transition-all ${
                    selected === d.value
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={!selected || isLoading}
                onClick={() => selected && onDeclare(selected)}
                className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-display font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="inline-block w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                    />
                    Generating Proof...
                  </>
                ) : (
                  "Declare + Generate Proof"
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-4 py-3 rounded-lg bg-muted text-muted-foreground font-display font-bold uppercase tracking-wider"
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DeclareModal;
