#[test_only]
module NovaWalletGames::poker_player_stats_tests {
    use std::signer;
    use std::vector;
    use NovaWalletGames::poker_player_stats;

    use cedra_framework::account;

    #[test(player = @0x123)]
    fun test_stats_tracking_logic(player: &signer) {
        // Initialize timestamp for testing
        cedra_framework::timestamp::set_time_has_started_for_testing(&account::create_signer_for_test(@0x1));
        
        let player_addr = signer::address_of(player);
        poker_player_stats::try_initialize(player);

        // 1. Initial State
        let (reached, won, best, histogram) = poker_player_stats::get_detailed_stats(player_addr);
        assert!(reached == 0, 1);
        assert!(won == 0, 2);
        assert!(best == 0, 3);
        assert!(*vector::borrow(&histogram, 0) == 0, 4);

        // 2. Plays a hand: High Card (Rank 0) - Loss
        poker_player_stats::record_participation(player_addr);
        poker_player_stats::record_showdown_participation(player_addr, 0); // High Card
        // No win recorded

        let (_, _, best, _) = poker_player_stats::get_detailed_stats(player_addr);
        assert!(best == 0, 5); // Still high card

        // 3. Plays a hand: Fluxh (Rank 5) - Win
        poker_player_stats::record_participation(player_addr);
        poker_player_stats::record_showdown_participation(player_addr, 5); // Flush
        poker_player_stats::record_showdown_win(player_addr);
        poker_player_stats::record_win(player_addr, 1000, 5); // Won 1000 with Flush

        let (reached, won, best, histogram) = poker_player_stats::get_detailed_stats(player_addr);
        assert!(reached == 2, 6);
        assert!(won == 1, 7);
        assert!(best == 5, 8); // Best is now Flush
        assert!(*vector::borrow(&histogram, 5) == 1, 9); // 1 Flush win

        // 4. Plays a hand: Pair (Rank 1) - Win
        // IMPORTANT: Verify that a LOWER rank win doesn't downgrade "Best Hand"
        poker_player_stats::record_participation(player_addr);
        poker_player_stats::record_showdown_participation(player_addr, 1); // Pair
        poker_player_stats::record_showdown_win(player_addr);
        poker_player_stats::record_win(player_addr, 500, 1); // Won 500 with Pair

        let (reached, won, best, histogram) = poker_player_stats::get_detailed_stats(player_addr);
        assert!(reached == 3, 10);
        assert!(won == 2, 11);
        assert!(best == 5, 12); // Best should stay Flush (5), NOT downgrade to Pair (1)
        assert!(*vector::borrow(&histogram, 1) == 1, 13); // 1 Pair win
        assert!(*vector::borrow(&histogram, 5) == 1, 14); // Still 1 Flush win

        // 5. Total Winnings Check
        let (_, _, _, total, biggest) = poker_player_stats::get_stats(player_addr);
        assert!(total == 1500, 15); // 1000 + 500
        assert!(biggest == 1000, 16); // Biggest single win
    }
}
