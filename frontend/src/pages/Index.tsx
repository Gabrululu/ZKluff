import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAccount } from "@starknet-react/core";
import WalletConnect from "@/components/game/WalletConnect";
import GameLobby from "@/components/game/GameLobby";
import GameBoard from "@/components/game/GameBoard";

const STARKNET_RPC =
  import.meta.env.VITE_STARKNET_RPC ??
  "https://starknet-sepolia.public.blastapi.io/rpc/v0_7";

type Screen = "landing" | "lobby" | "game";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("landing");
  const [currentRoomId, setCurrentRoomId] = useState("");

  const { address, isConnected, connector } = useAccount();

  // Register Sepolia with the wallet using every known identifier so the wallet
  // has a working RPC node regardless of which name it uses internally.
  // "sepolia-alpha" is the legacy name; "SN_SEPOLIA" / hex are newer.
  useEffect(() => {
    if (!isConnected || !connector) return;
    const registerNetwork = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const req = (connector as any).request.bind(connector);
      const currency = {
        type: "ERC20",
        options: {
          address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
        },
      };
      // Try both the legacy and current network IDs
      for (const id of ["sepolia-alpha", "SN_SEPOLIA", "0x534e5f5345504f4c4941"]) {
        try {
          await req({
            type: "wallet_addStarknetChain",
            params: {
              id,
              chain_name: "Starknet Sepolia",
              rpc_urls: [STARKNET_RPC],
              native_currency: currency,
              block_explorer_url: "https://sepolia.starkscan.co",
            },
          });
        } catch {
          // Ignore per-id failures
        }
      }
    };
    registerNetwork();
  }, [isConnected, connector]);

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
