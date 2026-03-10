import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GameStatus from "./GameStatus";
import HandDisplay, { CardData } from "./HandDisplay";
import GameLog from "./GameLog";
import CalloutButton from "./CalloutButton";
import DeclareModal from "./DeclareModal";
import ProofModal from "./ProofModal";
// @ts-ignore — JS hook
import { useGame } from "@/hooks/useGame";

type Phase = "WAITING" | "COMMIT" | "DECLARE" | "CHALLENGE" | "RESOLVED";

interface GameBoardProps {
  roomId: string;
  walletAddress: string;
  onLeave: () => void;
}

// Cairo phase string → UI Phase
const PHASE_MAP: Record<string, Phase> = {
  WaitingForPlayers: "WAITING",
  CommitPhase: "COMMIT",
  DeclarationPhase: "DECLARE",
  ChallengePhase: "CHALLENGE",
  Resolved: "RESOLVED",
};

// DeclareModal string → Cairo DeclarationType numeric index (matches enum in game.cairo)
const DECLARATION_INDEX: Record<string, number> = {
  HIGH_CARD: 0,
  HAS_PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8,
};

// Card value (1-52) → display CardData
// Encoding: value = (rank - 1) * 4 + suit, rank ∈ [1..13], suit ∈ [0..3]
const SUITS: CardData["suit"][] = ["♠", "♣", "♥", "♦"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function cardNumToData(n: number): CardData {
  return {
    suit: SUITS[(n - 1) % 4],
    rank: RANKS[Math.floor((n - 1) / 4)],
  };
}

// Generate a random 5-card hand as numeric values (1-52)
function generateHandNumbers(): number[] {
  const deck = Array.from({ length: 52 }, (_, i) => i + 1);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, 5);
}

// Placeholder opponent hand (always shown face-down)
const OPPONENT_PLACEHOLDER: CardData[] = Array.from({ length: 5 }, () => ({
  suit: "♠" as CardData["suit"],
  rank: "A",
}));

const GameBoard = ({ roomId, walletAddress, onLeave }: GameBoardProps) => {
  const {
    room,
    setHand,
    commitHand,
    declare,
    challenge,
    fold,
    loading,
    error,
    salt,
  } = useGame(roomId, walletAddress);

  // Private hand: generated once, synced into useGame's state for commitment
  const handNumbers = useMemo(() => generateHandNumbers(), []);
  useEffect(() => {
    setHand(handNumbers);
  }, [setHand]); // eslint-disable-line react-hooks/exhaustive-deps

  const [log, setLog] = useState<string[]>(["Game started. Waiting for players..."]);
  const [showDeclare, setShowDeclare] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [pendingDeclarationType, setPendingDeclarationType] = useState<number>(1);

  // Derive display values from on-chain room state
  const uiPhase: Phase = room ? (PHASE_MAP[room.phase] ?? "WAITING") : "WAITING";
  const potEth = room ? Number(BigInt(room.pot ?? 0)) / 1e18 : 0;
  const winnerAddress = room?.winner;
  const winner: "you" | "opponent" | null =
    uiPhase === "RESOLVED" && winnerAddress
      ? winnerAddress === walletAddress
        ? "you"
        : "opponent"
      : null;

  const myCards: CardData[] = handNumbers.map(cardNumToData);

  const addLog = useCallback((msg: string) => setLog((prev) => [...prev, msg]), []);

  useEffect(() => {
    if (error) addLog(`Error: ${error}`);
  }, [error, addLog]);

  const handleCommit = useCallback(async () => {
    addLog("Committing hand (ZK hash)...");
    await commitHand();
    addLog("Hand committed on-chain.");
  }, [commitHand, addLog]);

  const handleDeclare = useCallback(
    (declaration: string) => {
      const declType = DECLARATION_INDEX[declaration] ?? 1;
      setPendingDeclarationType(declType);
      setShowDeclare(false);
      setShowProof(true);
      addLog(`Declaring: ${declaration}. Generating ZK proof...`);
    },
    [addLog]
  );

  const handleProofComplete = useCallback(
    async (cairoProof: object | null) => {
      if (!cairoProof) {
        addLog("Proof generation failed. Try again.");
        return;
      }
      addLog("✓ Groth16 proof verified locally. Submitting on-chain...");
      await declare(pendingDeclarationType, cairoProof);
      addLog("Declaration + ZK proof submitted on-chain.");
    },
    [declare, pendingDeclarationType, addLog]
  );

  const handleCallBluff = useCallback(async () => {
    addLog("Challenging opponent's declaration...");
    await challenge();
    addLog("Challenge submitted. Resolving...");
  }, [challenge, addLog]);

  const handleFold = useCallback(async () => {
    addLog("You folded. Opponent wins.");
    await fold();
  }, [fold, addLog]);

  return (
    <div className="min-h-screen flex flex-col scanline">
      {/* Top bar */}
      <nav className="glass border-b border-border/50 px-4 py-3 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-bold text-foreground text-glow-green">ZKluff</span>
          <span className="text-muted-foreground/30">|</span>
          <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px] md:max-w-none">
            {walletAddress}
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onLeave}
          className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Leave
        </motion.button>
      </nav>

      <div className="flex-1 flex flex-col p-4 gap-4 max-w-6xl mx-auto w-full">
        {/* Game Status */}
        <GameStatus roomId={roomId} phase={uiPhase} pot={potEth} />

        <div className="flex-1 flex flex-col lg:flex-row gap-4">
          {/* Main board */}
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="felt-texture w-full max-w-2xl rounded-[50%] aspect-[2/1] flex flex-col items-center justify-between py-8 md:py-12 relative border border-primary/10">
              {/* Opponent hand (face-down — ZK hidden) */}
              <div className="relative z-10">
                <p className="font-mono text-[10px] text-muted-foreground/50 text-center mb-2">Opponent</p>
                <HandDisplay cards={OPPONENT_PLACEHOLDER} isOwner={false} />
              </div>

              {/* Pot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="font-display text-2xl font-bold text-gold text-glow-gold">
                  {potEth.toFixed(3)} ETH
                </p>
              </div>

              {/* Your hand */}
              <div className="relative z-10">
                <p className="font-mono text-[10px] text-primary/50 text-center mb-2">
                  Your Hand (click to peek)
                </p>
                <HandDisplay cards={myCards} isOwner={true} />
              </div>
            </div>

            {/* Winner banner */}
            <AnimatePresence>
              {uiPhase === "RESOLVED" && winner && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center z-20"
                >
                  <div
                    className={`text-center p-8 rounded-2xl ${
                      winner === "you" ? "glow-gold" : "glow-crimson"
                    } glass`}
                  >
                    <motion.h2
                      className={`font-display text-4xl md:text-5xl font-bold ${
                        winner === "you" ? "text-gold text-glow-gold" : "text-crimson"
                      }`}
                      animate={winner === "you" ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      {winner === "you" ? "YOU WIN!" : "YOU LOSE"}
                    </motion.h2>
                    <p className="font-mono text-sm text-muted-foreground mt-2">
                      {winner === "you"
                        ? `+${potEth.toFixed(3)} ETH`
                        : `-${(potEth / 2).toFixed(3)} ETH`}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onLeave}
                      className="mt-6 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-display font-bold uppercase tracking-wider"
                    >
                      Play Again
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Game Log */}
          <div className="w-full lg:w-64 lg:min-h-0 h-48 lg:h-auto">
            <GameLog entries={log} />
          </div>
        </div>

        {/* Action Bar */}
        <div className="glass rounded-lg p-4 flex items-center justify-center gap-4">
          {uiPhase === "COMMIT" && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCommit}
              disabled={loading}
              className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-display font-bold uppercase tracking-wider glow-green disabled:opacity-50"
            >
              {loading ? "Committing..." : "Commit Hand"}
            </motion.button>
          )}

          {uiPhase === "DECLARE" && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDeclare(true)}
              disabled={loading}
              className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-display font-bold uppercase tracking-wider glow-green disabled:opacity-50"
            >
              Declare Hand
            </motion.button>
          )}

          {uiPhase === "CHALLENGE" && (
            <CalloutButton onCallBluff={handleCallBluff} onFold={handleFold} />
          )}

          {uiPhase === "RESOLVED" && (
            <p className="font-mono text-sm text-muted-foreground">Game resolved on-chain.</p>
          )}

          {uiPhase === "WAITING" && (
            <p className="font-mono text-sm text-muted-foreground animate-pulse-green">
              Waiting for opponent...
            </p>
          )}
        </div>
      </div>

      {/* Modals */}
      <DeclareModal
        isOpen={showDeclare}
        onDeclare={handleDeclare}
        onClose={() => setShowDeclare(false)}
        isLoading={loading}
      />
      <ProofModal
        isOpen={showProof}
        cards={handNumbers}
        salt={salt}
        declarationType={pendingDeclarationType}
        onComplete={handleProofComplete}
        onClose={() => setShowProof(false)}
      />
    </div>
  );
};

export default GameBoard;
