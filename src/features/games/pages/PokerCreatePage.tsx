import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GlassCard, NovaButton, NovaInput } from "@/components/ui";
import { useToast } from "@/providers/ToastProvider";
import { useWallet } from "@/providers/WalletProvider";
import { hasConfiguredGameContracts } from "@/config/env";
import { useGamesNetwork } from "../hooks/useGamesNetwork";
import { useGameSigner } from "../hooks/useGameSigner";
import {
  MAX_SEATS,
  SPEED_LABELS,
  TABLE_COLORS,
  TABLE_SPEEDS
} from "../config/games";
import { createTable } from "../services/poker/actions";
import { parsePokerError } from "../utils/poker/errors";
import { usePokerTablesStore } from "../stores/poker/tables";
import { ContractsWarning } from "../components/ContractsWarning";
import "../styles/games.css";

function parseInteger(value: string): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function PokerCreatePage() {
  const wallet = useWallet();
  const signer = useGameSigner();
  const network = useGamesNetwork();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { refreshTables } = usePokerTablesStore();

  const [tableName, setTableName] = useState("");
  const [colorIndex, setColorIndex] = useState(0);
  const [smallBlind, setSmallBlind] = useState("5");
  const [bigBlind, setBigBlind] = useState("10");
  const [minBuyIn, setMinBuyIn] = useState("200");
  const [maxBuyIn, setMaxBuyIn] = useState("1000");
  const [ante, setAnte] = useState("0");
  const [straddleEnabled, setStraddleEnabled] = useState(false);
  const [tableSpeed, setTableSpeed] = useState<number>(TABLE_SPEEDS.STANDARD);
  const [submitting, setSubmitting] = useState(false);

  const nameError = useMemo(() => {
    const trimmed = tableName.trim();
    if (!trimmed) return null;
    if (trimmed.length < 3) return "Table name must be at least 3 characters.";
    if (trimmed.length > 32) return "Table name must be 32 characters or fewer.";
    if (!/^[A-Za-z0-9 _-]+$/.test(trimmed)) {
      return "Table name can only include letters, numbers, spaces, _ and -.";
    }
    return null;
  }, [tableName]);

  const valid = useMemo(() => {
    const sb = parseInteger(smallBlind);
    const bb = parseInteger(bigBlind);
    const min = parseInteger(minBuyIn);
    const max = parseInteger(maxBuyIn);
    if (Number.isNaN(sb) || sb <= 0) return false;
    if (Number.isNaN(bb) || bb <= 0) return false;
    if (bb < sb) return false;
    if (Number.isNaN(min) || min < bb) return false;
    if (Number.isNaN(max) || max < min) return false;
    return !nameError;
  }, [bigBlind, minBuyIn, maxBuyIn, nameError, smallBlind]);

  const handleCreate = async () => {
    if (!wallet.connected || !signer) {
      pushToast("error", "Connect your wallet before creating a table.");
      return;
    }
    if (wallet.networkMismatch) {
      pushToast("error", "Switch wallet network to Cedra Testnet.");
      return;
    }
    if (!hasConfiguredGameContracts()) {
      pushToast("error", "Game contracts are not configured.");
      return;
    }
    if (!valid) {
      pushToast("error", nameError || "Please fix table settings.");
      return;
    }

    setSubmitting(true);
    try {
      await createTable(network, signer, {
        smallBlind: BigInt(parseInteger(smallBlind)),
        bigBlind: BigInt(parseInteger(bigBlind)),
        minBuyIn: BigInt(parseInteger(minBuyIn)),
        maxBuyIn: BigInt(parseInteger(maxBuyIn)),
        ante: BigInt(parseInteger(ante) || 0),
        straddleEnabled,
        tableSpeed,
        name: tableName.trim() || undefined,
        colorIndex
      });

      pushToast("success", "Table created successfully.");
      await refreshTables(network);
      navigate("/games/poker");
    } catch (error) {
      pushToast("error", parsePokerError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="games-page">
      <ContractsWarning />

      <header className="games-hero">
        <p className="m-0 text-caption uppercase tracking-wide text-nova-cyan">Host Table</p>
        <h1 className="m-0 mt-nova-sm text-h1 text-text-primary">Create Poker Table</h1>
        <p className="m-0 mt-nova-sm max-w-2xl text-body text-text-secondary">
          Configure blinds, buy-in range, speed, and table theme.
        </p>
      </header>

      <GlassCard className="games-form-grid two">
        <NovaInput
          label="Table name (optional)"
          value={tableName}
          maxLength={32}
          onChange={(event) => setTableName(event.target.value)}
          placeholder="My Poker Table"
          error={nameError || undefined}
        />

        <div className="grid gap-nova-sm">
          <p className="m-0 text-caption text-text-secondary">Table theme</p>
          <div className="games-pill-row">
            {Object.entries(TABLE_COLORS).map(([idx, theme]) => (
              <button
                key={idx}
                type="button"
                className={`games-pill ${colorIndex === Number(idx) ? "active" : ""}`}
                style={{ borderColor: theme.accent }}
                onClick={() => setColorIndex(Number(idx))}
              >
                {theme.name}
              </button>
            ))}
          </div>
        </div>

        <NovaInput
          label="Small blind"
          value={smallBlind}
          onChange={(event) => setSmallBlind(event.target.value)}
          inputMode="numeric"
        />
        <NovaInput
          label="Big blind"
          value={bigBlind}
          onChange={(event) => setBigBlind(event.target.value)}
          inputMode="numeric"
        />

        <NovaInput
          label="Min buy-in"
          value={minBuyIn}
          onChange={(event) => setMinBuyIn(event.target.value)}
          inputMode="numeric"
        />
        <NovaInput
          label="Max buy-in"
          value={maxBuyIn}
          onChange={(event) => setMaxBuyIn(event.target.value)}
          inputMode="numeric"
        />

        <NovaInput
          label="Ante"
          value={ante}
          onChange={(event) => setAnte(event.target.value)}
          inputMode="numeric"
        />

        <div className="grid gap-nova-sm">
          <p className="m-0 text-caption text-text-secondary">Table speed</p>
          <div className="games-pill-row">
            {Object.entries(SPEED_LABELS).map(([speed, label]) => (
              <button
                key={speed}
                type="button"
                className={`games-pill ${tableSpeed === Number(speed) ? "active" : ""}`}
                onClick={() => setTableSpeed(Number(speed))}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-nova-sm rounded-nova-standard border border-surface-glass-border bg-surface-glass p-nova-md text-body text-text-secondary">
          <input
            type="checkbox"
            checked={straddleEnabled}
            onChange={(event) => setStraddleEnabled(event.target.checked)}
          />
          Allow straddle
        </label>
      </GlassCard>

      <GlassCard className="grid gap-nova-sm">
        <p className="m-0 text-caption text-text-muted">Seats are fixed at {MAX_SEATS} players.</p>
        <div className="flex flex-wrap gap-nova-sm">
          <NovaButton onClick={() => void handleCreate()} disabled={!valid || submitting} loading={submitting}>
            Create Table
          </NovaButton>
          <Link className="nova-btn nova-btn-ghost" to="/games/poker">
            Cancel
          </Link>
        </div>
      </GlassCard>
    </section>
  );
}
