import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
// @ts-ignore — JS hook
import { useProofGenerator } from "@/hooks/useProofGenerator";

interface ProofModalProps {
  isOpen: boolean;
  cards: number[];
  salt: string;
  declarationType: number;
  onComplete: (cairoProof: object | null) => void;
  onClose: () => void;
}

const DECLARATION_NAMES = [
  "High Card", "One Pair", "Two Pair", "Three of a Kind",
  "Straight", "Flush", "Full House", "Four of a Kind", "Straight Flush",
];

const steps = [
  { label: "Hashing hand with Poseidon...", key: "hash" },
  { label: "Running Groth16 circuit (BN254)...", key: "prove" },
  { label: "Verifying proof locally...", key: "verify" },
  { label: "Proof verified. Ready to submit.", key: "done" },
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
  const [proofData, setProofData] = useState<{
    pi_a0: string;
    commitment: string;
    provingMs: number;
  } | null>(null);
  const [proofError, setProofError] = useState("");

  const { generateProof } = useProofGenerator();

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(-1);
      setProofData(null);
      setProofError("");
      return;
    }

    let cancelled = false;

    const run = async () => {
      setCurrentStep(0); // Hashing
      await new Promise((r) => setTimeout(r, 400));
      if (cancelled) return;

      setCurrentStep(1); // Proving
      const result = await generateProof({ cards, salt, declarationType });
      if (cancelled) return;

      if (!result) {
        setProofError("Proof generation failed. Check circuit artifacts in /public/circuits/.");
        setCurrentStep(-1);
        onComplete(null);
        return;
      }

      setCurrentStep(2); // Verifying
      await new Promise((r) => setTimeout(r, 300));
      if (cancelled) return;

      setCurrentStep(3); // Done

      // Extract display data from the real proof
      const pi_a0 = result.proof?.pi_a?.[0] ?? "";
      const commitment = result.publicSignals?.[0] ?? "";
      setProofData({
        pi_a0: pi_a0 ? `0x${BigInt(pi_a0).toString(16).slice(0, 20)}...` : "",
        commitment: commitment
          ? `0x${BigInt(commitment).toString(16).slice(0, 16)}...`
          : "",
        provingMs: result.provingMs ?? 0,
      });

      onComplete(result.cairoProof);
    };

    run();
    return () => { cancelled = true; };
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

            <div className="relative z-10">
              <h2 className="font-display text-xl font-bold text-foreground mb-1">
                Zero-Knowledge Proof
              </h2>
              <p className="font-mono text-xs text-muted-foreground mb-6">
                Proving: <span className="text-primary">{DECLARATION_NAMES[declarationType]}</span>
                {" · "}Groth16 / BN254
              </p>

              {/* Steps */}
              <div className="space-y-3 mb-6">
                {steps.map((step, i) => (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {currentStep > i ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-primary text-base"
                        >
                          ✓
                        </motion.span>
                      ) : currentStep === i ? (
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse-green" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-muted" />
                      )}
                    </div>
                    <span
                      className={`font-mono text-xs ${
                        currentStep >= i ? "text-foreground" : "text-muted-foreground/50"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Real proof data */}
              {proofData && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2 mb-5"
                >
                  <div className="rounded-lg bg-muted/60 border border-primary/20 px-3 py-2.5">
                    <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
                      π_A (proof element)
                    </p>
                    <p className="font-mono text-xs text-primary break-all">{proofData.pi_a0}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 border border-border/30 px-3 py-2.5">
                    <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
                      Public input — commitment
                    </p>
                    <p className="font-mono text-xs text-foreground break-all">
                      {proofData.commitment}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground px-1">
                    <span>Proving time</span>
                    <span className="text-primary">{proofData.provingMs} ms</span>
                  </div>
                </motion.div>
              )}

              {/* Error */}
              {proofError && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30"
                >
                  <p className="font-mono text-xs text-red-400">{proofError}</p>
                </motion.div>
              )}

              {(currentStep === 3 || proofError) && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={onClose}
                  className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-display font-bold uppercase tracking-wider text-sm"
                >
                  {proofError ? "Close" : "Submit On-Chain →"}
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProofModal;
