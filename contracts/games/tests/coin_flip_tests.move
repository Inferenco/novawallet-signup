#[test_only]
module NovaWalletGames::coin_flip_tests {
    use std::signer;
    use cedra_framework::randomness;
    use cedra_framework::timestamp;
    use NovaWalletGames::chips;
    use NovaWalletGames::coin_flip;
    use NovaWalletGames::game_registry;

    const E_ALREADY_REGISTERED: u64 = 1;
    const E_NOT_REGISTERED: u64 = 2;
    const E_ZERO_BET: u64 = 3;
    const E_HOUSE_INSUFFICIENT: u64 = 4;

    const INITIAL_CHIP_TREASURY_BALANCE: u64 = 10_000_000_000;

    fun setup(framework: &signer, fx: &signer, admin: &signer, player: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);
        randomness::initialize_for_testing(fx);

        game_registry::init_for_test(admin);
        chips::init_for_test(admin);
        coin_flip::register_game(admin);

        chips::mint_test_chips(signer::address_of(player), 10_000);
    }

    #[test(admin = @NovaWalletGames, player = @0x123, framework = @0x1, fx = @cedra_framework)]
    fun test_registers_treasury_enabled_game(admin: &signer, player: &signer, framework: &signer, fx: &signer) {
        setup(framework, fx, admin, player);

        assert!(coin_flip::is_registered(), 0);
        assert!(coin_flip::get_game_id() == 1, 1);
        assert!(game_registry::game_requires_treasury(1), 2);
    }

    #[test(admin = @NovaWalletGames, framework = @0x1)]
    #[expected_failure(abort_code = E_ALREADY_REGISTERED, location = NovaWalletGames::coin_flip)]
    fun test_register_twice_fails(admin: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);

        game_registry::init_for_test(admin);
        coin_flip::register_game(admin);
        coin_flip::register_game(admin);
    }

    #[test(player = @0x123)]
    #[expected_failure(abort_code = E_NOT_REGISTERED, location = NovaWalletGames::coin_flip)]
    fun test_play_without_register_fails(player: &signer) {
        coin_flip::play_for_test(player, true, 100);
    }

    #[test(admin = @NovaWalletGames, player = @0x123, framework = @0x1, fx = @cedra_framework)]
    #[expected_failure(abort_code = E_ZERO_BET, location = NovaWalletGames::coin_flip)]
    fun test_zero_bet_fails(admin: &signer, player: &signer, framework: &signer, fx: &signer) {
        setup(framework, fx, admin, player);
        coin_flip::play_for_test(player, true, 0);
    }

    #[test(admin = @NovaWalletGames, player = @0x123, framework = @0x1, fx = @cedra_framework)]
    #[expected_failure(abort_code = E_HOUSE_INSUFFICIENT, location = NovaWalletGames::coin_flip)]
    fun test_house_insufficient_fails(admin: &signer, player: &signer, framework: &signer, fx: &signer) {
        setup(framework, fx, admin, player);

        let player_addr = signer::address_of(player);
        chips::mint_test_chips(player_addr, INITIAL_CHIP_TREASURY_BALANCE);
        coin_flip::play_for_test(player, false, INITIAL_CHIP_TREASURY_BALANCE + 1);
    }

    #[test(admin = @NovaWalletGames, player = @0x123, framework = @0x1, fx = @cedra_framework)]
    fun test_play_updates_balances_and_stats(admin: &signer, player: &signer, framework: &signer, fx: &signer) {
        setup(framework, fx, admin, player);

        let player_addr = signer::address_of(player);
        let player_before = chips::balance(player_addr);
        let house_before = chips::get_chip_treasury_balance();

        coin_flip::play_for_test(player, true, 1000);

        let player_after = chips::balance(player_addr);
        let house_after = chips::get_chip_treasury_balance();
        let (flips, total_bet_volume, total_payout_volume) = coin_flip::get_game_stats();

        assert!(player_after + house_after == player_before + house_before, 0);
        assert!(player_after == player_before - 1000 || player_after == player_before + 1000, 1);
        assert!(house_after == house_before + 1000 || house_after == house_before - 1000, 2);
        assert!(flips == 1, 3);
        assert!(coin_flip::get_round_nonce() == 1, 4);
        assert!(total_bet_volume == (1000 as u128), 5);
        assert!(total_payout_volume == 0 || total_payout_volume == (2000 as u128), 6);
    }
}
