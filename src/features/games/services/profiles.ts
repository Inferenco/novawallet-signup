import { getCedraClient } from "../core/transactions";
import type { NetworkType } from "../utils/constants";
import { buildWalletFunctionId } from "../config/wallet";

export interface UserProfile {
  nickname: string;
  avatarUrl: string;
  updatedAt: number;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error || "");
}

function isProfileNotFoundError(error: unknown): boolean {
  const message = toErrorMessage(error);
  return (
    message.includes("user_profiles::get_profile") &&
    message.includes("VMError") &&
    message.includes("ABORTED") &&
    message.includes("sub_status: Some(3)")
  );
}

export async function hasProfile(
  network: NetworkType,
  playerAddress: string
): Promise<boolean> {
  const cedra = getCedraClient(network);
  const functionId = buildWalletFunctionId(network, "USER_PROFILES", "has_profile");

  try {
    const result = await cedra.view({
      payload: {
        function: functionId as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [playerAddress]
      }
    });
    return Boolean(result[0]);
  } catch {
    return false;
  }
}

export async function getProfile(
  network: NetworkType,
  playerAddress: string
): Promise<UserProfile | null> {
  const cedra = getCedraClient(network);
  const functionId = buildWalletFunctionId(network, "USER_PROFILES", "get_profile");

  try {
    const result = await cedra.view({
      payload: {
        function: functionId as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [playerAddress]
      }
    });

    return {
      nickname: String(result[0] ?? ""),
      avatarUrl: String(result[1] ?? ""),
      updatedAt: Number(result[2] ?? 0)
    };
  } catch (error) {
    if (isProfileNotFoundError(error)) {
      return null;
    }
    console.warn("[Games Profiles] Unexpected error fetching profile:", error);
    return null;
  }
}

export async function getNickname(
  network: NetworkType,
  playerAddress: string
): Promise<string | null> {
  const cedra = getCedraClient(network);
  const functionId = buildWalletFunctionId(network, "USER_PROFILES", "get_nickname");

  try {
    const result = await cedra.view({
      payload: {
        function: functionId as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [playerAddress]
      }
    });
    const nickname = String(result[0] ?? "").trim();
    return nickname.length > 0 ? nickname : null;
  } catch {
    return null;
  }
}

export async function getAvatarUrl(
  network: NetworkType,
  playerAddress: string
): Promise<string | null> {
  const cedra = getCedraClient(network);
  const functionId = buildWalletFunctionId(network, "USER_PROFILES", "get_avatar_url");

  try {
    const result = await cedra.view({
      payload: {
        function: functionId as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [playerAddress]
      }
    });
    const url = String(result[0] ?? "").trim();
    return url.length > 0 ? url : null;
  } catch {
    return null;
  }
}

export async function getDisplayName(
  network: NetworkType,
  playerAddress: string
): Promise<string> {
  const nickname = await getNickname(network, playerAddress);
  if (nickname) return nickname;
  return `${playerAddress.slice(0, 6)}...${playerAddress.slice(-4)}`;
}

export async function getProfiles(
  network: NetworkType,
  playerAddresses: string[]
): Promise<Map<string, UserProfile | null>> {
  const profiles = new Map<string, UserProfile | null>();

  await Promise.all(
    playerAddresses.map(async (address) => {
      const profile = await getProfile(network, address);
      profiles.set(address, profile);
    })
  );

  return profiles;
}
