import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { WalletButton } from "@/components/wallet/WalletButton";
import { hasConfiguredGameContracts } from "@/config/env";
import { formatCedraFromOctas, shortAddress } from "@/lib/format";
import { useToast } from "@/providers/ToastProvider";
import { useWallet } from "@/providers/WalletProvider";
import { GamesTopBar } from "../components/GamesTopBar";
import { CHIP_IMAGE_URL, TABLE_COLORS } from "../config/games";
import { useCedraBalance } from "../hooks/useCedraBalance";
import { useGamesNetwork } from "../hooks/useGamesNetwork";
import { useChipActions } from "../hooks/poker/useChipActions";
import { getProfiles, type UserProfile } from "../services/profiles";
import { formatChips } from "../services/poker/chips";
import { getTableAddress, getTableSummary } from "../services/poker/views";
import { buildChipBalanceKey, usePokerChipsStore } from "../stores/poker/chips";
import { usePokerTablesStore } from "../stores/poker/tables";
import "../styles/casino.css";
import "../styles/poker-lobby.css";

function TableAvatar({
  avatarUrl,
  colorIndex,
  fallback
}: {
  avatarUrl?: string | null;
  colorIndex: number;
  fallback: string;
}) {
  if (avatarUrl) {
    return <img className="games-poker-table-icon" src={avatarUrl} alt={fallback} />;
  }

  return (
    <div
      className="games-poker-table-icon"
      style={{ background: TABLE_COLORS[colorIndex]?.accent || TABLE_COLORS[0].accent }}
    >
      <span className="games-poker-table-icon-fallback">{fallback}</span>
    </div>
  );
}

export function PokerLandingPage() {
  const wallet = useWallet();
  const network = useGamesNetwork();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const address = wallet.account?.address?.toString() ?? "";
  const { balance: cedraBalance, refreshBalance: refreshCedraBalance } = useCedraBalance(address);
  const { tables, refreshTables, isLoading, setMyTable, upsertTable, removeTable } =
    usePokerTablesStore();
  const chipActions = useChipActions({ network, playerAddress: address });
  const { refreshBalance: refreshChipBalance } = chipActions;

  const chipBalanceKey = buildChipBalanceKey(network, address);
  const cachedChipEntry = usePokerChipsStore((state) =>
    chipBalanceKey ? state.balances[chipBalanceKey] ?? null : null
  );
  const cachedChipBalance = cachedChipEntry?.balance ?? 0;
  const isCachedBalanceFresh = cachedChipEntry
    ? Date.now() - cachedChipEntry.updatedAt < 5 * 60 * 1000
    : false;
  const effectiveChipBalance =
    chipActions.chipBalance > 0
      ? chipActions.chipBalance
      : isCachedBalanceFresh
        ? cachedChipBalance
        : 0;

  const [joinAddress, setJoinAddress] = useState("");
  const [adminProfiles, setAdminProfiles] = useState<Map<string, UserProfile | null>>(new Map());
  const existingOwnedTableAddress = useMemo(() => {
    const normalized = address.toLowerCase();
    return tables.find((table) => table.owner.toLowerCase() === normalized)?.tableAddress ?? null;
  }, [address, tables]);

  useEffect(() => {
    if (!wallet.connected) return;

    void refreshTables(network, 6);
    void refreshChipBalance();
    void refreshCedraBalance();
  }, [network, refreshCedraBalance, refreshChipBalance, refreshTables, wallet.connected]);

  useEffect(() => {
    if (!wallet.connected || !address) return;

    let cancelled = false;

    void (async () => {
      try {
        const tableAddress = await getTableAddress(network, address);
        if (!tableAddress || tableAddress === "0x0" || cancelled) {
          return;
        }

        const summary = await getTableSummary(network, tableAddress);
        if (cancelled) return;

        upsertTable({ ...summary, tableAddress });
        setMyTable(tableAddress);
      } catch {
        if (!cancelled) {
          setMyTable(null);
          if (existingOwnedTableAddress) {
            removeTable(existingOwnedTableAddress);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, existingOwnedTableAddress, network, removeTable, setMyTable, upsertTable, wallet.connected]);

  useEffect(() => {
    if (!wallet.connected || tables.length === 0) return;

    const owners = Array.from(new Set(tables.map((table) => table.owner)));
    const missing = owners.filter((owner) => !adminProfiles.has(owner));
    if (missing.length === 0) return;

    getProfiles(network, missing)
      .then((profiles) => {
        setAdminProfiles((current) => {
          const next = new Map(current);
          profiles.forEach((profile, owner) => next.set(owner, profile));
          return next;
        });
      })
      .catch(() => {
        // Ignore non-critical profile fetch failures.
      });
  }, [adminProfiles, network, tables, wallet.connected]);

  const myTable = useMemo(() => {
    const normalized = address.toLowerCase();
    return tables.find((table) => table.owner.toLowerCase() === normalized) ?? null;
  }, [address, tables]);
  const cedraDisplay = useMemo(
    () => formatCedraFromOctas(BigInt(Math.max(cedraBalance, 0))).replace(/\s+CEDRA$/, ""),
    [cedraBalance]
  );

  const handleJoin = useCallback(() => {
    if (!wallet.connected) {
      pushToast("error", "Connect your wallet before joining a table.");
      return;
    }
    if (!hasConfiguredGameContracts()) {
      pushToast("error", "Game contracts are not configured.");
      return;
    }
    if (effectiveChipBalance <= 0) {
      pushToast("error", "You need chips first. Visit Nova Casino to claim your daily chips.");
      return;
    }

    const value = joinAddress.trim();
    if (!value.startsWith("0x") || value.length < 10) {
      pushToast("error", "Enter a valid table address.");
      return;
    }

    navigate(`/games/poker/${value}`);
  }, [effectiveChipBalance, joinAddress, navigate, pushToast, wallet.connected]);

  return (
    <section className="games-screen">
      <GamesTopBar title="Poker Lobby" backTo="/games" rightSlot={<WalletButton />} />

      <div className="games-screen-scroll">
        <div className="games-screen-content games-poker-dashboard">
          <div className="games-poker-overview-column">
            <div className="games-card games-card-hero games-poker-hero-card">
              <div className="games-section">
                <p className="games-section-kicker">Nova Star Hold&apos;em</p>
                <h1 className="games-section-title">Poker Lobby</h1>
                <p className="games-section-copy">
                  Join direct by address, browse live rooms, or host a polished five-seat table on
                  the same premium flow across mobile and desktop.
                </p>
              </div>
              <div className="games-poker-hero-highlights">
                <span>5-seat cash tables</span>
                <span>Owner controls</span>
                <span>Responsive game room</span>
              </div>
            </div>

            <div className="games-poker-balance-row">
              <span className="games-pill-balance">
                <span className="games-pill-label">CEDRA</span>
                <span>{cedraDisplay}</span>
              </span>
              <span className="games-pill-balance games-pill-balance-chip">
                <img src={CHIP_IMAGE_URL} alt="" aria-hidden="true" />
                <span className="games-pill-label">Chips</span>
                <span>{formatChips(effectiveChipBalance)}</span>
              </span>
            </div>

            {!wallet.connected ? (
              <div className="games-empty-state games-poker-wallet-note">
                Connect your wallet to join tables, create a room, and use your chip balance.
              </div>
            ) : null}

            <div className="games-card games-card-body games-section games-poker-live-card">
              <div className="games-inline-row" style={{ justifyContent: "space-between" }}>
                <div>
                  <p className="games-section-kicker">Active Tables</p>
                  <h2 className="games-section-title">Live Lobby</h2>
                </div>
                <Link className="games-button-link games-button-link-secondary" to="/games/poker/tables">
                  Browse All
                </Link>
              </div>

              <div className="games-poker-list-scroll">
                {isLoading ? (
                  <div className="games-empty-state">Loading tables...</div>
                ) : tables.length === 0 ? (
                  <div className="games-poker-empty">
                    <p className="games-section-title">No active tables yet</p>
                    <p className="games-section-copy">
                      Host a room or enter by address to start the floor.
                    </p>
                  </div>
                ) : (
                  tables.slice(0, 3).map((table) => {
                    const host = adminProfiles.get(table.owner);

                    return (
                      <Link
                        key={table.tableAddress}
                        className="games-poker-list-row"
                        to={`/games/poker/${table.tableAddress}`}
                      >
                        <TableAvatar
                          avatarUrl={host?.avatarUrl}
                          colorIndex={table.colorIndex}
                          fallback="♠"
                        />
                        <div className="games-poker-list-meta">
                          <p className="games-poker-list-title">{table.name || "Nova Poker"}</p>
                          <p className="games-poker-list-copy">
                            {table.smallBlind}/{table.bigBlind}
                            {table.ante > 0 ? ` • ante ${table.ante}` : ""}
                            {table.straddleEnabled ? " • straddle" : ""}
                          </p>
                          <p className="games-poker-list-copy">
                            Host {host?.nickname || shortAddress(table.owner)} • {table.occupiedSeats}/
                            {table.totalSeats}
                          </p>
                        </div>
                        <span className="games-button games-button-accent">Join</span>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="games-poker-actions-column">
            <div className="games-poker-split-grid">
              <div className="games-card games-poker-half-card">
                <div className="games-poker-card-title-row">
                  <p className="games-poker-card-title">Join By Address</p>
                </div>
                <label className="games-field">
                  <span className="games-field-label">Table address</span>
                  <input
                    className="games-input"
                    value={joinAddress}
                    placeholder="0x..."
                    onChange={(event) => setJoinAddress(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="games-button games-button-primary"
                  disabled={!wallet.connected || !hasConfiguredGameContracts()}
                  onClick={handleJoin}
                >
                  Join Table
                </button>
              </div>

              <div className="games-card games-poker-half-card">
                <div className="games-poker-card-title-row">
                  <p className="games-poker-card-title">Create Table</p>
                </div>
                <div className="games-poker-create-icon">+</div>
                <p className="games-section-copy">
                  Configure blinds, buy-in limits, speed, and table theme for a new game.
                </p>
                <Link className="games-button-link games-button-link-primary" to="/games/poker/create">
                  Host New Table
                </Link>
              </div>
            </div>

            <div className="games-card games-poker-owner-card">
              <div className="games-poker-owner-header">
                <div>
                  <p className="games-section-kicker">Owner Panel</p>
                  <h2 className="games-section-title">Your Table</h2>
                </div>
                {myTable ? <span className="games-poker-owner-badge">OWNER</span> : null}
              </div>

              {myTable ? (
                <Link className="games-poker-owner-row" to={`/games/poker/${myTable.tableAddress}`}>
                  <TableAvatar
                    avatarUrl={adminProfiles.get(myTable.owner)?.avatarUrl}
                    colorIndex={myTable.colorIndex}
                    fallback="♠"
                  />
                  <div className="games-poker-list-meta">
                    <p className="games-poker-list-title">{myTable.name || "Nova Poker"}</p>
                    <p className="games-poker-list-copy">
                      {myTable.smallBlind}/{myTable.bigBlind} blinds • {myTable.occupiedSeats}/
                      {myTable.totalSeats} seated
                    </p>
                  </div>
                  <span className="games-button games-button-accent">Open</span>
                </Link>
              ) : (
                <div className="games-empty-state">
                  Create a table to host your own game and re-enter it from this panel.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
