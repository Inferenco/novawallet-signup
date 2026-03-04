# Frontend Integration Guide — Texas Hold’em Contracts

This is a **from‑scratch, exhaustive integration guide** for frontends connecting to the on‑chain Texas Hold’em contracts. It focuses on **contract interaction**, **data flow**, and **event/indexer integration**, not UI aesthetics.

> Source of truth: `contracts/games/sources/poker/poker_texas_holdem.move` and related modules.

---

## 1) Where to Find Contract Addresses

**Do not hardcode addresses in your UI.** Use:
- `contracts/games/docs/DEPLOYMENT.md`
- your app’s chain config (e.g., `packages/frontend/src/config/chains.ts`)

You will need:
- `contractAddress`
- game module names (e.g., `poker_texas_holdem`, `chips`, `poker_events`)
- wallet profile module: `wallet::user_profiles`

---

## 2) Core Concepts (Must‑Know)

### 2.1 Table Object Address (Critical)
Tables are **Move Objects**. Every table has its own object address and holds escrowed chips.

**Flow:**
1. Owner calls `create_table(...)`.
2. Owner calls `get_table_address(owner_addr)`.
3. **All other calls use the table object address.**

Only one table per owner address is allowed because `TableRef` is stored at the owner.

### 2.2 Seat Index vs Hand Index
- **Seat index:** fixed slot `0..max_seats-1` (enforced as 5 seats in current code).
- **Hand index:** position in `players_in_hand` during an active hand.

Many arrays are **hand‑indexed**, not seat‑indexed:
- `get_encrypted_hole_cards`
- `get_commit_status`, `get_reveal_status`
- `get_current_bets`, `get_total_invested`
- `get_player_statuses`

Always use `get_players_in_hand` to map **hand index → seat index**.

### 2.3 Phases & Status
**Phases**: WAITING, COMMIT, REVEAL, PREFLOP, FLOP, TURN, RIVER, SHOWDOWN (0–7).  
**Player status**: WAITING, ACTIVE, FOLDED, ALL_IN (0–3).

### 2.4 Card Encoding
Cards are `u8` in `0..51`:
- `rank = card % 13` (0=2, …, 12=A)
- `suit = card / 13` (0=Clubs, 1=Diamonds, 2=Hearts, 3=Spades)

---

## 3) Infrastructure Requirements

You need three components:

1. **Wallet adapter** capable of signing Move transactions.
2. **RPC endpoint** for view calls + transaction submission.
3. **Indexer (GraphQL)** for event streams (table discovery, hand history).

> Recommended approach: keep a per‑chain config with RPC + indexer URLs and module IDs.

---

## 4) Chip Economy Integration (Wallet Balance)

The chip ledger is **internal** (not a fungible token). Users cannot transfer chips directly; only the game can move chips internally.

### 4.1 Entry Functions
- `chips::purchase_multiplier(player, factor)`
- `chips::claim_free_chips(player)`

### 4.2 View Functions (Wallet UI)
- `chips::balance(address)`
- `chips::get_daily_free_amount()`
- `chips::get_free_claim_period_seconds()`
- `chips::get_multiplier_options()`
- `chips::get_multiplier_price(factor)`
- `chips::get_multiplier_duration()`
- `chips::get_multiplier_status(address)`
- `chips::get_total_chip_supply()`

### 4.3 UI Guidance
- Present offers using `get_multiplier_options` + `get_multiplier_price`.
- Show wallet balance separately from table stack.
- Treat free claims as **rate‑limited** (use `get_last_claim_time` if you surface countdowns).

---

## 5) Table Discovery & Metadata

### 5.1 Table Creation (Owner)
```
poker_texas_holdem::create_table(
  owner,
  small_blind,
  big_blind,
  min_buy_in,
  max_buy_in,
  ante,
  straddle_enabled,
  max_seats,      // must be 5
  table_speed,    // 0=Standard,1=Fast,2=QuickFire
  name,           // 3–32 chars [A-Za-z0-9 _-]
  color_index     // 0..5
)
```

### 5.2 Table Address Lookup
```
poker_texas_holdem::get_table_address(owner_addr)
```

### 5.3 Table Discovery (Public)
Use events from `poker_events`:
- `TableCreated`
- `TableClosed`

Then hydrate via:
- `get_table_summary(table_addr)`

`get_table_summary` returns:
```
(admin, sb, bb, min_buy, max_buy,
 is_paused, owner_only_start,
 occupied_seats, total_seats, has_game,
 ante, straddle_enabled, table_speed, name, color_index)
```

---

## 6) Join / Leave / Seat Management

### Join
```
poker_texas_holdem::join_table(player, table_addr, seat_idx, buy_in)
```
Constraints:
- Table not paused.
- Seat empty, `seat_idx < max_seats`.
- Buy‑in within min/max and global cap.
- Player not already seated.

### Leave (Between Hands)
```
poker_texas_holdem::leave_table(player, table_addr)
```

### Leave After Hand
```
poker_texas_holdem::leave_after_hand(player, table_addr)
poker_texas_holdem::cancel_leave_after_hand(player, table_addr)
```
Use `get_pending_leaves` to display seat flags.

### Sit Out / Sit In
```
poker_texas_holdem::sit_out(player, table_addr)
poker_texas_holdem::sit_in(player, table_addr)
```
Missed blinds are tracked in `missed_blinds`, and paid into `dead_money` on sit‑in.

### Top Up (Between Hands)
```
poker_texas_holdem::top_up(player, table_addr, amount)
```

### Seat Info
```
poker_texas_holdem::get_seat_info_full(table_addr, seat_idx)
```
Returns `(player_addr, chip_count, is_sitting_out, current_bet, status)`.

---

## 7) Hand Lifecycle (Commit‑Reveal)

### Start Hand
```
poker_texas_holdem::start_hand(caller, table_addr)
```
Constraints:
- Table not paused.
- At least 2 active seats.
- If `owner_only_start` is enabled, caller must be the owner.

### Commit Phase
```
poker_texas_holdem::submit_commit(player, table_addr, commit_hash_32_bytes)
```
- `commit_hash = sha3_256(secret)`
- Secret must be 16–32 bytes.
- Store secret locally; contract does not retain it.

Use:
- `get_commit_status(table_addr)`
- `get_commit_deadline(table_addr)`

### Reveal Phase
```
poker_texas_holdem::reveal_secret(player, table_addr, secret_bytes)
```
Use:
- `get_reveal_status(table_addr)`
- `get_reveal_deadline(table_addr)`

### Timeouts
```
poker_texas_holdem::handle_timeout(table_addr)
```
- COMMIT/REVEAL → hand aborted
- ACTION → auto‑fold

Always use chain deadlines instead of hardcoded timers.

---

## 8) Hole Card Encryption & Decryption (Client‑Side)

Hole cards are encrypted on‑chain; only the player with the secret can decrypt.

**Key derivation:**
1. `key_material = secret_bytes || "HOLECARDS" || BCS(u64 seat_idx)`
2. `key = sha3_256(key_material)`
3. `card_byte ^ key[i % 32]`

**View calls:**
- `get_encrypted_hole_cards(table_addr)`
- `get_players_in_hand(table_addr)`

**Storage advice:** use secure storage (Keychain/Keystore) keyed by `{chain_id}:{table_addr}:{player_addr}:{hand_number}`.

---

## 9) Betting Actions

Entry actions:
```
fold
check
call
raise_to(total_bet)
all_in
straddle
```

**View helpers:**
- `get_action_on` (seat + player + deadline)
- `get_min_raise`
- `get_current_bets`
- `get_player_statuses`
- `get_community_cards`
- `get_pot_size`

**Straddle rules:**
- Only PREFLOP.
- Only if enabled.
- Only UTG and before any action.

If all remaining players are all‑in, the contract auto‑deals remaining streets and goes to showdown.

---

## 10) Showdown & Hand Results

Listen for:
- `poker_events::HandResult`
- `poker_events::HandAborted`

`HandResult` includes:
- board + (decrypted) hole cards for showdown
- hand types + tiebreakers
- winners + amounts
- `result_type` (0=showdown, 1=fold win)

**Hand rank values**:
0 High Card, 1 One Pair, 2 Two Pair, 3 Trips, 4 Straight, 5 Flush, 6 Full House, 7 Quads, 8 Straight Flush, 9 Royal Flush.

---

## 11) Abort Flow (Owner‑Initiated Vote)

Steps:
1. `request_abort(table_addr)` — owner only, opens 180s vote window.
2. `vote_abort(table_addr, approve)` — seated, not‑sitting‑out players only.
3. `finalize_abort(table_addr)` — anyone; refunds if unanimous.
4. `cancel_abort_request(table_addr)` — owner only; clears vote.

**Action lock:** during voting, `fold`, `check`, `call`, `raise_to`, and `handle_timeout` are blocked.

View:
```
get_abort_request_status(table_addr) -> (timestamp, approvals, vetos, deadline, seated_count)
```

---

## 12) Owner Controls (Admin UI)

Owner‑only entry functions:
- `pause_table`, `resume_table`
- `toggle_owner_only_start`
- `update_blinds`, `update_ante`, `toggle_straddle`, `update_buy_in_limits`
- `kick_player`
- `transfer_ownership`
- `close_table`

**Notes:**
- Config updates are **between hands only**.
- `pause_table` blocks new joins and starts but does not interrupt a hand.

---

## 13) Event Reference (Indexer)

**Actually emitted by poker_texas_holdem**:
- `TableCreated`, `TableClosed`
- `PlayerJoined`, `PlayerLeft`, `PlayerSatOut`, `PlayerSatIn`, `PlayerToppedUp`, `PlayerKicked`
- `OwnershipTransferred`
- `HandStarted`, `HandResult`, `HandAborted`
- `AbortRequested`, `AbortVoteCast`, `AbortRequestCancelled`
- `HoleCardsRevealed`

**Defined but not emitted** (see `poker_events.move`):
- `CommitSubmitted`, `RevealSubmitted`, `CardsDealt`, `PhaseChanged`, `CommunityCardsDealt`
- `BlindsPosted`, `AntesPosted`, `StraddlePosted`
- `PlayerFolded`, `PlayerChecked`, `PlayerCalled`, `PlayerRaised`, `PlayerWentAllIn`
- `ShowdownStarted`, `PotAwarded`, `HandEnded`, `FoldWin`, `TimeoutTriggered`

---

## 14) View Function Catalog (Quick Ref)

Poker view calls you’ll likely need:
- `get_table_address`, `get_table_summary`, `get_table_config_full`, `get_table_state`
- `get_owner`, `is_paused`, `is_owner_only_start`, `get_table_speed`
- `get_action_timeout_secs`, `get_timeout_penalty_percent`
- `get_seat_info_full`, `get_seat_count`, `get_player_seat`
- `get_players_in_hand`, `get_player_statuses`
- `get_current_bets`, `get_total_invested`, `get_call_amount`
- `get_action_on`, `get_action_deadline`, `get_min_raise`, `get_max_current_bet`
- `get_commit_status`, `get_reveal_status`, `get_commit_deadline`, `get_reveal_deadline`
- `get_community_cards`, `get_encrypted_hole_cards`, `get_pot_size`
- `get_missed_blinds`, `get_dead_money`, `get_pending_leaves`
- `get_abort_request_status`

---

## 15) Edge‑Case Checklist

- Table paused → disable join/start.
- Owner‑only start → non‑owners cannot start.
- Buy‑in validation → pre‑check min/max in UI.
- Top‑up/leave allowed only between hands.
- Lost secret → player cannot reveal or decrypt hole cards.
- Abort vote active → lock action UI and show vote countdown.

---

If you want a specific SDK‑level implementation guide (RN, web, or server‑side indexer), share your stack and I’ll tailor this guide.
