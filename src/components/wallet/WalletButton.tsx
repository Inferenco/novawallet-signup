import { useState } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { shortAddress } from "@/lib/format";

export function WalletButton() {
  const {
    connected,
    connecting,
    account,
    connect,
    disconnect,
    wallets,
    walletInstallUrl
  } = useWallet();
  const [open, setOpen] = useState(false);

  if (connected && account) {
    return (
      <div className="relative">
        <button
          type="button"
          className="rounded-full border border-accent-0/50 bg-accent-1/20 px-3 py-1.5 text-xs text-ink-0"
          onClick={() => setOpen((current) => !current)}
        >
          {shortAddress(account.address.toString())}
        </button>
        {open ? (
          <div className="absolute right-0 top-10 w-44 rounded-xl border border-white/10 bg-bg-1 p-2 shadow-xl">
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-xs text-ink-1 transition hover:bg-white/5 hover:text-ink-0"
              onClick={() => {
                navigator.clipboard.writeText(account.address.toString());
                setOpen(false);
              }}
            >
              Copy address
            </button>
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-xs text-rose-200 transition hover:bg-rose-500/20"
              onClick={() => {
                void disconnect();
                setOpen(false);
              }}
            >
              Disconnect
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <a
        href={walletInstallUrl}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-ink-1 transition hover:border-white/40 hover:text-ink-0"
      >
        Install Zedra
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-ink-1 transition hover:border-white/40 hover:text-ink-0"
        onClick={() => setOpen((current) => !current)}
        disabled={connecting}
      >
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
      {open ? (
        <div className="absolute right-0 top-10 w-48 rounded-xl border border-white/10 bg-bg-1 p-2 shadow-xl">
          {wallets.map((wallet) => (
            <button
              key={wallet.name}
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-ink-1 transition hover:bg-white/5 hover:text-ink-0"
              onClick={() => {
                void connect(wallet.name);
                setOpen(false);
              }}
              disabled={connecting}
            >
              {wallet.icon ? (
                <img src={wallet.icon} alt={wallet.name} className="h-4 w-4" />
              ) : null}
              <span>{wallet.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
