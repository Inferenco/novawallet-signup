import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GlassCard, NovaButton, NovaInput } from "@/components/ui";
import { useToast } from "@/providers/ToastProvider";
import { useWallet } from "@/providers/WalletProvider";
import { hasConfiguredGameContracts } from "@/config/env";
import { useGamesNetwork } from "../hooks/useGamesNetwork";
import { usePokerTablesStore } from "../stores/poker/tables";
import { useChipActions } from "../hooks/poker/useChipActions";
import { formatChips } from "../services/poker/chips";
import { getProfiles, type UserProfile } from "../services/profiles";
import { ContractsWarning } from "../components/ContractsWarning";
import "../styles/games.css";

export function PokerLandingPage() {
  const wallet = useWallet();
  const network = useGamesNetwork();
  const navigate = useNavigate();
  const { pushToast } = useToast();

  const address = wallet.account?.address?.toString() ?? "";
  const { tables, refreshTables, isLoading } = usePokerTablesStore();
  const chipActions = useChipActions({ network, playerAddress: address });
  const { refreshBalance } = chipActions;

  const [joinAddress, setJoinAddress] = useState("");
  const [adminProfiles, setAdminProfiles] = useState<Map<string, UserProfile | null>>(
    new Map()
  );

  useEffect(() => {
    if (!wallet.connected) return;
    void refreshTables(network, 6);
    void refreshBalance();
  }, [network, refreshBalance, refreshTables, wallet.connected]);

  useEffect(() => {
    if (!wallet.connected || tables.length === 0) return;
    const owners = Array.from(new Set(tables.map((table) => table.owner)));
    const missing = owners.filter((owner) => !adminProfiles.has(owner));
    if (missing.length === 0) return;

    getProfiles(network, missing)
      .then((profiles) => {
        setAdminProfiles((prev) => {
          const next = new Map(prev);
          profiles.forEach((profile, owner) => {
            next.set(owner, profile);
          });
          return next;
        });
      })
      .catch(() => {
        // ignore non-critical profile fetch failures
      });
  }, [adminProfiles, network, tables, wallet.connected]);

  const myTable = useMemo(() => {
    const normalized = address.toLowerCase();
    return tables.find((table) => table.owner.toLowerCase() === normalized) ?? null;
  }, [address, tables]);

  const handleJoin = useCallback(() => {
    if (!wallet.connected) {
      pushToast("error", "Connect your wallet before joining a table.");
      return;
    }

    if (chipActions.chipBalance <= 0) {
      pushToast(
        "error",
        "You need chips to join a table. Visit Casino to claim free chips first."
      );
      return;
    }

    const value = joinAddress.trim();
    if (!value.startsWith("0x") || value.length < 10) {
      pushToast("error", "Enter a valid table address.");
      return;
    }

    navigate(`/games/poker/${value}`);
  }, [chipActions.chipBalance, joinAddress, navigate, pushToast, wallet.connected]);

  return (
    <section className="games-page">
      <ContractsWarning />

      <header className="games-hero">
        <p className="m-0 text-caption uppercase tracking-wide text-nova-cyan">Texas Hold&apos;em</p>
        <h1 className="m-0 mt-nova-sm text-h1 text-text-primary">Poker Lobby</h1>
        <p className="m-0 mt-nova-sm max-w-2xl text-body text-text-secondary">
          Discover active tables, jump in with a direct table address, or create a new room.
        </p>
      </header>

      <div className="games-grid games-grid-2">
        <GlassCard className="grid gap-nova-md">
          <h2 className="games-section-title">Join by Address</h2>
          <NovaInput
            label="Table address"
            value={joinAddress}
            onChange={(event) => setJoinAddress(event.target.value)}
            placeholder="0x..."
          />
          <NovaButton
            onClick={handleJoin}
            disabled={!wallet.connected || !hasConfiguredGameContracts()}
          >
            Join Table
          </NovaButton>
          <p className="m-0 text-caption text-text-muted">
            Chip balance: {formatChips(chipActions.chipBalance)}
          </p>
        </GlassCard>

        <GlassCard className="grid gap-nova-md">
          <h2 className="games-section-title">Host Controls</h2>
          {myTable ? (
            <div className="games-list-row">
              <div className="meta">
                <p className="name">{myTable.name || "Nova Poker"}</p>
                <p className="sub">{myTable.smallBlind}/{myTable.bigBlind} • {myTable.occupiedSeats}/{myTable.totalSeats} seated</p>
              </div>
              <Link className="nova-btn nova-btn-accent nova-btn-sm" to={`/games/poker/${myTable.tableAddress}`}>
                Open
              </Link>
            </div>
          ) : (
            <p className="m-0 text-body text-text-muted">
              You are not currently hosting a table.
            </p>
          )}

          <div className="flex flex-wrap gap-nova-sm">
            <Link className="nova-btn nova-btn-primary" to="/games/poker/create">
              Create Table
            </Link>
            <Link className="nova-btn nova-btn-ghost" to="/games/poker/tables">
              Browse All Tables
            </Link>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="grid gap-nova-md">
        <div className="flex items-center justify-between gap-nova-sm">
          <h2 className="games-section-title">Recent Active Tables</h2>
          <Link className="text-caption font-semibold text-nova-cyan" to="/games/poker/tables">
            View all
          </Link>
        </div>

        <div className="games-card-list">
          {isLoading ? (
            <p className="m-0 text-body text-text-muted">Loading tables...</p>
          ) : tables.length === 0 ? (
            <p className="m-0 text-body text-text-muted">No active tables right now.</p>
          ) : (
            tables.map((table) => (
              <div key={table.tableAddress} className="games-list-row">
                <div className="meta">
                  <p className="name">{table.name || "Nova Poker"}</p>
                  <p className="sub">
                    {table.smallBlind}/{table.bigBlind}
                    {table.ante > 0 ? ` • ante ${table.ante}` : ""}
                    {table.straddleEnabled ? " • straddle" : ""}
                    {` • ${table.occupiedSeats}/${table.totalSeats}`}
                  </p>
                  <p className="sub">
                    Host: {adminProfiles.get(table.owner)?.nickname || `${table.owner.slice(0, 6)}...${table.owner.slice(-4)}`}
                  </p>
                </div>
                <Link className="nova-btn nova-btn-accent nova-btn-sm" to={`/games/poker/${table.tableAddress}`}>
                  Join
                </Link>
              </div>
            ))
          )}
        </div>
      </GlassCard>
    </section>
  );
}
