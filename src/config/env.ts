const DEFAULT_FULLNODE = "https://testnet.cedra.dev/v1";
const DEFAULT_INDEXER = "https://graphql.cedra.dev/v1/graphql";
const DEFAULT_ZEDRA_INSTALL_URL =
  "https://chromewebstore.google.com/detail/zedra-wallet/pbeefngmcchkcibdodceimammkigfanl";
const DEFAULT_EXPLORER_BASE = "https://cedrascan.com/txn";

export interface AppEnv {
  cedraNetwork: "testnet";
  fullnodeUrl: string;
  indexerUrl: string;
  walletContractAddress: string;
  zedraInstallUrl: string;
  explorerTxBaseUrl: string;
  basePath: string;
  mockChain: boolean;
  mockWallet: boolean;
}

const fromEnv = import.meta.env;

export const appEnv: AppEnv = {
  cedraNetwork: "testnet",
  fullnodeUrl: fromEnv.VITE_CEDRA_FULLNODE_URL || DEFAULT_FULLNODE,
  indexerUrl: fromEnv.VITE_CEDRA_INDEXER_URL || DEFAULT_INDEXER,
  walletContractAddress: fromEnv.VITE_WALLET_CONTRACT_ADDRESS || "0x0",
  zedraInstallUrl: fromEnv.VITE_ZEDRA_INSTALL_URL || DEFAULT_ZEDRA_INSTALL_URL,
  explorerTxBaseUrl: fromEnv.VITE_CEDRA_EXPLORER_TX_BASE || DEFAULT_EXPLORER_BASE,
  basePath: fromEnv.VITE_BASE_PATH || "/",
  mockChain: fromEnv.VITE_MOCK_CHAIN === "true",
  mockWallet: fromEnv.VITE_MOCK_WALLET === "true" || fromEnv.VITE_MOCK_CHAIN === "true"
};

export function hasConfiguredWalletContract(): boolean {
  return appEnv.walletContractAddress !== "0x0";
}
