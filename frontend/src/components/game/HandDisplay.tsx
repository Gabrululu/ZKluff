import { useState } from "react";
import { motion } from "framer-motion";
import CardComponent from "./CardComponent";

export interface CardData {
  suit: "♠" | "♣" | "♥" | "♦";
  rank: string;
}

interface HandDisplayProps {
  cards: CardData[];
  isOwner?: boolean;
  selectedIndices?: number[];
  onCardClick?: (index: number) => void;
}

const HandDisplay = ({ cards, isOwner = false, selectedIndices = [], onCardClick }: HandDisplayProps) => {
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());

  const handleClick = (index: number) => {
    if (isOwner) {
      setRevealedIndices((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
    }
    onCardClick?.(index);
  };

  return (
    <div className="flex gap-2 md:gap-3 justify-center items-end">
      {cards.map((card, i) => (
        <motion.div
          key={i}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: i * 0.1 }}
        >
          <CardComponent
            suit={card.suit}
            rank={card.rank}
            faceUp={isOwner && revealedIndices.has(i)}
            selected={selectedIndices.includes(i)}
            onClick={() => handleClick(i)}
            size="md"
          />
        </motion.div>
      ))}
    </div>
  );
};

export default HandDisplay;
