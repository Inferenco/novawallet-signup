/// Poker Chips - Internal Ledger
///
/// A non-transferable internal token for the Texas Hold'em game.
/// Players claim free chips on a fixed period and can purchase temporary multipliers
/// that increase their free claim amount. Chips are stored in a module-owned
/// Table and cannot be transferred externally.
module NovaWalletGames::chips {
    use std::string::{Self, String};
    use std::signer;
    use std::vector;
    use cedra_framework::timestamp;
    use cedra_framework::event;
    use cedra_framework::object::{Self, ExtendRef};
    use cedra_std::table::{Self, Table};
    use NovaWalletGames::game_registry::{Self, GameCapability};
    use NovaWalletGames::games_treasury;
    use wallet::gaming_consent;

    // Friend modules that can access internal chip functions
    friend NovaWalletGames::poker_texas_holdem;

    // ============================================
    // ERROR CODES
    // ============================================
    
    /// Module already initialized
    const E_ALREADY_INITIALIZED: u64 = 1;
    /// Module not initialized
    const E_NOT_INITIALIZED: u64 = 2;
    /// Caller is not the admin
    const E_NOT_ADMIN: u64 = 3;
    /// Amount must be greater than zero
    const E_ZERO_AMOUNT: u64 = 6;
    /// Treasury balance is insufficient
    const E_TREASURY_INSUFFICIENT: u64 = 7;
    /// Free chips already claimed in current claim period
    const E_ALREADY_CLAIMED_THIS_PERIOD: u64 = 9;
    /// Free chip claims are disabled
    const E_FREE_CLAIM_DISABLED: u64 = 11;
    /// Insufficient chip balance
    const E_INSUFFICIENT_BALANCE: u64 = 12;
    /// Unauthorized game (invalid or inactive capability)
    const E_UNAUTHORIZED_GAME: u64 = 13;
    /// Multiplier factor is not offered or invalid
    const E_INVALID_MULTIPLIER: u64 = 16;
    /// Cannot downgrade or misconfigured price
    const E_CANNOT_DOWNGRADE: u64 = 17;
    /// User must acknowledge current casino terms before using chip rewards
    const E_TERMS_NOT_ACKNOWLEDGED: u64 = 18;

    // ============================================
    // CONSTANTS
    // ============================================
    
    /// Default free claim period (3 hours)
    const DEFAULT_FREE_CLAIM_PERIOD_SECONDS: u64 = 10800;
    /// Seconds per week
    const WEEK_SECONDS: u64 = 604800;
    /// Initial chip treasury balance minted at deployment
    const INITIAL_CHIP_TREASURY_BALANCE: u64 = 10_000_000_000;

    // ============================================
    // EVENTS
    // ============================================

    #[event]
    struct FreeChipsClaimed has drop, store {
        player: address,
        amount: u64,
        timestamp: u64,
    }

    #[event]
    struct MultiplierPurchased has drop, store {
        player: address,
        factor: u8,
        old_factor: u8,
        cedra_spent: u64,
        expires_at: u64,
        timestamp: u64,
    }

    #[event]
    struct TreasuryCollected has drop, store {
        game_id: u64,
        from: address,
        amount: u64,
        timestamp: u64,
    }

    #[event]
    struct TreasuryPaidOut has drop, store {
        game_id: u64,
        to: address,
        amount: u64,
        timestamp: u64,
    }


    // ============================================
    // DATA STRUCTURES
    // ============================================

    /// The chip manager resource stored at module address
    struct ChipManager has key {
        /// Internal ledger mapping player address -> chip balance
        balances: Table<address, u64>,
        /// Total chips in circulation
        total_supply: u128,
        /// Chip Name (e.g. "Poker Chips")
        name: String,
        /// Chip Symbol (e.g. "CHIP")
        symbol: String,
        /// Chip Icon URI
        icon_uri: String,
        /// Object extension reference for managing the treasury signer
        extend_ref: ExtendRef,

        /// Free chip amount per claim period
        daily_free_amount: u64,
        /// Minimum time between free claims
        free_claim_period_seconds: u64,
        /// Multiplier price map: factor -> price in octas
        multiplier_prices: Table<u8, u64>,
        /// Active multiplier options for purchase (factor list)
        multiplier_options: vector<u8>,
        /// Multiplier duration in seconds (applies to new purchases)
        multiplier_duration: u64,
        /// Global hard cap on table buy-ins (e.g. 100,000 chips)
        global_max_table_buy_in: u64,
    }

    /// Per-player chip accounting for periodic claims and multipliers
    struct ChipAccount has key {
        /// Unix timestamp of last free-claim
        last_claim_time: u64,
        /// Active multiplier factor (1 = none)
        multiplier_factor: u8,
        /// Start timestamp of current multiplier
        multiplier_started_at: u64,
        /// Expiration timestamp of current multiplier
        multiplier_expires_at: u64,
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /// Initialize the chip system
    fun init_module(deployer: &signer) {
        let deployer_addr = signer::address_of(deployer);
        
        assert!(!exists<ChipManager>(@NovaWalletGames), E_ALREADY_INITIALIZED);
        
        // Create an object to hold the treasury funds (using object address)
        let constructor_ref = object::create_object(deployer_addr);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        
        // Store the ChipManager
        let manager = ChipManager {
            balances: table::new(),
            total_supply: 0,
            name: string::utf8(b"Poker Chips"),
            symbol: string::utf8(b"CHIP"),
            icon_uri: string::utf8(b"https://example.com/chip_icon.png"),
            extend_ref,
            daily_free_amount: 100,
            free_claim_period_seconds: DEFAULT_FREE_CLAIM_PERIOD_SECONDS,
            multiplier_prices: table::new(),
            multiplier_options: vector[2, 3, 4, 5],
            multiplier_duration: WEEK_SECONDS,
            global_max_table_buy_in: 100000,
        };
        
        // Add default multiplier prices (in octas: 1 CEDRA = 100_000_000 octas)
        table::add(&mut manager.multiplier_prices, 2, 100_000_000);  // 2x = 1 CEDRA
        table::add(&mut manager.multiplier_prices, 3, 200_000_000);  // 3x = 2 CEDRA
        table::add(&mut manager.multiplier_prices, 4, 300_000_000);  // 4x = 3 CEDRA
        table::add(&mut manager.multiplier_prices, 5, 500_000_000);  // 5x = 5 CEDRA

        // Auto-fund the chip treasury with internal-only chips.
        let treasury_addr = object::address_from_extend_ref(&manager.extend_ref);
        mint_internal(&mut manager, treasury_addr, INITIAL_CHIP_TREASURY_BALANCE);
        
        move_to(deployer, manager);

        // Keep admin and CEDRA treasury governance isolated from chip state.
        games_treasury::init(deployer);
    }

    // ============================================
    // INTERNAL HELPERS
    // ============================================

    fun ensure_chip_account(player: &signer) {
        let player_addr = signer::address_of(player);
        if (!exists<ChipAccount>(player_addr)) {
            move_to(player, ChipAccount {
                last_claim_time: 0,
                multiplier_factor: 1,
                multiplier_started_at: 0,
                multiplier_expires_at: 0,
            });
        };
    }

    /// Check if address is ANY admin (Primary, Secondary, or Tertiary)
    public fun is_admin(_manager: &ChipManager, addr: address): bool {
        games_treasury::is_admin_address(addr)
    }

    fun chip_treasury_address(manager: &ChipManager): address {
        object::address_from_extend_ref(&manager.extend_ref)
    }

    fun assert_terms_acknowledged(player_addr: address) {
        assert!(
            gaming_consent::has_acknowledged_current(player_addr),
            E_TERMS_NOT_ACKNOWLEDGED
        );
    }

    /// Internal helper to mint chips to a user
    fun mint_internal(manager: &mut ChipManager, to: address, amount: u64) {
        if (!table::contains(&manager.balances, to)) {
            table::add(&mut manager.balances, to, amount);
        } else {
            let bal = table::borrow_mut(&mut manager.balances, to);
            *bal = *bal + amount;
        };
        manager.total_supply = manager.total_supply + (amount as u128);
    }

    /// Internal helper to burn chips from a user
    fun burn_internal(manager: &mut ChipManager, from: address, amount: u64) {
        if (!table::contains(&manager.balances, from)) {
             assert!(false, E_INSUFFICIENT_BALANCE);
        };
        let bal = table::borrow_mut(&mut manager.balances, from);
        assert!(*bal >= amount, E_INSUFFICIENT_BALANCE);
        *bal = *bal - amount;
        manager.total_supply = manager.total_supply - (amount as u128);
    }

    // ============================================
    // PUBLIC FUNCTIONS
    // ============================================

    /// Purchase a multiplier to boost free claims
    public entry fun purchase_multiplier(player: &signer, factor: u8) acquires ChipManager, ChipAccount {
        assert!(exists<ChipManager>(@NovaWalletGames), E_NOT_INITIALIZED);
        assert!(factor > 1, E_INVALID_MULTIPLIER);

        let now = timestamp::now_seconds();
        let player_addr = signer::address_of(player);
        assert_terms_acknowledged(player_addr);
        ensure_chip_account(player);

        let manager = borrow_global_mut<ChipManager>(@NovaWalletGames);
        let (found, _) = vector::index_of(&manager.multiplier_options, &factor);
        assert!(found, E_INVALID_MULTIPLIER);
        assert!(table::contains(&manager.multiplier_prices, factor), E_INVALID_MULTIPLIER);

        let cost_new = *table::borrow(&manager.multiplier_prices, factor);
        assert!(cost_new > 0, E_ZERO_AMOUNT);

        let account = borrow_global_mut<ChipAccount>(player_addr);
        let current_factor = account.multiplier_factor;
        let expires_at = account.multiplier_expires_at;
        let started_at = account.multiplier_started_at;

        let effective_active = (current_factor > 1 && now < expires_at);
        if (!effective_active && current_factor > 1) {
            // Clean up expired multiplier state
            account.multiplier_factor = 1;
            account.multiplier_started_at = 0;
            account.multiplier_expires_at = 0;
        };

        let (cedra_spent, old_factor) = if (!effective_active) {
            let duration = manager.multiplier_duration;
            assert!(duration > 0, E_ZERO_AMOUNT);

            account.multiplier_factor = factor;
            account.multiplier_started_at = now;
            account.multiplier_expires_at = now + duration;
            (cost_new, 1)
        } else {
            assert!(factor > current_factor, E_CANNOT_DOWNGRADE);
            assert!(table::contains(&manager.multiplier_prices, current_factor), E_INVALID_MULTIPLIER);

            let cost_old = *table::borrow(&manager.multiplier_prices, current_factor);
            assert!(cost_new > cost_old, E_CANNOT_DOWNGRADE);

            let total_duration = expires_at - started_at;
            if (total_duration == 0) {
                // Treat as expired and charge full price
                let duration = manager.multiplier_duration;
                assert!(duration > 0, E_ZERO_AMOUNT);

                account.multiplier_factor = factor;
                account.multiplier_started_at = now;
                account.multiplier_expires_at = now + duration;
                (cost_new, 1)
            } else {
                let time_left = expires_at - now;
                account.multiplier_factor = factor;
                ((cost_new - cost_old) * time_left / total_duration, current_factor)
            }
        };

        if (cedra_spent > 0) {
            games_treasury::collect_multiplier_payment(player, cedra_spent);
        };

        event::emit(MultiplierPurchased {
            player: player_addr,
            factor,
            old_factor,
            cedra_spent,
            expires_at: account.multiplier_expires_at,
            timestamp: now,
        });
    }

    /// Claim free chips (period-limited)
    public entry fun claim_free_chips(player: &signer) acquires ChipManager, ChipAccount {
        assert!(exists<ChipManager>(@NovaWalletGames), E_NOT_INITIALIZED);
        let now = timestamp::now_seconds();
        let player_addr = signer::address_of(player);
        assert_terms_acknowledged(player_addr);
        ensure_chip_account(player);

        let manager = borrow_global_mut<ChipManager>(@NovaWalletGames);
        let free_amount = manager.daily_free_amount;
        assert!(free_amount > 0, E_FREE_CLAIM_DISABLED);
        let claim_period = manager.free_claim_period_seconds;
        assert!(claim_period > 0, E_ZERO_AMOUNT);

        let account = borrow_global_mut<ChipAccount>(player_addr);
        if (account.last_claim_time != 0) {
            assert!(now >= account.last_claim_time + claim_period, E_ALREADY_CLAIMED_THIS_PERIOD);
        };

        let factor: u64 = 1;
        if (account.multiplier_factor > 1 && now < account.multiplier_expires_at) {
            factor = account.multiplier_factor as u64;
        } else if (account.multiplier_factor > 1) {
            // Clean up expired multiplier state
            account.multiplier_factor = 1;
            account.multiplier_started_at = 0;
            account.multiplier_expires_at = 0;
        };

        account.last_claim_time = now;

        let final_amount = free_amount * factor;
        mint_internal(manager, player_addr, final_amount);

        event::emit(FreeChipsClaimed {
            player: player_addr,
            amount: final_amount,
            timestamp: now,
        });
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /// Add or update a multiplier price (Anyone with Admin Access)
    public entry fun set_multiplier_price(admin: &signer, factor: u8, price: u64) acquires ChipManager {
        assert!(exists<ChipManager>(@NovaWalletGames), E_NOT_INITIALIZED);
        assert!(factor > 1, E_INVALID_MULTIPLIER);
        assert!(price > 0, E_ZERO_AMOUNT);
        let manager = borrow_global_mut<ChipManager>(@NovaWalletGames);
        assert!(is_admin(manager, signer::address_of(admin)), E_NOT_ADMIN);

        if (table::contains(&manager.multiplier_prices, factor)) {
            let current = table::borrow_mut(&mut manager.multiplier_prices, factor);
            *current = price;
        } else {
            table::add(&mut manager.multiplier_prices, factor, price);
        };

        let (found, _) = vector::index_of(&manager.multiplier_options, &factor);
        if (!found) {
            vector::push_back(&mut manager.multiplier_options, factor);
        };
    }

    /// Update free chip amount per claim period (Anyone with Admin Access)
    public entry fun update_daily_free_chip_amount(admin: &signer, new_amount: u64) acquires ChipManager {
        assert!(exists<ChipManager>(@NovaWalletGames), E_NOT_INITIALIZED);
        let manager = borrow_global_mut<ChipManager>(@NovaWalletGames);
        assert!(is_admin(manager, signer::address_of(admin)), E_NOT_ADMIN);
        manager.daily_free_amount = new_amount;
    }

    /// Update free claim period in seconds (Anyone with Admin Access)
    public entry fun set_free_claim_period_seconds(admin: &signer, period_seconds: u64) acquires ChipManager {
        assert!(exists<ChipManager>(@NovaWalletGames), E_NOT_INITIALIZED);
        assert!(period_seconds > 0, E_ZERO_AMOUNT);
        let manager = borrow_global_mut<ChipManager>(@NovaWalletGames);
        assert!(is_admin(manager, signer::address_of(admin)), E_NOT_ADMIN);
        manager.free_claim_period_seconds = period_seconds;
    }

    /// Remove a multiplier option from active offerings (Anyone with Admin Access)
    public entry fun remove_multiplier_option(admin: &signer, factor: u8) acquires ChipManager {
        assert!(exists<ChipManager>(@NovaWalletGames), E_NOT_INITIALIZED);
        assert!(factor > 1, E_INVALID_MULTIPLIER);
        let manager = borrow_global_mut<ChipManager>(@NovaWalletGames);
        assert!(is_admin(manager, signer::address_of(admin)), E_NOT_ADMIN);

        let (found, index) = vector::index_of(&manager.multiplier_options, &factor);
        assert!(found, E_INVALID_MULTIPLIER);
        vector::remove(&mut manager.multiplier_options, index);
    }

    /// Update multiplier duration (Anyone with Admin Access)
    public entry fun set_multiplier_duration(admin: &signer, duration: u64) acquires ChipManager {
        assert!(exists<ChipManager>(@NovaWalletGames), E_NOT_INITIALIZED);
        assert!(duration > 0, E_ZERO_AMOUNT);
        let manager = borrow_global_mut<ChipManager>(@NovaWalletGames);
        assert!(is_admin(manager, signer::address_of(admin)), E_NOT_ADMIN);
        manager.multiplier_duration = duration;
    }

    /// Update global max table buy-in cap (Anyone with Admin Access)
    public entry fun update_global_max_table_buy_in(admin: &signer, new_max: u64) acquires ChipManager {
        assert!(exists<ChipManager>(@NovaWalletGames), E_NOT_INITIALIZED);
        let manager = borrow_global_mut<ChipManager>(@NovaWalletGames);
        assert!(is_admin(manager, signer::address_of(admin)), E_NOT_ADMIN);
        manager.global_max_table_buy_in = new_max;
    }

    // ============================================
    // GAME FUNCTIONS (called by texas_holdem module)
    // ============================================

    /// Internal helper for chip transfers (used by both friend and capability-based functions)
    fun transfer_chips_internal(
        from: address,
        to: address,
        amount: u64
    ) acquires ChipManager {
        if (amount == 0) return;
        
        assert!(exists<ChipManager>(@NovaWalletGames), E_NOT_INITIALIZED);
        let manager = borrow_global_mut<ChipManager>(@NovaWalletGames);
        
        // Debit 'from'
        if (!table::contains(&manager.balances, from)) {
             assert!(false, E_INSUFFICIENT_BALANCE);
        };
        let from_bal = table::borrow_mut(&mut manager.balances, from);
        assert!(*from_bal >= amount, E_INSUFFICIENT_BALANCE);
        *from_bal = *from_bal - amount;

        // Credit 'to'
        if (!table::contains(&manager.balances, to)) {
            table::add(&mut manager.balances, to, amount);
        } else {
            let to_bal = table::borrow_mut(&mut manager.balances, to);
            *to_bal = *to_bal + amount;
        };
    }

    /// Transfer chips between addresses (friend module access only)
    /// 
    /// Used by the texas_holdem game contract for buy-ins, payouts, and leaving.
    /// Since we use an internal ledger, this just updates the table.
    /// 
    /// Note: This function is kept for backward compatibility with texas_holdem.
    /// New games should use transfer_chips_with_cap instead.
    public(friend) fun transfer_chips(
        from: address,
        to: address,
        amount: u64
    ) acquires ChipManager {
        transfer_chips_internal(from, to, amount);
    }

    /// Transfer chips between addresses using a game capability
    /// 
    /// This is the preferred method for new games. The game must have a valid,
    /// active GameCapability obtained from the game_registry.
    /// 
    /// Used for buy-ins, payouts, and leaving.
    /// Since we use an internal ledger, this just updates the table.
    public fun transfer_chips_with_cap(
        cap: &GameCapability,
        from: address,
        to: address,
        amount: u64
    ) acquires ChipManager {
        // Verify the capability is valid and the game is active
        assert!(game_registry::verify_capability(cap), E_UNAUTHORIZED_GAME);
        
        transfer_chips_internal(from, to, amount);
    }

    /// Collect chips from a player into the central chip treasury.
    /// Only valid, active, treasury-enabled games can call this.
    public fun collect_to_treasury_with_cap(
        cap: &GameCapability,
        from: address,
        amount: u64
    ) acquires ChipManager {
        if (amount == 0) return;

        assert!(exists<ChipManager>(@NovaWalletGames), E_NOT_INITIALIZED);
        assert!(game_registry::verify_capability(cap), E_UNAUTHORIZED_GAME);

        let game_id = game_registry::get_game_id(cap);
        game_registry::assert_game_requires_treasury(game_id);

        let treasury_addr = {
            let manager = borrow_global<ChipManager>(@NovaWalletGames);
            chip_treasury_address(manager)
        };

        transfer_chips_internal(from, treasury_addr, amount);

        event::emit(TreasuryCollected {
            game_id,
            from,
            amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Deposit house takings into the central chip treasury.
    /// Only valid, active, treasury-enabled games can call this.
    public fun deposit_house_takings_with_cap(
        cap: &GameCapability,
        from: address,
        amount: u64
    ) acquires ChipManager {
        if (amount == 0) return;

        assert!(exists<ChipManager>(@NovaWalletGames), E_NOT_INITIALIZED);
        assert!(game_registry::verify_capability(cap), E_UNAUTHORIZED_GAME);

        let game_id = game_registry::get_game_id(cap);
        game_registry::assert_game_requires_treasury(game_id);
        let treasury_addr = {
            let manager = borrow_global<ChipManager>(@NovaWalletGames);
            chip_treasury_address(manager)
        };

        transfer_chips_internal(from, treasury_addr, amount);

        event::emit(TreasuryCollected {
            game_id,
            from,
            amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Pay chips from the central chip treasury to a player.
    /// Only valid, active, treasury-enabled games can call this.
    public fun payout_from_treasury_with_cap(
        cap: &GameCapability,
        to: address,
        amount: u64
    ) acquires ChipManager {
        if (amount == 0) return;

        assert!(exists<ChipManager>(@NovaWalletGames), E_NOT_INITIALIZED);
        assert!(game_registry::verify_capability(cap), E_UNAUTHORIZED_GAME);

        let game_id = game_registry::get_game_id(cap);
        game_registry::assert_game_requires_treasury(game_id);

        let treasury_addr = {
            let manager = borrow_global<ChipManager>(@NovaWalletGames);
            chip_treasury_address(manager)
        };
        let treasury_balance = balance(treasury_addr);
        assert!(treasury_balance >= amount, E_TREASURY_INSUFFICIENT);

        transfer_chips_internal(treasury_addr, to, amount);

        event::emit(TreasuryPaidOut {
            game_id,
            to,
            amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    #[view]
    /// Get a player's chip balance
    public fun balance(player: address): u64 acquires ChipManager {
        if (!exists<ChipManager>(@NovaWalletGames)) { return 0 };
        let manager = borrow_global<ChipManager>(@NovaWalletGames);
        if (table::contains(&manager.balances, player)) {
            *table::borrow(&manager.balances, player)
        } else {
            0
        }
    }

    #[view]
    /// Get chip treasury balance (internal chips held by house bankroll)
    public fun get_chip_treasury_balance(): u64 acquires ChipManager {
        if (!exists<ChipManager>(@NovaWalletGames)) { return 0 };
        let manager = borrow_global<ChipManager>(@NovaWalletGames);
        let treasury_addr = chip_treasury_address(manager);
        if (table::contains(&manager.balances, treasury_addr)) {
            *table::borrow(&manager.balances, treasury_addr)
        } else {
            0
        }
    }

    #[view]
    /// Get current chip name (custom metadata)
    public fun get_name(): String acquires ChipManager {
        if (!exists<ChipManager>(@NovaWalletGames)) { return string::utf8(b"") };
        borrow_global<ChipManager>(@NovaWalletGames).name
    }

    #[view]
    /// Get current chip symbol (custom metadata)
    public fun get_symbol(): String acquires ChipManager {
        if (!exists<ChipManager>(@NovaWalletGames)) { return string::utf8(b"") };
        borrow_global<ChipManager>(@NovaWalletGames).symbol
    }

    #[view]
    /// Get current chip icon URI (custom metadata)
    public fun get_icon_uri(): String acquires ChipManager {
        if (!exists<ChipManager>(@NovaWalletGames)) { return string::utf8(b"") };
        borrow_global<ChipManager>(@NovaWalletGames).icon_uri
    }

    #[view]
    /// Get free chip amount per claim period
    public fun get_daily_free_amount(): u64 acquires ChipManager {
        if (!exists<ChipManager>(@NovaWalletGames)) { return 0 };
        borrow_global<ChipManager>(@NovaWalletGames).daily_free_amount
    }

    #[view]
    /// Get free claim period in seconds
    public fun get_free_claim_period_seconds(): u64 acquires ChipManager {
        if (!exists<ChipManager>(@NovaWalletGames)) { return 0 };
        borrow_global<ChipManager>(@NovaWalletGames).free_claim_period_seconds
    }

    #[view]
    /// Get active multiplier options
    public fun get_multiplier_options(): vector<u8> acquires ChipManager {
        if (!exists<ChipManager>(@NovaWalletGames)) { return vector::empty() };
        let manager = borrow_global<ChipManager>(@NovaWalletGames);
        let res = vector::empty<u8>();
        let i = 0;
        let len = vector::length(&manager.multiplier_options);
        while (i < len) {
            let factor = *vector::borrow(&manager.multiplier_options, i);
            vector::push_back(&mut res, factor);
            i = i + 1;
        };
        res
    }

    #[view]
    /// Get multiplier price for an active option
    public fun get_multiplier_price(factor: u8): u64 acquires ChipManager {
        if (!exists<ChipManager>(@NovaWalletGames)) { return 0 };
        let manager = borrow_global<ChipManager>(@NovaWalletGames);
        let (found, _) = vector::index_of(&manager.multiplier_options, &factor);
        assert!(found, E_INVALID_MULTIPLIER);
        assert!(table::contains(&manager.multiplier_prices, factor), E_INVALID_MULTIPLIER);
        *table::borrow(&manager.multiplier_prices, factor)
    }

    #[view]
    /// Get multiplier duration in seconds
    public fun get_multiplier_duration(): u64 acquires ChipManager {
        if (!exists<ChipManager>(@NovaWalletGames)) { return 0 };
        borrow_global<ChipManager>(@NovaWalletGames).multiplier_duration
    }

    #[view]
    /// Get global max table buy-in cap
    public fun get_global_max_table_buy_in(): u64 acquires ChipManager {
        if (!exists<ChipManager>(@NovaWalletGames)) { return 100000 };
        borrow_global<ChipManager>(@NovaWalletGames).global_max_table_buy_in
    }

    #[view]
    /// Get the last claim timestamp for a player
    public fun get_last_claim_time(player: address): u64 acquires ChipAccount {
        if (!exists<ChipAccount>(player)) { return 0 };
        borrow_global<ChipAccount>(player).last_claim_time
    }

    #[view]
    /// Get multiplier status for a player
    /// Returns (factor, started_at, expires_at)
    public fun get_multiplier_status(player: address): (u8, u64, u64) acquires ChipAccount {
        if (!exists<ChipAccount>(player)) { return (1, 0, 0) };
        let account = borrow_global<ChipAccount>(player);
        let now = timestamp::now_seconds();
        if (account.multiplier_factor > 1 && now < account.multiplier_expires_at) {
            (account.multiplier_factor, account.multiplier_started_at, account.multiplier_expires_at)
        } else {
            (1, 0, 0)
        }
    }

    #[view]
    /// Get total chips currently in circulation
    public fun get_total_chip_supply(): u128 acquires ChipManager {
        if (!exists<ChipManager>(@NovaWalletGames)) { return 0 };
        let manager = borrow_global<ChipManager>(@NovaWalletGames);
        manager.total_supply
    }

    // ============================================
    // TEST HELPERS
    // ============================================

    #[test_only]
    public fun init_for_test(deployer: &signer) {
        init_module(deployer);
    }

    #[test_only]
    public fun mint_test_chips(to: address, amount: u64) acquires ChipManager {
        let manager = borrow_global_mut<ChipManager>(@NovaWalletGames);
        mint_internal(manager, to, amount);
    }
}
