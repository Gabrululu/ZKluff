import React, { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";

function short(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export default function WalletConnect({ large }) {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);

  if (isConnected) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          background: "var(--surface-2)", border: "1px solid var(--border-light)",
          borderRadius: "var(--radius)", padding: "0.4rem 0.85rem",
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "var(--accent)",
            boxShadow: "0 0 6px var(--accent)",
            display: "inline-block"
          }} />
          <span className="addr">{short(address)}</span>
        </div>
        <button className="btn-ghost" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }} onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  if (large) {
    return (
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
        {connectors.map((c) => (
          <button key={c.id} className="btn-primary" style={{ fontSize: "1rem", padding: "0.75rem 2rem" }}
            disabled={isConnecting} onClick={() => connect({ connector: c })}>
            {isConnecting ? <span className="spinner" /> : c.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button className="btn-primary" onClick={() => setOpen(!open)} disabled={isConnecting}>
        {isConnecting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : "Connect Wallet"}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
          background: "var(--surface)", border: "1px solid var(--border-light)",
          borderRadius: "var(--radius-lg)", padding: "0.5rem",
          boxShadow: "0 12px 32px rgba(0,0,0,0.5)", minWidth: 180,
        }}>
          {connectors.map((c) => (
            <button key={c.id} className="btn-ghost"
              style={{ width: "100%", textAlign: "left", marginBottom: "0.25rem", borderRadius: 8 }}
              onClick={() => { connect({ connector: c }); setOpen(false); }}>
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
