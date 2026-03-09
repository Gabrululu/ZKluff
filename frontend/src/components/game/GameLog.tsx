interface GameLogProps {
  entries: string[];
}

const GameLog = ({ entries }: GameLogProps) => {
  return (
    <div className="glass rounded-lg p-4 h-full flex flex-col">
      <h3 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
        Game Log
      </h3>
      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        {entries.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground/50">Waiting for actions...</p>
        ) : (
          entries.map((entry, i) => (
            <p key={i} className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              <span className="text-primary/60">›</span> {entry}
            </p>
          ))
        )}
      </div>
    </div>
  );
};

export default GameLog;
