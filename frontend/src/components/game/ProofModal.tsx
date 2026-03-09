import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
// @ts-ignore — JS hook
import { useProofGenerator } from "@/hooks/useProofGenerator";

interface ProofModalProps {
  isOpen: boolean;
  /** Card values 1-52 (private hand) */
  cards: number[];
  /** Blinding salt used for Poseidon commitment */
  salt: string;
  /** Cairo DeclarationType index (0-8) */
  declarationType: number;
  /** Called with the Cairo-formatted proof object, or null on failure */
  onComplete: (cairoProof: object | null) => void;
  onClose: () => void;
}

const steps = [
  "Hashing your hand...",
  "Computing ZK circuit...",
  "Proof ready. Submitting on-chain...",
];

const MatrixRain = () => {
  const columns = 20;
  return (
    <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
      {Array.from({ length: columns }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute font-mono text-primary text-[10px] leading-tight"
          style={{ left: `${(i / columns) * 100}%` }}
          initial={{ y: "-100%" }}
          animate={{ y: "100%" }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "linear",
          }}
        >
          {Array.from({ length: 20 }, () => Math.floor(Math.random() * 2)).join("\n")}
        </motion.div>
      ))}
    </div>
  );
};

const ProofModal = ({
  isOpen,
  cards,
  salt,
  declarationType,
  onComplete,
  onClose,
}: ProofModalProps) => {
  const [currentStep, setCurrentStep] = useState(-1);
  const [proofHash, setProofHash] = useState("");
  const [proofError, setProofError] = useState("");

  const { generateProof } = useProofGenerator();

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(-1);
      setProofHash("");
      setProofError("");
      return;
    }

    let cancelled = false;

    const run = async () => {
      setCurrentStep(0); // Hashing

      // Brief pause so the first step is visible
      await new Promise((r) => setTimeout(r, 600));
      if (cancelled) return;

      setCurrentStep(1); // Computing ZK circuit

      const result = await generateProof({ cards, salt, declarationType });
      if (cancelled) return;

      if (!result) {
        setProofError("Proof generation failed. Check circuit artifacts.");
        setCurrentStep(-1);
        onComplete(null);
        return;
      }

      // Show commitment from public signals as the "proof hash"
      const commitmentHex =
        "0x" + BigInt(result.publicSignals[0] ?? "0").toString(16).padStart(16, "0");
      setProofHash(commitmentHex);
      setCurrentStep(2); // Proof ready
      onComplete(result.cairoProof);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

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
            className="relative glass rounded-xl p-8 max-w-md w-full mx-4 overflow-hidden"
          >
            <MatrixRain />

            <h2 className="font-display text-xl font-bold text-foreground mb-6 relative z-10">
              Generating Zero-Knowledge Proof
            </h2>

            <div className="space-y-4 relative z-10">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                    {currentStep > i ? (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-primary text-lg"
                      >
                        ✓
                      </motion.span>
                    ) : currentStep === i ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse-green" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-muted" />
                    )}
                  </div>
                  <span
                    className={`font-mono text-sm ${
                      currentStep >= i ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step}
                  </span>
                </div>
              ))}
            </div>

            {proofError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-3 rounded-lg bg-crimson/10 border border-crimson/30 relative z-10"
              >
                <p className="font-mono text-xs text-crimson">{proofError}</p>
              </motion.div>
            )}

            {proofHash && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-3 rounded-lg bg-muted relative z-10"
              >
                <p className="text-[10px] text-muted-foreground mb-1">Commitment Hash</p>
                <p className="font-mono text-xs text-primary truncate">{proofHash}</p>
              </motion.div>
            )}

            {(currentStep === 2 || proofError) && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onClose}
                className="mt-4 w-full py-2 rounded-lg bg-primary text-primary-foreground font-display font-bold uppercase tracking-wider relative z-10"
              >
                Continue
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProofModal;
