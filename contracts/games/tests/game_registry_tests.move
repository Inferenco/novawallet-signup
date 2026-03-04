#[test_only]
module NovaWalletGames::game_registry_tests {
    use std::string;
    use std::signer;
    use cedra_framework::timestamp;
    use NovaWalletGames::game_registry;
    use NovaWalletGames::chips;

    // Error codes from game_registry
    const E_NOT_ADMIN: u64 = 3;
    const E_GAME_NOT_FOUND: u64 = 6;
    const E_INVALID_CAPABILITY: u64 = 8;
    const E_GAME_NAME_EXISTS: u64 = 9;
    const E_GAME_NOT_TREASURY_ENABLED: u64 = 10;
    
    // Error code from chips
    const E_UNAUTHORIZED_GAME: u64 = 13;
    const E_TREASURY_INSUFFICIENT: u64 = 7;

    const INITIAL_CHIP_TREASURY_BALANCE: u64 = 10_000_000_000;

    // ============================================
    // GAME REGISTRY TESTS
    // ============================================

    #[test(admin = @NovaWalletGames, framework = @0x1)]
    fun test_register_game(admin: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        game_registry::init_for_test(admin);
        
        let cap = game_registry::register_game(admin, string::utf8(b"Test Game"), false);
        
        assert!(game_registry::get_game_id(&cap) == 1, 0);
        assert!(game_registry::get_game_name(&cap) == string::utf8(b"Test Game"), 1);
        assert!(game_registry::is_initialized(), 2);
        assert!(game_registry::get_game_count() == 1, 3);
        assert!(!game_registry::game_requires_treasury(1), 4);
    }

    #[test(admin = @NovaWalletGames, framework = @0x1)]
    fun test_register_treasury_enabled_game(admin: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        game_registry::init_for_test(admin);

        let cap = game_registry::register_game(admin, string::utf8(b"Blackjack"), true);
        assert!(game_registry::get_game_id(&cap) == 1, 0);
        assert!(game_registry::game_requires_treasury(1), 1);
        assert!(!game_registry::game_requires_treasury(999), 2);
    }

    #[test(admin = @NovaWalletGames, framework = @0x1)]
    fun test_register_multiple_games(admin: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        game_registry::init_for_test(admin);
        
        let cap1 = game_registry::register_game(admin, string::utf8(b"Texas Hold'em"), false);
        let cap2 = game_registry::register_game(admin, string::utf8(b"Blackjack"), false);
        let cap3 = game_registry::register_game(admin, string::utf8(b"Roulette"), false);
        
        assert!(game_registry::get_game_id(&cap1) == 1, 0);
        assert!(game_registry::get_game_id(&cap2) == 2, 1);
        assert!(game_registry::get_game_id(&cap3) == 3, 2);
        assert!(game_registry::get_game_count() == 3, 3);
        assert!(game_registry::get_next_game_id() == 4, 4);
    }

    #[test(admin = @NovaWalletGames, non_admin = @0x123, framework = @0x1)]
    #[expected_failure(abort_code = E_NOT_ADMIN, location = NovaWalletGames::game_registry)]
    fun test_register_game_non_admin_fails(admin: &signer, non_admin: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        game_registry::init_for_test(admin);
        
        // Non-admin tries to register - should fail
        let _cap = game_registry::register_game(non_admin, string::utf8(b"Malicious Game"), false);
    }

    #[test(admin = @NovaWalletGames, framework = @0x1)]
    #[expected_failure(abort_code = E_GAME_NAME_EXISTS, location = NovaWalletGames::game_registry)]
    fun test_register_duplicate_name_fails(admin: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        game_registry::init_for_test(admin);
        
        let _cap1 = game_registry::register_game(admin, string::utf8(b"Texas Hold'em"), false);
        let _cap2 = game_registry::register_game(admin, string::utf8(b"Texas Hold'em"), false);
    }

    #[test(admin = @NovaWalletGames, framework = @0x1)]
    fun test_capability_verification(admin: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        game_registry::init_for_test(admin);
        
        let cap = game_registry::register_game(admin, string::utf8(b"Test Game"), false);
        
        // Valid capability should verify
        assert!(game_registry::verify_capability(&cap), 0);
        
        // Game info should be correct
        let (name, is_active, _registered_at) = game_registry::get_game_info(1);
        assert!(name == string::utf8(b"Test Game"), 1);
        assert!(is_active, 2);

        let (ext_name, ext_is_active, _ext_registered_at, requires_treasury) =
            game_registry::get_game_info_extended(1);
        assert!(ext_name == string::utf8(b"Test Game"), 3);
        assert!(ext_is_active, 4);
        assert!(!requires_treasury, 5);
    }

    #[test(admin = @NovaWalletGames, framework = @0x1)]
    fun test_deactivate_game(admin: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        game_registry::init_for_test(admin);
        
        let cap = game_registry::register_game(admin, string::utf8(b"Test Game"), false);
        
        // Initially active
        assert!(game_registry::is_game_active(1), 0);
        assert!(game_registry::verify_capability(&cap), 1);
        
        // Deactivate
        game_registry::deactivate_game(admin, 1);
        
        // Now inactive
        assert!(!game_registry::is_game_active(1), 2);
        assert!(!game_registry::verify_capability(&cap), 3);
    }

    #[test(admin = @NovaWalletGames, framework = @0x1)]
    fun test_reactivate_game(admin: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        game_registry::init_for_test(admin);
        
        let cap = game_registry::register_game(admin, string::utf8(b"Test Game"), false);
        
        // Deactivate then reactivate
        game_registry::deactivate_game(admin, 1);
        assert!(!game_registry::verify_capability(&cap), 0);
        
        game_registry::reactivate_game(admin, 1);
        assert!(game_registry::verify_capability(&cap), 1);
    }

    #[test(admin = @NovaWalletGames, framework = @0x1)]
    fun test_unregister_game_alias(admin: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        game_registry::init_for_test(admin);

        let cap = game_registry::register_game(admin, string::utf8(b"Test Game"), false);
        assert!(game_registry::verify_capability(&cap), 0);

        game_registry::unregister_game(admin, 1);
        assert!(!game_registry::is_game_active(1), 1);
        assert!(!game_registry::verify_capability(&cap), 2);
    }

    #[test(admin = @NovaWalletGames, non_admin = @0x123, framework = @0x1)]
    #[expected_failure(abort_code = E_NOT_ADMIN, location = NovaWalletGames::game_registry)]
    fun test_deactivate_non_admin_fails(admin: &signer, non_admin: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        game_registry::init_for_test(admin);
        
        let _cap = game_registry::register_game(admin, string::utf8(b"Test Game"), false);
        
        // Non-admin tries to deactivate - should fail
        game_registry::deactivate_game(non_admin, 1);
    }

    #[test(admin = @NovaWalletGames, framework = @0x1)]
    #[expected_failure(abort_code = E_GAME_NOT_FOUND, location = NovaWalletGames::game_registry)]
    fun test_deactivate_nonexistent_fails(admin: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        game_registry::init_for_test(admin);
        
        // Try to deactivate non-existent game
        game_registry::deactivate_game(admin, 999);
    }

    #[test(admin = @NovaWalletGames, new_owner = @0x456, framework = @0x1)]
    fun test_change_admin(admin: &signer, new_owner: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        game_registry::init_for_test(admin);
        
        let new_owner_addr = signer::address_of(new_owner);
        
        // Transfer admin
        game_registry::set_admin(admin, new_owner_addr);
        assert!(game_registry::get_admin() == new_owner_addr, 0);
        
        // New admin can register games
        let _cap = game_registry::register_game(new_owner, string::utf8(b"New Admin Game"), false);
        assert!(game_registry::get_game_count() == 1, 1);
    }

    #[test(admin = @NovaWalletGames, framework = @0x1)]
    fun test_get_active_game_ids(admin: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        game_registry::init_for_test(admin);
        
        let _cap1 = game_registry::register_game(admin, string::utf8(b"Game 1"), false);
        let _cap2 = game_registry::register_game(admin, string::utf8(b"Game 2"), false);
        let _cap3 = game_registry::register_game(admin, string::utf8(b"Game 3"), false);
        
        // All active initially
        let active_ids = game_registry::get_active_game_ids();
        assert!(std::vector::length(&active_ids) == 3, 0);
        
        // Deactivate game 2
        game_registry::deactivate_game(admin, 2);
        
        let active_ids = game_registry::get_active_game_ids();
        assert!(std::vector::length(&active_ids) == 2, 1);
        
        // All IDs still listed
        let all_ids = game_registry::get_all_game_ids();
        assert!(std::vector::length(&all_ids) == 3, 2);
    }

    #[test(admin = @NovaWalletGames, framework = @0x1)]
    fun test_get_active_game_entries(admin: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        game_registry::init_for_test(admin);

        let _cap1 = game_registry::register_game(admin, string::utf8(b"Coin Flip"), true);
        let _cap2 = game_registry::register_game(admin, string::utf8(b"Blackjack"), true);
        game_registry::deactivate_game(admin, 2);

        let (ids, names) = game_registry::get_active_game_entries();
        assert!(std::vector::length(&ids) == 1, 0);
        assert!(std::vector::length(&names) == 1, 1);
        assert!(*std::vector::borrow(&ids, 0) == 1, 2);
        assert!(*std::vector::borrow(&names, 0) == string::utf8(b"Coin Flip"), 3);
    }

    #[test(admin = @NovaWalletGames, framework = @0x1)]
    fun test_invalid_capability() {
        // Create a fake capability with a non-existent game ID
        let fake_cap = game_registry::create_test_capability(999, string::utf8(b"Fake Game"));
        
        // Without registry initialized, verification should fail
        assert!(!game_registry::verify_capability(&fake_cap), 0);
    }

    #[test(admin = @NovaWalletGames, player = @0x123, framework = @0x1)]
    fun test_collect_and_payout_chip_treasury(admin: &signer, player: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);

        game_registry::init_for_test(admin);
        chips::init_for_test(admin);

        let cap = game_registry::register_game(admin, string::utf8(b"Treasury Game"), true);
        let player_addr = signer::address_of(player);
        chips::mint_test_chips(player_addr, 1000);

        let treasury_before = chips::get_chip_treasury_balance();
        assert!(treasury_before == INITIAL_CHIP_TREASURY_BALANCE, 0);

        chips::collect_to_treasury_with_cap(&cap, player_addr, 400);
        assert!(chips::balance(player_addr) == 600, 1);
        assert!(chips::get_chip_treasury_balance() == treasury_before + 400, 2);

        chips::payout_from_treasury_with_cap(&cap, player_addr, 250);
        assert!(chips::balance(player_addr) == 850, 3);
        assert!(chips::get_chip_treasury_balance() == treasury_before + 150, 4);
    }

    #[test(admin = @NovaWalletGames, player = @0x123, framework = @0x1)]
    fun test_deposit_house_takings_treasury_game_succeeds(admin: &signer, player: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);

        game_registry::init_for_test(admin);
        chips::init_for_test(admin);

        let cap = game_registry::register_game(admin, string::utf8(b"Treasury Game"), true);
        let player_addr = signer::address_of(player);
        chips::mint_test_chips(player_addr, 1000);

        let treasury_before = chips::get_chip_treasury_balance();
        chips::deposit_house_takings_with_cap(&cap, player_addr, 125);
        assert!(chips::balance(player_addr) == 875, 0);
        assert!(chips::get_chip_treasury_balance() == treasury_before + 125, 1);
    }

    #[test(admin = @NovaWalletGames, player = @0x123, framework = @0x1)]
    #[expected_failure(abort_code = E_GAME_NOT_TREASURY_ENABLED, location = NovaWalletGames::game_registry)]
    fun test_deposit_house_takings_non_treasury_game_fails(admin: &signer, player: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);

        game_registry::init_for_test(admin);
        chips::init_for_test(admin);

        let cap = game_registry::register_game(admin, string::utf8(b"Normal Game"), false);
        let player_addr = signer::address_of(player);
        chips::mint_test_chips(player_addr, 1000);
        chips::deposit_house_takings_with_cap(&cap, player_addr, 100);
    }

    #[test(admin = @NovaWalletGames, player = @0x123, framework = @0x1)]
    #[expected_failure(abort_code = E_UNAUTHORIZED_GAME, location = NovaWalletGames::chips)]
    fun test_deposit_house_takings_invalid_cap_fails(admin: &signer, player: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);

        game_registry::init_for_test(admin);
        chips::init_for_test(admin);

        let fake_cap = game_registry::create_test_capability(999, string::utf8(b"Fake Game"));
        let player_addr = signer::address_of(player);
        chips::mint_test_chips(player_addr, 1000);
        chips::deposit_house_takings_with_cap(&fake_cap, player_addr, 100);
    }

    #[test(admin = @NovaWalletGames, player = @0x123, framework = @0x1)]
    #[expected_failure(abort_code = E_GAME_NOT_TREASURY_ENABLED, location = NovaWalletGames::game_registry)]
    fun test_collect_non_treasury_game_fails(admin: &signer, player: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);

        game_registry::init_for_test(admin);
        chips::init_for_test(admin);

        let cap = game_registry::register_game(admin, string::utf8(b"Normal Game"), false);
        let player_addr = signer::address_of(player);
        chips::mint_test_chips(player_addr, 1000);
        chips::collect_to_treasury_with_cap(&cap, player_addr, 100);
    }

    #[test(admin = @NovaWalletGames, player = @0x123, framework = @0x1)]
    #[expected_failure(abort_code = E_GAME_NOT_TREASURY_ENABLED, location = NovaWalletGames::game_registry)]
    fun test_payout_non_treasury_game_fails(admin: &signer, player: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);

        game_registry::init_for_test(admin);
        chips::init_for_test(admin);

        let cap = game_registry::register_game(admin, string::utf8(b"Normal Game"), false);
        chips::payout_from_treasury_with_cap(&cap, signer::address_of(player), 100);
    }

    #[test(admin = @NovaWalletGames, player = @0x123, framework = @0x1)]
    #[expected_failure(abort_code = E_TREASURY_INSUFFICIENT, location = NovaWalletGames::chips)]
    fun test_payout_insufficient_chip_treasury_fails(admin: &signer, player: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);

        game_registry::init_for_test(admin);
        chips::init_for_test(admin);

        let cap = game_registry::register_game(admin, string::utf8(b"Treasury Game"), true);
        chips::payout_from_treasury_with_cap(
            &cap,
            signer::address_of(player),
            INITIAL_CHIP_TREASURY_BALANCE + 1
        );
    }

    // ============================================
    // CAPABILITY-BASED CHIP TRANSFER TESTS
    // ============================================

    #[test(admin = @NovaWalletGames, player1 = @0x123, player2 = @0x456, framework = @0x1)]
    fun test_transfer_chips_with_cap(admin: &signer, player1: &signer, player2: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        
        // Initialize both modules
        game_registry::init_for_test(admin);
        chips::init_for_test(admin);
        
        // Register a game
        let cap = game_registry::register_game(admin, string::utf8(b"Test Game"), false);
        
        // Give player1 some chips
        let player1_addr = signer::address_of(player1);
        let player2_addr = signer::address_of(player2);
        chips::mint_test_chips(player1_addr, 1000);
        
        assert!(chips::balance(player1_addr) == 1000, 0);
        assert!(chips::balance(player2_addr) == 0, 1);
        
        // Transfer using capability
        chips::transfer_chips_with_cap(&cap, player1_addr, player2_addr, 500);
        
        assert!(chips::balance(player1_addr) == 500, 2);
        assert!(chips::balance(player2_addr) == 500, 3);
    }

    #[test(admin = @NovaWalletGames, player1 = @0x123, player2 = @0x456, framework = @0x1)]
    #[expected_failure(abort_code = E_UNAUTHORIZED_GAME, location = NovaWalletGames::chips)]
    fun test_transfer_with_invalid_cap_fails(admin: &signer, player1: &signer, player2: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        
        // Initialize both modules
        game_registry::init_for_test(admin);
        chips::init_for_test(admin);
        
        // Create a fake capability without registering
        let fake_cap = game_registry::create_test_capability(999, string::utf8(b"Fake Game"));
        
        // Give player1 some chips
        let player1_addr = signer::address_of(player1);
        let player2_addr = signer::address_of(player2);
        chips::mint_test_chips(player1_addr, 1000);
        
        // Transfer using invalid capability - should fail
        chips::transfer_chips_with_cap(&fake_cap, player1_addr, player2_addr, 500);
    }

    #[test(admin = @NovaWalletGames, player1 = @0x123, player2 = @0x456, framework = @0x1)]
    #[expected_failure(abort_code = E_UNAUTHORIZED_GAME, location = NovaWalletGames::chips)]
    fun test_transfer_with_deactivated_cap_fails(admin: &signer, player1: &signer, player2: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        
        // Initialize both modules
        game_registry::init_for_test(admin);
        chips::init_for_test(admin);
        
        // Register a game
        let cap = game_registry::register_game(admin, string::utf8(b"Test Game"), false);
        
        // Give player1 some chips
        let player1_addr = signer::address_of(player1);
        let player2_addr = signer::address_of(player2);
        chips::mint_test_chips(player1_addr, 1000);
        
        // Deactivate the game
        game_registry::deactivate_game(admin, 1);
        
        // Transfer using deactivated capability - should fail
        chips::transfer_chips_with_cap(&cap, player1_addr, player2_addr, 500);
    }

    #[test(admin = @NovaWalletGames, player1 = @0x123, player2 = @0x456, framework = @0x1)]
    fun test_transfer_zero_amount(admin: &signer, player1: &signer, player2: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        
        // Initialize both modules
        game_registry::init_for_test(admin);
        chips::init_for_test(admin);
        
        // Register a game
        let cap = game_registry::register_game(admin, string::utf8(b"Test Game"), false);
        
        // Give player1 some chips
        let player1_addr = signer::address_of(player1);
        let player2_addr = signer::address_of(player2);
        chips::mint_test_chips(player1_addr, 1000);
        
        // Transfer zero - should succeed (no-op)
        chips::transfer_chips_with_cap(&cap, player1_addr, player2_addr, 0);
        
        assert!(chips::balance(player1_addr) == 1000, 0);
        assert!(chips::balance(player2_addr) == 0, 1);
    }

    #[test(admin = @NovaWalletGames, player1 = @0x123, player2 = @0x456, framework = @0x1)]
    fun test_transfer_after_reactivation(admin: &signer, player1: &signer, player2: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        
        // Initialize both modules
        game_registry::init_for_test(admin);
        chips::init_for_test(admin);
        
        // Register a game
        let cap = game_registry::register_game(admin, string::utf8(b"Test Game"), false);
        
        // Give player1 some chips
        let player1_addr = signer::address_of(player1);
        let player2_addr = signer::address_of(player2);
        chips::mint_test_chips(player1_addr, 1000);
        
        // Deactivate then reactivate
        game_registry::deactivate_game(admin, 1);
        game_registry::reactivate_game(admin, 1);
        
        // Transfer should work again
        chips::transfer_chips_with_cap(&cap, player1_addr, player2_addr, 500);
        
        assert!(chips::balance(player1_addr) == 500, 0);
        assert!(chips::balance(player2_addr) == 500, 1);
    }
}
