import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "@/providers/WalletProvider";
import { GamesTopBar } from "../components/GamesTopBar";
import { TABLE_COLORS } from "../config/games";
import { useGamesNetwork } from "../hooks/useGamesNetwork";
import { getProfiles, type UserProfile } from "../services/profiles";
import { getTableAddress, getTableSummary } from "../services/poker/views";
import { useFilteredTables, usePokerTablesStore } from "../stores/poker/tables";
import "../styles/casino.css";
import "../styles/poker-lobby.css";

function TableAvatar({
  avatarUrl,
  colorIndex
}: {
  avatarUrl?: string | null;
  colorIndex: number;
}) {
  if (avatarUrl) {
    return <img className="games-poker-table-icon" src={avatarUrl} alt="Table host" />;
  }

  return (
    <div
      className="games-poker-table-icon"
      style={{ background: TABLE_COLORS[colorIndex]?.accent || TABLE_COLORS[0].accent }}
    >
      <span className="games-poker-table-icon-fallback">★</span>
    </div>
  );
}

export function PokerTablesPage() {
  const network = useGamesNetwork();
  const wallet = useWallet();
  const address = wallet.account?.address?.toString() ?? "";
  const {
    refreshTables,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    hasMore,
    loadMoreTables,
    isLoadingMore,
    lastRefresh,
    setMyTable,
    upsertTable
  } = usePokerTablesStore();
  const filteredTables = useFilteredTables();
  const [adminProfiles, setAdminProfiles] = useState<Map<string, UserProfile | null>>(new Map());

  useEffect(() => {
    void refreshTables(network, 20);
  }, [network, refreshTables]);

  useEffect(() => {
    if (!wallet.connected || !address) return;

    let cancelled = false;

    void (async () => {
      try {
        const tableAddress = await getTableAddress(network, address);
        if (!tableAddress || tableAddress === "0x0" || cancelled) {
          if (!cancelled) {
            setMyTable(null);
          }
          return;
        }

        const summary = await getTableSummary(network, tableAddress);
        if (cancelled) return;

        upsertTable({ ...summary, tableAddress });
        setMyTable(tableAddress);
      } catch {
        if (!cancelled) {
          setMyTable(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, lastRefresh, network, setMyTable, upsertTable, wallet.connected]);

  useEffect(() => {
    if (filteredTables.length === 0) return;

    const owners = Array.from(new Set(filteredTables.map((table) => table.owner)));
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
  }, [adminProfiles, filteredTables, network]);

  return (
    <section className="games-screen">
      <GamesTopBar
        title="Poker Tables"
        backTo="/games/poker"
        rightSlot={
          <Link className="games-icon-button" to="/games/poker/create" aria-label="Create table">
            +
          </Link>
        }
      />

      <div className="games-screen-scroll">
        <div className="games-screen-content">
          <div className="games-card games-card-body games-section">
            <div className="games-poker-search-row">
              <label className="games-field">
                <span className="games-field-label">Search</span>
                <input
                  className="games-input"
                  value={searchQuery}
                  placeholder="Search tables..."
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="games-icon-button games-poker-filter-placeholder"
                disabled
                aria-label="Filters unavailable"
              >
                ≡
              </button>
            </div>

            <div className="games-poker-list-scroll">
              {isLoading ? (
                <div className="games-empty-state">Loading tables...</div>
              ) : error ? (
                <div className="games-poker-empty">
                  <p className="games-section-title">Unable to load tables</p>
                  <p className="games-section-copy">{error}</p>
                  <button
                    type="button"
                    className="games-button games-button-primary"
                    onClick={() => {
                      void refreshTables(network, 20);
                    }}
                  >
                    Retry
                  </button>
                </div>
              ) : filteredTables.length === 0 ? (
                <div className="games-poker-empty">
                  <p className="games-section-title">No tables found</p>
                  <p className="games-section-copy">
                    No active tables match the current search.
                  </p>
                  <Link className="games-button-link games-button-link-primary" to="/games/poker/create">
                    Create Table
                  </Link>
                </div>
              ) : (
                filteredTables.map((table) => (
                  <Link
                    key={table.tableAddress}
                    className="games-poker-list-row"
                    to={`/games/poker/${table.tableAddress}`}
                  >
                    <TableAvatar
                      avatarUrl={adminProfiles.get(table.owner)?.avatarUrl}
                      colorIndex={table.colorIndex}
                    />
                    <div className="games-poker-list-meta">
                      <p className="games-poker-list-title">{table.name || "Nova Poker"}</p>
                      <p className="games-poker-list-copy">
                        Blinds {table.smallBlind}/{table.bigBlind} • Buy-in {table.minBuyIn}/
                        {table.maxBuyIn}
                      </p>
                      <p className="games-poker-list-copy">
                        {table.occupiedSeats}/{table.totalSeats} seated
                        {table.hasActiveGame ? " • LIVE" : ""}
                      </p>
                    </div>
                    <span className="games-button games-button-accent">Join</span>
                  </Link>
                ))
              )}
            </div>

            {hasMore && !isLoading ? (
              <button
                type="button"
                className="games-button games-button-secondary"
                disabled={isLoadingMore}
                onClick={() => {
                  void loadMoreTables(network);
                }}
              >
                {isLoadingMore ? "Loading..." : "Load More Tables"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
