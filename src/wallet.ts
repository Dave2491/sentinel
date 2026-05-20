import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";
import { mantleSepoliaTestnet } from "wagmi/chains";

export const hardhatLocal = defineChain({
  id: 31337,
  name: "Hardhat Local",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
  },
});

export const walletConfig = getDefaultConfig({
  appName: "Sentinel",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "sentinel-hackathon-preview",
  chains: [mantleSepoliaTestnet, hardhatLocal],
  ssr: false,
});
