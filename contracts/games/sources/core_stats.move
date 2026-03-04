/// Core Player Statistics Module
/// 
/// Tracks cross-game lifetime statistics for players including:
/// - Activity (Total games played across all game types)
/// - Performance (Total winnings, biggest win)
/// - Per-game breakdown (Game-specific stats tracked separately)
/// 
/// This module provides generic stats that apply to any game.
/// Game-specific stats (like poker hand rankings) should be tracked
/// in game-specific modules (e.g., player_stats.move for poker).
module NovaWalletGames::core_stats {
    use std::signer;
    use cedra_framework::timestamp;
    use cedra_std::table::{Self, Table};
    use NovaWalletGames::game_registry::{Self, GameCapability};

    // ============================================
    // ERROR CODES
    // ============================================

    /// Stats not initialized for this player
    const E_STATS_NOT_INITIALIZED: u64 = 1;

    // ============================================
    // DATA STRUCTURES
    // ============================================

    /// Core statistics tracked across all games
    struct CorePlayerStats has key {
        /// Total rounds/hands played across all games
        total_rounds_played: u64,
        /// Total rounds/hands won across all games
        total_rounds_won: u64,
        /// Total chip winnings across all games (gross, before fees)
        total_winnings: u128,
        /// Biggest single win across all games
        biggest_win: u64,
        /// Timestamp of last activity across any game
        last_played_time: u64,
        /// Per-game statistics breakdown
        /// Maps game_id -> GameStats
        game_stats: Table<u64, GameStats>,
    }

    /// Statistics for a specific game type
    struct GameStats has store, drop, copy {
        /// Game ID from the registry
        game_id: u64,
        /// Rounds/hands played in this game
        rounds_played: u64,
        /// Rounds/hands won in this game
        rounds_won: u64,
        /// Total winnings in this game
        total_winnings: u128,
        /// Biggest win in this game
        biggest_win: u64,
        /// Timestamp of first play
        first_played_time: u64,
        /// Timestamp of last play
        last_played_time: u64,
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /// Initialize core stats for a player
    /// Called when a player first joins any game
    public fun try_initialize(player: &signer) {
        let player_addr = signer::address_of(player);
        if (!exists<CorePlayerStats>(player_addr)) {
            move_to(player, CorePlayerStats {
                total_rounds_played: 0,
                total_rounds_won: 0,
                total_winnings: 0,
                biggest_win: 0,
                last_played_time: 0,
                game_stats: table::new(),
            });
        };
    }

    /// Initialize core stats for a player (capability-authorized)
    /// This version doesn't require the player's signer
    /// Only registered games can call this
    public fun try_initialize_for_player(
        cap: &GameCapability,
        player: &signer
    ) {
        game_registry::assert_valid_capability(cap);
        try_initialize(player);
    }

    // ============================================
    // UPDATE FUNCTIONS (Capability-Authorized)
    // ============================================

    /// Record a round/hand played
    /// Called when a player participates in a game round
    public fun record_participation(
        cap: &GameCapability,
        player_addr: address
    ) acquires CorePlayerStats {
        game_registry::assert_valid_capability(cap);
        if (!exists<CorePlayerStats>(player_addr)) return;
        
        let game_id = game_registry::get_game_id(cap);
        let now = timestamp::now_seconds();
        
        let stats = borrow_global_mut<CorePlayerStats>(player_addr);
        stats.total_rounds_played = stats.total_rounds_played + 1;
        stats.last_played_time = now;
        
        // Update game-specific stats
        ensure_game_stats_exist(&mut stats.game_stats, game_id, now);
        let game_stats = table::borrow_mut(&mut stats.game_stats, game_id);
        game_stats.rounds_played = game_stats.rounds_played + 1;
        game_stats.last_played_time = now;
    }

    /// Record a win
    /// Called when a player wins chips from a round
    public fun record_win(
        cap: &GameCapability,
        player_addr: address,
        amount: u64
    ) acquires CorePlayerStats {
        game_registry::assert_valid_capability(cap);
        if (!exists<CorePlayerStats>(player_addr)) return;
        
        let game_id = game_registry::get_game_id(cap);
        let now = timestamp::now_seconds();
        
        let stats = borrow_global_mut<CorePlayerStats>(player_addr);
        stats.total_rounds_won = stats.total_rounds_won + 1;
        stats.total_winnings = stats.total_winnings + (amount as u128);
        
        if (amount > stats.biggest_win) {
            stats.biggest_win = amount;
        };
        
        stats.last_played_time = now;
        
        // Update game-specific stats
        ensure_game_stats_exist(&mut stats.game_stats, game_id, now);
        let game_stats = table::borrow_mut(&mut stats.game_stats, game_id);
        game_stats.rounds_won = game_stats.rounds_won + 1;
        game_stats.total_winnings = game_stats.total_winnings + (amount as u128);
        
        if (amount > game_stats.biggest_win) {
            game_stats.biggest_win = amount;
        };
        
        game_stats.last_played_time = now;
    }

    // ============================================
    // INTERNAL HELPERS
    // ============================================

    /// Ensure game-specific stats entry exists for a game
    fun ensure_game_stats_exist(
        game_stats_table: &mut Table<u64, GameStats>,
        game_id: u64,
        now: u64
    ) {
        if (!table::contains(game_stats_table, game_id)) {
            table::add(game_stats_table, game_id, GameStats {
                game_id,
                rounds_played: 0,
                rounds_won: 0,
                total_winnings: 0,
                biggest_win: 0,
                first_played_time: now,
                last_played_time: now,
            });
        };
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    #[view]
    /// Check if a player has initialized core stats
    public fun has_stats(player: address): bool {
        exists<CorePlayerStats>(player)
    }

    #[view]
    /// Get core stats summary
    /// Returns (total_rounds_played, total_rounds_won, total_winnings, biggest_win, last_played_time)
    public fun get_stats(player: address): (u64, u64, u128, u64, u64) acquires CorePlayerStats {
        if (!exists<CorePlayerStats>(player)) {
            return (0, 0, 0, 0, 0)
        };
        
        let stats = borrow_global<CorePlayerStats>(player);
        (
            stats.total_rounds_played,
            stats.total_rounds_won,
            stats.total_winnings,
            stats.biggest_win,
            stats.last_played_time
        )
    }

    #[view]
    /// Get game-specific stats for a player
    /// Returns (rounds_played, rounds_won, total_winnings, biggest_win, first_played_time, last_played_time)
    public fun get_game_stats(player: address, game_id: u64): (u64, u64, u128, u64, u64, u64) acquires CorePlayerStats {
        if (!exists<CorePlayerStats>(player)) {
            return (0, 0, 0, 0, 0, 0)
        };
        
        let stats = borrow_global<CorePlayerStats>(player);
        
        if (!table::contains(&stats.game_stats, game_id)) {
            return (0, 0, 0, 0, 0, 0)
        };
        
        let game_stats = table::borrow(&stats.game_stats, game_id);
        (
            game_stats.rounds_played,
            game_stats.rounds_won,
            game_stats.total_winnings,
            game_stats.biggest_win,
            game_stats.first_played_time,
            game_stats.last_played_time
        )
    }

    #[view]
    /// Get win rate for a specific game (returns percentage * 100, e.g., 5000 = 50%)
    public fun get_game_win_rate(player: address, game_id: u64): u64 acquires CorePlayerStats {
        if (!exists<CorePlayerStats>(player)) {
            return 0
        };
        
        let stats = borrow_global<CorePlayerStats>(player);
        
        if (!table::contains(&stats.game_stats, game_id)) {
            return 0
        };
        
        let game_stats = table::borrow(&stats.game_stats, game_id);
        
        if (game_stats.rounds_played == 0) {
            return 0
        };
        
        // Return percentage * 100 (e.g., 5000 = 50.00%)
        (game_stats.rounds_won * 10000) / game_stats.rounds_played
    }

    #[view]
    /// Get overall win rate across all games (returns percentage * 100)
    public fun get_overall_win_rate(player: address): u64 acquires CorePlayerStats {
        if (!exists<CorePlayerStats>(player)) {
            return 0
        };
        
        let stats = borrow_global<CorePlayerStats>(player);
        
        if (stats.total_rounds_played == 0) {
            return 0
        };
        
        // Return percentage * 100 (e.g., 5000 = 50.00%)
        (stats.total_rounds_won * 10000) / stats.total_rounds_played
    }

    // ============================================
    // TEST HELPERS
    // ============================================

    #[test_only]
    public fun init_for_test(player: &signer) {
        try_initialize(player);
    }
}
