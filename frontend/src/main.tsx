import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { StarknetConfig, publicProvider, argent, braavos } from "@starknet-react/core";
import { sepolia } from "@starknet-react/chains";
import App from "./App.tsx";
import "./index.css";

const connectors = [argent(), braavos()];

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StarknetConfig
      chains={[sepolia]}
      provider={publicProvider()}
      connectors={connectors}
      autoConnect
    >
      <App />
    </StarknetConfig>
  </StrictMode>
);
