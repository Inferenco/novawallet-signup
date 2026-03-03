import { useState, useEffect, useRef } from "react";
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
    walletInstallUrl,
  } = useWallet();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const navLinkClass =
    "whitespace-nowrap rounded-nova-round bg-surface-glass px-nova-md py-nova-sm text-body text-text-secondary transition-colors hover:bg-surface-glass/80 hover:text-text-primary";

  if (connected && account) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          className={`${navLinkClass} bg-surface-glass font-medium text-text-primary`}
          onClick={() => setOpen((current) => !current)}
        >
          {shortAddress(account.address.toString())}
        </button>
        {open && (
          <div className="absolute right-0 top-12 w-48 rounded-nova-standard border border-surface-glass-border bg-bg-secondary p-nova-sm shadow-xl">
            <button
              type="button"
              className="flex w-full items-center gap-nova-sm rounded-nova-small px-nova-md py-nova-sm text-left text-body-small text-text-secondary transition-colors hover:bg-surface-glass hover:text-text-primary"
              onClick={() => {
                navigator.clipboard.writeText(account.address.toString());
                setOpen(false);
              }}
            >
              Copy address
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-nova-sm rounded-nova-small px-nova-md py-nova-sm text-left text-body-small text-status-error transition-colors hover:bg-status-error-bg"
              onClick={() => {
                void disconnect();
                setOpen(false);
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <a
        href={walletInstallUrl}
        target="_blank"
        rel="noreferrer"
        className={navLinkClass}
      >
        Install Wallet
      </a>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className={`${navLinkClass} ${connecting ? "opacity-50" : ""}`}
        onClick={() => setOpen((current) => !current)}
        disabled={connecting}
      >
        {connecting ? (
          <span className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Connecting
          </span>
        ) : (
          "Connect"
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-52 rounded-nova-standard border border-surface-glass-border bg-bg-secondary p-nova-sm shadow-xl">
          {wallets.map((wallet) => (
            <button
              key={wallet.name}
              type="button"
              className="flex w-full items-center gap-nova-sm rounded-nova-small px-nova-md py-nova-sm text-left text-body-small text-text-secondary transition-colors hover:bg-surface-glass hover:text-text-primary"
              onClick={() => {
                void connect(wallet.name);
                setOpen(false);
              }}
              disabled={connecting}
            >
              {wallet.icon && (
                <img
                  src={wallet.icon}
                  alt={wallet.name}
                  className="h-5 w-5 rounded-nova-micro"
                />
              )}
              <span>{wallet.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
