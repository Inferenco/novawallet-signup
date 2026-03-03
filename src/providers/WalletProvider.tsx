/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import {
  WalletCore,
  type AccountInfo,
  type NetworkInfo
} from "@cedra-labs/wallet-adapter-core";
import type { CedraWallet } from "@cedra-labs/wallet-standard";
import { Network } from "@cedra-labs/ts-sdk";
import { appEnv } from "@/config/env";
import { isExpectedNetwork } from "@/config/chain";

interface WalletDescriptor {
  name: string;
  icon?: string | null;
}

interface WalletContextState {
  connected: boolean;
  connecting: boolean;
  account: AccountInfo | null;
  network: NetworkInfo | null;
  wallets: WalletDescriptor[];
  wallet: WalletDescriptor | null;
  networkMismatch: boolean;
  walletInstallUrl: string;
  connect: (walletName: string) => Promise<void>;
  disconnect: () => Promise<void>;
  signAndSubmitTransaction: (payload: {
    data: {
      function: `${string}::${string}::${string}`;
      typeArguments?: string[];
      functionArguments: unknown[];
    };
  }) => Promise<{ hash: string }>;
}

interface WalletSnapshot {
  connected: boolean;
  connecting: boolean;
  account: AccountInfo | null;
  network: NetworkInfo | null;
  wallets: WalletDescriptor[];
  wallet: WalletDescriptor | null;
}

const WalletContext = createContext<WalletContextState | null>(null);

const initialSnapshot: WalletSnapshot = {
  connected: false,
  connecting: false,
  account: null,
  network: null,
  wallets: [],
  wallet: null
};

let walletCoreInstance: WalletCore | null = null;

function mapWallets(wallets: ReadonlyArray<{ name: string; icon?: string | null }>) {
  return wallets.map((wallet) => ({
    name: wallet.name,
    icon: wallet.icon ?? null
  }));
}

function getWalletCore(): WalletCore {
  if (!walletCoreInstance) {
    walletCoreInstance = new WalletCore([], {
      network: Network.TESTNET
    });
  }

  return walletCoreInstance;
}

function useMockWallet() {
  const [state, setState] = useState<WalletSnapshot>(() => ({
    ...initialSnapshot,
    wallets: [{ name: "Mock Zedra" }, { name: "Mock Nightly" }]
  }));

  const connect = useCallback(async (walletName: string) => {
    setState((prev) => ({ ...prev, connecting: true }));
    await new Promise((resolve) => setTimeout(resolve, 200));

    setState((prev) => ({
      ...prev,
      connecting: false,
      connected: true,
      wallet: { name: walletName },
      account: { address: { toString: () => "0xabc" } } as unknown as AccountInfo,
      network: {
        name:
          window.localStorage.getItem("nova_mock_network_mismatch") === "1"
            ? "devnet"
            : "testnet"
      } as NetworkInfo
    }));
  }, []);

  const disconnect = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      connected: false,
      connecting: false,
      account: null,
      network: null,
      wallet: null
    }));
  }, []);

  const signAndSubmitTransaction = useCallback(
    async (payload: {
      data: {
        function: `${string}::${string}::${string}`;
        typeArguments?: string[];
        functionArguments: unknown[];
      };
    }) => {
      void payload;
      return { hash: `0xmocktx${Date.now()}` };
    },
    []
  );

  return {
    ...state,
    connect,
    disconnect,
    signAndSubmitTransaction
  };
}

export function WalletProvider({ children }: PropsWithChildren) {
  const mockWalletState = useMockWallet();
  const [snapshot, setSnapshot] = useState<WalletSnapshot>(initialSnapshot);

  useEffect(() => {
    if (appEnv.mockWallet) return;

    const walletCore = getWalletCore();

    const handleConnect = (account: AccountInfo | null) => {
      setSnapshot((prev) => ({
        ...prev,
        connected: true,
        connecting: false,
        account,
        network: walletCore.network,
        wallet: walletCore.wallet
          ? {
              name: walletCore.wallet.name,
              icon: walletCore.wallet.icon ?? null
            }
          : null
      }));
    };

    const handleDisconnect = () => {
      setSnapshot((prev) => ({
        ...prev,
        connected: false,
        connecting: false,
        account: null,
        network: null,
        wallet: null
      }));
    };

    const handleNetworkChange = (network: NetworkInfo | null) => {
      setSnapshot((prev) => ({ ...prev, network }));
    };

    const handleAccountChange = (account: AccountInfo | null) => {
      setSnapshot((prev) => ({ ...prev, account }));
    };

    const updateWallets = () => {
      setSnapshot((prev) => ({
        ...prev,
        wallets: mapWallets(walletCore.wallets as CedraWallet[])
      }));
    };

    walletCore.on("connect", handleConnect);
    walletCore.on("disconnect", handleDisconnect);
    walletCore.on("networkChange", handleNetworkChange);
    walletCore.on("accountChange", handleAccountChange);
    walletCore.on("standardWalletsAdded", updateWallets);

    updateWallets();

    return () => {
      walletCore.off("connect", handleConnect);
      walletCore.off("disconnect", handleDisconnect);
      walletCore.off("networkChange", handleNetworkChange);
      walletCore.off("accountChange", handleAccountChange);
      walletCore.off("standardWalletsAdded", updateWallets);
    };
  }, []);

  const connect = useCallback(async (walletName: string) => {
    if (appEnv.mockWallet) {
      await mockWalletState.connect(walletName);
      return;
    }

    const walletCore = getWalletCore();
    setSnapshot((prev) => ({ ...prev, connecting: true }));
    try {
      await walletCore.connect(walletName);
      setSnapshot((prev) => ({
        ...prev,
        connecting: false,
        wallet: walletCore.wallet
          ? {
              name: walletCore.wallet.name,
              icon: walletCore.wallet.icon ?? null
            }
          : null,
        network: walletCore.network
      }));
    } catch (error) {
      setSnapshot((prev) => ({ ...prev, connecting: false }));
      throw error;
    }
  }, [mockWalletState]);

  const disconnect = useCallback(async () => {
    if (appEnv.mockWallet) {
      await mockWalletState.disconnect();
      return;
    }

    const walletCore = getWalletCore();
    await walletCore.disconnect();
  }, [mockWalletState]);

  const signAndSubmitTransaction = useCallback(
    async (payload: {
      data: {
        function: `${string}::${string}::${string}`;
        typeArguments?: string[];
        functionArguments: unknown[];
      };
    }) => {
      if (appEnv.mockWallet) {
        return mockWalletState.signAndSubmitTransaction(payload);
      }

      const walletCore = getWalletCore();
      if (!walletCore.account) {
        throw new Error("Wallet not connected");
      }

      const response = await walletCore.signAndSubmitTransaction(
        payload as Parameters<typeof walletCore.signAndSubmitTransaction>[0]
      );

      return { hash: response.hash };
    },
    [mockWalletState]
  );

  const activeSnapshot = appEnv.mockWallet ? mockWalletState : snapshot;
  const networkMismatch =
    activeSnapshot.connected && !isExpectedNetwork(activeSnapshot.network);

  const value = useMemo<WalletContextState>(
    () => ({
      ...activeSnapshot,
      connect,
      disconnect,
      signAndSubmitTransaction,
      walletInstallUrl: appEnv.zedraInstallUrl,
      networkMismatch
    }),
    [activeSnapshot, connect, disconnect, networkMismatch, signAndSubmitTransaction]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextState {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
}
