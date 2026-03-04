// ============================================
// Player Actions Tests
// ============================================
// Tests for player-initiated actions at the table

#[test_only]
module NovaWalletGames::player_actions_tests {
    use std::signer;
    use std::string;
    use cedra_framework::timestamp;
    use NovaWalletGames::poker_texas_holdem;
    use NovaWalletGames::chips;

    // Helper to setup a table with players and return table Object address
    fun setup_table_with_players(admin: &signer, p1: &signer, p2: &signer): address {
        chips::init_for_test(admin);
        poker_texas_holdem::create_table(admin, 5, 10, 50, 1000, 0, false, 5, 0, string::utf8(b"Player Test"), 0);
        
        let table_addr = poker_texas_holdem::get_table_address(signer::address_of(admin));
        let p1_addr = signer::address_of(p1);
        let p2_addr = signer::address_of(p2);
        
        chips::mint_test_chips(p1_addr, 1000);
        chips::mint_test_chips(p2_addr, 1000);
        
        poker_texas_holdem::join_table(p1, table_addr, 0, 200);
        poker_texas_holdem::join_table(p2, table_addr, 1, 200);
        
        table_addr
    }

    fun setup_hand_with_dead_money(
        admin: &signer,
        p1: &signer,
        p2: &signer,
        framework: &signer
    ): address {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);

        let table_addr = setup_table_with_players(admin, p1, p2);

        // Create dead money: player 1 misses and repays one big blind.
        poker_texas_holdem::sit_out(p1, table_addr);
        poker_texas_holdem::sit_in(p1, table_addr);
        assert!(poker_texas_holdem::get_dead_money(table_addr) == 10, 1000);

        // Start a hand (commit phase) so abort flow can be exercised with an active game.
        poker_texas_holdem::start_hand(admin, table_addr);

        table_addr
    }

    // ============================================
    // LEAVE TABLE
    // ============================================

    #[test(admin = @NovaWalletGames, p1 = @0xAAA, p2 = @0xBBB)]
    fun test_leave_table_returns_chips(admin: &signer, p1: &signer, p2: &signer) {
        let table_addr = setup_table_with_players(admin, p1, p2);
        let p1_addr = signer::address_of(p1);
        
        // Check initial chip balance (1000 - 200 = 800 in wallet)
        assert!(chips::balance(p1_addr) == 800, 1);
        
        // Leave table
        poker_texas_holdem::leave_table(p1, table_addr);
        
        // Should have all 1000 chips back
        assert!(chips::balance(p1_addr) == 1000, 2);
    }

    #[test(admin = @NovaWalletGames, player = @0xBEEF)]
    #[expected_failure(abort_code = 5, location = NovaWalletGames::poker_texas_holdem)] // E_NOT_AT_TABLE
    fun test_leave_table_not_at_table_fails(admin: &signer, player: &signer) {
        chips::init_for_test(admin);
        poker_texas_holdem::create_table(admin, 5, 10, 50, 1000, 0, false, 5, 0, string::utf8(b"Leave Test"), 0);
        let table_addr = poker_texas_holdem::get_table_address(signer::address_of(admin));
        
        // Player not at table tries to leave
        poker_texas_holdem::leave_table(player, table_addr);
    }

    // ============================================
    // SIT OUT / SIT IN
    // ============================================

    #[test(admin = @NovaWalletGames, p1 = @0xAAA, p2 = @0xBBB)]
    fun test_sit_out_success(admin: &signer, p1: &signer, p2: &signer) {
        let table_addr = setup_table_with_players(admin, p1, p2);
        
        poker_texas_holdem::sit_out(p1, table_addr);
        
        let (_, _, sitting_out) = poker_texas_holdem::get_seat_info(table_addr, 0);
        assert!(sitting_out == true, 1);
    }

    #[test(admin = @NovaWalletGames, p1 = @0xAAA, p2 = @0xBBB)]
    fun test_sit_in_success(admin: &signer, p1: &signer, p2: &signer) {
        let table_addr = setup_table_with_players(admin, p1, p2);
        
        poker_texas_holdem::sit_out(p1, table_addr);
        poker_texas_holdem::sit_in(p1, table_addr);
        
        let (_, _, sitting_out) = poker_texas_holdem::get_seat_info(table_addr, 0);
        assert!(sitting_out == false, 1);
    }

    // ============================================
    // TOP UP
    // ============================================

    #[test(admin = @NovaWalletGames, p1 = @0xAAA, p2 = @0xBBB)]
    fun test_top_up_success(admin: &signer, p1: &signer, p2: &signer) {
        let table_addr = setup_table_with_players(admin, p1, p2);
        let p1_addr = signer::address_of(p1);
        
        // Initial stack is 200, wallet has 800
        let (_, stack_before, _) = poker_texas_holdem::get_seat_info(table_addr, 0);
        assert!(stack_before == 200, 1);
        
        // Top up by 100
        poker_texas_holdem::top_up(p1, table_addr, 100);
        
        let (_, stack_after, _) = poker_texas_holdem::get_seat_info(table_addr, 0);
        assert!(stack_after == 300, 2);
        
        // Wallet should have 700 now
        assert!(chips::balance(p1_addr) == 700, 3);
    }

    #[test(admin = @NovaWalletGames, p1 = @0xAAA, p2 = @0xBBB)]
    #[expected_failure(abort_code = 10, location = NovaWalletGames::poker_texas_holdem)] // E_INSUFFICIENT_CHIPS (wallet check before max check)
    fun test_top_up_exceeds_max_fails(admin: &signer, p1: &signer, p2: &signer) {
        let table_addr = setup_table_with_players(admin, p1, p2);
        
        // Try to top up beyond max buy-in (1000)
        // Player has 200, trying to add 900 = 1100 total
        poker_texas_holdem::top_up(p1, table_addr, 900);
    }

    #[test(admin = @NovaWalletGames, p1 = @0xAAA, p2 = @0xBBB)]
    #[expected_failure(abort_code = 10, location = NovaWalletGames::poker_texas_holdem)] // E_INSUFFICIENT_CHIPS
    fun test_top_up_insufficient_wallet_fails(admin: &signer, p1: &signer, p2: &signer) {
        let table_addr = setup_table_with_players(admin, p1, p2);
        
        // Player has 800 in wallet, try to add 850
        poker_texas_holdem::top_up(p1, table_addr, 850);
    }

    // ============================================
    // LEAVE AFTER HAND
    // ============================================

    #[test(admin = @NovaWalletGames, p1 = @0xAAA, p2 = @0xBBB)]
    fun test_leave_after_hand_sets_flag(admin: &signer, p1: &signer, p2: &signer) {
        let table_addr = setup_table_with_players(admin, p1, p2);
        
        poker_texas_holdem::leave_after_hand(p1, table_addr);
        
        let pending = poker_texas_holdem::get_pending_leaves(table_addr);
        assert!(*std::vector::borrow(&pending, 0) == true, 1);
    }

    #[test(admin = @NovaWalletGames, p1 = @0xAAA, p2 = @0xBBB)]
    fun test_cancel_leave_after_hand(admin: &signer, p1: &signer, p2: &signer) {
        let table_addr = setup_table_with_players(admin, p1, p2);
        
        poker_texas_holdem::leave_after_hand(p1, table_addr);
        poker_texas_holdem::cancel_leave_after_hand(p1, table_addr);
        
        let pending = poker_texas_holdem::get_pending_leaves(table_addr);
        assert!(*std::vector::borrow(&pending, 0) == false, 1);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    #[test(admin = @NovaWalletGames, p1 = @0xAAA, p2 = @0xBBB)]
    fun test_get_table_state(admin: &signer, p1: &signer, p2: &signer) {
        let table_addr = setup_table_with_players(admin, p1, p2);
        
        let (hand_number, dealer_button, _, _) = poker_texas_holdem::get_table_state(table_addr);
        assert!(hand_number == 0, 1);
        assert!(dealer_button == 0, 2);
    }

    #[test(admin = @NovaWalletGames, p1 = @0xAAA, p2 = @0xBBB)]
    fun test_get_seat_count(admin: &signer, p1: &signer, p2: &signer) {
        let table_addr = setup_table_with_players(admin, p1, p2);
        
        let (occupied, total) = poker_texas_holdem::get_seat_count(table_addr);
        assert!(occupied == 2, 1);
        assert!(total == 5, 2);
    }

    // ============================================
    // MISSED BLINDS TRACKING
    // ============================================

    #[test(admin = @NovaWalletGames, player = @0xBEEF)]
    fun test_sit_out_records_missed_blind(admin: &signer, player: &signer) {
        chips::init_for_test(admin);
        poker_texas_holdem::create_table(admin, 5, 10, 50, 1000, 0, false, 5, 0, string::utf8(b"Blind Test"), 0);
        
        let table_addr = poker_texas_holdem::get_table_address(signer::address_of(admin));
        let player_addr = signer::address_of(player);
        chips::mint_test_chips(player_addr, 500);
        poker_texas_holdem::join_table(player, table_addr, 0, 200);
        
        // Sit out should record missed blind
        poker_texas_holdem::sit_out(player, table_addr);
        
        // Check missed blinds recorded (should be big blind = 10)
        let missed = poker_texas_holdem::get_missed_blinds(table_addr);
        assert!(*std::vector::borrow(&missed, 0) == 10, 1);
    }

    #[test(admin = @NovaWalletGames, player = @0xBEEF)]
    fun test_sit_in_collects_missed_blind(admin: &signer, player: &signer) {
        chips::init_for_test(admin);
        poker_texas_holdem::create_table(admin, 5, 10, 50, 1000, 0, false, 5, 0, string::utf8(b"Sit Test"), 0);
        
        let table_addr = poker_texas_holdem::get_table_address(signer::address_of(admin));
        let player_addr = signer::address_of(player);
        chips::mint_test_chips(player_addr, 500);
        poker_texas_holdem::join_table(player, table_addr, 0, 200);
        
        // Sit out (records missed blind)
        poker_texas_holdem::sit_out(player, table_addr);
        
        // Check stack before sit_in
        let (_, chips_before, _) = poker_texas_holdem::get_seat_info(table_addr, 0);
        assert!(chips_before == 200, 1);
        
        // Sit in (should collect missed blind)
        poker_texas_holdem::sit_in(player, table_addr);
        
        // Check stack after sit_in (should be reduced by big blind)
        let (_, chips_after, _) = poker_texas_holdem::get_seat_info(table_addr, 0);
        assert!(chips_after == 190, 2); // 200 - 10 (big blind)
        
        // Missed blinds should be cleared
        let missed = poker_texas_holdem::get_missed_blinds(table_addr);
        assert!(*std::vector::borrow(&missed, 0) == 0, 3);
    }

    // ============================================
    // DEAD MONEY (MISSED BLINDS TO POT)
    // ============================================

    #[test(admin = @NovaWalletGames)]
    fun test_dead_money_starts_at_zero(admin: &signer) {
        chips::init_for_test(admin);
        poker_texas_holdem::create_table(admin, 5, 10, 50, 1000, 0, false, 5, 0, string::utf8(b"Dead Zero"), 0);
        
        let table_addr = poker_texas_holdem::get_table_address(signer::address_of(admin));
        
        // Dead money should be zero on new table
        let dead = poker_texas_holdem::get_dead_money(table_addr);
        assert!(dead == 0, 1);
    }

    #[test(admin = @NovaWalletGames, player = @0xBEEF)]
    fun test_sit_in_adds_missed_blind_to_dead_money(admin: &signer, player: &signer) {
        chips::init_for_test(admin);
        poker_texas_holdem::create_table(admin, 5, 10, 50, 1000, 0, false, 5, 0, string::utf8(b"Dead Money"), 0);
        
        let table_addr = poker_texas_holdem::get_table_address(signer::address_of(admin));
        let player_addr = signer::address_of(player);
        chips::mint_test_chips(player_addr, 500);
        poker_texas_holdem::join_table(player, table_addr, 0, 200);
        
        // Sit out (records missed blind)
        poker_texas_holdem::sit_out(player, table_addr);
        
        // Verify dead money is still zero (only accumulated on sit_in)
        assert!(poker_texas_holdem::get_dead_money(table_addr) == 0, 1);
        
        // Sit in (should collect missed blind AND add to dead money)
        poker_texas_holdem::sit_in(player, table_addr);
        
        // Dead money should now equal the big blind (10)
        let dead = poker_texas_holdem::get_dead_money(table_addr);
        assert!(dead == 10, 2);
        
        // Player stack should be reduced
        let (_, chips_after, _) = poker_texas_holdem::get_seat_info(table_addr, 0);
        assert!(chips_after == 190, 3); // 200 - 10
    }

    #[test(admin = @NovaWalletGames, p1 = @0xAAA, p2 = @0xBBB)]
    fun test_dead_money_accumulates_from_multiple_players(admin: &signer, p1: &signer, p2: &signer) {
        let table_addr = setup_table_with_players(admin, p1, p2);
        
        // Both players sit out
        poker_texas_holdem::sit_out(p1, table_addr);
        poker_texas_holdem::sit_out(p2, table_addr);
        
        // Both sit back in
        poker_texas_holdem::sit_in(p1, table_addr);
        poker_texas_holdem::sit_in(p2, table_addr);
        
        // Dead money should be 2 * big blind (10 + 10 = 20)
        let dead = poker_texas_holdem::get_dead_money(table_addr);
        assert!(dead == 20, 1);
    }

    #[test(admin = @NovaWalletGames, p1 = @0xAAA, p2 = @0xBBB, framework = @0x1)]
    fun test_dead_money_stays_table_level_while_hand_in_progress(
        admin: &signer,
        p1: &signer,
        p2: &signer,
        framework: &signer
    ) {
        let table_addr = setup_hand_with_dead_money(admin, p1, p2, framework);

        // Dead money should remain table-level while hand is in progress.
        assert!(poker_texas_holdem::get_dead_money(table_addr) == 10, 1);
        // No player bets are posted in commit phase.
        let max_bet = poker_texas_holdem::get_max_current_bet(table_addr);
        assert!(max_bet == 0, 2);
    }

    #[test(admin = @NovaWalletGames, p1 = @0xAAA, p2 = @0xBBB, framework = @0x1)]
    fun test_abort_refund_excludes_dead_money_from_bb(
        admin: &signer,
        p1: &signer,
        p2: &signer,
        framework: &signer
    ) {
        let table_addr = setup_hand_with_dead_money(admin, p1, p2, framework);

        // Pause the hand via unanimous abort.
        poker_texas_holdem::request_abort(admin, table_addr);
        poker_texas_holdem::vote_abort(p1, table_addr, true);
        poker_texas_holdem::vote_abort(p2, table_addr, true);
        poker_texas_holdem::finalize_abort(admin, table_addr);

        // Player 1 paid one missed big blind before the hand and must not receive it back on abort.
        // Starting seat stacks after sit_in: p1=190, p2=200.
        let (_, p1_stack, _) = poker_texas_holdem::get_seat_info(table_addr, 0);
        let (_, p2_stack, _) = poker_texas_holdem::get_seat_info(table_addr, 1);
        assert!(p1_stack == 190, 2);
        assert!(p2_stack == 200, 3);
    }
}
