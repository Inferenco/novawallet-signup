#[test_only]
module NovaWalletGames::core_stats_tests {
    use std::string;
    use std::signer;
    use cedra_framework::timestamp;
    use NovaWalletGames::game_registry;
    use NovaWalletGames::core_stats;

    // ============================================
    // CORE STATS TESTS
    // ============================================

    #[test(player = @0x123, framework = @0x1)]
    fun test_initialize_stats(player: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        
        // Initialize
        core_stats::init_for_test(player);
        
        assert!(core_stats::has_stats(signer::address_of(player)), 0);
        
        // Check initial values
        let (rounds_played, rounds_won, total_winnings, biggest_win, last_played) = 
            core_stats::get_stats(signer::address_of(player));
        
        assert!(rounds_played == 0, 1);
        assert!(rounds_won == 0, 2);
        assert!(total_winnings == 0, 3);
        assert!(biggest_win == 0, 4);
        assert!(last_played == 0, 5);
    }

    #[test(admin = @NovaWalletGames, player = @0x123, framework = @0x1)]
    fun test_record_participation(admin: &signer, player: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        
        game_registry::init_for_test(admin);
        let cap = game_registry::register_game(admin, string::utf8(b"Test Game"), false);
        
        core_stats::init_for_test(player);
        let player_addr = signer::address_of(player);
        
        // Record participation
        core_stats::record_participation(&cap, player_addr);
        
        let (rounds_played, _, _, _, last_played) = core_stats::get_stats(player_addr);
        assert!(rounds_played == 1, 0);
        assert!(last_played == 100, 1);
        
        // Check game-specific stats
        let (game_rounds_played, _, _, _, first_played, game_last_played) = 
            core_stats::get_game_stats(player_addr, 1);
        assert!(game_rounds_played == 1, 2);
        assert!(first_played == 100, 3);
        assert!(game_last_played == 100, 4);
    }

    #[test(admin = @NovaWalletGames, player = @0x123, framework = @0x1)]
    fun test_record_win(admin: &signer, player: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        
        game_registry::init_for_test(admin);
        let cap = game_registry::register_game(admin, string::utf8(b"Test Game"), false);
        
        core_stats::init_for_test(player);
        let player_addr = signer::address_of(player);
        
        // Record a win
        core_stats::record_win(&cap, player_addr, 500);
        
        let (_, rounds_won, total_winnings, biggest_win, _) = core_stats::get_stats(player_addr);
        assert!(rounds_won == 1, 0);
        assert!(total_winnings == 500, 1);
        assert!(biggest_win == 500, 2);
    }

    #[test(admin = @NovaWalletGames, player = @0x123, framework = @0x1)]
    fun test_multiple_wins_updates_biggest(admin: &signer, player: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        
        game_registry::init_for_test(admin);
        let cap = game_registry::register_game(admin, string::utf8(b"Test Game"), false);
        
        core_stats::init_for_test(player);
        let player_addr = signer::address_of(player);
        
        // Record multiple wins
        core_stats::record_win(&cap, player_addr, 300);
        core_stats::record_win(&cap, player_addr, 1000);
        core_stats::record_win(&cap, player_addr, 200);
        
        let (_, rounds_won, total_winnings, biggest_win, _) = core_stats::get_stats(player_addr);
        assert!(rounds_won == 3, 0);
        assert!(total_winnings == 1500, 1);
        assert!(biggest_win == 1000, 2); // Biggest win stays at 1000
    }

    #[test(admin = @NovaWalletGames, player = @0x123, framework = @0x1)]
    fun test_multiple_games_stats(admin: &signer, player: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        
        game_registry::init_for_test(admin);
        let cap1 = game_registry::register_game(admin, string::utf8(b"Game 1"), false);
        let cap2 = game_registry::register_game(admin, string::utf8(b"Game 2"), false);
        
        core_stats::init_for_test(player);
        let player_addr = signer::address_of(player);
        
        // Play game 1
        core_stats::record_participation(&cap1, player_addr);
        core_stats::record_win(&cap1, player_addr, 500);
        
        // Play game 2
        timestamp::update_global_time_for_test_secs(200);
        core_stats::record_participation(&cap2, player_addr);
        core_stats::record_participation(&cap2, player_addr);
        core_stats::record_win(&cap2, player_addr, 800);
        
        // Check aggregate stats
        let (rounds_played, rounds_won, total_winnings, biggest_win, _) = 
            core_stats::get_stats(player_addr);
        assert!(rounds_played == 3, 0); // 1 from game1, 2 from game2
        assert!(rounds_won == 2, 1);
        assert!(total_winnings == 1300, 2);
        assert!(biggest_win == 800, 3);
        
        // Check game 1 specific stats
        let (g1_played, g1_won, g1_winnings, g1_biggest, _, _) = 
            core_stats::get_game_stats(player_addr, 1);
        assert!(g1_played == 1, 4);
        assert!(g1_won == 1, 5);
        assert!(g1_winnings == 500, 6);
        assert!(g1_biggest == 500, 7);
        
        // Check game 2 specific stats
        let (g2_played, g2_won, g2_winnings, g2_biggest, _, _) = 
            core_stats::get_game_stats(player_addr, 2);
        assert!(g2_played == 2, 8);
        assert!(g2_won == 1, 9);
        assert!(g2_winnings == 800, 10);
        assert!(g2_biggest == 800, 11);
    }

    #[test(admin = @NovaWalletGames, player = @0x123, framework = @0x1)]
    fun test_win_rate_calculation(admin: &signer, player: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        
        game_registry::init_for_test(admin);
        let cap = game_registry::register_game(admin, string::utf8(b"Test Game"), false);
        
        core_stats::init_for_test(player);
        let player_addr = signer::address_of(player);
        
        // 10 rounds played, 5 won = 50% win rate
        let i = 0;
        while (i < 10) {
            core_stats::record_participation(&cap, player_addr);
            if (i < 5) {
                core_stats::record_win(&cap, player_addr, 100);
            };
            i = i + 1;
        };
        
        let win_rate = core_stats::get_game_win_rate(player_addr, 1);
        assert!(win_rate == 5000, 0); // 50.00% * 100 = 5000
        
        let overall_rate = core_stats::get_overall_win_rate(player_addr);
        assert!(overall_rate == 5000, 1);
    }

    #[test(player = @0x123)]
    fun test_stats_not_initialized_returns_zeros(player: &signer) {
        let player_addr = signer::address_of(player);
        
        // Without initialization, should return zeros
        let (rounds_played, rounds_won, total_winnings, biggest_win, last_played) = 
            core_stats::get_stats(player_addr);
        
        assert!(rounds_played == 0, 0);
        assert!(rounds_won == 0, 1);
        assert!(total_winnings == 0, 2);
        assert!(biggest_win == 0, 3);
        assert!(last_played == 0, 4);
        
        // Game-specific should also return zeros
        let (g_played, g_won, g_winnings, g_biggest, g_first, g_last) = 
            core_stats::get_game_stats(player_addr, 1);
        
        assert!(g_played == 0, 5);
        assert!(g_won == 0, 6);
        assert!(g_winnings == 0, 7);
        assert!(g_biggest == 0, 8);
        assert!(g_first == 0, 9);
        assert!(g_last == 0, 10);
    }

    #[test(admin = @NovaWalletGames, player = @0x123, framework = @0x1)]
    fun test_record_without_init_is_noop(admin: &signer, player: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        
        game_registry::init_for_test(admin);
        let cap = game_registry::register_game(admin, string::utf8(b"Test Game"), false);
        
        let player_addr = signer::address_of(player);
        
        // Record without initialization - should not fail, just no-op
        core_stats::record_participation(&cap, player_addr);
        core_stats::record_win(&cap, player_addr, 500);
        
        // Stats still don't exist
        assert!(!core_stats::has_stats(player_addr), 0);
    }

    #[test(admin = @NovaWalletGames, player = @0x123)]
    #[expected_failure(abort_code = 8, location = NovaWalletGames::game_registry)] // E_INVALID_CAPABILITY
    fun test_rejects_invalid_capability_for_record_participation(admin: &signer, player: &signer) {
        core_stats::init_for_test(player);
        let fake_cap = game_registry::create_test_capability(999, string::utf8(b"Fake"));
        core_stats::record_participation(&fake_cap, signer::address_of(player));

        // Suppress unused warning in case behavior changes.
        let _ = admin;
    }

    #[test(admin = @NovaWalletGames, player = @0x123, framework = @0x1)]
    #[expected_failure(abort_code = 8, location = NovaWalletGames::game_registry)] // E_INVALID_CAPABILITY
    fun test_rejects_deactivated_capability_for_try_initialize(admin: &signer, player: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);

        game_registry::init_for_test(admin);
        let cap = game_registry::register_game(admin, string::utf8(b"Test Game"), false);
        game_registry::deactivate_game(admin, 1);

        core_stats::try_initialize_for_player(&cap, player);
    }

    #[test(admin = @NovaWalletGames, player = @0x123, framework = @0x1)]
    #[expected_failure(abort_code = 8, location = NovaWalletGames::game_registry)] // E_INVALID_CAPABILITY
    fun test_rejects_deactivated_capability_for_record_win(admin: &signer, player: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);

        game_registry::init_for_test(admin);
        let cap = game_registry::register_game(admin, string::utf8(b"Test Game"), false);
        core_stats::init_for_test(player);
        game_registry::deactivate_game(admin, 1);

        core_stats::record_win(&cap, signer::address_of(player), 100);
    }
}
