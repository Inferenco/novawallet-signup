import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WalletButton } from "@/components/wallet/WalletButton";
import { hasConfiguredGameContracts } from "@/config/env";
import { useToast } from "@/providers/ToastProvider";
import { useWallet } from "@/providers/WalletProvider";
import { GamesTopBar } from "../components/GamesTopBar";
import { MAX_SEATS, SPEED_LABELS, TABLE_COLORS, TABLE_SPEEDS } from "../config/games";
import { useGamesNetwork } from "../hooks/useGamesNetwork";
import { useGameSigner } from "../hooks/useGameSigner";
import { createTable } from "../services/poker/actions";
import { formatChips } from "../services/poker/chips";
import { usePokerTablesStore } from "../stores/poker/tables";
import { parsePokerError } from "../utils/poker/errors";
import "../styles/poker-lobby.css";

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
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
      pushToast("error", nameError || "Please fix the table settings.");
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
    <section className="games-screen">
      <GamesTopBar title="Create Table" backTo="/games/poker" rightSlot={<WalletButton />} />

      <div className="games-screen-scroll">
        <div className="games-screen-content">
          <div className="games-card games-card-body games-section">
            <div className="games-inline-row" style={{ justifyContent: "space-between" }}>
              <div>
                <p className="games-section-kicker">Host Table</p>
                <h1 className="games-section-title">Create Poker Table</h1>
              </div>
              <p className="games-status-text">{tableName.length}/32</p>
            </div>

            <label className="games-field">
              <span className="games-field-label">Table name (optional)</span>
              <input
                className="games-input"
                maxLength={32}
                placeholder="My Poker Table"
                value={tableName}
                onChange={(event) => setTableName(event.target.value)}
              />
            </label>
            {nameError ? <p className="games-status-text games-status-error">{nameError}</p> : null}
          </div>

          <div className="games-card games-card-body games-section">
            <div>
              <p className="games-section-kicker">Theme</p>
              <h2 className="games-section-title">Table Color</h2>
            </div>
            <div className="games-poker-color-grid">
              {Object.entries(TABLE_COLORS).map(([idx, theme]) => (
                <button
                  key={idx}
                  type="button"
                  className={`games-poker-color-swatch ${colorIndex === Number(idx) ? "active" : ""}`}
                  style={{ background: theme.accent }}
                  onClick={() => setColorIndex(Number(idx))}
                  aria-label={theme.name}
                />
              ))}
            </div>
          </div>

          <div className="games-card games-card-body games-section">
            <div>
              <p className="games-section-kicker">Blinds</p>
              <h2 className="games-section-title">Stakes</h2>
            </div>
            <div className="games-grid-two">
              <label className="games-field">
                <span className="games-field-label">Small blind</span>
                <input
                  className="games-input"
                  inputMode="numeric"
                  value={smallBlind}
                  onChange={(event) => setSmallBlind(event.target.value)}
                />
              </label>
              <label className="games-field">
                <span className="games-field-label">Big blind</span>
                <input
                  className="games-input"
                  inputMode="numeric"
                  value={bigBlind}
                  onChange={(event) => setBigBlind(event.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="games-card games-card-body games-section">
            <div>
              <p className="games-section-kicker">Buy-In Range</p>
              <h2 className="games-section-title">Entry Limits</h2>
            </div>
            <div className="games-grid-two">
              <label className="games-field">
                <span className="games-field-label">Minimum</span>
                <input
                  className="games-input"
                  inputMode="numeric"
                  value={minBuyIn}
                  onChange={(event) => setMinBuyIn(event.target.value)}
                />
              </label>
              <label className="games-field">
                <span className="games-field-label">Maximum</span>
                <input
                  className="games-input"
                  inputMode="numeric"
                  value={maxBuyIn}
                  onChange={(event) => setMaxBuyIn(event.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="games-card games-card-body games-section">
            <label className="games-field">
              <span className="games-field-label">Ante (optional)</span>
              <input
                className="games-input"
                inputMode="numeric"
                value={ante}
                onChange={(event) => setAnte(event.target.value)}
              />
            </label>

            <label className="games-poker-switch-row">
              <div>
                <p className="games-section-title" style={{ fontSize: "1rem" }}>
                  Allow Straddle
                </p>
                <p className="games-section-copy">UTG may post 2x big blind preflop.</p>
              </div>
              <input
                type="checkbox"
                checked={straddleEnabled}
                onChange={(event) => setStraddleEnabled(event.target.checked)}
              />
            </label>
          </div>

          <div className="games-card games-card-body games-section">
            <div>
              <p className="games-section-kicker">Speed</p>
              <h2 className="games-section-title">Action Timer</h2>
            </div>
            <div className="games-poker-speed-grid">
              {Object.entries(SPEED_LABELS).map(([speed, label]) => (
                <button
                  key={speed}
                  type="button"
                  className={`games-button ${tableSpeed === Number(speed) ? "games-button-accent" : "games-button-secondary"}`}
                  onClick={() => setTableSpeed(Number(speed))}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="games-poker-chip-seats">
              Seats fixed at {MAX_SEATS} players • Buy-in {formatChips(parseInteger(minBuyIn) || 0)}-
              {formatChips(parseInteger(maxBuyIn) || 0)}
            </div>
          </div>

          <div className="games-inline-row" style={{ justifyContent: "space-between" }}>
            <button
              type="button"
              className="games-button games-button-primary"
              disabled={!valid || submitting}
              onClick={() => {
                void handleCreate();
              }}
            >
              {submitting ? "Creating..." : "Create Table"}
            </button>
            <button
              type="button"
              className="games-button games-button-secondary"
              onClick={() => navigate("/games/poker")}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
