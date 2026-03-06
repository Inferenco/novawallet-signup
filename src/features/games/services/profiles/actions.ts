import { buildWalletFunctionId } from "../../config/wallet";
import { submitFunctionTransaction } from "../../core/transactions";
import type { TransactionResult } from "../poker/types";
import type { GameSigner } from "../../types";
import type { NetworkType } from "../../utils/constants";

async function submitProfileTransaction(
  network: NetworkType,
  signer: GameSigner,
  functionName: string,
  args: unknown[]
): Promise<TransactionResult> {
  const functionId = buildWalletFunctionId(network, "USER_PROFILES", functionName);

  const result = await submitFunctionTransaction({
    signer,
    functionId: functionId as `${string}::${string}::${string}`,
    functionArguments: args,
    typeArguments: []
  });

  return {
    hash: result.hash,
    success: result.success
  };
}

export async function setProfile(
  network: NetworkType,
  signer: GameSigner,
  nickname: string,
  avatarUrl: string
): Promise<TransactionResult> {
  return submitProfileTransaction(network, signer, "set_profile", [nickname, avatarUrl]);
}

export async function clearProfile(
  network: NetworkType,
  signer: GameSigner
): Promise<TransactionResult> {
  return submitProfileTransaction(network, signer, "clear_profile", []);
}
