import { useEffect } from "react";
import { Link } from "react-router-dom";
import { GlassCard, NovaButton, NovaInput } from "@/components/ui";
import { useGamesNetwork } from "../hooks/useGamesNetwork";
import { useFilteredTables, usePokerTablesStore } from "../stores/poker/tables";
import { ContractsWarning } from "../components/ContractsWarning";
import "../styles/games.css";

export function PokerTablesPage() {
  const network = useGamesNetwork();
  const { refreshTables, isLoading, searchQuery, setSearchQuery, hasMore, loadMoreTables, isLoadingMore } =
    usePokerTablesStore();

  const filteredTables = useFilteredTables();

  useEffect(() => {
    void refreshTables(network, 20);
  }, [network, refreshTables]);

  return (
    <section className="games-page">
      <ContractsWarning />

      <header className="games-hero">
        <p className="m-0 text-caption uppercase tracking-wide text-nova-cyan">Discover</p>
        <h1 className="m-0 mt-nova-sm text-h1 text-text-primary">Poker Tables</h1>
        <p className="m-0 mt-nova-sm max-w-2xl text-body text-text-secondary">
          Search active tables and join instantly.
        </p>
      </header>

      <GlassCard className="grid gap-nova-md">
        <div className="flex flex-wrap items-center justify-between gap-nova-sm">
          <NovaInput
            label="Search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search name or table address"
          />
          <Link className="nova-btn nova-btn-primary" to="/games/poker/create">
            Create Table
          </Link>
        </div>

        <div className="games-card-list">
          {isLoading ? (
            <p className="m-0 text-body text-text-muted">Loading tables...</p>
          ) : filteredTables.length === 0 ? (
            <p className="m-0 text-body text-text-muted">No tables match this search.</p>
          ) : (
            filteredTables.map((table) => (
              <div key={table.tableAddress} className="games-list-row">
                <div className="meta">
                  <p className="name">{table.name || "Nova Poker"}</p>
                  <p className="sub">
                    Blinds {table.smallBlind}/{table.bigBlind} • Buy-in {table.minBuyIn}-{table.maxBuyIn}
                  </p>
                  <p className="sub">
                    Seats {table.occupiedSeats}/{table.totalSeats}
                    {table.hasActiveGame ? " • live hand" : ""}
                  </p>
                </div>
                <Link className="nova-btn nova-btn-accent nova-btn-sm" to={`/games/poker/${table.tableAddress}`}>
                  Join
                </Link>
              </div>
            ))
          )}
        </div>

        {hasMore && (
          <div className="flex justify-center">
            <NovaButton
              variant="ghost"
              loading={isLoadingMore}
              onClick={() => {
                void loadMoreTables(network);
              }}
            >
              Load More Tables
            </NovaButton>
          </div>
        )}
      </GlassCard>

      <div className="flex justify-start">
        <Link className="nova-btn nova-btn-ghost" to="/games/poker">
          Back to Lobby
        </Link>
      </div>
    </section>
  );
}
