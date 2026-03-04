#[test_only]
module NovaWalletGames::chips_governance_tests {
    use std::signer;
    use NovaWalletGames::chips;
    use NovaWalletGames::games_treasury;

    // Actions
    const ACTION_SET_SECONDARY_ADMIN: u8 = 2;
    const ACTION_SET_TERTIARY_ADMIN: u8 = 4;

    fun setup_game(admin: &signer, framework: &signer) {
        cedra_framework::timestamp::set_time_has_started_for_testing(framework);
        chips::init_for_test(admin);
    }

    #[test(admin1 = @NovaWalletGames, admin2 = @0xAD2, admin3 = @0xAD3, framework = @0x1)]
    fun test_governance_bootstrapping(admin1: &signer, admin2: &signer, admin3: &signer, framework: &signer) {
        setup_game(admin1, framework);
        
        let admin2_addr = signer::address_of(admin2);
        let admin3_addr = signer::address_of(admin3);
        
        // 1. Initial State: Only Primary Admin exists
        // Primary can self-approve "Set Secondary"
        games_treasury::initiate_governance_action(admin1, ACTION_SET_SECONDARY_ADMIN, admin2_addr);
        games_treasury::approve_governance_action(admin1, 1);
        
        // Now Secondary Admin is set.
        // 2. Set Tertiary Admin (Requires 2-of-2)
        // Admin 1 initiates
        games_treasury::initiate_governance_action(admin1, ACTION_SET_TERTIARY_ADMIN, admin3_addr);
        
        // Admin 2 approves
        games_treasury::approve_governance_action(admin2, 2);
        
        // Now Tertiary Admin is set.
    }
    
    #[test(admin1 = @NovaWalletGames, admin2 = @0xAD2, admin3 = @0xAD3, framework = @0x1)]
    #[expected_failure(abort_code = 14, location = NovaWalletGames::games_treasury)] // E_SELF_APPROVAL
    fun test_fail_self_approval_when_others_exist(admin1: &signer, admin2: &signer, admin3: &signer, framework: &signer) {
        setup_game(admin1, framework);
        let admin2_addr = signer::address_of(admin2);
        let admin3_addr = signer::address_of(admin3);
        
        // Bootstrap Secondary
        games_treasury::initiate_governance_action(admin1, ACTION_SET_SECONDARY_ADMIN, admin2_addr);
        games_treasury::approve_governance_action(admin1, 1);
        
        // Try to Set Tertiary with self-approval
        games_treasury::initiate_governance_action(admin1, ACTION_SET_TERTIARY_ADMIN, admin3_addr);
        games_treasury::approve_governance_action(admin1, 2); // Should abort
    }
}
