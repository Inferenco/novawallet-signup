// ============================================
// Admin Controls Tests
// ============================================
// Tests for admin-only functions and table management

#[test_only]
module NovaWalletGames::admin_controls_tests {
    use std::signer;
    use std::string;
    use NovaWalletGames::poker_texas_holdem;
    use NovaWalletGames::chips;

    // Helper to setup a table and return its Object address
    fun setup_table(admin: &signer): address {
        chips::init_for_test(admin);
        poker_texas_holdem::create_table(admin, 5, 10, 50, 1000, 0, false, 5, 0, string::utf8(b"Admin Test"), 0);
        // Table is now an Object - get its address via TableRef
        poker_texas_holdem::get_table_address(signer::address_of(admin))
    }

    // ============================================
    // BLIND UPDATES
    // ============================================

    #[test(admin = @NovaWalletGames)]
    fun test_update_blinds_success(admin: &signer) {
        let table_addr = setup_table(admin);
        
        poker_texas_holdem::update_blinds(admin, table_addr, 10, 20);
        
        let (small, big, _, _) = poker_texas_holdem::get_table_config(table_addr);
        assert!(small == 10, 1);
        assert!(big == 20, 2);
    }

    #[test(admin = @NovaWalletGames, other = @0xBEEF)]
    #[expected_failure(abort_code = 1, location = NovaWalletGames::poker_texas_holdem)] // E_NOT_ADMIN
    fun test_update_blinds_non_admin_fails(admin: &signer, other: &signer) {
        let table_addr = setup_table(admin);
        
        // Non-admin tries to update blinds
        poker_texas_holdem::update_blinds(other, table_addr, 10, 20);
    }

    // ============================================
    // BUY-IN LIMITS
    // ============================================

    #[test(admin = @NovaWalletGames)]
    fun test_update_buyin_limits_success(admin: &signer) {
        let table_addr = setup_table(admin);
        
        poker_texas_holdem::update_buy_in_limits(admin, table_addr, 100, 2000);
        
        let (_, _, min_buy, max_buy) = poker_texas_holdem::get_table_config(table_addr);
        assert!(min_buy == 100, 1);
        assert!(max_buy == 2000, 2);
    }

    #[test(admin = @NovaWalletGames, other = @0xBEEF)]
    #[expected_failure(abort_code = 1, location = NovaWalletGames::poker_texas_holdem)] // E_NOT_ADMIN
    fun test_update_buyin_non_admin_fails(admin: &signer, other: &signer) {
        let table_addr = setup_table(admin);
        
        poker_texas_holdem::update_buy_in_limits(other, table_addr, 100, 2000);
    }

    // ============================================
    // ANTE & STRADDLE
    // ============================================

    #[test(admin = @NovaWalletGames)]
    fun test_update_ante_success(admin: &signer) {
        let table_addr = setup_table(admin);
        
        poker_texas_holdem::update_ante(admin, table_addr, 2);
        
        // Verify via table config (if exposed) - for now just confirm no abort
    }

    #[test(admin = @NovaWalletGames)]
    fun test_toggle_straddle_success(admin: &signer) {
        let table_addr = setup_table(admin);
        
        // Enable straddle
        poker_texas_holdem::toggle_straddle(admin, table_addr, true);
        // Disable straddle
        poker_texas_holdem::toggle_straddle(admin, table_addr, false);
    }

    // ============================================
    // OWNERSHIP TRANSFER
    // ============================================

    #[test(admin = @NovaWalletGames, new_owner = @0xBEEF)]
    fun test_transfer_ownership_success(admin: &signer, new_owner: &signer) {
        let table_addr = setup_table(admin);
        let new_owner_addr = signer::address_of(new_owner);
        
        // Transfer ownership
        poker_texas_holdem::transfer_ownership(admin, table_addr, new_owner_addr);
        
        // New admin should be able to update blinds
        poker_texas_holdem::update_blinds(new_owner, table_addr, 10, 20);
        
        let (small, big, _, _) = poker_texas_holdem::get_table_config(table_addr);
        assert!(small == 10, 1);
        assert!(big == 20, 2);
    }

    #[test(admin = @NovaWalletGames, new_owner = @0xBEEF)]
    #[expected_failure(abort_code = 1, location = NovaWalletGames::poker_texas_holdem)] // E_NOT_ADMIN
    fun test_old_owner_cannot_update_after_transfer(admin: &signer, new_owner: &signer) {
        let table_addr = setup_table(admin);
        let new_owner_addr = signer::address_of(new_owner);
        
        poker_texas_holdem::transfer_ownership(admin, table_addr, new_owner_addr);
        
        // Old admin should not be able to update anymore
        poker_texas_holdem::update_blinds(admin, table_addr, 15, 30);
    }

    #[test(admin = @NovaWalletGames, new_owner = @0xBEEF)]
    fun test_close_table_after_transfer_succeeds(admin: &signer, new_owner: &signer) {
        let table_addr = setup_table(admin);
        let new_owner_addr = signer::address_of(new_owner);

        poker_texas_holdem::transfer_ownership(admin, table_addr, new_owner_addr);
        poker_texas_holdem::close_table(new_owner, table_addr);
    }

    #[test(admin = @NovaWalletGames, new_owner = @0xBEEF)]
    fun test_old_owner_can_create_new_table_after_transfer(admin: &signer, new_owner: &signer) {
        let old_table_addr = setup_table(admin);
        let new_owner_addr = signer::address_of(new_owner);
        poker_texas_holdem::transfer_ownership(admin, old_table_addr, new_owner_addr);

        poker_texas_holdem::create_table(
            admin,
            10,
            20,
            100,
            1000,
            0,
            false,
            5,
            0,
            string::utf8(b"Admin Recreate"),
            1
        );
        let new_table_addr = poker_texas_holdem::get_table_address(signer::address_of(admin));
        assert!(new_table_addr != old_table_addr, 1);
    }

    #[test(admin = @NovaWalletGames, new_owner = @0xBEEF)]
    fun test_new_owner_can_claim_table_ref_after_transfer(admin: &signer, new_owner: &signer) {
        let table_addr = setup_table(admin);
        let new_owner_addr = signer::address_of(new_owner);

        poker_texas_holdem::transfer_ownership(admin, table_addr, new_owner_addr);
        poker_texas_holdem::claim_table_ref(new_owner, table_addr);

        let claimed_addr = poker_texas_holdem::get_table_address(new_owner_addr);
        assert!(claimed_addr == table_addr, 1);
    }

    // ============================================
    // PAUSE/RESUME
    // ============================================

    #[test(admin = @NovaWalletGames)]
    fun test_pause_resume_table_success(admin: &signer) {
        let table_addr = setup_table(admin);
        
        // Pause
        poker_texas_holdem::pause_table(admin, table_addr);
        assert!(poker_texas_holdem::is_paused(table_addr) == true, 1);
        
        // Resume
        poker_texas_holdem::resume_table(admin, table_addr);
        assert!(poker_texas_holdem::is_paused(table_addr) == false, 2);
    }

    // ============================================
    // ADMIN-ONLY START
    // ============================================

    #[test(admin = @NovaWalletGames)]
    fun test_toggle_owner_only_start(admin: &signer) {
        let table_addr = setup_table(admin);
        
        // Enable admin-only start
        poker_texas_holdem::toggle_owner_only_start(admin, table_addr, true);
        assert!(poker_texas_holdem::is_owner_only_start(table_addr) == true, 1);
        
        // Disable
        poker_texas_holdem::toggle_owner_only_start(admin, table_addr, false);
        assert!(poker_texas_holdem::is_owner_only_start(table_addr) == false, 2);
    }

    // ============================================
    // KICK PLAYER
    // ============================================

    #[test(admin = @NovaWalletGames, player = @0xBEEF)]
    fun test_kick_player_success(admin: &signer, player: &signer) {
        let table_addr = setup_table(admin);
        let player_addr = signer::address_of(player);
        
        chips::mint_test_chips(player_addr, 500);
        poker_texas_holdem::join_table(player, table_addr, 0, 200);
        
        // Kick player
        poker_texas_holdem::kick_player(admin, table_addr, 0);
        
        // Player should have their 200 chips back
        assert!(chips::balance(player_addr) == 500, 1); // 300 remained + 200 returned
    }

    #[test(admin = @NovaWalletGames, player = @0xBEEF, other = @0xDEAD)]
    #[expected_failure(abort_code = 1, location = NovaWalletGames::poker_texas_holdem)] // E_NOT_ADMIN
    fun test_kick_player_non_admin_fails(admin: &signer, player: &signer, other: &signer) {
        let table_addr = setup_table(admin);
        let player_addr = signer::address_of(player);
        
        chips::mint_test_chips(player_addr, 500);
        poker_texas_holdem::join_table(player, table_addr, 0, 200);
        
        // Non-admin tries to kick
        poker_texas_holdem::kick_player(other, table_addr, 0);
    }

    // ============================================
    // GET ADMIN VIEW
    // ============================================

    #[test(admin = @NovaWalletGames)]
    fun test_get_owner_returns_owner_address(admin: &signer) {
        let table_addr = setup_table(admin);
        let owner_addr = signer::address_of(admin);
        
        assert!(poker_texas_holdem::get_owner(table_addr) == owner_addr, 1);
    }

    #[test(admin = @NovaWalletGames, new_owner = @0xBEEF)]
    fun test_get_owner_after_transfer(admin: &signer, new_owner: &signer) {
        let table_addr = setup_table(admin);
        let new_owner_addr = signer::address_of(new_owner);
        
        poker_texas_holdem::transfer_ownership(admin, table_addr, new_owner_addr);
        assert!(poker_texas_holdem::get_owner(table_addr) == new_owner_addr, 1);
    }

    // ============================================
    // CONFIG VALIDATION
    // ============================================

    #[test(admin = @NovaWalletGames)]
    #[expected_failure(abort_code = 27, location = NovaWalletGames::poker_texas_holdem)] // E_ZERO_VALUE
    fun test_create_table_zero_small_blind_fails(admin: &signer) {
        chips::init_for_test(admin);
        poker_texas_holdem::create_table(admin, 0, 10, 50, 1000, 0, false, 5, 0, string::utf8(b"Bad Table"), 0);
    }

    #[test(admin = @NovaWalletGames)]
    #[expected_failure(abort_code = 25, location = NovaWalletGames::poker_texas_holdem)] // E_INVALID_BLINDS
    fun test_create_table_equal_blinds_fails(admin: &signer) {
        chips::init_for_test(admin);
        poker_texas_holdem::create_table(admin, 10, 10, 50, 1000, 0, false, 5, 0, string::utf8(b"Bad Table"), 0);
    }

    #[test(admin = @NovaWalletGames)]
    #[expected_failure(abort_code = 25, location = NovaWalletGames::poker_texas_holdem)] // E_INVALID_BLINDS
    fun test_create_table_small_blind_greater_than_big_fails(admin: &signer) {
        chips::init_for_test(admin);
        poker_texas_holdem::create_table(admin, 20, 10, 50, 1000, 0, false, 5, 0, string::utf8(b"Bad Table"), 0);
    }

    #[test(admin = @NovaWalletGames)]
    #[expected_failure(abort_code = 27, location = NovaWalletGames::poker_texas_holdem)] // E_ZERO_VALUE
    fun test_create_table_zero_min_buyin_fails(admin: &signer) {
        chips::init_for_test(admin);
        poker_texas_holdem::create_table(admin, 5, 10, 0, 1000, 0, false, 5, 0, string::utf8(b"Bad Table"), 0);
    }

    #[test(admin = @NovaWalletGames)]
    #[expected_failure(abort_code = 26, location = NovaWalletGames::poker_texas_holdem)] // E_INVALID_BUY_IN
    fun test_create_table_max_less_than_min_buyin_fails(admin: &signer) {
        chips::init_for_test(admin);
        poker_texas_holdem::create_table(admin, 5, 10, 1000, 500, 0, false, 5, 0, string::utf8(b"Bad Table"), 0);
    }

    // ============================================
    // TABLE SPEED TESTS
    // ============================================

    #[test(admin = @NovaWalletGames)]
    fun test_create_table_standard_speed(admin: &signer) {
        chips::init_for_test(admin);
        poker_texas_holdem::create_table(admin, 5, 10, 50, 1000, 0, false, 5, 0, string::utf8(b"Standard"), 0); // Standard speed
        let table_addr = poker_texas_holdem::get_table_address(signer::address_of(admin));
        assert!(poker_texas_holdem::get_table_speed(table_addr) == 0, 1);
        assert!(poker_texas_holdem::get_action_timeout_secs(table_addr) == 90, 2); // 1.5 minutes
    }

    #[test(admin = @NovaWalletGames)]
    fun test_create_table_fast_speed(admin: &signer) {
        chips::init_for_test(admin);
        poker_texas_holdem::create_table(admin, 5, 10, 50, 1000, 0, false, 5, 1, string::utf8(b"Fast Table"), 0); // Fast speed
        let table_addr = poker_texas_holdem::get_table_address(signer::address_of(admin));
        assert!(poker_texas_holdem::get_table_speed(table_addr) == 1, 1);
        assert!(poker_texas_holdem::get_action_timeout_secs(table_addr) == 60, 2); // 1 minute
    }

    #[test(admin = @NovaWalletGames)]
    fun test_create_table_quick_fire_speed(admin: &signer) {
        chips::init_for_test(admin);
        poker_texas_holdem::create_table(admin, 5, 10, 50, 1000, 0, false, 5, 2, string::utf8(b"Quick Fire"), 0); // Quick Fire speed
        let table_addr = poker_texas_holdem::get_table_address(signer::address_of(admin));
        assert!(poker_texas_holdem::get_table_speed(table_addr) == 2, 1);
        assert!(poker_texas_holdem::get_action_timeout_secs(table_addr) == 30, 2); // 30 seconds
    }

    #[test(admin = @NovaWalletGames)]
    #[expected_failure(abort_code = 35, location = NovaWalletGames::poker_texas_holdem)] // E_INVALID_SPEED
    fun test_create_table_invalid_speed_fails(admin: &signer) {
        chips::init_for_test(admin);
        poker_texas_holdem::create_table(admin, 5, 10, 50, 1000, 0, false, 5, 3, string::utf8(b"Bad Speed"), 0); // Invalid speed
    }

    #[test(admin = @NovaWalletGames)]
    #[expected_failure(abort_code = 25, location = NovaWalletGames::poker_texas_holdem)] // E_INVALID_BLINDS
    fun test_update_blinds_invalid_fails(admin: &signer) {
        let table_addr = setup_table(admin);
        poker_texas_holdem::update_blinds(admin, table_addr, 20, 10);
    }

    #[test(admin = @NovaWalletGames)]
    #[expected_failure(abort_code = 27, location = NovaWalletGames::poker_texas_holdem)] // E_ZERO_VALUE
    fun test_update_blinds_zero_fails(admin: &signer) {
        let table_addr = setup_table(admin);
        poker_texas_holdem::update_blinds(admin, table_addr, 0, 10);
    }

    #[test(admin = @NovaWalletGames)]
    #[expected_failure(abort_code = 26, location = NovaWalletGames::poker_texas_holdem)] // E_INVALID_BUY_IN
    fun test_update_buyin_invalid_fails(admin: &signer) {
        let table_addr = setup_table(admin);
        poker_texas_holdem::update_buy_in_limits(admin, table_addr, 1000, 500);
    }

    #[test(admin = @NovaWalletGames)]
    #[expected_failure(abort_code = 27, location = NovaWalletGames::poker_texas_holdem)] // E_ZERO_VALUE
    fun test_update_buyin_zero_fails(admin: &signer) {
        let table_addr = setup_table(admin);
        poker_texas_holdem::update_buy_in_limits(admin, table_addr, 0, 500);
    }

    // ============================================
    // GET TABLE SUMMARY VIEW
    // ============================================

    #[test(admin = @NovaWalletGames)]
    fun test_get_table_summary_empty_table(admin: &signer) {
        let table_addr = setup_table(admin);
        let owner_addr = signer::address_of(admin);
        
        let (
            ret_admin,
            small_blind,
            big_blind,
            min_buy_in,
            max_buy_in,
            is_paused,
            owner_only_start,
            occupied_seats,
            total_seats,
            has_game,
            ante,
            straddle_enabled,
            table_speed,
            name,
            color_index,
        ) = poker_texas_holdem::get_table_summary(table_addr);
        
        // Verify all returned values
        assert!(ret_admin == owner_addr, 1);
        assert!(small_blind == 5, 2);
        assert!(big_blind == 10, 3);
        assert!(min_buy_in == 50, 4);
        assert!(max_buy_in == 1000, 5);
        assert!(is_paused == false, 6);
        assert!(owner_only_start == false, 7);
        assert!(occupied_seats == 0, 8);
        assert!(total_seats == 5, 9);
        assert!(has_game == false, 10);
        assert!(ante == 0, 11);
        assert!(straddle_enabled == false, 12);
        assert!(table_speed == 0, 13);
        assert!(string::length(&name) > 0, 14);
        assert!(color_index == 0, 15);
    }

    #[test(admin = @NovaWalletGames, player1 = @0xBEEF, player2 = @0xDEAD)]
    fun test_get_table_summary_with_players(admin: &signer, player1: &signer, player2: &signer) {
        let table_addr = setup_table(admin);
        let player1_addr = signer::address_of(player1);
        let player2_addr = signer::address_of(player2);
        
        // Add two players
        chips::mint_test_chips(player1_addr, 500);
        chips::mint_test_chips(player2_addr, 500);
        poker_texas_holdem::join_table(player1, table_addr, 0, 200);
        poker_texas_holdem::join_table(player2, table_addr, 2, 300);
        
        let (
            _,
            _,
            _,
            _,
            _,
            _,
            _,
            occupied_seats,
            total_seats,
            _,
            _,
            _,
            _,
            _,
            _,
        ) = poker_texas_holdem::get_table_summary(table_addr);
        
        assert!(occupied_seats == 2, 1);
        assert!(total_seats == 5, 2);
    }

    #[test(admin = @NovaWalletGames)]
    fun test_get_table_summary_paused_and_admin_only(admin: &signer) {
        let table_addr = setup_table(admin);
        
        // Pause table and enable admin-only start
        poker_texas_holdem::pause_table(admin, table_addr);
        poker_texas_holdem::toggle_owner_only_start(admin, table_addr, true);
        
        let (
            _,
            _,
            _,
            _,
            _,
            is_paused,
            owner_only_start,
            _,
            _,
            _,
            _,
            _,
            _,
            _,
            _,
        ) = poker_texas_holdem::get_table_summary(table_addr);
        
        assert!(is_paused == true, 1);
        assert!(owner_only_start == true, 2);
    }

    #[test(admin = @NovaWalletGames)]
    #[expected_failure(abort_code = 3, location = NovaWalletGames::poker_texas_holdem)] // E_TABLE_NOT_FOUND
    fun test_get_table_summary_nonexistent_table_fails(admin: &signer) {
        chips::init_for_test(admin);
        
        // Try to get summary for a non-existent table
        poker_texas_holdem::get_table_summary(@0xDEADBEEF);
    }
}
