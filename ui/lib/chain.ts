/**
 * Chain configuration
 * 
 * Set NEXT_PUBLIC_CHAIN in your .env.local:
 *   hardhat  → Local dev (default)
 *   sepolia  → Testnet
 *   mainnet  → Production
 */

import { hardhat, sepolia, mainnet } from "viem/chains";

const chains = { hardhat, sepolia, mainnet };

export const chainName = (process.env.NEXT_PUBLIC_CHAIN || "hardhat") as keyof typeof chains;
export const chain = chains[chainName];
export const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";
