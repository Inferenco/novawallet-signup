/// Games Treasury - shared CEDRA treasury and multisig admin controls for games
///
/// This module stores CEDRA collected from chip multiplier purchases and
/// manages treasury/governance multisig requests. Chip token accounting stays
/// in `chips.move`.
module NovaWalletGames::games_treasury {
    use std::signer;
    use std::option::{Self, Option};
    use std::vector;
    use cedra_framework::timestamp;
    use cedra_framework::object::{Self, ExtendRef};
    use cedra_framework::cedra_coin;
    use cedra_framework::coin;
    use cedra_std::table::{Self, Table};

    // Only chips should collect multiplier payments directly.
    friend NovaWalletGames::chips;

    // ============================================
    // ERROR CODES
    // ============================================

    /// Module already initialized
    const E_ALREADY_INITIALIZED: u64 = 1;
    /// Module not initialized
    const E_NOT_INITIALIZED: u64 = 2;
    /// Caller is not an admin
    const E_NOT_ADMIN: u64 = 3;
    /// Caller is not the primary admin
    const E_NOT_PRIMARY_ADMIN: u64 = 4;
    /// Amount must be greater than zero
    const E_ZERO_AMOUNT: u64 = 6;
    /// Treasury balance is insufficient
    const E_TREASURY_INSUFFICIENT: u64 = 7;
    /// Self-approval not allowed when multiple admins exist
    const E_SELF_APPROVAL: u64 = 14;
    /// Request not found
    const E_REQUEST_NOT_FOUND: u64 = 15;
    /// Request has expired
    const E_REQUEST_EXPIRED: u64 = 18;

    // ============================================
    // CONSTANTS
    // ============================================

    /// Withdrawal request expiration window (1 hour)
    const WITHDRAWAL_REQUEST_EXPIRATION_SECONDS: u64 = 60 * 60;

    /// Governance action types
    const ACTION_UPDATE_RECIPIENT: u8 = 1;
    const ACTION_SET_SECONDARY_ADMIN: u8 = 2;
    const ACTION_REMOVE_SECONDARY_ADMIN: u8 = 3;
    const ACTION_SET_TERTIARY_ADMIN: u8 = 4;
    const ACTION_REMOVE_TERTIARY_ADMIN: u8 = 5;

    // ============================================
    // DATA STRUCTURES
    // ============================================

    struct WithdrawalRequest has store, drop, copy {
        request_id: u64,
        amount: u64,
        initiator: address,
        request_timestamp: u64,
        expiration_timestamp: u64,
    }

    struct GovernanceRequest has store, drop, copy {
        request_id: u64,
        action_type: u8,
        target_address: address,
        initiator: address,
        timestamp: u64,
    }

    struct GamesTreasury has key {
        /// Object reference used to hold treasury CEDRA
        extend_ref: ExtendRef,
        /// Total CEDRA tracked in treasury (octas)
        treasury_balance: u64,
        /// Recipient for approved withdrawals
        treasury_recipient: address,

        /// Primary admin
        admin: address,
        /// Optional secondary admin
        secondary_admin: Option<address>,
        /// Optional tertiary admin
        tertiary_admin: Option<address>,

        /// Withdrawal multisig state
        withdrawal_requests: Table<u64, WithdrawalRequest>,
        withdrawal_order: vector<u64>,
        next_withdrawal_id: u64,

        /// Governance multisig state
        governance_requests: Table<u64, GovernanceRequest>,
        governance_order: vector<u64>,
        next_gov_request_id: u64,
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    public(friend) fun init(deployer: &signer) {
        let deployer_addr = signer::address_of(deployer);
        assert!(!exists<GamesTreasury>(@NovaWalletGames), E_ALREADY_INITIALIZED);

        let constructor_ref = object::create_object(deployer_addr);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let treasury_signer = object::generate_signer(&constructor_ref);
        if (coin::is_coin_initialized<cedra_coin::CedraCoin>()) {
            coin::register<cedra_coin::CedraCoin>(&treasury_signer);
        };

        move_to(deployer, GamesTreasury {
            extend_ref,
            treasury_balance: 0,
            treasury_recipient: deployer_addr,
            admin: deployer_addr,
            secondary_admin: option::none(),
            tertiary_admin: option::none(),
            withdrawal_requests: table::new(),
            withdrawal_order: vector::empty(),
            next_withdrawal_id: 1,
            governance_requests: table::new(),
            governance_order: vector::empty(),
            next_gov_request_id: 1,
        });
    }

    // ============================================
    // INTERNAL HELPERS
    // ============================================

    fun is_admin(treasury: &GamesTreasury, addr: address): bool {
        if (treasury.admin == addr) return true;
        if (option::contains(&treasury.secondary_admin, &addr)) return true;
        if (option::contains(&treasury.tertiary_admin, &addr)) return true;
        false
    }

    fun is_primary_admin(treasury: &GamesTreasury, addr: address): bool {
        treasury.admin == addr
    }

    fun has_multiple_admins(treasury: &GamesTreasury): bool {
        option::is_some(&treasury.secondary_admin) || option::is_some(&treasury.tertiary_admin)
    }

    fun treasury_address(treasury: &GamesTreasury): address {
        object::address_from_extend_ref(&treasury.extend_ref)
    }

    /// Register the treasury object for CEDRA if coin is initialized and store is missing.
    fun ensure_treasury_coin_store(treasury: &GamesTreasury) {
        if (!coin::is_coin_initialized<cedra_coin::CedraCoin>()) return;

        let treasury_addr = treasury_address(treasury);
        if (!coin::is_account_registered<cedra_coin::CedraCoin>(treasury_addr)) {
            let treasury_signer = object::generate_signer_for_extending(&treasury.extend_ref);
            coin::register<cedra_coin::CedraCoin>(&treasury_signer);
        };
    }

    fun remove_request_id(order: &mut vector<u64>, request_id: u64) {
        let (found, index) = vector::index_of(order, &request_id);
        if (found) {
            vector::remove(order, index);
        };
    }

    // ============================================
    // CHIP INTEGRATION
    // ============================================

    /// Collect payment from multiplier purchase into treasury.
    public(friend) fun collect_multiplier_payment(player: &signer, amount: u64) acquires GamesTreasury {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(exists<GamesTreasury>(@NovaWalletGames), E_NOT_INITIALIZED);

        let treasury = borrow_global_mut<GamesTreasury>(@NovaWalletGames);
        ensure_treasury_coin_store(treasury);
        let treasury_addr = treasury_address(treasury);
        coin::transfer<cedra_coin::CedraCoin>(player, treasury_addr, amount);
        treasury.treasury_balance = treasury.treasury_balance + amount;
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    public entry fun set_primary_admin(admin: &signer, new_admin: address) acquires GamesTreasury {
        assert!(exists<GamesTreasury>(@NovaWalletGames), E_NOT_INITIALIZED);

        let treasury = borrow_global_mut<GamesTreasury>(@NovaWalletGames);
        assert!(is_primary_admin(treasury, signer::address_of(admin)), E_NOT_PRIMARY_ADMIN);
        treasury.admin = new_admin;
    }

    public entry fun initiate_treasury_withdrawal(admin: &signer, amount: u64) acquires GamesTreasury {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(exists<GamesTreasury>(@NovaWalletGames), E_NOT_INITIALIZED);

        let treasury = borrow_global_mut<GamesTreasury>(@NovaWalletGames);
        let admin_addr = signer::address_of(admin);
        assert!(is_admin(treasury, admin_addr), E_NOT_ADMIN);
        assert!(treasury.treasury_balance >= amount, E_TREASURY_INSUFFICIENT);

        let request_id = treasury.next_withdrawal_id;
        let now = timestamp::now_seconds();
        let request = WithdrawalRequest {
            request_id,
            amount,
            initiator: admin_addr,
            request_timestamp: now,
            expiration_timestamp: now + WITHDRAWAL_REQUEST_EXPIRATION_SECONDS,
        };

        table::add(&mut treasury.withdrawal_requests, request_id, request);
        vector::push_back(&mut treasury.withdrawal_order, request_id);
        treasury.next_withdrawal_id = request_id + 1;
    }

    public entry fun approve_treasury_withdrawal(admin: &signer, request_id: u64) acquires GamesTreasury {
        assert!(exists<GamesTreasury>(@NovaWalletGames), E_NOT_INITIALIZED);

        let treasury = borrow_global_mut<GamesTreasury>(@NovaWalletGames);
        let admin_addr = signer::address_of(admin);
        assert!(is_admin(treasury, admin_addr), E_NOT_ADMIN);
        assert!(table::contains(&treasury.withdrawal_requests, request_id), E_REQUEST_NOT_FOUND);

        let request = *table::borrow(&treasury.withdrawal_requests, request_id);

        if (has_multiple_admins(treasury)) {
            assert!(request.initiator != admin_addr, E_SELF_APPROVAL);
        };

        assert!(timestamp::now_seconds() <= request.expiration_timestamp, E_REQUEST_EXPIRED);
        assert!(treasury.treasury_balance >= request.amount, E_TREASURY_INSUFFICIENT);

        let amount = request.amount;
        let recipient = treasury.treasury_recipient;
        treasury.treasury_balance = treasury.treasury_balance - amount;

        ensure_treasury_coin_store(treasury);
        let treasury_signer = object::generate_signer_for_extending(&treasury.extend_ref);
        coin::transfer<cedra_coin::CedraCoin>(&treasury_signer, recipient, amount);

        table::remove(&mut treasury.withdrawal_requests, request_id);
        remove_request_id(&mut treasury.withdrawal_order, request_id);
    }

    public entry fun initiate_governance_action(
        admin: &signer,
        action_type: u8,
        target_address: address
    ) acquires GamesTreasury {
        assert!(exists<GamesTreasury>(@NovaWalletGames), E_NOT_INITIALIZED);

        let treasury = borrow_global_mut<GamesTreasury>(@NovaWalletGames);
        let admin_addr = signer::address_of(admin);
        assert!(is_admin(treasury, admin_addr), E_NOT_ADMIN);

        let request_id = treasury.next_gov_request_id;
        let request = GovernanceRequest {
            request_id,
            action_type,
            target_address,
            initiator: admin_addr,
            timestamp: timestamp::now_seconds(),
        };

        table::add(&mut treasury.governance_requests, request_id, request);
        vector::push_back(&mut treasury.governance_order, request_id);
        treasury.next_gov_request_id = request_id + 1;
    }

    public entry fun approve_governance_action(admin: &signer, request_id: u64) acquires GamesTreasury {
        assert!(exists<GamesTreasury>(@NovaWalletGames), E_NOT_INITIALIZED);

        let treasury = borrow_global_mut<GamesTreasury>(@NovaWalletGames);
        let admin_addr = signer::address_of(admin);
        assert!(is_admin(treasury, admin_addr), E_NOT_ADMIN);
        assert!(table::contains(&treasury.governance_requests, request_id), E_REQUEST_NOT_FOUND);

        let request = *table::borrow(&treasury.governance_requests, request_id);

        if (has_multiple_admins(treasury)) {
            assert!(request.initiator != admin_addr, E_SELF_APPROVAL);
        };

        let action_type = request.action_type;
        let target_address = request.target_address;

        if (action_type == ACTION_UPDATE_RECIPIENT) {
            treasury.treasury_recipient = target_address;
        } else if (action_type == ACTION_SET_SECONDARY_ADMIN) {
            treasury.secondary_admin = option::some(target_address);
        } else if (action_type == ACTION_REMOVE_SECONDARY_ADMIN) {
            treasury.secondary_admin = option::none();
        } else if (action_type == ACTION_SET_TERTIARY_ADMIN) {
            treasury.tertiary_admin = option::some(target_address);
        } else if (action_type == ACTION_REMOVE_TERTIARY_ADMIN) {
            treasury.tertiary_admin = option::none();
        };

        table::remove(&mut treasury.governance_requests, request_id);
        remove_request_id(&mut treasury.governance_order, request_id);
    }

    public entry fun cancel_governance_action(admin: &signer, request_id: u64) acquires GamesTreasury {
        assert!(exists<GamesTreasury>(@NovaWalletGames), E_NOT_INITIALIZED);

        let treasury = borrow_global_mut<GamesTreasury>(@NovaWalletGames);
        assert!(is_admin(treasury, signer::address_of(admin)), E_NOT_ADMIN);
        assert!(table::contains(&treasury.governance_requests, request_id), E_REQUEST_NOT_FOUND);

        table::remove(&mut treasury.governance_requests, request_id);
        remove_request_id(&mut treasury.governance_order, request_id);
    }

    public entry fun deposit_treasury(account: &signer, amount: u64) acquires GamesTreasury {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(exists<GamesTreasury>(@NovaWalletGames), E_NOT_INITIALIZED);

        let treasury = borrow_global_mut<GamesTreasury>(@NovaWalletGames);
        ensure_treasury_coin_store(treasury);
        let treasury_addr = treasury_address(treasury);
        coin::transfer<cedra_coin::CedraCoin>(account, treasury_addr, amount);
        treasury.treasury_balance = treasury.treasury_balance + amount;
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    #[view]
    public fun is_admin_address(addr: address): bool acquires GamesTreasury {
        if (!exists<GamesTreasury>(@NovaWalletGames)) { return false };
        let treasury = borrow_global<GamesTreasury>(@NovaWalletGames);
        is_admin(treasury, addr)
    }

    #[view]
    public fun is_primary_admin_address(addr: address): bool acquires GamesTreasury {
        if (!exists<GamesTreasury>(@NovaWalletGames)) { return false };
        let treasury = borrow_global<GamesTreasury>(@NovaWalletGames);
        is_primary_admin(treasury, addr)
    }

    #[view]
    public fun get_treasury_balance(): u64 acquires GamesTreasury {
        if (!exists<GamesTreasury>(@NovaWalletGames)) { return 0 };
        borrow_global<GamesTreasury>(@NovaWalletGames).treasury_balance
    }

    #[view]
    public fun get_treasury_recipient(): address acquires GamesTreasury {
        if (!exists<GamesTreasury>(@NovaWalletGames)) { return @0x0 };
        borrow_global<GamesTreasury>(@NovaWalletGames).treasury_recipient
    }

    #[view]
    public fun get_primary_admin(): address acquires GamesTreasury {
        if (!exists<GamesTreasury>(@NovaWalletGames)) { return @0x0 };
        borrow_global<GamesTreasury>(@NovaWalletGames).admin
    }

    #[view]
    public fun get_secondary_admin(): address acquires GamesTreasury {
        if (!exists<GamesTreasury>(@NovaWalletGames)) { return @0x0 };
        let treasury = borrow_global<GamesTreasury>(@NovaWalletGames);
        if (option::is_some(&treasury.secondary_admin)) {
            *option::borrow(&treasury.secondary_admin)
        } else {
            @0x0
        }
    }

    #[view]
    public fun has_secondary_admin(): bool acquires GamesTreasury {
        if (!exists<GamesTreasury>(@NovaWalletGames)) { return false };
        option::is_some(&borrow_global<GamesTreasury>(@NovaWalletGames).secondary_admin)
    }

    #[view]
    public fun get_tertiary_admin(): address acquires GamesTreasury {
        if (!exists<GamesTreasury>(@NovaWalletGames)) { return @0x0 };
        let treasury = borrow_global<GamesTreasury>(@NovaWalletGames);
        if (option::is_some(&treasury.tertiary_admin)) {
            *option::borrow(&treasury.tertiary_admin)
        } else {
            @0x0
        }
    }

    #[view]
    public fun has_tertiary_admin(): bool acquires GamesTreasury {
        if (!exists<GamesTreasury>(@NovaWalletGames)) { return false };
        option::is_some(&borrow_global<GamesTreasury>(@NovaWalletGames).tertiary_admin)
    }

    #[view]
    public fun get_withdrawal_request(request_id: u64): WithdrawalRequest acquires GamesTreasury {
        let treasury = borrow_global<GamesTreasury>(@NovaWalletGames);
        *table::borrow(&treasury.withdrawal_requests, request_id)
    }

    #[view]
    public fun get_withdrawal_requests_page(
        limit: u64,
        offset: u64
    ): vector<WithdrawalRequest> acquires GamesTreasury {
        if (!exists<GamesTreasury>(@NovaWalletGames)) {
            return vector::empty()
        };

        let treasury = borrow_global<GamesTreasury>(@NovaWalletGames);
        let total_len = vector::length(&treasury.withdrawal_order);
        let res = vector::empty<WithdrawalRequest>();
        if (offset >= total_len) {
            return res
        };

        let i = 0;
        let count = 0;
        let skipped = 0;

        while (i < total_len && count < limit) {
            let req_id = *vector::borrow(&treasury.withdrawal_order, total_len - 1 - i);
            if (skipped >= offset) {
                vector::push_back(&mut res, *table::borrow(&treasury.withdrawal_requests, req_id));
                count = count + 1;
            } else {
                skipped = skipped + 1;
            };
            i = i + 1;
        };

        res
    }

    #[view]
    public fun get_governance_request(request_id: u64): GovernanceRequest acquires GamesTreasury {
        let treasury = borrow_global<GamesTreasury>(@NovaWalletGames);
        *table::borrow(&treasury.governance_requests, request_id)
    }

    #[view]
    public fun get_governance_requests_page(
        limit: u64,
        offset: u64
    ): vector<GovernanceRequest> acquires GamesTreasury {
        if (!exists<GamesTreasury>(@NovaWalletGames)) {
            return vector::empty()
        };

        let treasury = borrow_global<GamesTreasury>(@NovaWalletGames);
        let total_len = vector::length(&treasury.governance_order);
        let res = vector::empty<GovernanceRequest>();
        if (offset >= total_len) {
            return res
        };

        let i = 0;
        let count = 0;
        let skipped = 0;

        while (i < total_len && count < limit) {
            let req_id = *vector::borrow(&treasury.governance_order, total_len - 1 - i);
            if (skipped >= offset) {
                vector::push_back(&mut res, *table::borrow(&treasury.governance_requests, req_id));
                count = count + 1;
            } else {
                skipped = skipped + 1;
            };
            i = i + 1;
        };

        res
    }

    // ============================================
    // TEST HELPERS
    // ============================================

    #[test_only]
    public fun init_for_test(deployer: &signer) {
        init(deployer);
    }

    #[test_only]
    public fun set_admins_for_test(primary: address, secondary: Option<address>, tertiary: Option<address>) acquires GamesTreasury {
        let treasury = borrow_global_mut<GamesTreasury>(@NovaWalletGames);
        treasury.admin = primary;
        treasury.secondary_admin = secondary;
        treasury.tertiary_admin = tertiary;
    }
}
