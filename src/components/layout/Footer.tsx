export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-bg-0/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-ink-2 md:flex-row">
        <p>Nova Ecosystem dApp</p>
        <div className="flex items-center gap-4">
          <a
            href="https://x.com/movenovawallet"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-ink-0"
          >
            X
          </a>
          <a
            href="https://t.me/movenovawallet"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-ink-0"
          >
            Telegram
          </a>
        </div>
      </div>
    </footer>
  );
}
