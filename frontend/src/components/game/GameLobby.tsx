import { useState } from "react";
import { motion } from "framer-motion";
import { useDisconnect } from "@starknet-react/core";
// @ts-ignore — JS hook
import { useCreateRoom, useJoinRoom, useRooms, useMintTokens, useTokenBalance } from "@/hooks/useGame";

interface GameLobbyProps {
  walletAddress: string;
  onCreateGame: (roomId: string) => void;
  onJoinGame: (roomId: string) => void;
}

const GameLobby = ({ walletAddress, onCreateGame, onJoinGame }: GameLobbyProps) => {
  const [entryFee, setEntryFee] = useState("");
  const [roomId, setRoomId] = useState("");
  const [joinError, setJoinError] = useState("");

  const { createRoom, loading: createLoading, error: createError } = useCreateRoom(walletAddress);
  const { joinRoom, loading: joinLoading, error: joinError2 } = useJoinRoom(walletAddress);
  const { rooms, loading: roomsLoading, refetch } = useRooms();
  const { mintTokens, loading: mintLoading, error: mintError } = useMintTokens();
  const { balance: zktBalance } = useTokenBalance(walletAddress);
  const { disconnect } = useDisconnect();

  const waitingRooms = rooms.filter(
    (r: any) =>
      r.phase === "WaitingForPlayers" &&
      r.player_a?.toLowerCase() !== walletAddress?.toLowerCase()
  );

  const handleCreate = async () => {
    setJoinError("");
    const fee = parseFloat(entryFee) || 0.05;
    const newRoomId = await createRoom(BigInt(Math.round(fee * 1e18)));
    if (newRoomId != null) {
      onCreateGame(newRoomId.toString());
    }
  };

  const handleJoin = async (id: string | number) => {
    setJoinError("");
    const success = await joinRoom(id);
    if (success) {
      onJoinGame(id.toString());
    }
    // joinError2 from the hook will surface the specific error (e.g. "Cannot join your own room")
  };

  const errorMsg = createError || joinError2 || joinError || mintError;

  return (
    <div className="min-h-screen flex flex-col scanline">
      {/* Navbar */}
      <nav className="glass border-b border-border/50 px-6 py-4 flex items-center justify-between relative z-10">
        <span className="font-display text-xl font-bold text-foreground text-glow-green">
          ZKluff
        </span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-primary">
            {zktBalance !== null ? `${zktBalance} ZKT` : "— ZKT"}
          </span>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={mintTokens}
            disabled={mintLoading}
            className="px-3 py-1 rounded-md border border-primary/40 text-primary text-xs font-mono hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            {mintLoading ? "Minting..." : "Get Tokens"}
          </motion.button>
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse-green" />
          <span className="font-mono text-xs text-muted-foreground truncate max-w-[80px] md:max-w-[160px]">
            {walletAddress}
          </span>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => disconnect()}
            className="px-2 py-1 rounded-md border border-border/40 text-muted-foreground text-xs font-mono hover:text-foreground hover:border-border transition-colors"
          >
            Disconnect
          </motion.button>
        </div>
      </nav>

      <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
        {/* Error banner */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 font-mono text-xs text-red-400"
          >
            {errorMsg}
          </motion.div>
        )}

        {/* Create / Join Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass rounded-xl p-6 border border-primary/20 glow-green transition-shadow hover:shadow-[0_0_30px_hsl(132_100%_50%/0.15)]"
          >
            <h2 className="font-display text-2xl font-bold text-foreground mb-1">Create Game</h2>
            <p className="text-sm text-muted-foreground mb-6">Start a new ZK bluff room</p>
            <div className="mb-4">
              <label className="font-mono text-xs text-muted-foreground mb-1.5 block">
                Entry Fee (tokens, in wei)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                placeholder="0.05"
                className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreate}
              disabled={createLoading}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-display font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {createLoading ? "Creating..." : "Create Room"}
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass rounded-xl p-6 border border-foreground/10"
          >
            <h2 className="font-display text-2xl font-bold text-foreground mb-1">Join Game</h2>
            <p className="text-sm text-muted-foreground mb-6">Enter a room ID manually</p>
            <div className="mb-4">
              <label className="font-mono text-xs text-muted-foreground mb-1.5 block">
                Room ID (number)
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="1"
                className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleJoin(roomId)}
              disabled={joinLoading || !roomId.trim()}
              className="w-full py-3 rounded-lg border border-foreground/20 bg-transparent text-foreground font-display font-bold uppercase tracking-wider hover:bg-foreground/5 transition-colors disabled:opacity-50"
            >
              {joinLoading ? "Joining..." : "Join Room"}
            </motion.button>
          </motion.div>
        </div>

        {/* Active Rooms */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-foreground">Open Rooms</h3>
            <button
              onClick={refetch}
              disabled={roomsLoading}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              {roomsLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {roomsLoading && rooms.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground py-6 text-center">
              Fetching rooms from chain...
            </p>
          ) : waitingRooms.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground py-6 text-center">
              No open rooms. Create one above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left font-mono text-[10px] text-muted-foreground uppercase tracking-wider py-2 px-3">
                      Room ID
                    </th>
                    <th className="text-left font-mono text-[10px] text-muted-foreground uppercase tracking-wider py-2 px-3">
                      Creator
                    </th>
                    <th className="text-left font-mono text-[10px] text-muted-foreground uppercase tracking-wider py-2 px-3">
                      Bet
                    </th>
                    <th className="py-2 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {waitingRooms.map((room: any) => (
                    <tr
                      key={room.id}
                      className="border-b border-border/30 hover:bg-foreground/[0.02] transition-colors"
                    >
                      <td className="font-mono text-xs text-foreground py-3 px-3">#{room.id}</td>
                      <td className="font-mono text-xs text-muted-foreground py-3 px-3">
                        {room.player_a
                          ? `${room.player_a.slice(0, 6)}...${room.player_a.slice(-4)}`
                          : "—"}
                      </td>
                      <td className="font-mono text-xs text-gold py-3 px-3">
                        {room.bet_amount
                          ? (Number(BigInt(room.bet_amount)) / 1e18).toFixed(4)
                          : "—"}{" "}
                        ZKT
                      </td>
                      <td className="py-3 px-3">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleJoin(room.id)}
                          disabled={joinLoading}
                          className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-display font-bold uppercase disabled:opacity-50"
                        >
                          Join
                        </motion.button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default GameLobby;
