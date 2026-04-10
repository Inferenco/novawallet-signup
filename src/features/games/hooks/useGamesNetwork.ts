import { resolveNetworkType, type NetworkType } from "../utils/constants";

export function useGamesNetwork(): NetworkType {
  return resolveNetworkType();
}
