/// Core Events Module
/// 
/// Generic events that can be used by any game in the system.
/// Events are authorized via GameCapability to ensure only registered games emit them.
/// Game-specific events should be defined in separate modules (e.g., poker_events.move).
module NovaWalletGames::core_events {
    use std::string::String;
    use cedra_framework::event;
    use NovaWalletGames::game_registry::{Self, GameCapability};

    // ============================================
    // TABLE/GAME LIFECYCLE EVENTS (Generic)
    // ============================================

    // Emitted when a new game table is created
    #[event]
    struct GameTableCreated has drop, store {
        /// The game type ID from the registry
        game_id: u64,
        /// Human-readable game name
        game_name: String,
        /// Address of the table/game instance
        table_addr: address,
        /// Admin/owner of the table
        admin: address,
        /// Display name of the table
        table_name: String,
        /// Minimum buy-in amount
        min_buy_in: u64,
        /// Maximum buy-in amount
        max_buy_in: u64,
        /// Maximum number of players
        max_players: u64,
    }

    // Emitted when a game table is closed
    #[event]
    struct GameTableClosed has drop, store {
        game_id: u64,
        game_name: String,
        table_addr: address,
        admin: address,
    }

    // Emitted when table metadata is updated
    #[event]
    struct GameTableUpdated has drop, store {
        game_id: u64,
        table_addr: address,
        admin: address,
        table_name: String,
    }

    // ============================================
    // PLAYER MANAGEMENT EVENTS (Generic)
    // ============================================

    // Emitted when a player joins a game table
    #[event]
    struct PlayerJoinedGame has drop, store {
        game_id: u64,
        game_name: String,
        table_addr: address,
        player: address,
        seat_index: u64,
        buy_in_amount: u64,
    }

    // Emitted when a player leaves a game table
    #[event]
    struct PlayerLeftGame has drop, store {
        game_id: u64,
        game_name: String,
        table_addr: address,
        player: address,
        seat_index: u64,
        chips_returned: u64,
    }

    // Emitted when a player sits out (pauses play)
    #[event]
    struct PlayerSatOut has drop, store {
        game_id: u64,
        table_addr: address,
        player: address,
        seat_index: u64,
    }

    // Emitted when a player sits back in
    #[event]
    struct PlayerSatIn has drop, store {
        game_id: u64,
        table_addr: address,
        player: address,
        seat_index: u64,
    }

    // Emitted when a player tops up their chips
    #[event]
    struct PlayerToppedUp has drop, store {
        game_id: u64,
        table_addr: address,
        player: address,
        seat_index: u64,
        amount: u64,
        new_stack: u64,
    }

    // Emitted when a player is kicked from a table
    #[event]
    struct PlayerKicked has drop, store {
        game_id: u64,
        table_addr: address,
        player: address,
        seat_index: u64,
        chips_returned: u64,
        reason: u8,  // 0=admin, 1=timeout, 2=violation
    }

    // ============================================
    // GAME ROUND/SESSION EVENTS (Generic)
    // ============================================

    // Emitted when a new game round starts
    #[event]
    struct GameRoundStarted has drop, store {
        game_id: u64,
        table_addr: address,
        round_number: u64,
        participating_players: vector<address>,
    }

    // Emitted when a game round ends
    #[event]
    struct GameRoundEnded has drop, store {
        game_id: u64,
        table_addr: address,
        round_number: u64,
        total_pot: u64,
    }

    // ============================================
    // SETTLEMENT EVENTS (Generic)
    // ============================================

    // Emitted when chips are awarded to a winner
    #[event]
    struct ChipsAwarded has drop, store {
        game_id: u64,
        game_name: String,
        table_addr: address,
        round_number: u64,
        winner: address,
        amount: u64,
        fee_deducted: u64,
    }

    // Emitted for comprehensive round results
    #[event]
    struct GameRoundResult has drop, store {
        game_id: u64,
        game_name: String,
        table_addr: address,
        round_number: u64,
        timestamp: u64,
        /// Winners (may be multiple for split pots)
        winner_addresses: vector<address>,
        winner_amounts: vector<u64>,
        /// Total pot and fees
        total_pot: u64,
        total_fees: u64,
        /// Result type (game-specific interpretation)
        result_type: u8,
    }

    // ============================================
    // TIMEOUT/ABORT EVENTS (Generic)
    // ============================================

    // Emitted when a player times out
    #[event]
    struct PlayerTimedOut has drop, store {
        game_id: u64,
        table_addr: address,
        round_number: u64,
        player: address,
        seat_index: u64,
        penalty_chips: u64,
    }

    // Emitted when a game round is aborted
    #[event]
    struct GameRoundAborted has drop, store {
        game_id: u64,
        table_addr: address,
        round_number: u64,
        reason: u8,  // 0=timeout, 1=emergency, 2=voted, 3=error
    }

    // ============================================
    // ADMIN EVENTS (Generic)
    // ============================================

    // Emitted when table ownership is transferred
    #[event]
    struct TableOwnershipTransferred has drop, store {
        game_id: u64,
        table_addr: address,
        old_admin: address,
        new_admin: address,
    }

    // ============================================
    // EMIT FUNCTIONS (capability-authorized)
    // ============================================

    fun assert_authorized_game(cap: &GameCapability) {
        game_registry::assert_valid_capability(cap);
    }

    /// Emit a table created event
    public fun emit_table_created(
        cap: &GameCapability,
        table_addr: address,
        admin: address,
        table_name: String,
        min_buy_in: u64,
        max_buy_in: u64,
        max_players: u64,
    ) {
        assert_authorized_game(cap);
        event::emit(GameTableCreated {
            game_id: game_registry::get_game_id(cap),
            game_name: game_registry::get_game_name(cap),
            table_addr,
            admin,
            table_name,
            min_buy_in,
            max_buy_in,
            max_players,
        });
    }

    /// Emit a table closed event
    public fun emit_table_closed(
        cap: &GameCapability,
        table_addr: address,
        admin: address,
    ) {
        assert_authorized_game(cap);
        event::emit(GameTableClosed {
            game_id: game_registry::get_game_id(cap),
            game_name: game_registry::get_game_name(cap),
            table_addr,
            admin,
        });
    }

    /// Emit a table updated event
    public fun emit_table_updated(
        cap: &GameCapability,
        table_addr: address,
        admin: address,
        table_name: String,
    ) {
        assert_authorized_game(cap);
        event::emit(GameTableUpdated {
            game_id: game_registry::get_game_id(cap),
            table_addr,
            admin,
            table_name,
        });
    }

    /// Emit a player joined event
    public fun emit_player_joined(
        cap: &GameCapability,
        table_addr: address,
        player: address,
        seat_index: u64,
        buy_in_amount: u64,
    ) {
        assert_authorized_game(cap);
        event::emit(PlayerJoinedGame {
            game_id: game_registry::get_game_id(cap),
            game_name: game_registry::get_game_name(cap),
            table_addr,
            player,
            seat_index,
            buy_in_amount,
        });
    }

    /// Emit a player left event
    public fun emit_player_left(
        cap: &GameCapability,
        table_addr: address,
        player: address,
        seat_index: u64,
        chips_returned: u64,
    ) {
        assert_authorized_game(cap);
        event::emit(PlayerLeftGame {
            game_id: game_registry::get_game_id(cap),
            game_name: game_registry::get_game_name(cap),
            table_addr,
            player,
            seat_index,
            chips_returned,
        });
    }

    /// Emit a player sat out event
    public fun emit_player_sat_out(
        cap: &GameCapability,
        table_addr: address,
        player: address,
        seat_index: u64,
    ) {
        assert_authorized_game(cap);
        event::emit(PlayerSatOut {
            game_id: game_registry::get_game_id(cap),
            table_addr,
            player,
            seat_index,
        });
    }

    /// Emit a player sat in event
    public fun emit_player_sat_in(
        cap: &GameCapability,
        table_addr: address,
        player: address,
        seat_index: u64,
    ) {
        assert_authorized_game(cap);
        event::emit(PlayerSatIn {
            game_id: game_registry::get_game_id(cap),
            table_addr,
            player,
            seat_index,
        });
    }

    /// Emit a player topped up event
    public fun emit_player_topped_up(
        cap: &GameCapability,
        table_addr: address,
        player: address,
        seat_index: u64,
        amount: u64,
        new_stack: u64,
    ) {
        assert_authorized_game(cap);
        event::emit(PlayerToppedUp {
            game_id: game_registry::get_game_id(cap),
            table_addr,
            player,
            seat_index,
            amount,
            new_stack,
        });
    }

    /// Emit a player kicked event
    public fun emit_player_kicked(
        cap: &GameCapability,
        table_addr: address,
        player: address,
        seat_index: u64,
        chips_returned: u64,
        reason: u8,
    ) {
        assert_authorized_game(cap);
        event::emit(PlayerKicked {
            game_id: game_registry::get_game_id(cap),
            table_addr,
            player,
            seat_index,
            chips_returned,
            reason,
        });
    }

    /// Emit a game round started event
    public fun emit_round_started(
        cap: &GameCapability,
        table_addr: address,
        round_number: u64,
        participating_players: vector<address>,
    ) {
        assert_authorized_game(cap);
        event::emit(GameRoundStarted {
            game_id: game_registry::get_game_id(cap),
            table_addr,
            round_number,
            participating_players,
        });
    }

    /// Emit a game round ended event
    public fun emit_round_ended(
        cap: &GameCapability,
        table_addr: address,
        round_number: u64,
        total_pot: u64,
    ) {
        assert_authorized_game(cap);
        event::emit(GameRoundEnded {
            game_id: game_registry::get_game_id(cap),
            table_addr,
            round_number,
            total_pot,
        });
    }

    /// Emit a chips awarded event
    public fun emit_chips_awarded(
        cap: &GameCapability,
        table_addr: address,
        round_number: u64,
        winner: address,
        amount: u64,
        fee_deducted: u64,
    ) {
        assert_authorized_game(cap);
        event::emit(ChipsAwarded {
            game_id: game_registry::get_game_id(cap),
            game_name: game_registry::get_game_name(cap),
            table_addr,
            round_number,
            winner,
            amount,
            fee_deducted,
        });
    }

    /// Emit a comprehensive game round result event
    public fun emit_round_result(
        cap: &GameCapability,
        table_addr: address,
        round_number: u64,
        timestamp: u64,
        winner_addresses: vector<address>,
        winner_amounts: vector<u64>,
        total_pot: u64,
        total_fees: u64,
        result_type: u8,
    ) {
        assert_authorized_game(cap);
        event::emit(GameRoundResult {
            game_id: game_registry::get_game_id(cap),
            game_name: game_registry::get_game_name(cap),
            table_addr,
            round_number,
            timestamp,
            winner_addresses,
            winner_amounts,
            total_pot,
            total_fees,
            result_type,
        });
    }

    /// Emit a player timed out event
    public fun emit_player_timed_out(
        cap: &GameCapability,
        table_addr: address,
        round_number: u64,
        player: address,
        seat_index: u64,
        penalty_chips: u64,
    ) {
        assert_authorized_game(cap);
        event::emit(PlayerTimedOut {
            game_id: game_registry::get_game_id(cap),
            table_addr,
            round_number,
            player,
            seat_index,
            penalty_chips,
        });
    }

    /// Emit a game round aborted event
    public fun emit_round_aborted(
        cap: &GameCapability,
        table_addr: address,
        round_number: u64,
        reason: u8,
    ) {
        assert_authorized_game(cap);
        event::emit(GameRoundAborted {
            game_id: game_registry::get_game_id(cap),
            table_addr,
            round_number,
            reason,
        });
    }

    /// Emit a table ownership transferred event
    public fun emit_ownership_transferred(
        cap: &GameCapability,
        table_addr: address,
        old_admin: address,
        new_admin: address,
    ) {
        assert_authorized_game(cap);
        event::emit(TableOwnershipTransferred {
            game_id: game_registry::get_game_id(cap),
            table_addr,
            old_admin,
            new_admin,
        });
    }
}
