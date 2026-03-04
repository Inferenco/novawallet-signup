import type { NetworkType } from "./utils/constants";

export type GamesNetwork = NetworkType;

export interface WalletTxSubmitter {
  signAndSubmitTransaction: (payload: {
    data: {
      function: `${string}::${string}::${string}`;
      typeArguments?: string[];
      functionArguments: unknown[];
    };
  }) => Promise<{ hash: string }>;
}

export interface GameSigner extends WalletTxSubmitter {
  accountAddress: string;
}
