import { beforeEach, describe, expect, it } from "vitest";
import { clearSecret, getSecret, hasSecret, storeSecret } from "./secrets";

describe("poker secret local storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and retrieves a secret", async () => {
    await storeSecret("testnet", "0xabc", "0xplayer", 1, "secret-value");
    await expect(getSecret("testnet", "0xabc", "0xplayer", 1)).resolves.toBe(
      "secret-value"
    );
  });

  it("clears stored secret", async () => {
    await storeSecret("testnet", "0xabc", "0xplayer", 2, "secret-value");
    await clearSecret("testnet", "0xabc", "0xplayer", 2);
    await expect(getSecret("testnet", "0xabc", "0xplayer", 2)).resolves.toBeNull();
  });

  it("reports existence correctly", async () => {
    await storeSecret("testnet", "0xabc", "0xplayer", 3, "secret-value");
    await expect(hasSecret("testnet", "0xabc", "0xplayer", 3)).resolves.toBe(true);
    await expect(hasSecret("testnet", "0xabc", "0xplayer", 9)).resolves.toBe(false);
  });
});
