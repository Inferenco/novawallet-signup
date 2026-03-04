// ============================================
// Abort Flow Tests
// ============================================
// Tests for two-step abort voting mechanism

#[test_only]
module NovaWalletGames::abort_flow_tests {
    use std::signer;
    use std::string;
    use cedra_framework::timestamp;
    use NovaWalletGames::poker_texas_holdem;
    use NovaWalletGames::chips;

    // Helper to setup a table and return its Object address
    fun setup_table(admin: &signer): address {
        chips::init_for_test(admin);
        poker_texas_holdem::create_table(admin, 5, 10, 50, 1000, 0, false, 5, 0, string::utf8(b"Abort Test"), 0);
        poker_texas_holdem::get_table_address(signer::address_of(admin))
    }

    fun setup_active_hand_with_abort(
        admin: &signer,
        player1: &signer,
        player2: &signer,
        straddle_enabled: bool,
        framework: &signer,
    ): address {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);

        chips::init_for_test(admin);
        poker_texas_holdem::create_table(
            admin,
            5,
            10,
            50,
            1000,
            0,
            straddle_enabled,
            5,
            0,
            string::utf8(b"Abort Active"),
            0
        );
        let table_addr = poker_texas_holdem::get_table_address(signer::address_of(admin));

        let p1_addr = signer::address_of(player1);
        let p2_addr = signer::address_of(player2);
        chips::mint_test_chips(p1_addr, 1000);
        chips::mint_test_chips(p2_addr, 1000);
        poker_texas_holdem::join_table(player1, table_addr, 0, 200);
        poker_texas_holdem::join_table(player2, table_addr, 1, 200);

        poker_texas_holdem::start_hand(admin, table_addr);

        poker_texas_holdem::request_abort(admin, table_addr);
        table_addr
    }

    // ============================================
    // REQUEST ABORT TESTS
    // ============================================

    #[test(admin = @NovaWalletGames)]
    #[expected_failure(abort_code = 7, location = NovaWalletGames::poker_texas_holdem)] // E_NO_GAME
    fun test_request_abort_no_game_fails(admin: &signer) {
        let table_addr = setup_table(admin);
        poker_texas_holdem::request_abort(admin, table_addr);
    }

    #[test(admin = @NovaWalletGames, player = @0xBEEF)]
    #[expected_failure(abort_code = 1, location = NovaWalletGames::poker_texas_holdem)] // E_NOT_ADMIN
    fun test_request_abort_non_admin_fails(admin: &signer, player: &signer) {
        let table_addr = setup_table(admin);
        poker_texas_holdem::request_abort(player, table_addr);
    }

    // ============================================
    // CANCEL ABORT TESTS
    // ============================================

    #[test(admin = @NovaWalletGames)]
    #[expected_failure(abort_code = 37, location = NovaWalletGames::poker_texas_holdem)] // E_NO_ABORT_REQUEST
    fun test_cancel_abort_no_request_fails(admin: &signer) {
        let table_addr = setup_table(admin);
        poker_texas_holdem::cancel_abort_request(admin, table_addr);
    }

    // ============================================
    // VOTE ABORT TESTS
    // ============================================

    #[test(admin = @NovaWalletGames, player = @0xBEEF)]
    #[expected_failure(abort_code = 37, location = NovaWalletGames::poker_texas_holdem)] // E_NO_ABORT_REQUEST
    fun test_vote_abort_no_request_fails(admin: &signer, player: &signer) {
        let table_addr = setup_table(admin);
        let player_addr = signer::address_of(player);
        chips::mint_test_chips(player_addr, 500);
        poker_texas_holdem::join_table(player, table_addr, 0, 200);
        poker_texas_holdem::vote_abort(player, table_addr, true);
    }

    #[test(admin = @NovaWalletGames, player1 = @0xBEEF, player2 = @0xDEAD, framework = @0x1)]
    #[expected_failure(abort_code = 42, location = NovaWalletGames::poker_texas_holdem)] // E_ABORT_PENDING
    fun test_all_in_blocked_while_abort_vote_active(
        admin: &signer,
        player1: &signer,
        player2: &signer,
        framework: &signer
    ) {
        let table_addr = setup_active_hand_with_abort(admin, player1, player2, false, framework);
        poker_texas_holdem::all_in(player1, table_addr);
    }

    #[test(admin = @NovaWalletGames, player1 = @0xBEEF, player2 = @0xDEAD, framework = @0x1)]
    #[expected_failure(abort_code = 42, location = NovaWalletGames::poker_texas_holdem)] // E_ABORT_PENDING
    fun test_straddle_blocked_while_abort_vote_active(
        admin: &signer,
        player1: &signer,
        player2: &signer,
        framework: &signer
    ) {
        let table_addr = setup_active_hand_with_abort(admin, player1, player2, true, framework);
        poker_texas_holdem::straddle(player1, table_addr);
    }

    // ============================================
    // GET ABORT REQUEST STATUS VIEW TESTS
    // ============================================

    #[test(admin = @NovaWalletGames)]
    fun test_get_abort_request_status_no_request(admin: &signer) {
        let table_addr = setup_table(admin);
        let (timestamp, approvals, vetos, deadline, seated) = 
            poker_texas_holdem::get_abort_request_status(table_addr);
        
        assert!(timestamp == 0, 1);
        assert!(approvals == 0, 2);
        assert!(vetos == 0, 3);
        assert!(deadline == 0, 4);
        assert!(seated == 0, 5);
    }

    #[test(admin = @NovaWalletGames, player1 = @0xBEEF, player2 = @0xDEAD)]
    fun test_get_abort_request_status_with_players(admin: &signer, player1: &signer, player2: &signer) {
        let table_addr = setup_table(admin);
        let player1_addr = signer::address_of(player1);
        let player2_addr = signer::address_of(player2);
        
        chips::mint_test_chips(player1_addr, 500);
        chips::mint_test_chips(player2_addr, 500);
        poker_texas_holdem::join_table(player1, table_addr, 0, 200);
        poker_texas_holdem::join_table(player2, table_addr, 2, 300);
        
        let (_, _, _, _, seated) = poker_texas_holdem::get_abort_request_status(table_addr);
        assert!(seated == 2, 1);
    }
}
