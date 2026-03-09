import { motion } from "framer-motion";
import { useConnect } from "@starknet-react/core";
import FloatingCards from "./FloatingCards";

const WalletConnect = () => {
  const { connect, connectors } = useConnect();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative scanline">
      <FloatingCards />

      <div className="relative z-10 text-center px-4">
        <motion.h1
          className="font-display text-7xl md:text-9xl font-bold text-foreground animate-glitch text-glow-green tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          ZKluff
        </motion.h1>

        <motion.p
          className="font-mono text-sm md:text-base text-muted-foreground mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Bluff on-chain. Prove it with ZK.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col sm:flex-row gap-3 justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          {connectors.map((connector) => {
            const available = connector.available();
            return (
              <motion.button
                key={connector.id}
                whileHover={available ? { scale: 1.05 } : {}}
                whileTap={available ? { scale: 0.95 } : {}}
                onClick={() => available && connect({ connector })}
                disabled={!available}
                title={available ? `Connect ${connector.name}` : `${connector.name} extension not found`}
                className={`px-8 py-3.5 rounded-lg border font-display font-bold uppercase tracking-widest text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                  available
                    ? "border-foreground/30 bg-transparent text-foreground hover:bg-foreground/10 cursor-pointer"
                    : "border-foreground/10 bg-transparent text-muted-foreground/40 cursor-not-allowed"
                }`}
              >
                {connector.icon && (
                  <img
                    src={typeof connector.icon === "string" ? connector.icon : connector.icon.light}
                    alt={connector.name}
                    className="w-5 h-5"
                  />
                )}
                <span>{connector.name}</span>
                {!available && (
                  <span className="font-mono text-[10px] normal-case tracking-normal ml-1 opacity-70">
                    not installed
                  </span>
                )}
              </motion.button>
            );
          })}
        </motion.div>

        {connectors.every((c) => !c.available()) && (
          <motion.p
            className="mt-6 font-mono text-xs text-muted-foreground/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            Install{" "}
            <a
              href="https://www.ready.co/ready-wallet"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              Ready Wallet
            </a>{" "}
            or{" "}
            <a
              href="https://braavos.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              Braavos
            </a>{" "}
            to connect.
          </motion.p>
        )}

        <motion.p
          className="mt-16 font-mono text-[11px] text-muted-foreground/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          Powered by Starknet • Zero-Knowledge Proofs
        </motion.p>
      </div>
    </div>
  );
};

export default WalletConnect;
