import { submitFunctionTransaction } from "../../core/transactions";
import { buildWalletFunctionId } from "../../config/wallet";
import type { GameSigner } from "../../types";
import type { NetworkType } from "../../utils/constants";

export interface ConsentTransactionResult {
  hash: string;
  success: boolean;
}

export async function acknowledgeCurrentTerms(
  network: NetworkType,
  signer: GameSigner
): Promise<ConsentTransactionResult> {
  const functionId = buildWalletFunctionId(
    network,
    "GAMING_CONSENT",
    "acknowledge_current_terms"
  );

  return submitFunctionTransaction({
    signer,
    functionId: functionId as `${string}::${string}::${string}`,
    typeArguments: [],
    functionArguments: []
  });
}
