#[test_only]
module NovaWalletGames::core_events_tests {
    use std::string;
    use cedra_framework::timestamp;
    use NovaWalletGames::core_events;
    use NovaWalletGames::game_registry;

    #[test(admin = @NovaWalletGames, framework = @0x1)]
    fun test_emit_with_valid_capability(admin: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test_secs(100);

        game_registry::init_for_test(admin);
        let cap = game_registry::register_game(admin, string::utf8(b"Events Test"), false);

        core_events::emit_table_created(
            &cap,
            @0xA11CE,
            @0xB0B,
            string::utf8(b"Table Alpha"),
            50,
            500,
            5,
        );
    }

    #[test]
    #[expected_failure(abort_code = 8, location = NovaWalletGames::game_registry)] // E_INVALID_CAPABILITY
    fun test_emit_rejects_invalid_capability() {
        let fake_cap = game_registry::create_test_capability(999, string::utf8(b"Fake"));
        core_events::emit_table_closed(&fake_cap, @0xA11CE, @0xB0B);
    }
}
