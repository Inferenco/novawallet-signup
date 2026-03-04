// ============================================
// Reveal Hole Cards Tests
// ============================================
// Tests for the opt-in hole card reveal feature (audit trail)

#[test_only]
module NovaWalletGames::reveal_tests {
    use std::signer;
    use std::string;
    use NovaWalletGames::poker_texas_holdem;
    use NovaWalletGames::chips;

    // Helper to setup a game environment and return table Object address
    fun setup_table(admin: &signer): address {
        chips::init_for_test(admin);
        
        // Create table with 5/10 blinds, min 50 max 1000 buy-in
        poker_texas_holdem::create_table(admin, 5, 10, 50, 1000, 0, false, 5, 0, string::utf8(b"Reveal Test"), 0);
        poker_texas_holdem::get_table_address(signer::address_of(admin))
    }

    #[test(admin = @NovaWalletGames)]
    fun test_table_setup_for_reveal(admin: &signer) {
        // Basic sanity check that table creation works
        let table_addr = setup_table(admin);
        let (small, big, _, _) = poker_texas_holdem::get_table_config(table_addr);
        assert!(small == 5, 1);
        assert!(big == 10, 2);
    }

    // Note: Full reveal_hole_cards tests require:
    // - Active game (timestamp module not available in unit tests)
    // - Folded player status
    // - Encrypted hole cards
    // 
    // These must be tested on-chain via CLI or integration tests.
    // Unit tests here validate basic setup works.
}
