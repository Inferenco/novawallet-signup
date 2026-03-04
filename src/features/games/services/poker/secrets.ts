import { SECRET_KEY_PREFIX } from "../../config/games";

function buildSecretKey(
  network: string,
  tableAddress: string,
  playerAddress: string,
  handNumber: number
): string {
  return `${SECRET_KEY_PREFIX}_${network}_${tableAddress}_${playerAddress}_${handNumber}`.toLowerCase();
}

function safeGetStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export async function storeSecret(
  network: string,
  tableAddress: string,
  playerAddress: string,
  handNumber: number,
  secret: string
): Promise<void> {
  const storage = safeGetStorage();
  if (!storage) return;
  const key = buildSecretKey(network, tableAddress, playerAddress, handNumber);
  storage.setItem(key, secret);
}

export async function getSecret(
  network: string,
  tableAddress: string,
  playerAddress: string,
  handNumber: number
): Promise<string | null> {
  const storage = safeGetStorage();
  if (!storage) return null;
  const key = buildSecretKey(network, tableAddress, playerAddress, handNumber);
  return storage.getItem(key);
}

export async function clearSecret(
  network: string,
  tableAddress: string,
  playerAddress: string,
  handNumber: number
): Promise<void> {
  const storage = safeGetStorage();
  if (!storage) return;
  const key = buildSecretKey(network, tableAddress, playerAddress, handNumber);
  storage.removeItem(key);
}

export async function clearTableSecrets(
  network: string,
  tableAddress: string,
  playerAddress: string,
  maxHandNumber: number
): Promise<void> {
  const jobs: Promise<void>[] = [];
  for (let hand = 1; hand <= maxHandNumber; hand += 1) {
    jobs.push(clearSecret(network, tableAddress, playerAddress, hand));
  }
  await Promise.all(jobs);
}

export async function clearAllPlayerSecrets(
  network: string,
  playerAddress: string,
  knownTableAddresses: string[],
  maxHandNumber = 100
): Promise<void> {
  const jobs: Promise<void>[] = [];
  for (const table of knownTableAddresses) {
    for (let hand = 1; hand <= maxHandNumber; hand += 1) {
      jobs.push(clearSecret(network, table, playerAddress, hand));
    }
  }
  await Promise.all(jobs);
}

export async function hasSecret(
  network: string,
  tableAddress: string,
  playerAddress: string,
  handNumber: number
): Promise<boolean> {
  const secret = await getSecret(network, tableAddress, playerAddress, handNumber);
  return Boolean(secret);
}
