import { Cedra, CedraConfig } from "@cedra-labs/ts-sdk";
import { CHAIN_CONFIG } from "@/config/chain";

let client: Cedra | null = null;

export function getCedraClient(): Cedra {
  if (!client) {
    client = new Cedra(
      new CedraConfig({
        network: CHAIN_CONFIG.network,
        fullnode: CHAIN_CONFIG.rpcUrl,
        indexer: CHAIN_CONFIG.indexerUrl
      })
    );
  }

  return client;
}

export async function waitForTransaction(transactionHash: string): Promise<void> {
  const cedra = getCedraClient();
  await cedra.waitForTransaction({ transactionHash });
}
