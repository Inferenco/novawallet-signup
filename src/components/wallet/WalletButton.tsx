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

  if (connected && account) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          className="nova-btn nova-btn-accent nova-btn-sm"
          onClick={() => setOpen((current) => !current)}
        >
          {shortAddress(account.address.toString())}
        </button>
        {open && (
          <div className="nova-card absolute right-0 top-12 w-48 p-nova-sm shadow-xl">
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
        className="nova-btn nova-btn-ghost nova-btn-sm"
      >
        Install Zedra
      </a>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="nova-btn nova-btn-ghost nova-btn-sm"
        onClick={() => setOpen((current) => !current)}
        disabled={connecting}
      >
        {connecting ? (
          <>
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Connecting...
          </>
        ) : (
          "Connect Wallet"
        )}
      </button>
      {open && (
        <div className="nova-card absolute right-0 top-12 w-52 p-nova-sm shadow-xl">
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
