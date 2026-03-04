/// Game Registry - Capability-based authorization for game modules
/// 
/// Provides a registry for authorized games and issues capabilities that
/// allow new game modules to interact with the chip system without requiring
/// friend module declarations for each new game.
module NovaWalletGames::game_registry {
    use std::string::{Self, String};
    use std::signer;
    use std::vector;
    use cedra_framework::timestamp;

    // ============================================
    // ERROR CODES
    // ============================================
    
    /// Registry already initialized
    const E_ALREADY_INITIALIZED: u64 = 1;
    /// Registry not initialized
    const E_NOT_INITIALIZED: u64 = 2;
    /// Caller is not the admin
    const E_NOT_ADMIN: u64 = 3;
    /// Game name cannot be empty
    const E_EMPTY_GAME_NAME: u64 = 4;
    /// Game name too long (max 64 characters)
    const E_GAME_NAME_TOO_LONG: u64 = 5;
    /// Game with this ID does not exist
    const E_GAME_NOT_FOUND: u64 = 6;
    /// Game is not active
    const E_GAME_NOT_ACTIVE: u64 = 7;
    /// Invalid capability (game_id mismatch or deactivated)
    const E_INVALID_CAPABILITY: u64 = 8;
    /// Game name already exists
    const E_GAME_NAME_EXISTS: u64 = 9;
    /// Game is not marked as treasury-enabled
    const E_GAME_NOT_TREASURY_ENABLED: u64 = 10;

    // ============================================
    // CONSTANTS
    // ============================================
    
    /// Maximum game name length
    const MAX_GAME_NAME_LENGTH: u64 = 64;

    // ============================================
    // DATA STRUCTURES
    // ============================================

    /// Capability issued to authorized games
    /// Games store this and present it when calling chip operations
    struct GameCapability has store, drop, copy {
        /// Unique identifier for this game
        game_id: u64,
        /// Human-readable game name
        game_name: String,
    }

    /// Information about a registered game
    struct GameInfo has store, drop, copy {
        /// Unique identifier for this game
        game_id: u64,
        /// Human-readable game name
        name: String,
        /// Whether this game is currently active
        is_active: bool,
        /// Timestamp when the game was registered
        registered_at: u64,
        /// Whether this game can access chip treasury payout/collection flows
        requires_treasury: bool,
    }

    /// The registry resource stored at module address
    struct GameRegistry has key {
        /// List of all registered games
        games: vector<GameInfo>,
        /// Counter for generating unique game IDs
        next_game_id: u64,
        /// Admin who can register/deactivate games
        admin: address,
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /// Initialize the game registry
    fun init_module(deployer: &signer) {
        let deployer_addr = signer::address_of(deployer);
        
        assert!(!exists<GameRegistry>(@NovaWalletGames), E_ALREADY_INITIALIZED);
        
        move_to(deployer, GameRegistry {
            games: vector::empty(),
            next_game_id: 1, // Start at 1, reserve 0 for "no game"
            admin: deployer_addr,
        });
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /// Register a new game and return its capability
    /// Only the admin can register new games
    public fun register_game(
        admin: &signer,
        name: String,
        requires_treasury: bool
    ): GameCapability acquires GameRegistry {
        assert!(exists<GameRegistry>(@NovaWalletGames), E_NOT_INITIALIZED);
        
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<GameRegistry>(@NovaWalletGames);
        
        // Verify admin
        assert!(registry.admin == admin_addr, E_NOT_ADMIN);
        
        // Validate name
        let name_len = string::length(&name);
        assert!(name_len > 0, E_EMPTY_GAME_NAME);
        assert!(name_len <= MAX_GAME_NAME_LENGTH, E_GAME_NAME_TOO_LONG);
        
        // Check for duplicate names
        let i = 0;
        let len = vector::length(&registry.games);
        while (i < len) {
            let game = vector::borrow(&registry.games, i);
            assert!(game.name != name, E_GAME_NAME_EXISTS);
            i = i + 1;
        };
        
        // Assign game ID and increment counter
        let game_id = registry.next_game_id;
        registry.next_game_id = game_id + 1;
        
        let now = timestamp::now_seconds();
        
        // Create game info and add to registry
        let game_info = GameInfo {
            game_id,
            name,
            is_active: true,
            registered_at: now,
            requires_treasury,
        };
        vector::push_back(&mut registry.games, game_info);
        
        // Return capability
        GameCapability {
            game_id,
            game_name: name,
        }
    }

    /// Deactivate a game (prevents chip transfers using its capability)
    public entry fun deactivate_game(
        admin: &signer,
        game_id: u64
    ) acquires GameRegistry {
        assert!(exists<GameRegistry>(@NovaWalletGames), E_NOT_INITIALIZED);
        
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<GameRegistry>(@NovaWalletGames);
        
        // Verify admin
        assert!(registry.admin == admin_addr, E_NOT_ADMIN);
        
        // Find and deactivate game
        let i = 0;
        let len = vector::length(&registry.games);
        let found = false;
        
        while (i < len) {
            let game = vector::borrow_mut(&mut registry.games, i);
            if (game.game_id == game_id) {
                game.is_active = false;
                found = true;
                break
            };
            i = i + 1;
        };
        
        assert!(found, E_GAME_NOT_FOUND);
    }

    /// Soft-unregister a game from active use.
    /// This is an alias of `deactivate_game` and preserves historical metadata.
    public entry fun unregister_game(
        admin: &signer,
        game_id: u64
    ) acquires GameRegistry {
        deactivate_game(admin, game_id);
    }

    /// Reactivate a previously deactivated game
    public entry fun reactivate_game(
        admin: &signer,
        game_id: u64
    ) acquires GameRegistry {
        assert!(exists<GameRegistry>(@NovaWalletGames), E_NOT_INITIALIZED);
        
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<GameRegistry>(@NovaWalletGames);
        
        // Verify admin
        assert!(registry.admin == admin_addr, E_NOT_ADMIN);
        
        // Find and reactivate game
        let i = 0;
        let len = vector::length(&registry.games);
        let found = false;
        
        while (i < len) {
            let game = vector::borrow_mut(&mut registry.games, i);
            if (game.game_id == game_id) {
                game.is_active = true;
                found = true;
                break
            };
            i = i + 1;
        };
        
        assert!(found, E_GAME_NOT_FOUND);
    }

    /// Transfer admin rights to a new address
    public entry fun set_admin(
        admin: &signer,
        new_admin: address
    ) acquires GameRegistry {
        assert!(exists<GameRegistry>(@NovaWalletGames), E_NOT_INITIALIZED);
        
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<GameRegistry>(@NovaWalletGames);
        
        // Verify current admin
        assert!(registry.admin == admin_addr, E_NOT_ADMIN);
        
        registry.admin = new_admin;
    }

    // ============================================
    // CAPABILITY VERIFICATION
    // ============================================

    /// Verify that a capability is valid (game exists and is active)
    public fun verify_capability(cap: &GameCapability): bool acquires GameRegistry {
        if (!exists<GameRegistry>(@NovaWalletGames)) {
            return false
        };
        
        let registry = borrow_global<GameRegistry>(@NovaWalletGames);
        
        let i = 0;
        let len = vector::length(&registry.games);
        while (i < len) {
            let game = vector::borrow(&registry.games, i);
            if (game.game_id == cap.game_id) {
                // Check both ID match and active status
                return game.is_active && game.name == cap.game_name
            };
            i = i + 1;
        };
        
        false
    }

    /// Assert that a capability is valid (reverts if not)
    public fun assert_valid_capability(cap: &GameCapability) acquires GameRegistry {
        assert!(verify_capability(cap), E_INVALID_CAPABILITY);
    }

    /// Assert that a game ID is configured for chip treasury access
    public fun assert_game_requires_treasury(game_id: u64) acquires GameRegistry {
        assert!(game_requires_treasury(game_id), E_GAME_NOT_TREASURY_ENABLED);
    }

    // ============================================
    // CAPABILITY ACCESSORS
    // ============================================

    /// Get the game ID from a capability
    public fun get_game_id(cap: &GameCapability): u64 {
        cap.game_id
    }

    /// Get the game name from a capability
    public fun get_game_name(cap: &GameCapability): String {
        cap.game_name
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    #[view]
    /// Check if the registry is initialized
    public fun is_initialized(): bool {
        exists<GameRegistry>(@NovaWalletGames)
    }

    #[view]
    /// Get the current admin address
    public fun get_admin(): address acquires GameRegistry {
        if (!exists<GameRegistry>(@NovaWalletGames)) {
            return @0x0
        };
        borrow_global<GameRegistry>(@NovaWalletGames).admin
    }

    #[view]
    /// Get the total number of registered games
    public fun get_game_count(): u64 acquires GameRegistry {
        if (!exists<GameRegistry>(@NovaWalletGames)) {
            return 0
        };
        vector::length(&borrow_global<GameRegistry>(@NovaWalletGames).games)
    }

    #[view]
    /// Get game info by ID
    /// Returns (name, is_active, registered_at) or empty values if not found
    public fun get_game_info(game_id: u64): (String, bool, u64) acquires GameRegistry {
        if (!exists<GameRegistry>(@NovaWalletGames)) {
            return (string::utf8(b""), false, 0)
        };
        
        let registry = borrow_global<GameRegistry>(@NovaWalletGames);
        
        let i = 0;
        let len = vector::length(&registry.games);
        while (i < len) {
            let game = vector::borrow(&registry.games, i);
            if (game.game_id == game_id) {
                return (game.name, game.is_active, game.registered_at)
            };
            i = i + 1;
        };
        
        (string::utf8(b""), false, 0)
    }

    #[view]
    /// Get game info by ID including treasury requirement.
    /// Returns (name, is_active, registered_at, requires_treasury) or empty values if not found.
    public fun get_game_info_extended(game_id: u64): (String, bool, u64, bool) acquires GameRegistry {
        if (!exists<GameRegistry>(@NovaWalletGames)) {
            return (string::utf8(b""), false, 0, false)
        };

        let registry = borrow_global<GameRegistry>(@NovaWalletGames);

        let i = 0;
        let len = vector::length(&registry.games);
        while (i < len) {
            let game = vector::borrow(&registry.games, i);
            if (game.game_id == game_id) {
                return (game.name, game.is_active, game.registered_at, game.requires_treasury)
            };
            i = i + 1;
        };

        (string::utf8(b""), false, 0, false)
    }

    #[view]
    /// Check if a game ID is active
    public fun is_game_active(game_id: u64): bool acquires GameRegistry {
        if (!exists<GameRegistry>(@NovaWalletGames)) {
            return false
        };
        
        let registry = borrow_global<GameRegistry>(@NovaWalletGames);
        
        let i = 0;
        let len = vector::length(&registry.games);
        while (i < len) {
            let game = vector::borrow(&registry.games, i);
            if (game.game_id == game_id) {
                return game.is_active
            };
            i = i + 1;
        };
        
        false
    }

    #[view]
    /// Check if a game has chip treasury access enabled
    public fun game_requires_treasury(game_id: u64): bool acquires GameRegistry {
        if (!exists<GameRegistry>(@NovaWalletGames)) {
            return false
        };

        let registry = borrow_global<GameRegistry>(@NovaWalletGames);

        let i = 0;
        let len = vector::length(&registry.games);
        while (i < len) {
            let game = vector::borrow(&registry.games, i);
            if (game.game_id == game_id) {
                return game.requires_treasury
            };
            i = i + 1;
        };

        false
    }

    #[view]
    /// Get the next game ID that will be assigned
    public fun get_next_game_id(): u64 acquires GameRegistry {
        if (!exists<GameRegistry>(@NovaWalletGames)) {
            return 1
        };
        borrow_global<GameRegistry>(@NovaWalletGames).next_game_id
    }

    #[view]
    /// Get all game IDs (active and inactive)
    public fun get_all_game_ids(): vector<u64> acquires GameRegistry {
        let result = vector::empty<u64>();
        
        if (!exists<GameRegistry>(@NovaWalletGames)) {
            return result
        };
        
        let registry = borrow_global<GameRegistry>(@NovaWalletGames);
        
        let i = 0;
        let len = vector::length(&registry.games);
        while (i < len) {
            let game = vector::borrow(&registry.games, i);
            vector::push_back(&mut result, game.game_id);
            i = i + 1;
        };
        
        result
    }

    #[view]
    /// Get all active game IDs
    public fun get_active_game_ids(): vector<u64> acquires GameRegistry {
        let result = vector::empty<u64>();
        
        if (!exists<GameRegistry>(@NovaWalletGames)) {
            return result
        };
        
        let registry = borrow_global<GameRegistry>(@NovaWalletGames);
        
        let i = 0;
        let len = vector::length(&registry.games);
        while (i < len) {
            let game = vector::borrow(&registry.games, i);
            if (game.is_active) {
                vector::push_back(&mut result, game.game_id);
            };
            i = i + 1;
        };
        
        result
    }

    #[view]
    /// Get active game IDs and names in matching index order.
    public fun get_active_game_entries(): (vector<u64>, vector<String>) acquires GameRegistry {
        let ids = vector::empty<u64>();
        let names = vector::empty<String>();

        if (!exists<GameRegistry>(@NovaWalletGames)) {
            return (ids, names)
        };

        let registry = borrow_global<GameRegistry>(@NovaWalletGames);

        let i = 0;
        let len = vector::length(&registry.games);
        while (i < len) {
            let game = vector::borrow(&registry.games, i);
            if (game.is_active) {
                vector::push_back(&mut ids, game.game_id);
                vector::push_back(&mut names, game.name);
            };
            i = i + 1;
        };

        (ids, names)
    }

    // ============================================
    // TEST HELPERS
    // ============================================

    #[test_only]
    public fun init_for_test(deployer: &signer) {
        init_module(deployer);
    }

    #[test_only]
    /// Create a capability directly for testing purposes
    public fun create_test_capability(game_id: u64, game_name: String): GameCapability {
        GameCapability {
            game_id,
            game_name,
        }
    }
}
