import { Buffer } from "buffer";
import { EventEmitter } from "events";
if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
  // circomlibjs needs EventEmitter global
  if (!(window as any).EventEmitter) (window as any).EventEmitter = EventEmitter;
}
// Some circomlibjs internals check global instead of window
if (typeof globalThis.Buffer === "undefined") (globalThis as any).Buffer = Buffer;

import { createRoot } from "react-dom/client";
import { StarknetConfig, argent, braavos } from "@starknet-react/core";
import { sepolia } from "@starknet-react/chains";
import { RpcProvider } from "starknet";
import App from "./App.tsx";
import "./index.css";

const rpcUrl =
  import.meta.env.VITE_STARKNET_RPC ??
  "https://starknet-sepolia.public.blastapi.io/rpc/v0_7";

const _provider = new RpcProvider({
  nodeUrl: rpcUrl,
  chainId: "0x534e5f5345504f4c4941" as any, // SN_SEPOLIA — explicit so Braavos recognises the network
});

function rpcProviderFactory() {
  return _provider;
}

const connectors = [argent(), braavos()];

createRoot(document.getElementById("root")!).render(
  <StarknetConfig
    chains={[sepolia]}
    provider={rpcProviderFactory}
    connectors={connectors}
    autoConnect
  >
    <App />
  </StarknetConfig>
);
