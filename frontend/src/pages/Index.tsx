import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAccount } from "@starknet-react/core";
import WalletConnect from "@/components/game/WalletConnect";
import GameLobby from "@/components/game/GameLobby";
import GameBoard from "@/components/game/GameBoard";

type Screen = "landing" | "lobby" | "game";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("landing");
  const [currentRoomId, setCurrentRoomId] = useState("");

  const { address, isConnected } = useAccount();

  // Navigate when wallet connects / disconnects
  useEffect(() => {
    if (isConnected && address) {
      if (screen === "landing") setScreen("lobby");
    } else {
      setScreen("landing");
      setCurrentRoomId("");
    }
  }, [isConnected, address]);

  const handleCreateGame = (roomId: string) => {
    setCurrentRoomId(roomId);
    setScreen("game");
  };

  const handleJoinGame = (roomId: string) => {
    setCurrentRoomId(roomId);
    setScreen("game");
  };

  const handleLeave = () => {
    setCurrentRoomId("");
    setScreen("lobby");
  };

  return (
    <AnimatePresence mode="wait">
      {screen === "landing" && (
        <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <WalletConnect />
        </motion.div>
      )}
      {screen === "lobby" && (
        <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <GameLobby
            walletAddress={address ?? ""}
            onCreateGame={handleCreateGame}
            onJoinGame={handleJoinGame}
          />
        </motion.div>
      )}
      {screen === "game" && (
        <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <GameBoard roomId={currentRoomId} walletAddress={address ?? ""} onLeave={handleLeave} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Index;
