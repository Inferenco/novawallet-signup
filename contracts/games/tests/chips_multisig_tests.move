#[test_only]
module NovaWalletGames::chips_multisig_tests {
    use std::signer;
    use std::option;
    use cedra_framework::timestamp;
    use cedra_framework::cedra_coin;
    use cedra_framework::coin;
    use NovaWalletGames::chips;
    use NovaWalletGames::games_treasury;

    /// Octas per CEDRA
    const OCTAS_PER_CEDRA: u64 = 100_000_000;
    
    // Error codes from games_treasury.move
    const E_SELF_APPROVAL: u64 = 14; 
    const E_REQUEST_EXPIRED: u64 = 18;

    fun setup(framework: &signer, admin: &signer, user: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        
        // Init coin
        if (!coin::is_coin_initialized<cedra_coin::CedraCoin>()) {
            let (burn_cap, mint_cap) = cedra_coin::initialize_for_test(framework);
            coin::register<cedra_coin::CedraCoin>(framework);
            // Mint 1B CEDRA to framework
            let coins = coin::mint(1_000_000_000 * OCTAS_PER_CEDRA, &mint_cap);
            coin::deposit(signer::address_of(framework), coins);
            
            coin::destroy_burn_cap(burn_cap);
            coin::destroy_mint_cap(mint_cap);
        };
        
        coin::register<cedra_coin::CedraCoin>(admin);
        coin::register<cedra_coin::CedraCoin>(user);
        
        // Fund admin
        coin::transfer<cedra_coin::CedraCoin>(framework, signer::address_of(admin), 1000 * OCTAS_PER_CEDRA);
        
        chips::init_for_test(admin);
    }

    #[test(admin = @NovaWalletGames, sec_admin = @0x456, framework = @0x1)]
    fun test_multisig_success_flow(admin: &signer, sec_admin: &signer, framework: &signer) {
        setup(framework, admin, sec_admin);
        let sec_addr = signer::address_of(sec_admin);
        
        games_treasury::set_admins_for_test(signer::address_of(admin), option::some(sec_addr), option::none());
        
        // Deposit 100 CEDRA to treasury
        let deposit_amount = 100 * OCTAS_PER_CEDRA;
        games_treasury::deposit_treasury(admin, deposit_amount);
        
        assert!(games_treasury::get_treasury_balance() == deposit_amount, 0);

        // Initiate Withdrawal (Primary)
        let withdraw_amount = 50 * OCTAS_PER_CEDRA;
        games_treasury::initiate_treasury_withdrawal(admin, withdraw_amount);
        
        // Approve Withdrawal (Secondary)
        let recipient_bal_before = coin::balance<cedra_coin::CedraCoin>(games_treasury::get_treasury_recipient());
        games_treasury::approve_treasury_withdrawal(sec_admin, 1);
        
        // Verify
        let treasury_after = games_treasury::get_treasury_balance();
        assert!(treasury_after == deposit_amount - withdraw_amount, 1);
        
        let recipient_bal_after = coin::balance<cedra_coin::CedraCoin>(games_treasury::get_treasury_recipient());
        assert!(recipient_bal_after == recipient_bal_before + withdraw_amount, 2);
    }

    #[test(admin = @NovaWalletGames, sec_admin = @0x456, framework = @0x1)]
    #[expected_failure(abort_code = E_SELF_APPROVAL, location = NovaWalletGames::games_treasury)]
    fun test_multisig_self_approval_fail_when_secondary_exists(admin: &signer, sec_admin: &signer, framework: &signer) {
        setup(framework, admin, sec_admin);
        let sec_addr = signer::address_of(sec_admin);
        
        games_treasury::set_admins_for_test(signer::address_of(admin), option::some(sec_addr), option::none());
        
        games_treasury::deposit_treasury(admin, 100 * OCTAS_PER_CEDRA);
        
        // Initiate (Primary)
        games_treasury::initiate_treasury_withdrawal(admin, 50 * OCTAS_PER_CEDRA);
        
        // Try Approve (Primary) -> FAIL
        games_treasury::approve_treasury_withdrawal(admin, 1);
    }

    #[test(admin = @NovaWalletGames, framework = @0x1)]
    fun test_single_admin_success(admin: &signer, framework: &signer) {
        // Only admin, no sec_admin passed
        // We need a dummy user to fund
        // Hack: pass admin as user too, shouldn't matter for setup
        setup(framework, admin, admin); 
        
        // Ensure NO secondary admin
        assert!(!games_treasury::has_secondary_admin(), 0);
        
        games_treasury::deposit_treasury(admin, 100 * OCTAS_PER_CEDRA);
        
        // Initiate (Primary)
        games_treasury::initiate_treasury_withdrawal(admin, 50 * OCTAS_PER_CEDRA);
        
        // Approve (Primary) -> SUCCESS (Exception for single admin)
        games_treasury::approve_treasury_withdrawal(admin, 1);
        
        assert!(games_treasury::get_treasury_balance() == 50 * OCTAS_PER_CEDRA, 1);
    }

    #[test(admin = @NovaWalletGames, framework = @0x1)]
    #[expected_failure(abort_code = E_REQUEST_EXPIRED, location = NovaWalletGames::games_treasury)]
    fun test_withdrawal_request_expired(admin: &signer, framework: &signer) {
        setup(framework, admin, admin);
        
        games_treasury::deposit_treasury(admin, 100 * OCTAS_PER_CEDRA);
        games_treasury::initiate_treasury_withdrawal(admin, 50 * OCTAS_PER_CEDRA);
        
        timestamp::update_global_time_for_test_secs(3601);
        games_treasury::approve_treasury_withdrawal(admin, 1);
    }

    // #[test(admin = @NovaWalletGames, sec_admin = @0x456, framework = @0x1)]
    // fun test_cancel_flow(admin: &signer, sec_admin: &signer, framework: &signer) {
    //     setup(framework, admin, sec_admin);
    //     let sec_addr = signer::address_of(sec_admin);
    //     chips::set_admins_for_test(signer::address_of(admin), option::some(sec_addr), option::none());
    //     
    //     chips::deposit_treasury(admin, 100 * OCTAS_PER_CEDRA);
    //     
    //     // Initiate
    //     chips::initiate_treasury_withdrawal(admin, 50 * OCTAS_PER_CEDRA);
    //     
    //     // Cancel (Primary)
    //     // chips::cancel_treasury_withdrawal(admin, 1);
    //     
    //     // Try Approve -> FAIL (Not Found) or via explicit check
    // }

    // #[test(admin = @NovaWalletGames, sec_admin = @0x456, framework = @0x1)]
    // #[expected_failure(abort_code = 15, location = NovaWalletGames::chips)] // E_REQUEST_NOT_FOUND
    // fun test_approve_cancelled_request(admin: &signer, sec_admin: &signer, framework: &signer) {
    //     setup(framework, admin, sec_admin);
    //     let sec_addr = signer::address_of(sec_admin);
    //     chips::set_admins_for_test(signer::address_of(admin), option::some(sec_addr), option::none());
    //     
    //     chips::deposit_treasury(admin, 100 * OCTAS_PER_CEDRA);
    //     
    //     chips::initiate_treasury_withdrawal(admin, 50 * OCTAS_PER_CEDRA);
    //     // chips::cancel_treasury_withdrawal(admin, 1);
    //     
    //     // Try approve
    //     chips::approve_treasury_withdrawal(sec_admin, 1);
    // }
}
