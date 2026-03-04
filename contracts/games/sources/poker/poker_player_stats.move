/// Player Statistics Module
/// 
/// Tracks lifetime on-chain statistics for players including:
/// - Activity (Hands played, folded)
/// - Performance (Hands won, total winnings, biggest pot)
/// - Skill/Luck (Showdowns reached/won, best hand ranking)
/// - Detailed Hand History (Wins by hand rank frequency)
module NovaWalletGames::poker_player_stats {
    use std::vector;
    use std::signer;
    use cedra_framework::timestamp;

    friend NovaWalletGames::poker_texas_holdem;
    #[test_only]
    friend NovaWalletGames::poker_player_stats_tests;

    // ============================================
    // CONSTANTS
    // ============================================

    // Hand Rankings
    const HAND_HIGH_CARD: u8 = 0;
    const HAND_PAIR: u8 = 1;
    const HAND_TWO_PAIR: u8 = 2;
    const HAND_THREE_OF_A_KIND: u8 = 3;
    const HAND_STRAIGHT: u8 = 4;
    const HAND_FLUSH: u8 = 5;
    const HAND_FULL_HOUSE: u8 = 6;
    const HAND_FOUR_OF_A_KIND: u8 = 7;
    const HAND_STRAIGHT_FLUSH: u8 = 8;
    const HAND_ROYAL_FLUSH: u8 = 9;

    // ============================================
    // DATA STRUCTURES
    // ============================================

    struct PlayerStats has key {
        // Activity
        hands_played: u64,
        hands_won: u64,
        hands_folded: u64,
        
        // Skill / Luck
        showdowns_reached: u64,
        showdowns_won: u64,
        best_hand_ranking: u8, // Highest rank achieved (0-9)
        
        // Detailed Hand Stats
        // Vector size 10: Index 0=High Card ... 9=Royal Flush
        // Tracks NUMBER of times won with each hand type
        hand_wins_by_rank: vector<u64>,
        
        // Financials
        total_winnings: u128,
        biggest_pot_won: u64,
        
        last_played_time: u64
    }

    // ============================================
    // INTERNAL HELPERS
    // ============================================

    fun ensure_stats_exist(player: &signer) {
        let addr = signer::address_of(player);
        if (!exists<PlayerStats>(addr)) {
            let wins_vec = vector::empty<u64>();
            let i = 0;
            while (i <= 9) {
                vector::push_back(&mut wins_vec, 0);
                i = i + 1;
            };

            move_to(player, PlayerStats {
                hands_played: 0,
                hands_won: 0,
                hands_folded: 0,
                showdowns_reached: 0,
                showdowns_won: 0,
                best_hand_ranking: 0,
                hand_wins_by_rank: wins_vec,
                total_winnings: 0,
                biggest_pot_won: 0,
                last_played_time: 0 // Will be set on first play
            });
        }
    }

    // ============================================
    // UPDATE FUNCTIONS (Friend Only)
    // ============================================

    /// Called when a player is dealt into a hand (starts playing)
    /// Note: texas_holdem must generate a signer for the player or we change this to take address?
    /// Since texas_holdem doesn't have the player's signer during game loop (only stored addr), 
    /// we likely need to accept address and use a resource account capability or 
    /// structure this differently.
    ///
    /// Issue: We cannot move_to(signer) if we only have address.
    /// Solution: Player must initialize their stats manually OR we accept that stats only 
    /// accrue if they have initialized.
    /// BETTER: The `join_table` takes a signer. Use that moment to initialize stats!
    
    /// Initialize stats if missing. Called by join_table.
    public(friend) fun try_initialize(player: &signer) {
        ensure_stats_exist(player);
    }

    /// Record a hand played. 
    /// We can assume stats exist because `join_table` calls `try_initialize`.
    public(friend) fun record_participation(player_addr: address) acquires PlayerStats {
        if (!exists<PlayerStats>(player_addr)) return;
        
        let stats = borrow_global_mut<PlayerStats>(player_addr);
        stats.hands_played = stats.hands_played + 1;
        stats.last_played_time = timestamp::now_seconds();
    }

    /// Record a fold
    public(friend) fun record_fold(player_addr: address) acquires PlayerStats {
        if (!exists<PlayerStats>(player_addr)) return;
        
        let stats = borrow_global_mut<PlayerStats>(player_addr);
        stats.hands_folded = stats.hands_folded + 1;
    }

    /// Record reaching a showdown
    /// hand_rank: The rank of their hand (0-9)
    public(friend) fun record_showdown_participation(player_addr: address, hand_rank: u8) acquires PlayerStats {
        if (!exists<PlayerStats>(player_addr)) return;
        let stats = borrow_global_mut<PlayerStats>(player_addr);
        
        stats.showdowns_reached = stats.showdowns_reached + 1;

        // Track best hand regardless of win/loss (e.g. losing Quads is still cool)
        if (hand_rank > stats.best_hand_ranking) {
            stats.best_hand_ranking = hand_rank;
        };
    }

    /// Record a showdown win explicitly
    public(friend) fun record_showdown_win(player_addr: address) acquires PlayerStats {
        if (!exists<PlayerStats>(player_addr)) return;
        let stats = borrow_global_mut<PlayerStats>(player_addr);
        stats.showdowns_won = stats.showdowns_won + 1;
    }

    /// Record a win (Pot awarded)
    /// amount: Chip amount won
    /// hand_rank: Rank of the winning hand (if showdown), or 255 if fold-win (stats ignore rank)
    public(friend) fun record_win(player_addr: address, amount: u64, hand_rank: u8) acquires PlayerStats {
        if (!exists<PlayerStats>(player_addr)) return;
        let stats = borrow_global_mut<PlayerStats>(player_addr);

        stats.hands_won = stats.hands_won + 1;
        stats.total_winnings = stats.total_winnings + (amount as u128);
        
        if (amount > stats.biggest_pot_won) {
            stats.biggest_pot_won = amount;
        };

        // If valid hand rank (not fold-win which uses >9 usually, e.g. 255)
        // Check bounds to be safe
        if (hand_rank <= HAND_ROYAL_FLUSH) {
            let count = vector::borrow_mut(&mut stats.hand_wins_by_rank, (hand_rank as u64));
            *count = *count + 1;
            
            // Also update best_hand here just in case record_showdown wasn't called (e.g. early fold win logic?)
            // But usually fold win has no hand_rank.
            if (hand_rank > stats.best_hand_ranking) {
                stats.best_hand_ranking = hand_rank;
            };
        };
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    #[view]
    public fun get_stats(player: address): (u64, u64, u64, u128, u64) acquires PlayerStats {
        if (!exists<PlayerStats>(player)) {
            return (0, 0, 0, 0, 0)
        };
        let stats = borrow_global<PlayerStats>(player);
        (
            stats.hands_played,
            stats.hands_won,
            stats.hands_folded,
            stats.total_winnings,
            stats.biggest_pot_won
        )
    }

    #[view]
    public fun get_detailed_stats(player: address): (u64, u64, u8, vector<u64>) acquires PlayerStats {
        if (!exists<PlayerStats>(player)) {
            return (0, 0, 0, vector::empty())
        };
        let stats = borrow_global<PlayerStats>(player);
        (
            stats.showdowns_reached,
            stats.showdowns_won,
            stats.best_hand_ranking,
            stats.hand_wins_by_rank
        )
    }

    // ============================================
    // TEST HELPERS
    // ============================================
    #[test_only]
    public fun init_stats_for_test(player: &signer) {
        ensure_stats_exist(player);
    }
}
