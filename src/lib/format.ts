import { DateTime } from "luxon";

export type EventStatus = "Live" | "Upcoming" | "Past" | "TBA";
export const OCTAS_PER_CEDRA = 100_000_000n;

export function toU64String(value: string | number | bigint): string {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") return Math.max(0, Math.trunc(value)).toString();
  const parsed = value.trim();
  return parsed === "" ? "0" : parsed;
}

export function parseInteger(value: unknown, fallback: number = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value === "true" || value === "1";
  return false;
}

export function shortAddress(address: string | undefined): string {
  if (!address) return "";
  if (address.length < 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatCedraFromOctas(octas: bigint): string {
  const whole = octas / OCTAS_PER_CEDRA;
  const fractional = octas % OCTAS_PER_CEDRA;

  if (fractional === 0n) {
    return `${whole.toString()} CEDRA`;
  }

  const fractionText = fractional
    .toString()
    .padStart(8, "0")
    .replace(/0+$/, "");

  return `${whole.toString()}.${fractionText} CEDRA`;
}

export function toUnixSeconds(dateTimeLocal: string): number {
  const dt = DateTime.fromISO(dateTimeLocal, { zone: "local" });
  return dt.isValid ? Math.floor(dt.toUTC().toSeconds()) : 0;
}

export function fromUnixSeconds(unixSeconds: number): string {
  return DateTime.fromSeconds(unixSeconds, { zone: "utc" }).toLocal().toFormat("yyyy-LL-dd'T'HH:mm");
}

export function formatDateTime(unixSeconds: number): string {
  return DateTime.fromSeconds(unixSeconds, { zone: "utc" })
    .toLocal()
    .toFormat("dd LLL yyyy, HH:mm ZZZZ");
}

export function computeEventStatus(
  startTimestamp: number,
  endTimestamp: number,
  isTba: boolean,
  nowUnixSeconds: number = Math.floor(Date.now() / 1000)
): EventStatus {
  if (isTba) return "TBA";
  if (nowUnixSeconds > endTimestamp) return "Past";
  if (nowUnixSeconds >= startTimestamp) return "Live";
  return "Upcoming";
}

export function mapErrorMessage(error: unknown): string {
  const raw = String(error ?? "Unknown error");
  const lowered = raw.toLowerCase();

  if (lowered.includes("invalid_escrow") || lowered.includes("invalid escrow")) {
    return "Escrow amount is invalid for the current contract configuration.";
  }
  if (lowered.includes("not_submitter") || lowered.includes("permission_denied")) {
    return "This action is only available to the original submitter.";
  }
  if (lowered.includes("not_found") || lowered.includes("not found")) {
    return "The event or pending submission could not be found on chain.";
  }
  if (lowered.includes("insufficient") || lowered.includes("balance")) {
    return "Insufficient balance for escrow or gas fees.";
  }

  return "Transaction failed. Please review wallet details and try again.";
}
