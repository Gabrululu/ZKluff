import { createRoot } from "react-dom/client";
import { StarknetConfig, jsonRpcProvider, argent, braavos } from "@starknet-react/core";
import { sepolia } from "@starknet-react/chains";
import App from "./App.tsx";
import "./index.css";

const connectors = [argent(), braavos()];

const rpcUrl =
  import.meta.env.VITE_STARKNET_RPC ??
  "https://starknet-sepolia.public.blastapi.io/rpc/v0_7";

createRoot(document.getElementById("root")!).render(
  <StarknetConfig
    chains={[sepolia]}
    provider={jsonRpcProvider({ rpc: () => ({ nodeUrl: rpcUrl }) })}
    connectors={connectors}
    autoConnect
  >
    <App />
  </StarknetConfig>
);
