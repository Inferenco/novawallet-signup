import type {
  EntryFunctionArgumentTypes,
  ScriptFunctionArgumentTypes,
  SimpleEntryFunctionArgumentTypes
} from "@cedra-labs/ts-sdk";
import { getCedraClient, submitFunctionTransaction } from "../../core/transactions";
import { buildFunctionId } from "../../config/games";
import type { GameSigner } from "../../types";
import type { NetworkType } from "../../utils/constants";
import type { TransactionResult } from "./types";

export const POKER_MODULES = {
  TEXAS_HOLDEM: "TEXAS_HOLDEM",
  CHIPS: "CHIPS"
} as const;

export type PokerModule = keyof typeof POKER_MODULES;

export type PokerErrorCode = "VIEW_ERROR" | "TRANSACTION_ERROR" | "UNKNOWN_ERROR";

export type PokerClientError = Error & {
  code: PokerErrorCode;
  context?: {
    module: PokerModule;
    functionName: string;
  };
  details?: Record<string, unknown>;
  cause?: unknown;
  isPokerClientError: true;
};

type ViewFunctionArgs = Array<
  EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes
>;
type TransactionFunctionArgs = ViewFunctionArgs | ScriptFunctionArgumentTypes[];

export function getPokerFunctionId(
  network: NetworkType,
  module: PokerModule,
  functionName: string
): string {
  return buildFunctionId(network, module, functionName);
}

function createPokerError(
  message: string,
  code: PokerErrorCode,
  context: PokerClientError["context"],
  cause: unknown,
  details?: Record<string, unknown>
): PokerClientError {
  const error = new Error(message) as PokerClientError;
  error.code = code;
  error.context = context;
  error.details = details;
  error.cause = cause;
  error.isPokerClientError = true;
  return error;
}

function normalizePokerError(
  error: unknown,
  code: PokerErrorCode,
  context: PokerClientError["context"]
): PokerClientError {
  if (error && typeof error === "object" && "isPokerClientError" in error) {
    return error as PokerClientError;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unexpected poker client error";

  const details =
    error && typeof error === "object"
      ? { ...(error as Record<string, unknown>) }
      : undefined;

  return createPokerError(message, code, context, error, details);
}

export async function callView<T>(
  network: NetworkType,
  module: PokerModule,
  functionName: string,
  args: ViewFunctionArgs = [],
  typeArgs: string[] = []
): Promise<T> {
  const cedra = getCedraClient(network);
  const functionId = getPokerFunctionId(network, module, functionName);

  try {
    const result = await cedra.view({
      payload: {
        function: functionId as `${string}::${string}::${string}`,
        typeArguments: typeArgs,
        functionArguments: args
      }
    });

    return result as T;
  } catch (error) {
    throw normalizePokerError(error, "VIEW_ERROR", { module, functionName });
  }
}

export async function submitTransaction(
  network: NetworkType,
  signer: GameSigner,
  module: PokerModule,
  functionName: string,
  args: TransactionFunctionArgs,
  typeArgs: string[] = []
): Promise<TransactionResult> {
  const functionId = getPokerFunctionId(network, module, functionName);

  try {
    return await submitFunctionTransaction({
      signer,
      functionId: functionId as `${string}::${string}::${string}`,
      typeArguments: typeArgs,
      functionArguments: args
    });
  } catch (error) {
    throw normalizePokerError(error, "TRANSACTION_ERROR", { module, functionName });
  }
}
