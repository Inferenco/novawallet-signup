import { getCedraClient } from "../core/transactions";
import { buildWalletFunctionId } from "../config/wallet";
import type { NetworkType } from "../utils/constants";

export { acknowledgeCurrentTerms } from "./consent/actions";

export interface CasinoTerms {
  version: number;
  content: string;
  format: string;
  updatedAt: number;
}

export interface UserTermsAcknowledgment {
  exists: boolean;
  acceptedVersion: number;
  acceptedAt: number;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

export async function getCurrentTerms(
  network: NetworkType
): Promise<CasinoTerms | null> {
  const cedra = getCedraClient(network);
  const functionId = buildWalletFunctionId(
    network,
    "GAMING_CONSENT",
    "get_current_terms"
  );

  try {
    const result = await cedra.view({
      payload: {
        function: functionId as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: []
      }
    });

    return {
      version: toNumber(result[0]),
      content: String(result[1] ?? ""),
      format: String(result[2] ?? ""),
      updatedAt: toNumber(result[3])
    };
  } catch (error) {
    console.warn("[Games Consent] Failed to fetch current terms:", error);
    return null;
  }
}

export async function hasAcknowledgedCurrent(
  network: NetworkType,
  userAddress: string
): Promise<boolean> {
  const cedra = getCedraClient(network);
  const functionId = buildWalletFunctionId(
    network,
    "GAMING_CONSENT",
    "has_acknowledged_current"
  );

  try {
    const result = await cedra.view({
      payload: {
        function: functionId as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [userAddress]
      }
    });

    return toBoolean(result[0]);
  } catch (error) {
    console.warn("[Games Consent] Failed to fetch acknowledgment status:", error);
    return false;
  }
}

export async function getUserAcknowledgment(
  network: NetworkType,
  userAddress: string
): Promise<UserTermsAcknowledgment | null> {
  const cedra = getCedraClient(network);
  const functionId = buildWalletFunctionId(
    network,
    "GAMING_CONSENT",
    "get_user_acknowledgment"
  );

  try {
    const result = await cedra.view({
      payload: {
        function: functionId as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [userAddress]
      }
    });

    return {
      exists: toBoolean(result[0]),
      acceptedVersion: toNumber(result[1]),
      acceptedAt: toNumber(result[2])
    };
  } catch (error) {
    console.warn("[Games Consent] Failed to fetch user acknowledgment:", error);
    return null;
  }
}
