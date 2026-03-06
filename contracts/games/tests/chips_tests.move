#[test_only]
module NovaWalletGames::chips_tests {
    use std::signer;
    use std::string;
    use std::vector;
    use cedra_framework::timestamp;
    use cedra_framework::cedra_coin;
    use cedra_framework::coin;
    use NovaWalletGames::chips;
    use NovaWalletGames::games_treasury;
    use NovaWalletGames::gaming_consent;

    /// Octas per CEDRA
    const OCTAS_PER_CEDRA: u64 = 100_000_000;
    const INITIAL_CHIP_TREASURY_BALANCE: u64 = 10_000_000_000;

    // Error codes from chips.move
    const E_ALREADY_CLAIMED_THIS_PERIOD: u64 = 9;
    const E_NOT_ADMIN: u64 = 3;
    const E_INVALID_MULTIPLIER: u64 = 16;
    const E_CANNOT_DOWNGRADE: u64 = 17;
    const E_TERMS_NOT_ACKNOWLEDGED: u64 = 18;

    fun setup_without_ack(framework: &signer, admin: &signer, user: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100); // Ensure non-zero time

        if (!coin::is_coin_initialized<cedra_coin::CedraCoin>()) {
            let (burn_cap, mint_cap) = cedra_coin::initialize_for_test(framework);
            coin::register<cedra_coin::CedraCoin>(framework);
            let coins = coin::mint(1_000_000_000 * OCTAS_PER_CEDRA, &mint_cap);
            coin::deposit(signer::address_of(framework), coins);
            coin::destroy_burn_cap(burn_cap);
            coin::destroy_mint_cap(mint_cap);
        };

        coin::register<cedra_coin::CedraCoin>(admin);
        coin::register<cedra_coin::CedraCoin>(user);

        coin::transfer<cedra_coin::CedraCoin>(framework, signer::address_of(admin), 1000 * OCTAS_PER_CEDRA);
        coin::transfer<cedra_coin::CedraCoin>(framework, signer::address_of(user), 1000 * OCTAS_PER_CEDRA);

        gaming_consent::init_for_test(admin);
        chips::init_for_test(admin);
    }

    fun setup(framework: &signer, admin: &signer, user: &signer) {
        setup_without_ack(framework, admin, user);
        gaming_consent::acknowledge_current_terms(user);
    }

    fun configure_default_multiplier(admin: &signer, factor: u8, price: u64, duration: u64) {
        chips::set_multiplier_price(admin, factor, price);
        chips::set_multiplier_duration(admin, duration);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    fun test_chip_treasury_auto_initialized(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        assert!(chips::get_chip_treasury_balance() == INITIAL_CHIP_TREASURY_BALANCE, 0);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    fun test_claim_free_chips_once(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        chips::update_daily_free_chip_amount(admin, 500);
        chips::claim_free_chips(user);

        let balance = chips::balance(signer::address_of(user));
        assert!(balance == 500, 0);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    #[expected_failure(abort_code = E_TERMS_NOT_ACKNOWLEDGED, location = NovaWalletGames::chips)]
    fun test_claim_without_ack_fails(admin: &signer, user: &signer, framework: &signer) {
        setup_without_ack(framework, admin, user);
        chips::claim_free_chips(user);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    #[expected_failure(abort_code = E_TERMS_NOT_ACKNOWLEDGED, location = NovaWalletGames::chips)]
    fun test_purchase_without_ack_fails(admin: &signer, user: &signer, framework: &signer) {
        setup_without_ack(framework, admin, user);
        configure_default_multiplier(admin, 2, 100 * OCTAS_PER_CEDRA, 1000);
        chips::purchase_multiplier(user, 2);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    #[expected_failure(abort_code = E_TERMS_NOT_ACKNOWLEDGED, location = NovaWalletGames::chips)]
    fun test_claim_after_terms_bump_without_reack_fails(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        gaming_consent::set_terms(
            admin,
            string::utf8(b"# Nova Casino Terms v2\n\nUpdated"),
            string::utf8(b"text/markdown"),
        );

        chips::claim_free_chips(user);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    #[expected_failure(abort_code = E_TERMS_NOT_ACKNOWLEDGED, location = NovaWalletGames::chips)]
    fun test_purchase_after_terms_bump_without_reack_fails(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        configure_default_multiplier(admin, 2, 100 * OCTAS_PER_CEDRA, 1000);
        gaming_consent::set_terms(
            admin,
            string::utf8(b"# Nova Casino Terms v2\n\nUpdated"),
            string::utf8(b"text/markdown"),
        );

        chips::purchase_multiplier(user, 2);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    fun test_reack_after_terms_bump_restores_access(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        configure_default_multiplier(admin, 2, 100 * OCTAS_PER_CEDRA, 1000);
        gaming_consent::set_terms(
            admin,
            string::utf8(b"# Nova Casino Terms v2\n\nUpdated"),
            string::utf8(b"text/markdown"),
        );
        gaming_consent::acknowledge_current_terms(user);

        chips::purchase_multiplier(user, 2);
        chips::claim_free_chips(user);

        assert!(chips::balance(signer::address_of(user)) > 0, 0);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    #[expected_failure(abort_code = E_ALREADY_CLAIMED_THIS_PERIOD, location = NovaWalletGames::chips)]
    fun test_claim_free_chips_twice_fails(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        chips::update_daily_free_chip_amount(admin, 1000);
        chips::claim_free_chips(user);

        // Advance slightly but less than the claim period
        timestamp::update_global_time_for_test_secs(1000);
        chips::claim_free_chips(user);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    fun test_claim_after_custom_period(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        chips::update_daily_free_chip_amount(admin, 100);
        chips::set_free_claim_period_seconds(admin, 200);

        chips::claim_free_chips(user); // First claim at t=100
        timestamp::update_global_time_for_test_secs(300); // Advance to t=300 (100 + 200 period)
        chips::claim_free_chips(user); // Second claim should succeed

        let balance = chips::balance(signer::address_of(user));
        assert!(balance == 200, 0);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    fun test_purchase_multiplier_fresh(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        configure_default_multiplier(admin, 2, 100 * OCTAS_PER_CEDRA, 1000);

        let user_addr = signer::address_of(user);
        let before = coin::balance<cedra_coin::CedraCoin>(user_addr);
        chips::purchase_multiplier(user, 2);
        let after = coin::balance<cedra_coin::CedraCoin>(user_addr);

        let (factor, started_at, expires_at) = chips::get_multiplier_status(user_addr);
        assert!(factor == 2, 0);
        assert!(started_at == 100, 1);
        assert!(expires_at == 1100, 2);
        assert!(before - after == 100 * OCTAS_PER_CEDRA, 3);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    fun test_purchase_updates_treasury_balance(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        configure_default_multiplier(admin, 2, 50 * OCTAS_PER_CEDRA, 1000);

        chips::purchase_multiplier(user, 2);
        assert!(games_treasury::get_treasury_balance() == 50 * OCTAS_PER_CEDRA, 0);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    fun test_purchase_multiplier_upgrade(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        configure_default_multiplier(admin, 2, 100 * OCTAS_PER_CEDRA, 1000);
        chips::set_multiplier_price(admin, 4, 300 * OCTAS_PER_CEDRA);

        chips::purchase_multiplier(user, 2);
        timestamp::update_global_time_for_test_secs(500); // time_left = 600
        chips::purchase_multiplier(user, 4);

        // Additional cost = (300 - 100) * 600 / 1000 = 120
        let expected_total = 100 * OCTAS_PER_CEDRA + 120 * OCTAS_PER_CEDRA;
        assert!(games_treasury::get_treasury_balance() == expected_total, 0);

        let (factor, _, expires_at) = chips::get_multiplier_status(signer::address_of(user));
        assert!(factor == 4, 1);
        assert!(expires_at == 1100, 2);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    fun test_multiplier_no_duration_extension(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        configure_default_multiplier(admin, 2, 100 * OCTAS_PER_CEDRA, 1000);
        chips::set_multiplier_price(admin, 4, 300 * OCTAS_PER_CEDRA);

        chips::purchase_multiplier(user, 2);
        let (_, _, expires_before) = chips::get_multiplier_status(signer::address_of(user));

        timestamp::update_global_time_for_test_secs(200);
        chips::purchase_multiplier(user, 4);
        let (_, _, expires_after) = chips::get_multiplier_status(signer::address_of(user));

        assert!(expires_before == expires_after, 0);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    #[expected_failure(abort_code = E_CANNOT_DOWNGRADE, location = NovaWalletGames::chips)]
    fun test_purchase_multiplier_downgrade_fails(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        configure_default_multiplier(admin, 3, 150 * OCTAS_PER_CEDRA, 1000);
        chips::set_multiplier_price(admin, 2, 100 * OCTAS_PER_CEDRA);

        chips::purchase_multiplier(user, 3);
        chips::purchase_multiplier(user, 2);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    #[expected_failure(abort_code = E_INVALID_MULTIPLIER, location = NovaWalletGames::chips)]
    fun test_purchase_invalid_multiplier_fails(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        chips::purchase_multiplier(user, 9);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    fun test_claim_with_active_multiplier(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        chips::update_daily_free_chip_amount(admin, 100);
        configure_default_multiplier(admin, 3, 100 * OCTAS_PER_CEDRA, 1000);

        chips::purchase_multiplier(user, 3);
        chips::claim_free_chips(user);

        let balance = chips::balance(signer::address_of(user));
        assert!(balance == 300, 0);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    fun test_claim_after_multiplier_expires(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        chips::update_daily_free_chip_amount(admin, 100);
        configure_default_multiplier(admin, 2, 100 * OCTAS_PER_CEDRA, 200);

        chips::purchase_multiplier(user, 2);
        timestamp::update_global_time_for_test_secs(500);
        chips::claim_free_chips(user);

        let balance = chips::balance(signer::address_of(user));
        assert!(balance == 100, 0);

        let (factor, started_at, expires_at) = chips::get_multiplier_status(signer::address_of(user));
        assert!(factor == 1, 1);
        assert!(started_at == 0, 2);
        assert!(expires_at == 0, 3);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    fun test_admin_set_multiplier_price(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        chips::set_multiplier_price(admin, 2, 100 * OCTAS_PER_CEDRA);
        let price = chips::get_multiplier_price(2);
        assert!(price == 100 * OCTAS_PER_CEDRA, 0);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    #[expected_failure(abort_code = E_INVALID_MULTIPLIER, location = NovaWalletGames::chips)]
    fun test_admin_remove_multiplier_option(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        // Default options are 2, 3, 4, 5. Remove 2.
        chips::remove_multiplier_option(admin, 2);

        let options = chips::get_multiplier_options();
        assert!(vector::length(&options) == 3, 0); // 3, 4, 5 remain

        chips::purchase_multiplier(user, 2); // Should fail - removed
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    fun test_removed_option_keeps_active_multiplier(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        chips::update_daily_free_chip_amount(admin, 100);
        configure_default_multiplier(admin, 3, 100 * OCTAS_PER_CEDRA, 1000);

        chips::purchase_multiplier(user, 3);
        chips::remove_multiplier_option(admin, 3);
        chips::claim_free_chips(user);

        let balance = chips::balance(signer::address_of(user));
        assert!(balance == 300, 0);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    fun test_admin_set_duration(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        chips::set_multiplier_price(admin, 2, 100 * OCTAS_PER_CEDRA);
        chips::set_multiplier_duration(admin, 500);

        chips::purchase_multiplier(user, 2);
        let (_, _, expires_at) = chips::get_multiplier_status(signer::address_of(user));
        assert!(expires_at == 600, 0);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    #[expected_failure(abort_code = E_NOT_ADMIN, location = NovaWalletGames::chips)]
    fun test_non_admin_cannot_configure(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        chips::set_multiplier_price(user, 2, 100 * OCTAS_PER_CEDRA);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    fun test_multiplier_options_view(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        // Default options: 2, 3, 4, 5 (4 options)
        // Update price for 2 (no duplicate added)
        chips::set_multiplier_price(admin, 2, 150 * OCTAS_PER_CEDRA);
        // Add new option 6
        chips::set_multiplier_price(admin, 6, 600 * OCTAS_PER_CEDRA);

        let options = chips::get_multiplier_options();
        assert!(vector::length(&options) == 5, 0); // 2, 3, 4, 5, 6
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    fun test_upgrade_uses_original_duration(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        configure_default_multiplier(admin, 2, 100 * OCTAS_PER_CEDRA, 1000);
        chips::set_multiplier_price(admin, 4, 300 * OCTAS_PER_CEDRA);

        chips::purchase_multiplier(user, 2);
        timestamp::update_global_time_for_test_secs(300); // time_left = 800

        // Change duration after purchase (should not affect pro-rate)
        chips::set_multiplier_duration(admin, 2000);
        chips::purchase_multiplier(user, 4);

        // Additional cost = (300 - 100) * 800 / 1000 = 160
        let expected_total = 100 * OCTAS_PER_CEDRA + 160 * OCTAS_PER_CEDRA;
        assert!(games_treasury::get_treasury_balance() == expected_total, 0);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    fun test_multiplier_status_view(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        configure_default_multiplier(admin, 2, 100 * OCTAS_PER_CEDRA, 1000);

        chips::purchase_multiplier(user, 2);
        let (factor, started_at, expires_at) = chips::get_multiplier_status(signer::address_of(user));
        assert!(factor == 2, 0);
        assert!(started_at == 100, 1);
        assert!(expires_at == 1100, 2);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    fun test_multiplier_duration_view(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        chips::set_multiplier_duration(admin, 777);
        let duration = chips::get_multiplier_duration();
        assert!(duration == 777, 0);
    }

    #[test(admin = @NovaWalletGames, user = @0x123, framework = @0x1)]
    #[expected_failure(abort_code = E_INVALID_MULTIPLIER, location = NovaWalletGames::chips)]
    fun test_get_multiplier_price(admin: &signer, user: &signer, framework: &signer) {
        setup(framework, admin, user);
        chips::get_multiplier_price(9);
    }
}
