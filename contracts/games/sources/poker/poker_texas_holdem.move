/// Casino-Grade 5-Seat Texas Hold'em
/// 
/// A fully on-chain Texas Hold'em poker game with:
/// - Configurable blinds (small/big)
/// - 4 betting rounds (pre-flop, flop, turn, river)
/// - All player actions (fold, check, call, raise, all-in)
/// - Side pots and pot distribution
/// - Full poker hand evaluation
/// - Commit-reveal card shuffling
module NovaWalletGames::poker_texas_holdem {
    use std::vector;
    use std::signer;
    use std::string::String;
    use std::option::{Self, Option};
    use cedra_std::hash;
    use cedra_framework::timestamp;
    use cedra_framework::block;
    use cedra_std::bcs;
    use cedra_framework::object::{Self, ExtendRef};
    use NovaWalletGames::chips;
    use NovaWalletGames::poker_hand_eval;
    use NovaWalletGames::poker_pot_manager::{Self, PotState};
    use NovaWalletGames::poker_events;
    use NovaWalletGames::poker_player_stats;
    use NovaWalletGames::game_registry::{Self, GameCapability};
    use NovaWalletGames::core_stats;

    // ============================================
    // ERROR CODES
    // ============================================
    
    const E_NOT_ADMIN: u64 = 1;
    const E_TABLE_EXISTS: u64 = 2;
    const E_TABLE_NOT_FOUND: u64 = 3;
    const E_SEAT_TAKEN: u64 = 4;
    const E_NOT_AT_TABLE: u64 = 5;
    const E_GAME_IN_PROGRESS: u64 = 6;
    const E_NO_GAME: u64 = 7;
    const E_NOT_YOUR_TURN: u64 = 8;
    const E_INVALID_ACTION: u64 = 9;
    const E_INSUFFICIENT_CHIPS: u64 = 10;
    const E_INVALID_RAISE: u64 = 11;
    const E_NOT_ENOUGH_PLAYERS: u64 = 12;
    const E_ALREADY_COMMITTED: u64 = 13;
    const E_INVALID_SECRET: u64 = 15;
    const E_WRONG_PHASE: u64 = 16;
    const E_TABLE_FULL: u64 = 17;
    const E_BUY_IN_TOO_LOW: u64 = 18;
    const E_BUY_IN_TOO_HIGH: u64 = 19;
    const E_ALREADY_REVEALED: u64 = 20;
    const E_NO_TIMEOUT: u64 = 21;
    const E_STRADDLE_NOT_ALLOWED: u64 = 22;
    const E_STRADDLE_ALREADY_POSTED: u64 = 23;
    const E_NOT_UTG: u64 = 24;
    const E_INVALID_BLINDS: u64 = 25;        // big_blind must be > small_blind
    const E_INVALID_BUY_IN: u64 = 26;        // max_buy_in must be >= min_buy_in
    const E_ZERO_VALUE: u64 = 27;            // Values must be non-zero
    const E_INVALID_COMMIT_SIZE: u64 = 31;   // Commit hash must be exactly 32 bytes
    const E_INVALID_SECRET_SIZE: u64 = 32;   // Secret must be 16-32 bytes
    const E_ALREADY_SEATED: u64 = 33;        // Address already occupies a seat
    const E_INVALID_SEAT_COUNT: u64 = 34;    // Table must have 5 or 7 seats
    const E_INVALID_SPEED: u64 = 35;          // Invalid table speed setting
    const E_ABORT_REQUEST_EXISTS: u64 = 36;   // Abort already requested
    const E_NO_ABORT_REQUEST: u64 = 37;       // No pending abort request
    const E_ALREADY_VOTED: u64 = 38;          // Player already voted on abort
    const E_ABORT_DELAY_NOT_PASSED: u64 = 39; // Voting period not over and votes pending
    const E_ABORT_VETOED: u64 = 40;           // Not unanimous approval
    const E_VOTES_PENDING: u64 = 41;          // Not all players voted yet
    const E_ABORT_PENDING: u64 = 42;          // Actions locked during abort vote
    const E_INVALID_NAME_LENGTH: u64 = 43;    // Name must be 3-32 bytes
    const E_INVALID_NAME_CHAR: u64 = 44;      // Name contains invalid characters
    const E_INVALID_COLOR_INDEX: u64 = 45;    // Color index must be 0-5
    const TIMEOUT_PENALTY_PERCENT: u64 = 10;  // 10% of stack as timeout penalty
    
    // Size validation constants
    const COMMIT_HASH_SIZE: u64 = 32;        // SHA3-256 output size
    const MIN_SECRET_SIZE: u64 = 16;         // Minimum secret length
    const MAX_SECRET_SIZE: u64 = 32;         // Maximum secret length
    const MAX_COLOR_INDEX: u8 = 5;           // Maximum valid color palette index

    // Table speed options
    const SPEED_STANDARD: u8 = 0;     // 60s action, 120s commit/reveal
    const SPEED_FAST: u8 = 1;         // 30s action, 60s commit/reveal
    const SPEED_QUICK_FIRE: u8 = 2;   // 15s action, 30s commit/reveal

    // Abort voting constants
    const ABORT_VOTE_DELAY_SECS: u64 = 180;   // 3 minutes voting window

    // ============================================
    // GAME STATE CONSTANTS
    // ============================================
    
    const PHASE_WAITING: u8 = 0;
    const PHASE_COMMIT: u8 = 1;
    const PHASE_REVEAL: u8 = 2;
    const PHASE_PREFLOP: u8 = 3;
    const PHASE_FLOP: u8 = 4;
    const PHASE_TURN: u8 = 5;
    const PHASE_RIVER: u8 = 6;
    const PHASE_SHOWDOWN: u8 = 7;

    const STATUS_WAITING: u8 = 0;
    const STATUS_ACTIVE: u8 = 1;
    const STATUS_FOLDED: u8 = 2;
    const STATUS_ALL_IN: u8 = 3;

    const MAX_PLAYERS: u64 = 5;  // Maximum possible seats (used for validation)
    const MIN_PLAYERS: u64 = 5;  // Minimum seats allowed
    const ACTION_TIMEOUT_SECS: u64 = 60;
    const COMMIT_REVEAL_TIMEOUT_SECS: u64 = 120; // 2 minutes for commit/reveal phases

    // ============================================
    // DATA STRUCTURES
    // ============================================

    struct TableConfig has store, copy, drop {
        small_blind: u64,
        big_blind: u64,
        min_buy_in: u64,
        max_buy_in: u64,
        ante: u64,              // Optional ante (0 = no ante)
        straddle_enabled: bool, // Allow voluntary straddle
        table_speed: u8,        // 0=Standard(90s), 1=Fast(60s), 2=QuickFire(30s)
    }

    struct Seat has store, copy, drop {
        player: address,
        chip_count: u64,
        is_sitting_out: bool,
    }

    struct Game has store, drop {
        phase: u8,
        encrypted_hole_cards: vector<vector<u8>>,  // Encrypted with per-player keys
        community_cards: vector<u8>,
        // Card generation (replaces stored deck for privacy)
        card_seed: vector<u8>,          // Current hash state for on-demand card generation
        dealt_card_mask: u128,          // Bitmask tracking dealt cards (52 bits, prevents duplicates)
        card_keys: vector<vector<u8>>,  // Derived encryption keys for showdown decryption
        player_status: vector<u8>,
        pot_state: PotState,
        players_in_hand: vector<u64>,
        action_on: u64,
        action_deadline: u64,
        dealer_position: u64,
        min_raise: u64,
        last_aggressor: Option<u64>,
        has_acted_mask: vector<bool>,  // Track who has acted this betting round
        betting_reopened_for: vector<bool>,  // Can player re-raise? False after short all-in
        straddle_hand_idx: Option<u64>, // Who straddled (if any)
        straddle_amount: u64,           // Straddle amount (0 if none)
        commits: vector<vector<u8>>,
        secrets: vector<vector<u8>>,
        // Timeout deadlines
        commit_deadline: u64,
        reveal_deadline: u64,
        // Audit trail
        revealed_mask: vector<bool>,  // Track which folded players have revealed
    }

    /// Reference stored at admin's address pointing to their table object
    struct TableRef has key {
        table_address: address,
    }

    struct Table has key {
        config: TableConfig,
        owner: address,
        max_seats: u64,          // Number of seats (5 or 7)
        name: String,            // Table display name (3-32 chars)
        color_index: u8,         // Color palette index (0-5)
        seats: vector<Option<Seat>>,
        game: Option<Game>,
        dealer_button: u64,
        hand_number: u64,
        // Dead button tracking
        next_bb_seat: u64,           // Seat that owes big blind next
        missed_blinds: vector<u64>,  // Missed blind amounts per seat
        dead_money: u64,             // Accumulated dead money to add to pot
        // New fields for deferred features
        is_paused: bool,             // Table paused (no new hands)
        pending_leaves: vector<bool>, // Players who want to leave after hand
        owner_only_start: bool,       // Only admin can start hands
        // Object control for escrow
        extend_ref: ExtendRef,       // For generating signer to move chips
        // Abort voting state
        abort_request_timestamp: u64,          // 0 = no active request, >0 = request timestamp
        abort_approvals: vector<address>,      // Players who approved abort
        abort_vetos: vector<address>,          // Players who vetoed abort
    }

    /// Module-level configuration storing the game capability
    /// This allows texas_holdem to use capability-based chip transfers if needed
    struct TexasHoldemConfig has key {
        /// The game capability obtained from the game registry
        game_capability: GameCapability,
        /// Game ID assigned by the registry
        game_id: u64,
    }

    // ============================================
    // GAME REGISTRATION
    // ============================================

    /// Register Texas Hold'em with the game registry
    /// This must be called by the admin after deployment to enable capability-based features
    /// Note: The module still works without this via the friend pattern for backward compatibility
    public entry fun register_game(owner: &signer) {
        use std::string;
        
        // Only allow registration once
        assert!(!exists<TexasHoldemConfig>(@NovaWalletGames), E_TABLE_EXISTS);
        
        // Register with the game registry
        let capability = game_registry::register_game(
            owner,
            string::utf8(b"Texas Hold'em"),
            false
        );
        
        let game_id = game_registry::get_game_id(&capability);
        
        // Store the configuration
        move_to(owner, TexasHoldemConfig {
            game_capability: capability,
            game_id,
        });
    }

    // Check if the game is registered with the registry
    #[view]
    public fun is_registered(): bool {
        exists<TexasHoldemConfig>(@NovaWalletGames)
    }

    // Get the game ID (returns 0 if not registered)
    #[view]
    public fun get_game_id(): u64 acquires TexasHoldemConfig {
        if (!exists<TexasHoldemConfig>(@NovaWalletGames)) {
            return 0
        };
        borrow_global<TexasHoldemConfig>(@NovaWalletGames).game_id
    }

    // ============================================
    // TABLE MANAGEMENT
    // ============================================

    public entry fun create_table(
        owner: &signer,
        small_blind: u64,
        big_blind: u64,
        min_buy_in: u64,
        max_buy_in: u64,
        ante: u64,
        straddle_enabled: bool,
        max_seats: u64,
        table_speed: u8,
        name: String,
        color_index: u8
    ) acquires Table, TableRef {
        let owner_addr = signer::address_of(owner);
        
        // Keep TableRef hygienic across ownership transfers and legacy state.
        if (exists<TableRef>(owner_addr)) {
            let existing_table_addr = borrow_global<TableRef>(owner_addr).table_address;
            if (exists<Table>(existing_table_addr)) {
                let existing_table = borrow_global<Table>(existing_table_addr);
                assert!(existing_table.owner != owner_addr, E_TABLE_EXISTS);
            };
            let TableRef { table_address: _ } = move_from<TableRef>(owner_addr);
        };
        
        // Validate config
        assert!(small_blind > 0, E_ZERO_VALUE);
        assert!(big_blind > small_blind, E_INVALID_BLINDS);
        assert!(min_buy_in > 0, E_ZERO_VALUE);
        assert!(max_buy_in >= min_buy_in, E_INVALID_BUY_IN);
        // Enforce Global Max Buy-In Limit
        assert!(max_buy_in <= chips::get_global_max_table_buy_in(), E_BUY_IN_TOO_HIGH);

        assert!(max_seats == 5, E_INVALID_SEAT_COUNT);

        assert!(table_speed <= SPEED_QUICK_FIRE, E_INVALID_SPEED);
        
        // Validate name and color
        validate_table_name(&name);
        assert!(color_index <= MAX_COLOR_INDEX, E_INVALID_COLOR_INDEX);
        
        // Create a Move Object for the table (escrow pattern)
        let constructor_ref = object::create_object(owner_addr);
        let table_address = object::address_from_constructor_ref(&constructor_ref);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let obj_signer = object::generate_signer(&constructor_ref);
        
        // Initialize vectors based on max_seats
        let seats = vector::empty<Option<Seat>>();
        let missed_blinds = vector::empty<u64>();
        let pending_leaves = vector::empty<bool>();
        let i = 0u64;
        while (i < max_seats) {
            vector::push_back(&mut seats, option::none());
            vector::push_back(&mut missed_blinds, 0);
            vector::push_back(&mut pending_leaves, false);
            i = i + 1;
        };
        
        // Store Table resource on the object (not admin's address)
        move_to(&obj_signer, Table {
            config: TableConfig { small_blind, big_blind, min_buy_in, max_buy_in, ante, straddle_enabled, table_speed },
            owner: owner_addr,
            max_seats,
            name,
            color_index,
            seats,
            game: option::none(),
            dealer_button: 0,
            hand_number: 0,
            next_bb_seat: 0,
            missed_blinds,
            dead_money: 0,
            is_paused: false,
            pending_leaves,
            owner_only_start: false,
            extend_ref,
            abort_request_timestamp: 0,
            abort_approvals: vector::empty<address>(),
            abort_vetos: vector::empty<address>(),
        });
        
        // Store reference at admin's address for lookup
        move_to(owner, TableRef { table_address });
        
        poker_events::emit_table_created(
            table_address, owner_addr, small_blind, big_blind, 
            min_buy_in, max_buy_in, ante, straddle_enabled,
            name, color_index
        );
    }

    public entry fun join_table(
        player: &signer,
        table_addr: address,
        seat_idx: u64,
        buy_in_chips: u64
    ) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        
        // Prevent joining while table is paused
        assert!(!table.is_paused, E_INVALID_ACTION);
        
        assert!(seat_idx < table.max_seats, E_TABLE_FULL);
        assert!(option::is_none(vector::borrow(&table.seats, seat_idx)), E_SEAT_TAKEN);
        assert!(buy_in_chips >= table.config.min_buy_in, E_BUY_IN_TOO_LOW);
        assert!(buy_in_chips <= table.config.max_buy_in, E_BUY_IN_TOO_HIGH);
        
        let player_addr = signer::address_of(player);
        
        // Initialize player stats if needed (poker-specific stats)
        poker_player_stats::try_initialize(player);
        
        // Initialize core stats if needed (cross-game stats)
        core_stats::try_initialize(player);
        
        // MEDIUM-2 Fix: Prevent same address from occupying multiple seats
        let existing_seat = find_player_seat_in_table(table, player_addr);
        assert!(option::is_none(&existing_seat), E_ALREADY_SEATED); // MAX_PLAYERS means "not found"
        
        let player_balance = chips::balance(player_addr);
        assert!(player_balance >= buy_in_chips, E_INSUFFICIENT_CHIPS);
        
        chips::transfer_chips(player_addr, table_addr, buy_in_chips);
        
        *vector::borrow_mut(&mut table.seats, seat_idx) = option::some(Seat {
            player: player_addr,
            chip_count: buy_in_chips,
            is_sitting_out: false,
        });
        
        poker_events::emit_player_joined(table_addr, seat_idx, player_addr, buy_in_chips);
    }

    public entry fun leave_table(player: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        
        let player_addr = signer::address_of(player);
        let seat_idx = find_player_seat_in_table(table, player_addr);
        assert!(option::is_some(&seat_idx), E_NOT_AT_TABLE);

        let seat_idx = option::extract(&mut seat_idx);
        
        let seat = option::extract(vector::borrow_mut(&mut table.seats, seat_idx));
        chips::transfer_chips(table_addr, player_addr, seat.chip_count);
        
        poker_events::emit_player_left(table_addr, seat_idx, player_addr, seat.chip_count);
    }

    /// Sit out - player stays at table but won't be dealt into new hands
    public entry fun sit_out(player: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        
        let player_addr = signer::address_of(player);
        let seat_idx = find_player_seat_in_table(table, player_addr);
        assert!(option::is_some(&seat_idx), E_NOT_AT_TABLE);
        
        let seat_idx = option::extract(&mut seat_idx);
        let seat = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
        seat.is_sitting_out = true;
        
        // Track missed blind (one big blind, capped - standard cash game rule)
        let bb = table.config.big_blind;
        let current_missed = *vector::borrow(&table.missed_blinds, seat_idx);
        if (current_missed == 0) {
            *vector::borrow_mut(&mut table.missed_blinds, seat_idx) = bb;
        };
        
        poker_events::emit_player_sat_out(table_addr, seat_idx, player_addr);
    }

    /// Sit back in - player will be dealt into the next hand
    public entry fun sit_in(player: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        
        let player_addr = signer::address_of(player);
        let seat_idx = find_player_seat_in_table(table, player_addr);
        assert!(option::is_some(&seat_idx), E_NOT_AT_TABLE);
        
        // Collect missed blinds if any (add to dead money for next pot)
        let seat_idx = option::extract(&mut seat_idx);
        let missed = *vector::borrow(&table.missed_blinds, seat_idx);
        if (missed > 0) {
            let seat = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
            if (seat.chip_count >= missed) {
                seat.chip_count = seat.chip_count - missed;
                // Add to dead money pool - will be added to pot at start of next hand
                table.dead_money = table.dead_money + missed;
            };
            *vector::borrow_mut(&mut table.missed_blinds, seat_idx) = 0;
        };
        
        let seat = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
        seat.is_sitting_out = false;
        
        poker_events::emit_player_sat_in(table_addr, seat_idx, player_addr);
    }

    /// Top up chips between hands (add more chips without leaving table)
    public entry fun top_up(player: &signer, table_addr: address, amount: u64) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        
        let player_addr = signer::address_of(player);
        let seat_idx = find_player_seat_in_table(table, player_addr);
        assert!(option::is_some(&seat_idx), E_NOT_AT_TABLE);
        let seat_idx = option::extract(&mut seat_idx);
        
        // Check player has enough chips in their account
        let player_balance = chips::balance(player_addr);
        assert!(player_balance >= amount, E_INSUFFICIENT_CHIPS);
        
        // Check new total doesn't exceed max buy-in
        let seat = option::borrow(vector::borrow(&table.seats, seat_idx));
        let new_total = seat.chip_count + amount;
        assert!(new_total <= table.config.max_buy_in, E_BUY_IN_TOO_HIGH);
        
        // Transfer chips
        chips::transfer_chips(player_addr, table_addr, amount);
        let seat = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
        seat.chip_count = seat.chip_count + amount;
        
        poker_events::emit_player_topped_up(table_addr, seat_idx, player_addr, amount, seat.chip_count);
    }

    /// Cleanup orphaned TableRef when the actual Table no longer exists.
    /// This is a migration fix for tables closed before v7.0.1 that didn't remove TableRef.
    public entry fun cleanup_table_ref(owner: &signer) acquires TableRef {
        let owner_addr = signer::address_of(owner);
        assert!(exists<TableRef>(owner_addr), E_TABLE_NOT_FOUND);
        
        let table_ref = borrow_global<TableRef>(owner_addr);
        let table_addr = table_ref.table_address;
        
        // Only allow cleanup if the actual Table no longer exists
        assert!(!exists<Table>(table_addr), E_GAME_IN_PROGRESS);
        
        // Remove the orphaned TableRef
        let TableRef { table_address: _ } = move_from<TableRef>(owner_addr);
    }

    /// Close and delete a table (owner only)
    /// 
    /// Returns chips to any seated players and removes the Table resource.
    /// Cannot be called while a hand is in progress.
    public entry fun close_table(owner: &signer, table_addr: address) acquires Table, TableRef {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        
        let owner_addr = signer::address_of(owner);
        let table = borrow_global<Table>(table_addr);
        assert!(table.owner == owner_addr, E_NOT_ADMIN);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        
        // Remove a matching owner TableRef if present.
        if (exists<TableRef>(owner_addr)) {
            let ref_addr = borrow_global<TableRef>(owner_addr).table_address;
            if (ref_addr == table_addr) {
                let TableRef { table_address: _ } = move_from<TableRef>(owner_addr);
            };
        };
        
        // Emit event BEFORE deletion so it can be indexed by frontend
        poker_events::emit_table_closed(table_addr, owner_addr);
        
        // Move out and destroy the table
        let Table {
            config: _,
            owner: _,
            max_seats: _,
            name: _,
            color_index: _,
            seats,
            game: _,
            dealer_button: _,
            hand_number: _,
            next_bb_seat: _,
            missed_blinds: _,
            dead_money: _,
            is_paused: _,
            pending_leaves: _,
            owner_only_start: _,
            extend_ref: _,
            abort_request_timestamp: _,
            abort_approvals: _,
            abort_vetos: _,
        } = move_from<Table>(table_addr);
        
        // Return chips to any seated players
        let i = 0u64;
        while (i < vector::length(&seats)) {
            let seat_opt = vector::borrow(&seats, i);
            if (option::is_some(seat_opt)) {
                let seat = option::borrow(seat_opt);
                if (seat.chip_count > 0) {
                    chips::transfer_chips(table_addr, seat.player, seat.chip_count);
                };
            };
            i = i + 1;
        };
    }

    // ============================================
    // ADMIN CONTROLS
    // ============================================

    /// Update blind levels (admin only, between hands)
    public entry fun update_blinds(owner: &signer, table_addr: address, small_blind: u64, big_blind: u64) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.owner == signer::address_of(owner), E_NOT_ADMIN);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        
        // Validate config
        assert!(small_blind > 0, E_ZERO_VALUE);
        assert!(big_blind > small_blind, E_INVALID_BLINDS);
        
        table.config.small_blind = small_blind;
        table.config.big_blind = big_blind;
    }

    /// Update ante amount (admin only, between hands)
    public entry fun update_ante(owner: &signer, table_addr: address, ante: u64) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.owner == signer::address_of(owner), E_NOT_ADMIN);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        
        table.config.ante = ante;
    }

    /// Toggle straddle enabled (admin only, between hands)
    public entry fun toggle_straddle(owner: &signer, table_addr: address, enabled: bool) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.owner == signer::address_of(owner), E_NOT_ADMIN);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        
        table.config.straddle_enabled = enabled;
    }

    /// Update buy-in limits (admin only, between hands)
    public entry fun update_buy_in_limits(owner: &signer, table_addr: address, min_buy_in: u64, max_buy_in: u64) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.owner == signer::address_of(owner), E_NOT_ADMIN);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        
        // Validate config
        assert!(min_buy_in > 0, E_ZERO_VALUE);
        assert!(max_buy_in >= min_buy_in, E_INVALID_BUY_IN);
        
        table.config.min_buy_in = min_buy_in;
        table.config.max_buy_in = max_buy_in;
    }

    /// Kick a player from the table (admin only, between hands)
    public entry fun kick_player(owner: &signer, table_addr: address, seat_idx: u64) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.owner == signer::address_of(owner), E_NOT_ADMIN);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        assert!(seat_idx < table.max_seats, E_INVALID_ACTION);
        assert!(option::is_some(vector::borrow(&table.seats, seat_idx)), E_NOT_AT_TABLE);
        
        let seat = option::extract(vector::borrow_mut(&mut table.seats, seat_idx));
        let player_addr = seat.player;
        let chips_returned = seat.chip_count;
        chips::transfer_chips(table_addr, player_addr, chips_returned);
        
        poker_events::emit_player_kicked(table_addr, seat_idx, player_addr, chips_returned);
    }

    /// Transfer table ownership (owner only)
    public entry fun transfer_ownership(owner: &signer, table_addr: address, new_owner: address) acquires Table, TableRef {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let owner_addr = signer::address_of(owner);
        let table = borrow_global<Table>(table_addr);
        assert!(table.owner == owner_addr, E_NOT_ADMIN);

        // Clear the old owner's table ref so ownership transfer cannot orphan close/create flows.
        if (exists<TableRef>(owner_addr)) {
            let old_ref_addr = borrow_global<TableRef>(owner_addr).table_address;
            if (old_ref_addr == table_addr) {
                let TableRef { table_address: _ } = move_from<TableRef>(owner_addr);
            };
        };

        let table = borrow_global_mut<Table>(table_addr);
        let old_owner = table.owner;
        table.owner = new_owner;
        
        poker_events::emit_ownership_transferred(table_addr, old_owner, new_owner);
    }

    /// Rebind caller's TableRef to a table they currently own.
    /// Useful after ownership transfer where caller did not create the table object.
    public entry fun claim_table_ref(owner: &signer, table_addr: address) acquires Table, TableRef {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);

        let owner_addr = signer::address_of(owner);
        let table = borrow_global<Table>(table_addr);
        assert!(table.owner == owner_addr, E_NOT_ADMIN);

        if (exists<TableRef>(owner_addr)) {
            let current_ref_addr = borrow_global<TableRef>(owner_addr).table_address;
            if (current_ref_addr == table_addr) {
                return
            };
            if (exists<Table>(current_ref_addr)) {
                let current_table = borrow_global<Table>(current_ref_addr);
                assert!(current_table.owner != owner_addr, E_TABLE_EXISTS);
            };
            let TableRef { table_address: _ } = move_from<TableRef>(owner_addr);
        };

        move_to(owner, TableRef { table_address: table_addr });
    }

    #[view]
    /// Get table address from admin's TableRef
    public fun get_table_address(owner_addr: address): address acquires TableRef {
        assert!(exists<TableRef>(owner_addr), E_TABLE_NOT_FOUND);
        borrow_global<TableRef>(owner_addr).table_address
    }

    /// Pause the table - no new hands can start (owner only)
    public entry fun pause_table(owner: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.owner == signer::address_of(owner), E_NOT_ADMIN);
        
        table.is_paused = true;
    }

    /// Resume the table - hands can start again (owner only)
    public entry fun resume_table(owner: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.owner == signer::address_of(owner), E_NOT_ADMIN);
        
        table.is_paused = false;
    }

    /// Toggle admin-only hand start (owner only)
    public entry fun toggle_owner_only_start(owner: &signer, table_addr: address, enabled: bool) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.owner == signer::address_of(owner), E_NOT_ADMIN);
        
        table.owner_only_start = enabled;
    }

    /// Request to leave after current hand completes
    public entry fun leave_after_hand(player: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        
        let player_addr = signer::address_of(player);
        let seat_idx = find_player_seat_in_table(table, player_addr);
        assert!(option::is_some(&seat_idx), E_NOT_AT_TABLE);
        let seat_idx = option::extract(&mut seat_idx);
        
        // Mark this player as wanting to leave
        *vector::borrow_mut(&mut table.pending_leaves, seat_idx) = true;
    }

    /// Cancel request to leave after hand
    public entry fun cancel_leave_after_hand(player: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        
        let player_addr = signer::address_of(player);
        let seat_idx = find_player_seat_in_table(table, player_addr);
        assert!(option::is_some(&seat_idx), E_NOT_AT_TABLE);
        let seat_idx = option::extract(&mut seat_idx);
        
        *vector::borrow_mut(&mut table.pending_leaves, seat_idx) = false;
    }

    /// Reveal hole cards for a folded player (opt-in audit trail)
    /// 
    /// Only callable by folded players during an active hand (PREFLOP-RIVER).
    /// Emits HoleCardsRevealed event with decrypted cards and encryption key
    /// for third-party verification.
    public entry fun reveal_hole_cards(player: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        
        let player_addr = signer::address_of(player);
        let game = option::borrow_mut(&mut table.game);
        
        // Phase check: cards must be dealt (PREFLOP-RIVER)
        assert!(game.phase >= PHASE_PREFLOP && game.phase <= PHASE_RIVER, E_WRONG_PHASE);
        
        // Find player in hand
        let hand_idx = find_player_hand_idx(&game.players_in_hand, &table.seats, player_addr);
        let num_players = vector::length(&game.players_in_hand);
        assert!(hand_idx < num_players, E_NOT_AT_TABLE);
        
        // Must be folded
        let status = *vector::borrow(&game.player_status, hand_idx);
        assert!(status == STATUS_FOLDED, E_INVALID_ACTION);
        
        // Duplicate reveal check
        assert!(!*vector::borrow(&game.revealed_mask, hand_idx), E_ALREADY_REVEALED);
        *vector::borrow_mut(&mut game.revealed_mask, hand_idx) = true;
        
        // Decrypt cards
        let encrypted_hole = vector::borrow(&game.encrypted_hole_cards, hand_idx);
        let card_key = vector::borrow(&game.card_keys, hand_idx);
        let decrypted_cards = xor_encrypt_cards(encrypted_hole, card_key);
        
        // Get seat index for event
        let seat_idx = *vector::borrow(&game.players_in_hand, hand_idx);
        
        // Emit event
        poker_events::emit_hole_cards_revealed(
            table_addr,
            table.hand_number,
            timestamp::now_seconds(),
            seat_idx,
            player_addr,
            decrypted_cards,
            *card_key,
        );
    }

    // ============================================
    // TWO-STEP ABORT FLOW
    // ============================================

    /// Request abort - admin initiates abort request (step 1 of 2)
    /// 
    /// Starts a voting period where all seated players must approve.
    /// The abort can be finalized after all players vote OR after the delay expires.
    public entry fun request_abort(owner: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.owner == signer::address_of(owner), E_NOT_ADMIN);
        assert!(option::is_some(&table.game), E_NO_GAME);
        assert!(table.abort_request_timestamp == 0, E_ABORT_REQUEST_EXISTS);
        
        // Set the abort request timestamp
        let now = timestamp::now_seconds();
        table.abort_request_timestamp = now;
        table.abort_approvals = vector::empty<address>();
        table.abort_vetos = vector::empty<address>();
        
        let deadline = now + ABORT_VOTE_DELAY_SECS;
        poker_events::emit_abort_requested(table_addr, table.hand_number, signer::address_of(owner), deadline);
    }

    /// Vote on abort request - seated player approves or vetoes
    public entry fun vote_abort(player: &signer, table_addr: address, approve: bool) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.abort_request_timestamp > 0, E_NO_ABORT_REQUEST);
        
        let player_addr = signer::address_of(player);
        
        // Must be seated at the table and NOT sitting out
        let seat_idx = find_player_seat_in_table(table, player_addr);
        assert!(option::is_some(&seat_idx), E_NOT_AT_TABLE);
        let idx = option::extract(&mut seat_idx);
        let seat = option::borrow(vector::borrow(&table.seats, idx));
        assert!(!seat.is_sitting_out, E_INVALID_ACTION); // Sitting out players cannot vote
        
        // Check not already voted
        assert!(!vector::contains(&table.abort_approvals, &player_addr), E_ALREADY_VOTED);
        assert!(!vector::contains(&table.abort_vetos, &player_addr), E_ALREADY_VOTED);
        
        // Record vote
        if (approve) {
            vector::push_back(&mut table.abort_approvals, player_addr);
        } else {
            vector::push_back(&mut table.abort_vetos, player_addr);
        };
        
        let approvals = vector::length(&table.abort_approvals);
        let vetos = vector::length(&table.abort_vetos);
        
        poker_events::emit_abort_vote_cast(
            table_addr,
            table.hand_number,
            player_addr,
            approve,
            approvals,
            vetos
        );
    }

    /// Finalize abort - execute if all players approved (unanimous)
    /// 
    /// Can be called once:
    /// 1. All seated players have voted AND all approved, OR
    /// 2. Delay has passed AND all who voted approved (for timeout case)
    public entry fun finalize_abort(caller: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.abort_request_timestamp > 0, E_NO_ABORT_REQUEST);
        assert!(option::is_some(&table.game), E_NO_GAME);
        
        let now = timestamp::now_seconds();
        let deadline = table.abort_request_timestamp + ABORT_VOTE_DELAY_SECS;
        let abort_start = table.abort_request_timestamp;
        
        // Count active players (seated and not sitting out)
        let seated_count = count_active_players(&table.seats);
        let approvals = vector::length(&table.abort_approvals);
        let vetos = vector::length(&table.abort_vetos);
        let total_votes = approvals + vetos;
        
        // If not all voted, must wait for deadline
        if (total_votes < seated_count) {
            assert!(now >= deadline, E_VOTES_PENDING);
        };
        
        // Check if we have 100% approval (no vetos AND all approved)
        let unanimous_approval = vetos == 0 && approvals == seated_count;
        
        if (unanimous_approval) {
            // Execute the abort - refund players
            let game = option::borrow(&table.game);
            let total_invested = poker_pot_manager::get_total_invested(&game.pot_state);
            let players_in_hand = game.players_in_hand;
            
            let i = 0u64;
            while (i < vector::length(&players_in_hand)) {
                let seat_idx = *vector::borrow(&players_in_hand, i);
                let refund = *vector::borrow(&total_invested, i);
                if (refund > 0 && option::is_some(vector::borrow(&table.seats, seat_idx))) {
                    let seat = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
                    seat.chip_count = seat.chip_count + refund;
                };
                i = i + 1;
            };
            
            // Clear game and abort state
            let hand_number_emit = table.hand_number;
            table.game = option::none();
            table.abort_request_timestamp = 0;
            table.abort_approvals = vector::empty<address>();
            table.abort_vetos = vector::empty<address>();
            
            // Emit with reason code 3 = voted abort (approved)
            poker_events::emit_hand_aborted(table_addr, hand_number_emit, 3);
        } else {
            // Abort REJECTED - not 100% approval
            // Extend timer by voting duration and clear abort state
            if (option::is_some(&table.game)) {
                let vote_duration = now - abort_start;
                let game = option::borrow_mut(&mut table.game);
                game.action_deadline = game.action_deadline + vote_duration;
            };
            
            let hand_number = table.hand_number;
            table.abort_request_timestamp = 0;
            table.abort_approvals = vector::empty<address>();
            table.abort_vetos = vector::empty<address>();
            
            // Emit abort request cancelled/rejected event
            poker_events::emit_abort_request_cancelled(table_addr, hand_number);
        };
        
        // Suppress unused variable warning
        let _ = caller;
    }

    /// Cancel abort request - admin cancels pending request
    public entry fun cancel_abort_request(owner: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.owner == signer::address_of(owner), E_NOT_ADMIN);
        assert!(table.abort_request_timestamp > 0, E_NO_ABORT_REQUEST);
        
        let hand_number = table.hand_number;
        let abort_start = table.abort_request_timestamp;
        
        // Extend action deadline by time spent in abort voting (pause effect)
        if (option::is_some(&table.game)) {
            let now = timestamp::now_seconds();
            let vote_duration = now - abort_start;
            let game = option::borrow_mut(&mut table.game);
            game.action_deadline = game.action_deadline + vote_duration;
        };
        
        // Clear abort state
        table.abort_request_timestamp = 0;
        table.abort_approvals = vector::empty<address>();
        table.abort_vetos = vector::empty<address>();
        
        poker_events::emit_abort_request_cancelled(table_addr, hand_number);
    }

    /// Helper to count active players (seated and not sitting out)
    fun count_active_players(seats: &vector<Option<Seat>>): u64 {
        let count = 0u64;
        let i = 0u64;
        while (i < vector::length(seats)) {
            let seat_opt = vector::borrow(seats, i);
            if (option::is_some(seat_opt)) {
                let seat = option::borrow(seat_opt);
                if (!seat.is_sitting_out) {
                    count = count + 1;
                };
            };
            i = i + 1;
        };
        count
    }

    // ============================================
    // HAND LIFECYCLE"
    // ============================================

    public entry fun start_hand(caller: &signer, table_addr: address) acquires Table, TexasHoldemConfig {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        assert!(!table.is_paused, E_INVALID_ACTION);  // Table must not be paused
        
        // Enforce owner_only_start if enabled
        if (table.owner_only_start) {
            assert!(signer::address_of(caller) == table.owner, E_NOT_ADMIN);
        };
        
        let active_seats = get_active_seat_indices_internal(table);
        assert!(vector::length(&active_seats) >= 2, E_NOT_ENOUGH_PLAYERS);
        
        table.dealer_button = next_active_seat_internal(table, table.dealer_button);
        table.hand_number = table.hand_number + 1;
        
        let num_players = vector::length(&active_seats);
        let player_status = vector::empty<u8>();
        let commits = vector::empty<vector<u8>>();
        let secrets = vector::empty<vector<u8>>();
        let encrypted_hole_cards = vector::empty<vector<u8>>();
        let has_acted_mask = vector::empty<bool>();
        let betting_reopened_for = vector::empty<bool>();
        let revealed_mask = vector::empty<bool>();
        
        let i = 0u64;
        while (i < num_players) {
            vector::push_back(&mut player_status, STATUS_ACTIVE);
            vector::push_back(&mut commits, vector::empty());
            vector::push_back(&mut secrets, vector::empty());
            vector::push_back(&mut encrypted_hole_cards, vector::empty());
            vector::push_back(&mut has_acted_mask, false);
            vector::push_back(&mut betting_reopened_for, true);  // Can raise at start
            vector::push_back(&mut revealed_mask, false);

            // Record stats participation
            let seat_idx = *vector::borrow(&active_seats, i);
            let seat = option::borrow(vector::borrow(&table.seats, seat_idx));
            poker_player_stats::record_participation(seat.player);
            
            // Record core stats if game is registered
            if (exists<TexasHoldemConfig>(@NovaWalletGames)) {
                let config = borrow_global<TexasHoldemConfig>(@NovaWalletGames);
                core_stats::record_participation(&config.game_capability, seat.player);
            };
            
            i = i + 1;
        };
        
        table.game = option::some(Game {
            phase: PHASE_COMMIT,
            encrypted_hole_cards,
            community_cards: vector::empty(),
            card_seed: vector::empty(),    // Initialized when secrets are revealed
            dealt_card_mask: 0,            // No cards dealt yet
            card_keys: vector::empty(),    // Derived keys stored for showdown
            player_status,
            pot_state: poker_pot_manager::new(num_players),
            players_in_hand: active_seats,
            action_on: 0,
            action_deadline: 0,
            dealer_position: table.dealer_button,
            min_raise: table.config.big_blind,
            last_aggressor: option::none(),
            has_acted_mask,
            betting_reopened_for,
            straddle_hand_idx: option::none(),
            straddle_amount: 0,
            commits,
            secrets,
            commit_deadline: timestamp::now_seconds() + get_commit_reveal_timeout(table.config.table_speed),
            reveal_deadline: 0, // Set when all commits are in
            revealed_mask,
        });
        
        // Emit HandStarted event
        let game = option::borrow(&table.game);
        poker_events::emit_hand_started(table_addr, table.hand_number, table.dealer_button, game.players_in_hand);
    }

    public entry fun submit_commit(
        player: &signer,
        table_addr: address,
        commit_hash: vector<u8>
    ) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        
        // MEDIUM-1 Fix: Validate commit hash size (must be exactly 32 bytes for SHA3-256)
        assert!(vector::length(&commit_hash) == COMMIT_HASH_SIZE, E_INVALID_COMMIT_SIZE);
        
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        
        // Enforce commit deadline - reject late commits
        let game = option::borrow(&table.game);
        assert!(game.phase == PHASE_COMMIT, E_WRONG_PHASE);
        assert!(timestamp::now_seconds() <= game.commit_deadline, E_NO_TIMEOUT);
        
        let player_addr = signer::address_of(player);
        let hand_idx = find_player_hand_idx(&game.players_in_hand, &table.seats, player_addr);
        
        // Check not already committed  
        assert!(vector::is_empty(vector::borrow(&game.commits, hand_idx)), E_ALREADY_COMMITTED);
        
        // Now mutate
        let game_mut = option::borrow_mut(&mut table.game);
        *vector::borrow_mut(&mut game_mut.commits, hand_idx) = commit_hash;
        
        if (all_committed_internal(game_mut)) {
            game_mut.phase = PHASE_REVEAL;
            game_mut.reveal_deadline = timestamp::now_seconds() + get_commit_reveal_timeout(table.config.table_speed);
        };
    }

    public entry fun reveal_secret(
        player: &signer,
        table_addr: address,
        secret: vector<u8>
    ) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        
        // MEDIUM-1 Fix: Validate secret size (16-32 bytes)
        let secret_len = vector::length(&secret);
        assert!(secret_len >= MIN_SECRET_SIZE && secret_len <= MAX_SECRET_SIZE, E_INVALID_SECRET_SIZE);
        
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        
        let player_addr = signer::address_of(player);
        
        // Read-only access first
        let game = option::borrow(&table.game);
        assert!(game.phase == PHASE_REVEAL, E_WRONG_PHASE);
        // Enforce reveal deadline - reject late reveals
        assert!(timestamp::now_seconds() <= game.reveal_deadline, E_NO_TIMEOUT);
        
        let hand_idx = find_player_hand_idx(&game.players_in_hand, &table.seats, player_addr);
        
        assert!(vector::is_empty(vector::borrow(&game.secrets, hand_idx)), E_ALREADY_REVEALED);
        
        let computed_hash = hash::sha3_256(secret);
        let stored_commit = *vector::borrow(&game.commits, hand_idx);
        assert!(computed_hash == stored_commit, E_INVALID_SECRET);
        
        let all_revealed_flag: bool;
        {
            let game_mut = option::borrow_mut(&mut table.game);
            *vector::borrow_mut(&mut game_mut.secrets, hand_idx) = secret;
            all_revealed_flag = all_revealed_internal(game_mut);
        };
        
        if (all_revealed_flag) {
            let game_mut = option::borrow_mut(&mut table.game);
            initialize_card_seed(game_mut);
            deal_hole_cards_internal(game_mut);
            
            // Clear secrets after keys are derived (privacy improvement)
            // The card_keys are now stored for showdown decryption
            let num_secrets = vector::length(&game_mut.secrets);
            let s = 0u64;
            while (s < num_secrets) {
                *vector::borrow_mut(&mut game_mut.secrets, s) = vector::empty();
                s = s + 1;
            };
            
            // Post antes first (if configured)
            let ante = table.config.ante;
            post_antes_internal(game_mut, &mut table.seats, ante);
            
            // Then post blinds
            let bb_amount = table.config.big_blind;
            let sb_amount = table.config.small_blind;
            post_blinds_internal(game_mut, &mut table.seats, sb_amount, bb_amount);
            
            // Add accumulated dead money to pot (from missed blinds)
            if (table.dead_money > 0) {
                // Dead money is table-level chips and must not affect any player's invested stack.
                add_dead_money_to_pot_internal(game_mut, table.dead_money);
            };
            
            // Update next_bb_seat - tracks who should have BB next hand (for dead button)
            let bb_hand_idx = get_big_blind_hand_idx_internal(game_mut);
            let bb_seat_idx = *vector::borrow(&game_mut.players_in_hand, bb_hand_idx);
            table.next_bb_seat = (bb_seat_idx + 1) % table.max_seats;
            
            game_mut.phase = PHASE_PREFLOP;
            let num_players = vector::length(&game_mut.players_in_hand);
            let bb_hand_idx = get_big_blind_hand_idx_internal(game_mut);
            // Heads-up: dealer (SB) acts first preflop
            if (num_players == 2) {
                game_mut.action_on = get_small_blind_hand_idx_internal(game_mut);
            } else {
                game_mut.action_on = (bb_hand_idx + 1) % num_players;
            };
            game_mut.action_deadline = timestamp::now_seconds() + get_action_timeout(table.config.table_speed);
        };
    }

    // ============================================
    // PLAYER ACTIONS
    // ============================================

    public entry fun fold(player: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        assert!(table.abort_request_timestamp == 0, E_ABORT_PENDING); // Actions locked during abort vote
        
        let player_addr = signer::address_of(player);
        let game = option::borrow(&table.game);
        check_action_allowed_internal(game, &table.seats, player_addr);
        let hand_idx = find_player_hand_idx(&game.players_in_hand, &table.seats, player_addr);
        
        let game_mut = option::borrow_mut(&mut table.game);
        *vector::borrow_mut(&mut game_mut.player_status, hand_idx) = STATUS_FOLDED;
        *vector::borrow_mut(&mut game_mut.has_acted_mask, hand_idx) = true;
        
        // Record fold stat
        poker_player_stats::record_fold(player_addr);
        
        advance_action_internal(table, table_addr);
    }

    public entry fun check(player: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        assert!(table.abort_request_timestamp == 0, E_ABORT_PENDING); // Actions locked during abort vote
        
        let player_addr = signer::address_of(player);
        let game = option::borrow(&table.game);
        check_action_allowed_internal(game, &table.seats, player_addr);
        let hand_idx = find_player_hand_idx(&game.players_in_hand, &table.seats, player_addr);
        
        let call_amount = poker_pot_manager::get_call_amount(&game.pot_state, hand_idx);
        assert!(call_amount == 0, E_INVALID_ACTION);
        
        // Mark player as having acted
        let game_mut = option::borrow_mut(&mut table.game);
        *vector::borrow_mut(&mut game_mut.has_acted_mask, hand_idx) = true;
        
        advance_action_internal(table, table_addr);
    }

    public entry fun call(player: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        assert!(table.abort_request_timestamp == 0, E_ABORT_PENDING); // Actions locked during abort vote
        
        let player_addr = signer::address_of(player);
        let game = option::borrow(&table.game);
        check_action_allowed_internal(game, &table.seats, player_addr);
        let hand_idx = find_player_hand_idx(&game.players_in_hand, &table.seats, player_addr);
        let seat_idx = *vector::borrow(&game.players_in_hand, hand_idx);
        
        let call_amount = poker_pot_manager::get_call_amount(&game.pot_state, hand_idx);
        let seat = option::borrow(vector::borrow(&table.seats, seat_idx));
        let actual_amount = if (call_amount > seat.chip_count) { seat.chip_count } else { call_amount };
        
        {
            let game_mut = option::borrow_mut(&mut table.game);
            let seat_mut = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
            seat_mut.chip_count = seat_mut.chip_count - actual_amount;
            poker_pot_manager::add_bet(&mut game_mut.pot_state, hand_idx, actual_amount);
            *vector::borrow_mut(&mut game_mut.has_acted_mask, hand_idx) = true;
            if (seat_mut.chip_count == 0) {
                *vector::borrow_mut(&mut game_mut.player_status, hand_idx) = STATUS_ALL_IN;
            };
        };
        
        advance_action_internal(table, table_addr);
    }

    public entry fun raise_to(player: &signer, table_addr: address, total_bet: u64) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        assert!(table.abort_request_timestamp == 0, E_ABORT_PENDING); // Actions locked during abort vote
        
        let player_addr = signer::address_of(player);
        let game = option::borrow(&table.game);
        check_action_allowed_internal(game, &table.seats, player_addr);
        let hand_idx = find_player_hand_idx(&game.players_in_hand, &table.seats, player_addr);
        let seat_idx = *vector::borrow(&game.players_in_hand, hand_idx);
        
        let current_bet = poker_pot_manager::get_current_bet(&game.pot_state, hand_idx);
        let max_bet = poker_pot_manager::get_max_current_bet(&game.pot_state);
        let min_raise = game.min_raise;
        
        // Check if player can raise (if they already acted, betting must have been reopened)
        let has_acted = *vector::borrow(&game.has_acted_mask, hand_idx);
        if (has_acted) {
            assert!(*vector::borrow(&game.betting_reopened_for, hand_idx), E_INVALID_ACTION);
        };
        
        // Underflow protection: total_bet must be >= current_bet (what player already has in)
        assert!(total_bet >= current_bet, E_INVALID_RAISE);
        // A raise must exceed the current max bet
        assert!(total_bet > max_bet, E_INVALID_RAISE);
        
        let raise_amount = total_bet - max_bet;
        let seat = option::borrow(vector::borrow(&table.seats, seat_idx));
        let is_all_in = (total_bet == seat.chip_count + current_bet);
        
        // Raise validation:
        // 1. If max_bet < min_raise (short all-in situation), allow bet completing to min_raise
        // 2. Otherwise, raise_amount must be >= min_raise, or player is all-in
        let is_valid_raise = if (max_bet < min_raise) {
            // After a short all-in, allow betting up to min_raise (completing the bet)
            total_bet >= min_raise || is_all_in
        } else {
            // Normal case: raise must be at least min_raise, or all-in
            raise_amount >= min_raise || is_all_in
        };
        assert!(is_valid_raise, E_INVALID_RAISE);
        
        let add_amount = total_bet - current_bet;
        assert!(seat.chip_count >= add_amount, E_INSUFFICIENT_CHIPS);
        
        {
            let game_mut = option::borrow_mut(&mut table.game);
            let seat_mut = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
            seat_mut.chip_count = seat_mut.chip_count - add_amount;
            poker_pot_manager::add_bet(&mut game_mut.pot_state, hand_idx, add_amount);
            
            // Only full raises (>= min_raise) reopen betting and update min_raise
            if (raise_amount >= min_raise) {
                game_mut.min_raise = raise_amount;
                game_mut.last_aggressor = option::some(hand_idx);
                reset_acted_mask_except(game_mut, hand_idx);
            } else {
                // Short all-in: just mark as acted, don't reopen betting
                *vector::borrow_mut(&mut game_mut.has_acted_mask, hand_idx) = true;
                // Players who already acted cannot re-raise after a short all-in
                mark_no_reraise_for_acted(game_mut);
            };
            
            if (seat_mut.chip_count == 0) {
                *vector::borrow_mut(&mut game_mut.player_status, hand_idx) = STATUS_ALL_IN;
            };
        };
        
        advance_action_internal(table, table_addr);
    }

    public entry fun all_in(player: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        assert!(table.abort_request_timestamp == 0, E_ABORT_PENDING); // Actions locked during abort vote
        
        let player_addr = signer::address_of(player);
        let game = option::borrow(&table.game);
        check_action_allowed_internal(game, &table.seats, player_addr);
        let hand_idx = find_player_hand_idx(&game.players_in_hand, &table.seats, player_addr);
        let seat_idx = *vector::borrow(&game.players_in_hand, hand_idx);
        
        let seat = option::borrow(vector::borrow(&table.seats, seat_idx));
        let all_in_amount = seat.chip_count;
        
        let max_bet = poker_pot_manager::get_max_current_bet(&game.pot_state);
        let current_bet = poker_pot_manager::get_current_bet(&game.pot_state, hand_idx);
        let min_raise = game.min_raise;
        
        {
            let game_mut = option::borrow_mut(&mut table.game);
            let seat_mut = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
            seat_mut.chip_count = 0;
            poker_pot_manager::add_bet(&mut game_mut.pot_state, hand_idx, all_in_amount);
            *vector::borrow_mut(&mut game_mut.player_status, hand_idx) = STATUS_ALL_IN;
            
            // Calculate the new bet total after adding all_in_amount
            let new_total_bet = current_bet + all_in_amount;
            
            // Only set last_aggressor and reopen betting if this constitutes a valid raise
            // (new total bet exceeds max_bet by at least min_raise)
            if (new_total_bet > max_bet && (new_total_bet - max_bet) >= min_raise) {
                game_mut.last_aggressor = option::some(hand_idx);
                game_mut.min_raise = new_total_bet - max_bet;
                // Valid raise reopens betting
                reset_acted_mask_except(game_mut, hand_idx);
            } else {
                // Short all-in: just mark as acted, don't reopen betting
                *vector::borrow_mut(&mut game_mut.has_acted_mask, hand_idx) = true;
                // Players who already acted cannot re-raise after a short all-in
                mark_no_reraise_for_acted(game_mut);
            };
        };
        
        advance_action_internal(table, table_addr);
    }

    /// Post a straddle (voluntary third blind, 2x big blind)
    /// 
    /// Can only be called by UTG player during preflop before any other action.
    /// Straddler gets last action preflop (acts as if they posted BB).
    public entry fun straddle(player: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        assert!(table.abort_request_timestamp == 0, E_ABORT_PENDING); // Actions locked during abort vote
        assert!(table.config.straddle_enabled, E_STRADDLE_NOT_ALLOWED);
        
        let player_addr = signer::address_of(player);
        let game = option::borrow(&table.game);
        
        // Must be preflop
        assert!(game.phase == PHASE_PREFLOP, E_WRONG_PHASE);
        // No straddle already posted
        assert!(option::is_none(&game.straddle_hand_idx), E_STRADDLE_ALREADY_POSTED);
        
        // Must be UTG (player whose turn it is at start of preflop action)
        let hand_idx = find_player_hand_idx(&game.players_in_hand, &table.seats, player_addr);
        assert!(game.action_on == hand_idx, E_NOT_YOUR_TURN);
        
        // Verify player hasn't acted yet (straddle must be first action)
        assert!(!*vector::borrow(&game.has_acted_mask, hand_idx), E_INVALID_ACTION);
        
        let straddle_amount = table.config.big_blind * 2;
        let seat_idx = *vector::borrow(&game.players_in_hand, hand_idx);
        
        // Check sufficient chips
        let seat = option::borrow(vector::borrow(&table.seats, seat_idx));
        assert!(seat.chip_count >= straddle_amount, E_INSUFFICIENT_CHIPS);
        
        {
            let game_mut = option::borrow_mut(&mut table.game);
            let seat_mut = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
            
            seat_mut.chip_count = seat_mut.chip_count - straddle_amount;
            poker_pot_manager::add_bet(&mut game_mut.pot_state, hand_idx, straddle_amount);
            
            game_mut.straddle_hand_idx = option::some(hand_idx);
            game_mut.straddle_amount = straddle_amount;
            game_mut.min_raise = straddle_amount;  // New min raise = straddle amount
            
            // Mark straddle as NOT acted (they get option to raise later)
            // Move action to next player after straddler
            let num_players = vector::length(&game_mut.players_in_hand);
            game_mut.action_on = (hand_idx + 1) % num_players;
            
            // Skip non-active players
            while (*vector::borrow(&game_mut.player_status, game_mut.action_on) != STATUS_ACTIVE) {
                game_mut.action_on = (game_mut.action_on + 1) % num_players;
            };
            
            game_mut.action_deadline = timestamp::now_seconds() + get_action_timeout(table.config.table_speed);
        };
    }

    /// Handle timeouts for commit/reveal/action phases
    /// 
    /// Anyone can call this to enforce timeouts. Effects depend on phase:
    /// - COMMIT/REVEAL: Apply 10% penalty, mark as sitting out, abort if <2 players remain
    /// - PREFLOP-RIVER: Auto-fold the timed-out player
    public entry fun handle_timeout(table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        assert!(table.abort_request_timestamp == 0, E_ABORT_PENDING); // No timeouts during abort vote
        
        let now = timestamp::now_seconds();
        let game = option::borrow(&table.game);
        let phase = game.phase;
        
        if (phase == PHASE_COMMIT) {
            // Check commit timeout
            assert!(now > game.commit_deadline, E_NO_TIMEOUT);
            // Just abort the hand - no penalty for not understanding the workflow
            poker_events::emit_hand_aborted(table_addr, table.hand_number, 0); // reason 0 = commit timeout
            table.game = option::none();
            
        } else if (phase == PHASE_REVEAL) {
            // Check reveal timeout
            assert!(now > game.reveal_deadline, E_NO_TIMEOUT);
            // Just abort the hand - no penalty for not understanding the workflow
            poker_events::emit_hand_aborted(table_addr, table.hand_number, 1); // reason 1 = reveal timeout
            table.game = option::none();
            
        } else if (phase >= PHASE_PREFLOP && phase <= PHASE_RIVER) {
            // Check action timeout
            assert!(now > game.action_deadline, E_NO_TIMEOUT);
            // Auto-fold the player who timed out
            let action_on = game.action_on;
            {
                let game_mut = option::borrow_mut(&mut table.game);
                *vector::borrow_mut(&mut game_mut.player_status, action_on) = STATUS_FOLDED;
                *vector::borrow_mut(&mut game_mut.has_acted_mask, action_on) = true;
            };
            advance_action_internal(table, table_addr);
        };
    }

    // ============================================
    // INTERNAL GAME LOGIC
    // ============================================

    fun advance_action_internal(table: &mut Table, table_addr: address) {
        let game = option::borrow(&table.game);
        let active_count = count_active_players_internal(game);
        
        if (active_count <= 1) {
            end_hand_fold_internal(table, table_addr);
            return
        };
        
        let game = option::borrow(&table.game);
        if (is_betting_complete_internal(game)) {
            collect_and_advance_phase(table, table_addr);
        } else {
            let game_mut = option::borrow_mut(&mut table.game);
            game_mut.action_on = next_active_hand_idx_internal(game_mut);
            game_mut.action_deadline = timestamp::now_seconds() + get_action_timeout(table.config.table_speed);
        };
    }

    fun collect_and_advance_phase(table: &mut Table, table_addr: address) {
        {
            let game_mut = option::borrow_mut(&mut table.game);
            let non_folded = get_non_folded_mask_internal(game_mut);
            poker_pot_manager::collect_bets(&mut game_mut.pot_state, &non_folded);
        };
        advance_phase_internal(table, table_addr);
    }

    fun advance_phase_internal(table: &mut Table, table_addr: address) {
        let bb = table.config.big_blind;
        let game_mut = option::borrow_mut(&mut table.game);
        game_mut.last_aggressor = option::none();
        
        // Reset min_raise to big blind for new street
        game_mut.min_raise = bb;
        
        // Reset has_acted_mask and betting_reopened_for for new betting round
        let num_players = vector::length(&game_mut.players_in_hand);
        let i = 0u64;
        while (i < num_players) {
            *vector::borrow_mut(&mut game_mut.has_acted_mask, i) = false;
            *vector::borrow_mut(&mut game_mut.betting_reopened_for, i) = true;  // Can raise at new street
            i = i + 1;
        };
        
        // Count ACTIVE players (not ALL_IN, not FOLDED)
        let active_count = 0u64;
        let j = 0u64;
        while (j < num_players) {
            if (*vector::borrow(&game_mut.player_status, j) == STATUS_ACTIVE) {
                active_count = active_count + 1;
            };
            j = j + 1;
        };
        
        // If 0 or 1 ACTIVE players remain, runout remaining cards and go to showdown
        // (no more betting possible when all-in or only one player can act)
        if (active_count <= 1) {
            run_all_in_runout_internal(game_mut);
            game_mut.phase = PHASE_SHOWDOWN;
            run_showdown_internal(table, table_addr);
            return
        };
        
        let game_mut = option::borrow_mut(&mut table.game);
        let dealer_hand_idx = get_dealer_hand_idx_internal(game_mut);
        
        // Postflop: player left of dealer acts first (works for heads-up and multi-way)
        // In heads-up, this means BB (non-dealer) acts first, dealer acts last
        game_mut.action_on = (dealer_hand_idx + 1) % num_players;
        
        // Skip non-active players
        let start = game_mut.action_on;
        while (*vector::borrow(&game_mut.player_status, game_mut.action_on) != STATUS_ACTIVE) {
            game_mut.action_on = (game_mut.action_on + 1) % num_players;
            if (game_mut.action_on == start) {
                // No active players - run out remaining community cards before showdown
                run_all_in_runout_internal(game_mut);
                game_mut.phase = PHASE_SHOWDOWN;
                run_showdown_internal(table, table_addr);
                return
            };
        };
        
        let game_mut = option::borrow_mut(&mut table.game);
        if (game_mut.phase == PHASE_PREFLOP) {
            // Add fresh entropy before dealing flop (prevents prediction)
            add_street_entropy(game_mut);
            deal_community_cards_internal(game_mut, 3);
            game_mut.phase = PHASE_FLOP;
        } else if (game_mut.phase == PHASE_FLOP) {
            // Add fresh entropy before dealing turn
            add_street_entropy(game_mut);
            deal_community_cards_internal(game_mut, 1);
            game_mut.phase = PHASE_TURN;
        } else if (game_mut.phase == PHASE_TURN) {
            // Add fresh entropy before dealing river
            add_street_entropy(game_mut);
            deal_community_cards_internal(game_mut, 1);
            game_mut.phase = PHASE_RIVER;
        } else {
            game_mut.phase = PHASE_SHOWDOWN;
            run_showdown_internal(table, table_addr);
            return
        };
        
        game_mut.action_deadline = timestamp::now_seconds() + get_action_timeout(table.config.table_speed);
    }

    /// Deal remaining community cards when all players are all-in
    fun run_all_in_runout_internal(game: &mut Game) {
        let community_len = vector::length(&game.community_cards);
        if (community_len < 5) {
            // Add fresh entropy before dealing runout cards
            add_street_entropy(game);
            let remaining = 5 - community_len;
            deal_community_cards_internal(game, remaining);
        };
    }

    fun run_showdown_internal(table: &mut Table, table_addr: address) {
        let game = option::borrow(&table.game);
        let hand_rankings = vector::empty<poker_pot_manager::HandRanking>();
        let num_players = vector::length(&game.players_in_hand);
        
        // Build hand rankings and collect showdown data
        let showdown_seats = vector::empty<u64>();
        let showdown_players = vector::empty<address>();
        let showdown_hole_cards = vector::empty<vector<u8>>();
        let showdown_hand_types = vector::empty<u8>();
        
        let i = 0u64;
        while (i < num_players) {
            let status = *vector::borrow(&game.player_status, i);
            let seat_idx = *vector::borrow(&game.players_in_hand, i);
            
            if (status == STATUS_ACTIVE || status == STATUS_ALL_IN) {
                // Decrypt the hole cards using stored card_keys (secrets are cleared)
                let encrypted_hole = vector::borrow(&game.encrypted_hole_cards, i);
                let card_key = vector::borrow(&game.card_keys, i);
                let decrypted_hole = xor_encrypt_cards(encrypted_hole, card_key);
                
                let cards = vector::empty<u8>();
                vector::append(&mut cards, decrypted_hole);
                vector::append(&mut cards, game.community_cards);
                
                let (hand_type, tiebreaker) = poker_hand_eval::evaluate_hand(cards);
                vector::push_back(&mut hand_rankings, poker_pot_manager::new_hand_ranking(hand_type, tiebreaker));
                
                // Collect showdown data for non-folded players (use decrypted cards)
                vector::push_back(&mut showdown_seats, seat_idx);
                let seat = option::borrow(vector::borrow(&table.seats, seat_idx));
                vector::push_back(&mut showdown_players, seat.player);
                vector::push_back(&mut showdown_hole_cards, xor_encrypt_cards(encrypted_hole, card_key));
                vector::push_back(&mut showdown_hand_types, hand_type);
                
                // Record showdown participation
                poker_player_stats::record_showdown_participation(seat.player, hand_type);
            } else {
                vector::push_back(&mut hand_rankings, poker_pot_manager::new_hand_ranking(0, 0));
            };
            i = i + 1;
        };
        
        let active = get_non_folded_mask_internal(game);
        let game = option::borrow(&table.game);
        let dealer_hand_idx = get_dealer_hand_idx_internal(game);
        let distributions = poker_pot_manager::calculate_distribution(
            &game.pot_state, 
            &hand_rankings, 
            &active,
            dealer_hand_idx,
            num_players
        );
        
        let game = option::borrow(&table.game);
        let players_in_hand = game.players_in_hand;
        let community_cards = game.community_cards;
        let total_pot = poker_pot_manager::get_total_pot(&game.pot_state);
        let hand_number = table.hand_number;
        
        // Process distributions and build winner data
        let winner_seats = vector::empty<u64>();
        let winner_players = vector::empty<address>();
        let winner_amounts = vector::empty<u64>();
        
        let d = 0u64;
        while (d < vector::length(&distributions)) {
            let dist = vector::borrow(&distributions, d);
            let hand_idx = poker_pot_manager::get_distribution_player(dist);
            let amount = poker_pot_manager::get_distribution_amount(dist);

            let seat_idx = *vector::borrow(&players_in_hand, hand_idx);
            let seat = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
            seat.chip_count = seat.chip_count + amount;
            
            // Record win (Using 0 for hand_rank here is okay if we don't need detailed hand type in win record, 
            // BUT wait, record_win updates the detailed histogram! We NEED the hand rank!
            // We have `hand_rankings` vector. We can extract it.
            let rank_obj = vector::borrow(&hand_rankings, hand_idx);
            let hand_rank = poker_pot_manager::get_hand_type(rank_obj);
            poker_player_stats::record_win(seat.player, amount, hand_rank);
            poker_player_stats::record_showdown_win(seat.player);
            
            // Record winner data
            vector::push_back(&mut winner_seats, seat_idx);
            vector::push_back(&mut winner_players, seat.player);
            vector::push_back(&mut winner_amounts, amount);
            
            d = d + 1;
        };
        
        // Emit comprehensive hand result event
        poker_events::emit_hand_result(
            table_addr,
            hand_number,
            timestamp::now_seconds(),
            community_cards,
            showdown_seats,
            showdown_players,
            showdown_hole_cards,
            showdown_hand_types,
            winner_seats,
            winner_players,
            winner_amounts,
            total_pot,
            0,
            0, // result_type: showdown
        );

        // Dead money has now been consumed into this completed hand's pot.
        table.dead_money = 0;
        
        // Process pending leaves before clearing the game
        process_pending_leaves(table, table_addr);
        
        table.game = option::none();
    }

    fun end_hand_fold_internal(table: &mut Table, table_addr: address) {
        {
            let game_mut = option::borrow_mut(&mut table.game);
            let non_folded = get_non_folded_mask_internal(game_mut);
            poker_pot_manager::collect_bets(&mut game_mut.pot_state, &non_folded);
        };
        
        let game = option::borrow(&table.game);
        let num_players = vector::length(&game.players_in_hand);
        let winner_hand_idx = 0u64;
        let i = 0u64;
        while (i < num_players) {
            if (*vector::borrow(&game.player_status, i) != STATUS_FOLDED) {
                winner_hand_idx = i;
                break
            };
            i = i + 1;
        };
        
        let game = option::borrow(&table.game);
        let total = poker_pot_manager::get_total_pot(&game.pot_state);
        let community_cards = game.community_cards;
        let seat_idx = *vector::borrow(&game.players_in_hand, winner_hand_idx);
        let hand_number = table.hand_number;
        
        let seat = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
        seat.chip_count = seat.chip_count + total;
        let winner_player = seat.player;
        
        // Record win (hand_rank 255 for fold-win)
        poker_player_stats::record_win(winner_player, total, 255);
        
        
        // Emit hand result event for fold win
        // For fold wins, showdown arrays are empty (cards not revealed)
        poker_events::emit_hand_result(
            table_addr,
            hand_number,
            timestamp::now_seconds(),
            community_cards,
            vector::empty<u64>(),           // showdown_seats (empty - no showdown)
            vector::empty<address>(),       // showdown_players
            vector::empty<vector<u8>>(),    // showdown_hole_cards
            vector::empty<u8>(),            // showdown_hand_types
            vector::singleton(seat_idx),    // winner_seats
            vector::singleton(winner_player), // winner_players
            vector::singleton(total),       // winner_amounts
            total,
            0,
            1, // result_type: fold_win
        );

        // Dead money has now been consumed into this completed hand's pot.
        table.dead_money = 0;
        
        // Process pending leaves before clearing the game
        process_pending_leaves(table, table_addr);
        
        table.game = option::none();
    }

    /// Process pending leaves - auto-remove players who requested to leave after hand
    fun process_pending_leaves(table: &mut Table, table_addr: address) {
        let i = 0u64;
        while (i < table.max_seats) {
            if (*vector::borrow(&table.pending_leaves, i) && 
                option::is_some(vector::borrow(&table.seats, i))) {
                let seat = option::extract(vector::borrow_mut(&mut table.seats, i));
                if (seat.chip_count > 0) {
                    chips::transfer_chips(table_addr, seat.player, seat.chip_count);
                };
                *vector::borrow_mut(&mut table.pending_leaves, i) = false;
                poker_events::emit_player_left(table_addr, i, seat.player, seat.chip_count);
            };
            i = i + 1;
        };
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    fun add_dead_money_to_pot_internal(game: &mut Game, amount: u64) {
        if (amount == 0) {
            return
        };

        let eligible = vector::empty<u64>();
        let i = 0u64;
        let num_players = vector::length(&game.players_in_hand);
        while (i < num_players) {
            vector::push_back(&mut eligible, i);
            i = i + 1;
        };

        poker_pot_manager::add_dead_money(&mut game.pot_state, amount, eligible);
    }

    /// Validate table name: 3-32 bytes, alphanumeric + space/dash/underscore only
    fun validate_table_name(name: &String) {
        use std::string;
        let bytes = string::bytes(name);
        let len = vector::length(bytes);
        assert!(len >= 3 && len <= 32, E_INVALID_NAME_LENGTH);
        
        let i = 0u64;
        while (i < len) {
            let c = *vector::borrow(bytes, i);
            // Valid chars: 0-9 (48-57), A-Z (65-90), a-z (97-122), space (32), dash (45), underscore (95)
            let valid = (c >= 48 && c <= 57) ||   // 0-9
                        (c >= 65 && c <= 90) ||   // A-Z
                        (c >= 97 && c <= 122) ||  // a-z
                        c == 32 || c == 45 || c == 95;  // space, dash, underscore
            assert!(valid, E_INVALID_NAME_CHAR);
            i = i + 1;
        };
    }

    fun find_player_seat_in_table(table: &Table, player: address): Option<u64> {
            let (is_found, seat_idx) = vector::find(&table.seats, |seat| {
                if(option::is_some(seat)) {
                option::borrow(seat).player == player
            } else {
                false
            }
        });
        if (is_found) { option::some(seat_idx) } else { option::none() }
    }

    /// Get action timeout in seconds based on table speed setting
    fun get_action_timeout(speed: u8): u64 {
        if (speed == SPEED_FAST) { 60 }
        else if (speed == SPEED_QUICK_FIRE) { 30 }
        else { 90 }  // SPEED_STANDARD default (1.5 minutes)
    }

    /// Get commit/reveal timeout in seconds based on table speed setting
    fun get_commit_reveal_timeout(speed: u8): u64 {
        if (speed == SPEED_FAST) { 90 }
        else if (speed == SPEED_QUICK_FIRE) { 45 }
        else { 180 }  // SPEED_STANDARD default (3 minutes)
    }

    fun find_player_hand_idx(players_in_hand: &vector<u64>, seats: &vector<Option<Seat>>, player: address): u64 {
        let num = vector::length(players_in_hand);
        let i = 0u64;
        while (i < num) {
            let seat_idx = *vector::borrow(players_in_hand, i);
            let seat = option::borrow(vector::borrow(seats, seat_idx));
            if (seat.player == player) { return i };
            i = i + 1;
        };
        num
    }

    fun check_action_allowed_internal(game: &Game, seats: &vector<Option<Seat>>, player: address) {
        assert!(game.phase >= PHASE_PREFLOP && game.phase <= PHASE_RIVER, E_WRONG_PHASE);
        let hand_idx = find_player_hand_idx(&game.players_in_hand, seats, player);
        assert!(game.action_on == hand_idx, E_NOT_YOUR_TURN);
        assert!(*vector::borrow(&game.player_status, hand_idx) == STATUS_ACTIVE, E_INVALID_ACTION);
    }

    /// Reset has_acted_mask for all players except the specified one (the raiser).
    /// Called when a raise reopens betting. Also sets betting_reopened_for = true.
    fun reset_acted_mask_except(game: &mut Game, except_idx: u64) {
        let num = vector::length(&game.has_acted_mask);
        let i = 0u64;
        while (i < num) {
            if (i == except_idx) {
                *vector::borrow_mut(&mut game.has_acted_mask, i) = true;
            } else {
                let status = *vector::borrow(&game.player_status, i);
                // Only reset for ACTIVE players (folded/all-in don't need to act)
                if (status == STATUS_ACTIVE) {
                    *vector::borrow_mut(&mut game.has_acted_mask, i) = false;
                    *vector::borrow_mut(&mut game.betting_reopened_for, i) = true;  // Can re-raise
                };
            };
            i = i + 1;
        };
    }

    /// Mark that already-acted players cannot re-raise (after short all-in).
    fun mark_no_reraise_for_acted(game: &mut Game) {
        let num = vector::length(&game.has_acted_mask);
        let i = 0u64;
        while (i < num) {
            if (*vector::borrow(&game.has_acted_mask, i)) {
                *vector::borrow_mut(&mut game.betting_reopened_for, i) = false;
            };
            i = i + 1;
        };
    }

    fun get_active_seat_indices_internal(table: &Table): vector<u64> {
        let active = vector::empty<u64>();
        let i = 0u64;
        while (i < table.max_seats) {
            if (option::is_some(vector::borrow(&table.seats, i))) {
                let seat = option::borrow(vector::borrow(&table.seats, i));
                if (!seat.is_sitting_out && seat.chip_count > 0) {
                    vector::push_back(&mut active, i);
                };
            };
            i = i + 1;
        };
        active
    }

    fun next_active_seat_internal(table: &Table, from: u64): u64 {
        let i = (from + 1) % table.max_seats;
        while (i != from) {
            if (option::is_some(vector::borrow(&table.seats, i))) {
                let seat = option::borrow(vector::borrow(&table.seats, i));
                if (!seat.is_sitting_out && seat.chip_count > 0) { return i };
            };
            i = (i + 1) % table.max_seats;
        };
        from
    }

    fun all_committed_internal(game: &Game): bool {
        let len = vector::length(&game.commits);
        let i = 0u64;
        while (i < len) {
            if (vector::is_empty(vector::borrow(&game.commits, i))) { return false };
            i = i + 1;
        };
        true
    }

    fun all_revealed_internal(game: &Game): bool {
        let len = vector::length(&game.secrets);
        let i = 0u64;
        while (i < len) {
            if (vector::is_empty(vector::borrow(&game.secrets, i))) { return false };
            i = i + 1;
        };
        true
    }

    /// Initialize the card seed from all player secrets and blockchain entropy.
    /// This replaces the old shuffle_deck_internal - we no longer store the full deck.
    fun initialize_card_seed(game: &mut Game) {
        // Build seed from all player secrets
        let seed = vector::empty<u8>();
        let i = 0u64;
        while (i < vector::length(&game.secrets)) {
            vector::append(&mut seed, *vector::borrow(&game.secrets, i));
            i = i + 1;
        };
        
        // Add blockchain entropy (deadlines + block height + timestamp)
        let deadline_bytes = bcs::to_bytes(&game.commit_deadline);
        vector::append(&mut seed, deadline_bytes);
        
        let reveal_deadline_bytes = bcs::to_bytes(&game.reveal_deadline);
        vector::append(&mut seed, reveal_deadline_bytes);
        
        let block_height = block::get_current_block_height();
        let block_bytes = bcs::to_bytes(&block_height);
        vector::append(&mut seed, block_bytes);
        
        let ts = timestamp::now_seconds();
        let ts_bytes = bcs::to_bytes(&ts);
        vector::append(&mut seed, ts_bytes);
        
        // Hash everything to create the master seed
        game.card_seed = hash::sha3_256(seed);
        game.dealt_card_mask = 0; // No cards dealt yet
    }
    
    /// Add fresh entropy before dealing each street's community cards.
    /// This ensures future cards cannot be predicted from current state.
    fun add_street_entropy(game: &mut Game) {
        let fresh = vector::empty<u8>();
        vector::append(&mut fresh, game.card_seed);
        vector::append(&mut fresh, bcs::to_bytes(&block::get_current_block_height()));
        vector::append(&mut fresh, bcs::to_bytes(&timestamp::now_seconds()));
        game.card_seed = hash::sha3_256(fresh);
    }
    
    /// Deal a single card using the hash chain, ensuring no duplicates via bitmask.
    /// Returns a card value 0-51.
    fun deal_card(game: &mut Game): u8 {
        let card: u8;
        loop {
            // Hash current seed to advance the random state
            game.card_seed = hash::sha3_256(game.card_seed);
            
            // Extract random value from first 2 bytes for better distribution
            let rand_val = ((*vector::borrow(&game.card_seed, 0) as u64) << 8) 
                         | (*vector::borrow(&game.card_seed, 1) as u64);
            card = ((rand_val % 52) as u8);
            
            // Check if this card was already dealt using bitmask
            let card_bit = 1u128 << (card as u8);
            if ((game.dealt_card_mask & card_bit) == 0) {
                // Card not yet dealt - mark it as dealt and return
                game.dealt_card_mask = game.dealt_card_mask | card_bit;
                break
            };
            // Card already dealt, loop to pick another
        };
        card
    }

    /// Generate per-player card encryption key from their secret and seat index
    fun derive_card_key(secret: &vector<u8>, seat_idx: u64): vector<u8> {
        let key_material = vector::empty<u8>();
        vector::append(&mut key_material, *secret);
        // Append a domain separator
        vector::append(&mut key_material, b"HOLECARDS");
        // Append seat index bytes
        let seat_bytes = bcs::to_bytes(&seat_idx);
        vector::append(&mut key_material, seat_bytes);
        hash::sha3_256(key_material)
    }
    
    /// XOR encrypt/decrypt cards (symmetric operation)
    fun xor_encrypt_cards(cards: &vector<u8>, key: &vector<u8>): vector<u8> {
        let result = vector::empty<u8>();
        let i = 0u64;
        let key_len = vector::length(key);
        while (i < vector::length(cards)) {
            let card_byte = *vector::borrow(cards, i);
            let key_byte = *vector::borrow(key, i % key_len);
            vector::push_back(&mut result, card_byte ^ key_byte);
            i = i + 1;
        };
        result
    }

    fun deal_hole_cards_internal(game: &mut Game) {
        let num = vector::length(&game.players_in_hand);
        let p = 0u64;
        while (p < num) {
            // Deal 2 cards using on-demand generation
            let card1 = deal_card(game);
            let card2 = deal_card(game);
            
            let plain_cards = vector::empty<u8>();
            vector::push_back(&mut plain_cards, card1);
            vector::push_back(&mut plain_cards, card2);
            
            // Derive encryption key and store it for showdown
            let secret = vector::borrow(&game.secrets, p);
            let seat_idx = *vector::borrow(&game.players_in_hand, p);
            let card_key = derive_card_key(secret, seat_idx);
            
            // Store the derived key for later showdown decryption
            vector::push_back(&mut game.card_keys, card_key);
            
            let encrypted = xor_encrypt_cards(&plain_cards, vector::borrow(&game.card_keys, p));
            *vector::borrow_mut(&mut game.encrypted_hole_cards, p) = encrypted;
            
            p = p + 1;
        };
    }

    fun deal_community_cards_internal(game: &mut Game, count: u64) {
        // Burn one card before dealing (standard poker rule)
        let _ = deal_card(game);
        
        let i = 0u64;
        while (i < count) {
            let card = deal_card(game);
            vector::push_back(&mut game.community_cards, card);
            i = i + 1;
        };
    }

    fun post_blinds_internal(game: &mut Game, seats: &mut vector<Option<Seat>>, sb: u64, bb: u64) {
        let _num_players = vector::length(&game.players_in_hand);
        let sb_hand_idx = get_small_blind_hand_idx_internal(game);
        let bb_hand_idx = get_big_blind_hand_idx_internal(game);
        
        let sb_seat_idx = *vector::borrow(&game.players_in_hand, sb_hand_idx);
        let bb_seat_idx = *vector::borrow(&game.players_in_hand, bb_hand_idx);
        
        let sb_amount = sb;
        {
            let seat = option::borrow_mut(vector::borrow_mut(seats, sb_seat_idx));
            if (seat.chip_count < sb_amount) {
                sb_amount = seat.chip_count;
                *vector::borrow_mut(&mut game.player_status, sb_hand_idx) = STATUS_ALL_IN;
            };
            seat.chip_count = seat.chip_count - sb_amount;
        };
        poker_pot_manager::add_bet(&mut game.pot_state, sb_hand_idx, sb_amount);
        
        let bb_amount = bb;
        {
            let seat = option::borrow_mut(vector::borrow_mut(seats, bb_seat_idx));
            if (seat.chip_count < bb_amount) {
                bb_amount = seat.chip_count;
                *vector::borrow_mut(&mut game.player_status, bb_hand_idx) = STATUS_ALL_IN;
            };
            seat.chip_count = seat.chip_count - bb_amount;
        };
        poker_pot_manager::add_bet(&mut game.pot_state, bb_hand_idx, bb_amount);
        
        game.min_raise = bb;
    }

    /// Post antes from all players (called before blinds)
    fun post_antes_internal(game: &mut Game, seats: &mut vector<Option<Seat>>, ante: u64) {
        if (ante == 0) { return };
        
        let num_players = vector::length(&game.players_in_hand);
        let i = 0u64;
        while (i < num_players) {
            let seat_idx = *vector::borrow(&game.players_in_hand, i);
            let ante_amount = ante;
            {
                let seat = option::borrow_mut(vector::borrow_mut(seats, seat_idx));
                if (seat.chip_count < ante_amount) {
                    ante_amount = seat.chip_count;
                    *vector::borrow_mut(&mut game.player_status, i) = STATUS_ALL_IN;
                };
                seat.chip_count = seat.chip_count - ante_amount;
            };
            poker_pot_manager::add_bet(&mut game.pot_state, i, ante_amount);
            i = i + 1;
        };
    }

    fun get_dealer_hand_idx_internal(game: &Game): u64 {
        let num = vector::length(&game.players_in_hand);
        let i = 0u64;
        while (i < num) {
            if (*vector::borrow(&game.players_in_hand, i) == game.dealer_position) { return i };
            i = i + 1;
        };
        0
    }

    fun get_small_blind_hand_idx_internal(game: &Game): u64 {
        let dealer_idx = get_dealer_hand_idx_internal(game);
        let num = vector::length(&game.players_in_hand);
        // Heads-up: dealer posts the small blind
        if (num == 2) {
            return dealer_idx
        };
        (dealer_idx + 1) % num
    }

    fun get_big_blind_hand_idx_internal(game: &Game): u64 {
        let dealer_idx = get_dealer_hand_idx_internal(game);
        let num = vector::length(&game.players_in_hand);
        // Heads-up: non-dealer posts the big blind
        if (num == 2) {
            return (dealer_idx + 1) % num
        };
        (dealer_idx + 2) % num
    }

    fun count_active_players_internal(game: &Game): u64 {
        let count = 0u64;
        let i = 0u64;
        while (i < vector::length(&game.player_status)) {
            let status = *vector::borrow(&game.player_status, i);
            if (status == STATUS_ACTIVE || status == STATUS_ALL_IN) { count = count + 1; };
            i = i + 1;
        };
        count
    }

    fun is_betting_complete_internal(game: &Game): bool {
        let max_bet = poker_pot_manager::get_max_current_bet(&game.pot_state);
        let num = vector::length(&game.player_status);
        
        let i = 0u64;
        while (i < num) {
            let status = *vector::borrow(&game.player_status, i);
            if (status == STATUS_ACTIVE) {
                // Player must have acted this round
                if (!*vector::borrow(&game.has_acted_mask, i)) { return false };
                // All bets must be matched
                let bet = poker_pot_manager::get_current_bet(&game.pot_state, i);
                if (bet < max_bet) { return false };
            };
            i = i + 1;
        };
        true
    }

    fun next_active_hand_idx_internal(game: &Game): u64 {
        let num = vector::length(&game.player_status);
        let next = (game.action_on + 1) % num;
        while (next != game.action_on) {
            if (*vector::borrow(&game.player_status, next) == STATUS_ACTIVE) { return next };
            next = (next + 1) % num;
        };
        game.action_on
    }

    fun get_active_mask_internal(game: &Game): vector<bool> {
        let mask = vector::empty<bool>();
        let i = 0u64;
        while (i < vector::length(&game.player_status)) {
            let status = *vector::borrow(&game.player_status, i);
            vector::push_back(&mut mask, status == STATUS_ACTIVE);
            i = i + 1;
        };
        mask
    }

    fun get_all_in_mask_internal(game: &Game): vector<bool> {
        let mask = vector::empty<bool>();
        let i = 0u64;
        while (i < vector::length(&game.player_status)) {
            let status = *vector::borrow(&game.player_status, i);
            vector::push_back(&mut mask, status == STATUS_ALL_IN);
            i = i + 1;
        };
        mask
    }

    fun get_non_folded_mask_internal(game: &Game): vector<bool> {
        let mask = vector::empty<bool>();
        let i = 0u64;
        while (i < vector::length(&game.player_status)) {
            let status = *vector::borrow(&game.player_status, i);
            vector::push_back(&mut mask, status != STATUS_FOLDED);
            i = i + 1;
        };
        mask
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    #[view]
    public fun get_table_config(table_addr: address): (u64, u64, u64, u64) acquires Table {
        let table = borrow_global<Table>(table_addr);
        (table.config.small_blind, table.config.big_blind, table.config.min_buy_in, table.config.max_buy_in)
    }

    #[view]
    public fun get_game_phase(table_addr: address): u8 acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { PHASE_WAITING }
        else { option::borrow(&table.game).phase }
    }

    #[view]
    public fun get_pot_size(table_addr: address): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { 0 }
        else { poker_pot_manager::get_total_pot(&option::borrow(&table.game).pot_state) }
    }

    #[view]
    public fun get_community_cards(table_addr: address): vector<u8> acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { vector::empty() }
        else { option::borrow(&table.game).community_cards }
    }

    #[view]
    public fun get_seat_info(table_addr: address, seat_idx: u64): (address, u64, bool) acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_some(vector::borrow(&table.seats, seat_idx))) {
            let seat = option::borrow(vector::borrow(&table.seats, seat_idx));
            (seat.player, seat.chip_count, seat.is_sitting_out)
        } else {
            (@0x0, 0, true)
        }
    }

    // ============================================
    // EXTENDED VIEW FUNCTIONS (Frontend Integration)
    // ============================================

    #[view]
    /// Get full table config including ante and straddle info
    public fun get_table_config_full(table_addr: address): (u64, u64, u64, u64, u64, bool, u64) acquires Table {
        let table = borrow_global<Table>(table_addr);
        (
            table.config.small_blind,
            table.config.big_blind,
            table.config.min_buy_in,
            table.config.max_buy_in,
            table.config.ante,
            table.config.straddle_enabled,
            0
        )
    }

    #[view]
    /// Get table state (hand number, dealer, next BB seat)
    public fun get_table_state(table_addr: address): (u64, u64, u64, u64) acquires Table {
        let table = borrow_global<Table>(table_addr);
        (table.hand_number, table.dealer_button, table.next_bb_seat, 0)
    }

    #[view]
    /// Get whose turn it is (seat index and address)
    public fun get_action_on(table_addr: address): (u64, address, u64) acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) {
            return (0, @0x0, 0)
        };
        let game = option::borrow(&table.game);
        let hand_idx = game.action_on;
        let seat_idx = *vector::borrow(&game.players_in_hand, hand_idx);
        let player_addr = if (option::is_some(vector::borrow(&table.seats, seat_idx))) {
            option::borrow(vector::borrow(&table.seats, seat_idx)).player
        } else { @0x0 };
        (seat_idx, player_addr, game.action_deadline)
    }

    #[view]
    /// Get action deadline
    public fun get_action_deadline(table_addr: address): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { 0 }
        else { option::borrow(&table.game).action_deadline }
    }

    #[view]
    /// Get current min raise amount
    public fun get_min_raise(table_addr: address): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { 0 }
        else { option::borrow(&table.game).min_raise }
    }

    #[view]
    /// Get max current bet this round
    public fun get_max_current_bet(table_addr: address): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { 0 }
        else { poker_pot_manager::get_max_current_bet(&option::borrow(&table.game).pot_state) }
    }

    #[view]
    /// Get commit deadline
    public fun get_commit_deadline(table_addr: address): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { 0 }
        else { option::borrow(&table.game).commit_deadline }
    }

    #[view]
    /// Get reveal deadline
    public fun get_reveal_deadline(table_addr: address): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { 0 }
        else { option::borrow(&table.game).reveal_deadline }
    }

    #[view]
    /// Get player's seat index from their address
    public fun get_player_seat(table_addr: address, player_addr: address): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        let seat_idx = find_player_seat_in_table(table, player_addr);
        if (option::is_some(&seat_idx)) {
            option::extract(&mut seat_idx)
        } else {
            0
        }
    }

    #[view]
    /// Get seat indices of players in current hand
    public fun get_players_in_hand(table_addr: address): vector<u64> acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { vector::empty() }
        else { option::borrow(&table.game).players_in_hand }
    }

    #[view]
    /// Get encrypted hole cards for all players in hand
    /// Frontend decrypts using player's secret + seat index
    /// Note: This returns ENCRYPTED data - only the player with the matching secret can decrypt
    public fun get_encrypted_hole_cards(table_addr: address): vector<vector<u8>> acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { vector::empty() }
        else { option::borrow(&table.game).encrypted_hole_cards }
    }


    #[view]
    /// Get status of each player in hand (0=waiting, 1=active, 2=folded, 3=all-in)
    public fun get_player_statuses(table_addr: address): vector<u8> acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { vector::empty() }
        else { option::borrow(&table.game).player_status }
    }

    #[view]
    /// Get commit status as boolean array (true = committed)
    public fun get_commit_status(table_addr: address): vector<bool> acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { return vector::empty() };
        let game = option::borrow(&table.game);
        let result = vector::empty<bool>();
        let i = 0u64;
        while (i < vector::length(&game.commits)) {
            vector::push_back(&mut result, !vector::is_empty(vector::borrow(&game.commits, i)));
            i = i + 1;
        };
        result
    }

    #[view]
    /// Get reveal status as boolean array (true = revealed)
    public fun get_reveal_status(table_addr: address): vector<bool> acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { return vector::empty() };
        let game = option::borrow(&table.game);
        let result = vector::empty<bool>();
        let i = 0u64;
        while (i < vector::length(&game.secrets)) {
            vector::push_back(&mut result, !vector::is_empty(vector::borrow(&game.secrets, i)));
            i = i + 1;
        };
        result
    }

    #[view]
    /// Get current bets per player in hand
    public fun get_current_bets(table_addr: address): vector<u64> acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { vector::empty() }
        else { poker_pot_manager::get_current_bets(&option::borrow(&table.game).pot_state) }
    }

    #[view]
    /// Get total invested per player in hand
    public fun get_total_invested(table_addr: address): vector<u64> acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { vector::empty() }
        else { poker_pot_manager::get_total_invested(&option::borrow(&table.game).pot_state) }
    }

    #[view]
    /// Get call amount for a specific player (by hand index)
    public fun get_call_amount(table_addr: address, hand_idx: u64): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { 0 }
        else { poker_pot_manager::get_call_amount(&option::borrow(&table.game).pot_state, hand_idx) }
    }

    #[view]
    /// Get last aggressor (seat index, or MAX if none)
    public fun get_last_aggressor(table_addr: address): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { return table.max_seats };
        let game = option::borrow(&table.game);
        if (option::is_none(&game.last_aggressor)) { table.max_seats }
        else {
            let hand_idx = *option::borrow(&game.last_aggressor);
            *vector::borrow(&game.players_in_hand, hand_idx)
        }
    }

    #[view]
    /// Get extended seat info including current bet and status
    public fun get_seat_info_full(table_addr: address, seat_idx: u64): (address, u64, bool, u64, u8) acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(vector::borrow(&table.seats, seat_idx))) {
            return (@0x0, 0, true, 0, STATUS_WAITING)
        };
        
        let seat = option::borrow(vector::borrow(&table.seats, seat_idx));
        let current_bet = 0u64;
        let status = STATUS_WAITING;
        
        if (option::is_some(&table.game)) {
            let game = option::borrow(&table.game);
            // Find this seat's hand_idx
            let i = 0u64;
            while (i < vector::length(&game.players_in_hand)) {
                if (*vector::borrow(&game.players_in_hand, i) == seat_idx) {
                    current_bet = poker_pot_manager::get_current_bet(&game.pot_state, i);
                    status = *vector::borrow(&game.player_status, i);
                    break
                };
                i = i + 1;
            };
        };
        
        (seat.player, seat.chip_count, seat.is_sitting_out, current_bet, status)
    }

    #[view]
    /// Get timeout penalty percentage
    public fun get_timeout_penalty_percent(): u64 {
        TIMEOUT_PENALTY_PERCENT
    }

    #[view]
    /// Get action timeout in seconds for a specific table
    public fun get_action_timeout_secs(table_addr: address): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        get_action_timeout(table.config.table_speed)
    }

    #[view]
    /// Get table speed setting (0=Standard, 1=Fast, 2=QuickFire)
    public fun get_table_speed(table_addr: address): u8 acquires Table {
        let table = borrow_global<Table>(table_addr);
        table.config.table_speed
    }

    #[view]
    /// Check if table is paused
    public fun is_table_paused(table_addr: address): bool acquires Table {
        let table = borrow_global<Table>(table_addr);
        table.is_paused
    }

    #[view]
    /// Check if admin-only start is enabled
    public fun is_owner_only_start(table_addr: address): bool acquires Table {
        let table = borrow_global<Table>(table_addr);
        table.owner_only_start
    }

    #[view]
    /// Get pending leaves (players who want to leave after hand)
    public fun get_pending_leaves(table_addr: address): vector<bool> acquires Table {
        let table = borrow_global<Table>(table_addr);
        table.pending_leaves
    }

    #[view]
    /// Check if table is paused
    public fun is_paused(table_addr: address): bool acquires Table {
        let table = borrow_global<Table>(table_addr);
        table.is_paused
    }

    #[view]
    /// Get missed blinds for all seats
    public fun get_missed_blinds(table_addr: address): vector<u64> acquires Table {
        let table = borrow_global<Table>(table_addr);
        table.missed_blinds
    }

    #[view]
    /// Get accumulated dead money (from missed blinds) to be added to next pot
    public fun get_dead_money(table_addr: address): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        table.dead_money
    }

    #[view]
    /// Get seat count (occupied, total)
    public fun get_seat_count(table_addr: address): (u64, u64) acquires Table {
        let table = borrow_global<Table>(table_addr);
        let occupied = 0u64;
        let i = 0u64;
        while (i < table.max_seats) {
            if (option::is_some(vector::borrow(&table.seats, i))) {
                occupied = occupied + 1;
            };
            i = i + 1;
        };
        (occupied, table.max_seats)
    }

    #[view]
    /// Get the owner address for a table
    public fun get_owner(table_addr: address): address acquires Table {
        let table = borrow_global<Table>(table_addr);
        table.owner
    }

    #[view]
    /// Get abort request status for frontend display
    /// Returns: (timestamp, approvals_count, vetos_count, deadline, seated_count)
    /// timestamp = 0 means no active request
    public fun get_abort_request_status(table_addr: address): (u64, u64, u64, u64, u64) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global<Table>(table_addr);
        
        let seated_count = count_active_players(&table.seats);
        let approvals = vector::length(&table.abort_approvals);
        let vetos = vector::length(&table.abort_vetos);
        let deadline = if (table.abort_request_timestamp > 0) {
            table.abort_request_timestamp + ABORT_VOTE_DELAY_SECS
        } else {
            0
        };
        
        (table.abort_request_timestamp, approvals, vetos, deadline, seated_count)
    }

    #[view]
    /// Get summary info for table discovery (for displaying table cards)
    /// Returns: (admin, small_blind, big_blind, min_buy_in, max_buy_in, 
    ///           is_paused, owner_only_start, occupied_seats, total_seats, has_game,
    ///           ante, straddle_enabled, table_speed, name, color_index)
    public fun get_table_summary(table_addr: address): (
        address,  // admin
        u64,      // small_blind
        u64,      // big_blind  
        u64,      // min_buy_in
        u64,      // max_buy_in
        bool,     // is_paused
        bool,     // owner_only_start
        u64,      // occupied_seats
        u64,      // total_seats (table.max_seats)
        bool,     // has_game (hand in progress)
        u64,      // ante
        bool,     // straddle_enabled
        u8,       // table_speed
        String,   // name
        u8,       // color_index
    ) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global<Table>(table_addr);
        
        // Count occupied seats
        let occupied = 0u64;
        let i = 0u64;
        while (i < table.max_seats) {
            if (option::is_some(vector::borrow(&table.seats, i))) {
                occupied = occupied + 1;
            };
            i = i + 1;
        };
        
        (
            table.owner,
            table.config.small_blind,
            table.config.big_blind,
            table.config.min_buy_in,
            table.config.max_buy_in,
            table.is_paused,
            table.owner_only_start,
            occupied,
            table.max_seats,
            option::is_some(&table.game),
            table.config.ante,
            table.config.straddle_enabled,
            table.config.table_speed,
            table.name,
            table.color_index,
        )
    }
}
