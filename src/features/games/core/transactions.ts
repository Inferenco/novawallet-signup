import { Cedra, CedraConfig, Network } from "@cedra-labs/ts-sdk";
import { CHAIN_CONFIG } from "@/config/chain";
import { waitForTransaction } from "@/lib/cedraClient";
import type { GameSigner } from "../types";
import type { NetworkType } from "../utils/constants";

const clientCache = new Map<NetworkType, Cedra>();

function toSdkNetwork(network: NetworkType): Network {
  return network === "devnet" ? Network.DEVNET : Network.TESTNET;
}

export function getCedraClient(network: NetworkType): Cedra {
  const cached = clientCache.get(network);
  if (cached) return cached;

  const client = new Cedra(
    new CedraConfig({
      network: toSdkNetwork(network),
      fullnode: CHAIN_CONFIG.rpcUrl,
      indexer: CHAIN_CONFIG.gamesIndexerUrl
    })
  );
  clientCache.set(network, client);
  return client;
}

export async function submitFunctionTransaction(params: {
  signer: GameSigner;
  functionId: `${string}::${string}::${string}`;
  functionArguments: unknown[];
  typeArguments?: string[];
}): Promise<{ hash: string; success: boolean }> {
  const response = await params.signer.signAndSubmitTransaction({
    data: {
      function: params.functionId,
      typeArguments: params.typeArguments ?? [],
      functionArguments: params.functionArguments
    }
  });

  await waitForTransaction(response.hash);
  return { hash: response.hash, success: true };
}

export function clearClientCache() {
  clientCache.clear();
}
