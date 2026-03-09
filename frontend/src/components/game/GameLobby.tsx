import { useState } from "react";
import { motion } from "framer-motion";
// @ts-ignore — JS hook
import { useCreateRoom, useJoinRoom } from "@/hooks/useGame";

interface ActiveRoom {
  id: string;
  players: number;
  pot: number;
  status: string;
}

interface GameLobbyProps {
  walletAddress: string;
  onCreateGame: (roomId: string) => void;
  onJoinGame: (roomId: string) => void;
}

const mockRooms: ActiveRoom[] = [
  { id: "0x7a3f...e12b", players: 1, pot: 0.05, status: "Waiting" },
  { id: "0x9c2d...a8f4", players: 2, pot: 0.2, status: "In Progress" },
  { id: "0x1b5e...d937", players: 1, pot: 0.1, status: "Waiting" },
];

const GameLobby = ({ walletAddress, onCreateGame, onJoinGame }: GameLobbyProps) => {
  const [entryFee, setEntryFee] = useState("");
  const [roomId, setRoomId] = useState("");

  const { createRoom, loading: createLoading } = useCreateRoom(walletAddress);
  const { joinRoom, loading: joinLoading } = useJoinRoom(walletAddress);

  const handleCreate = async () => {
    const fee = parseFloat(entryFee) || 0.05;
    const newRoomId = await createRoom(BigInt(Math.round(fee * 1e18)));
    if (newRoomId != null) onCreateGame(newRoomId.toString());
  };

  const handleJoin = async (id: string) => {
    const success = await joinRoom(id);
    if (success) onJoinGame(id);
  };

  return (
    <div className="min-h-screen flex flex-col scanline">
      {/* Navbar */}
      <nav className="glass border-b border-border/50 px-6 py-4 flex items-center justify-between relative z-10">
        <span className="font-display text-xl font-bold text-foreground text-glow-green">
          ZKluff
        </span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse-green" />
          <span className="font-mono text-xs text-muted-foreground">{walletAddress}</span>
        </div>
      </nav>

      <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
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
                Entry Fee (ETH)
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
            <p className="text-sm text-muted-foreground mb-6">Enter an existing room</p>
            <div className="mb-4">
              <label className="font-mono text-xs text-muted-foreground mb-1.5 block">
                Room ID
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="0x7a3f...e12b"
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
          <h3 className="font-display text-lg font-bold text-foreground mb-4">Active Rooms</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left font-mono text-[10px] text-muted-foreground uppercase tracking-wider py-2 px-3">
                    Room ID
                  </th>
                  <th className="text-left font-mono text-[10px] text-muted-foreground uppercase tracking-wider py-2 px-3">
                    Players
                  </th>
                  <th className="text-left font-mono text-[10px] text-muted-foreground uppercase tracking-wider py-2 px-3">
                    Pot
                  </th>
                  <th className="text-left font-mono text-[10px] text-muted-foreground uppercase tracking-wider py-2 px-3">
                    Status
                  </th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {mockRooms.map((room) => (
                  <tr
                    key={room.id}
                    className="border-b border-border/30 hover:bg-foreground/[0.02] transition-colors"
                  >
                    <td className="font-mono text-xs text-foreground py-3 px-3">{room.id}</td>
                    <td className="font-mono text-xs text-muted-foreground py-3 px-3">
                      {room.players}/2
                    </td>
                    <td className="font-mono text-xs text-gold py-3 px-3">
                      {room.pot.toFixed(2)} ETH
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          room.status === "Waiting"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {room.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {room.status === "Waiting" && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleJoin(room.id)}
                          className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-display font-bold uppercase"
                        >
                          Join
                        </motion.button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GameLobby;
