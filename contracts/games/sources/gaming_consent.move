/// Gaming Consent Module
///
/// Stores a versioned casino-terms document at the games package address and
/// an on-chain acknowledgement record under each user account.
module NovaWalletGames::gaming_consent {
    use std::error;
    use std::signer;
    use std::string::{Self, String};
    use cedra_framework::event;
    use cedra_framework::timestamp;
    use NovaWalletGames::games_treasury;

    // ============================================
    // ERROR CODES
    // ============================================

    /// Module not initialized
    const E_NOT_INITIALIZED: u64 = 2;
    /// Caller is not an admin
    const E_NOT_ADMIN: u64 = 3;
    /// Terms content cannot be empty
    const E_EMPTY_TERMS_CONTENT: u64 = 4;
    /// Terms content too long
    const E_TERMS_CONTENT_TOO_LONG: u64 = 5;
    /// User already acknowledged current version
    const E_ALREADY_ACKNOWLEDGED_CURRENT: u64 = 6;
    /// Terms format cannot be empty
    const E_EMPTY_TERMS_FORMAT: u64 = 7;
    /// Terms format too long
    const E_TERMS_FORMAT_TOO_LONG: u64 = 8;

    // ============================================
    // CONSTANTS
    // ============================================

    const MAX_TERMS_CONTENT_LENGTH: u64 = 32_768;
    const MAX_TERMS_FORMAT_LENGTH: u64 = 64;

    /// Initial values to avoid an uninitialized UX after first publish.
    const DEFAULT_TERMS_CONTENT: vector<u8> = b"# Nova Casino Notice\n\nInitial on-chain terms placeholder. Update via set_terms before production use.";
    const DEFAULT_TERMS_FORMAT: vector<u8> = b"text/markdown";

    // ============================================
    // STRUCTS
    // ============================================

    struct TermsConfig has key {
        current_version: u64,
        terms_content: String,
        terms_format: String,
        updated_at: u64,
    }

    struct UserAcknowledgment has key {
        accepted_version: u64,
        accepted_at: u64,
    }

    // ============================================
    // EVENTS
    // ============================================

    #[event]
    struct TermsUpdated has drop, store {
        version: u64,
        terms_format: String,
        updated_by: address,
        timestamp: u64,
    }

    #[event]
    struct TermsAcknowledged has drop, store {
        user: address,
        version: u64,
        timestamp: u64,
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    fun init_module(account: &signer) {
        // Keep publish/upgrade idempotent if module initialization is retried.
        if (exists<TermsConfig>(@NovaWalletGames)) return;

        let now = timestamp::now_seconds();
        let terms_content = string::utf8(DEFAULT_TERMS_CONTENT);
        let terms_format = string::utf8(DEFAULT_TERMS_FORMAT);

        move_to(account, TermsConfig {
            current_version: 1,
            terms_content: copy terms_content,
            terms_format: copy terms_format,
            updated_at: now,
        });
    }

    // ============================================
    // HELPERS
    // ============================================

    fun is_admin(addr: address): bool {
        let primary = games_treasury::get_primary_admin();
        if (primary != @0x0) {
            if (primary == addr) return true;

            let secondary = games_treasury::get_secondary_admin();
            if (secondary != @0x0 && secondary == addr) return true;

            let tertiary = games_treasury::get_tertiary_admin();
            if (tertiary != @0x0 && tertiary == addr) return true;

            return false
        };

        addr == @NovaWalletGames
    }

    // ============================================
    // ENTRY FUNCTIONS
    // ============================================

    /// Updates full terms content/format and increments the active terms version.
    /// Caller must be a wallet admin.
    public entry fun set_terms(
        admin: &signer,
        terms_content: String,
        terms_format: String,
    ) acquires TermsConfig {
        assert!(exists<TermsConfig>(@NovaWalletGames), error::not_found(E_NOT_INITIALIZED));

        let admin_addr = signer::address_of(admin);
        assert!(is_admin(admin_addr), error::permission_denied(E_NOT_ADMIN));

        let content_len = string::length(&terms_content);
        let format_len = string::length(&terms_format);
        assert!(content_len > 0, error::invalid_argument(E_EMPTY_TERMS_CONTENT));
        assert!(content_len <= MAX_TERMS_CONTENT_LENGTH, error::invalid_argument(E_TERMS_CONTENT_TOO_LONG));
        assert!(format_len > 0, error::invalid_argument(E_EMPTY_TERMS_FORMAT));
        assert!(format_len <= MAX_TERMS_FORMAT_LENGTH, error::invalid_argument(E_TERMS_FORMAT_TOO_LONG));

        let config = borrow_global_mut<TermsConfig>(@NovaWalletGames);
        config.current_version = config.current_version + 1;
        config.terms_content = copy terms_content;
        config.terms_format = copy terms_format;
        config.updated_at = timestamp::now_seconds();

        event::emit(TermsUpdated {
            version: config.current_version,
            terms_format,
            updated_by: admin_addr,
            timestamp: config.updated_at,
        });
    }

    /// Acknowledge the currently active terms version.
    /// One acknowledgment is allowed per version.
    public entry fun acknowledge_current_terms(user: &signer) acquires TermsConfig, UserAcknowledgment {
        assert!(exists<TermsConfig>(@NovaWalletGames), error::not_found(E_NOT_INITIALIZED));

        let now = timestamp::now_seconds();
        let user_addr = signer::address_of(user);
        let current_version = borrow_global<TermsConfig>(@NovaWalletGames).current_version;

        if (exists<UserAcknowledgment>(user_addr)) {
            let ack = borrow_global_mut<UserAcknowledgment>(user_addr);
            assert!(
                ack.accepted_version < current_version,
                error::already_exists(E_ALREADY_ACKNOWLEDGED_CURRENT)
            );
            ack.accepted_version = current_version;
            ack.accepted_at = now;
        } else {
            move_to(user, UserAcknowledgment {
                accepted_version: current_version,
                accepted_at: now,
            });
        };

        event::emit(TermsAcknowledged {
            user: user_addr,
            version: current_version,
            timestamp: now,
        });
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    #[view]
    public fun get_current_terms(): (u64, String, String, u64) acquires TermsConfig {
        if (!exists<TermsConfig>(@NovaWalletGames)) {
            return (0, string::utf8(b""), string::utf8(b""), 0)
        };

        let config = borrow_global<TermsConfig>(@NovaWalletGames);
        (
            config.current_version,
            config.terms_content,
            config.terms_format,
            config.updated_at
        )
    }

    #[view]
    public fun has_acknowledged_current(user: address): bool acquires TermsConfig, UserAcknowledgment {
        if (!exists<TermsConfig>(@NovaWalletGames)) return false;
        if (!exists<UserAcknowledgment>(user)) return false;

        let current_version = borrow_global<TermsConfig>(@NovaWalletGames).current_version;
        borrow_global<UserAcknowledgment>(user).accepted_version >= current_version
    }

    // Returns (exists, accepted_version, accepted_at).
    #[view]
    public fun get_user_acknowledgment(user: address): (bool, u64, u64) acquires UserAcknowledgment {
        if (!exists<UserAcknowledgment>(user)) {
            return (false, 0, 0)
        };

        let ack = borrow_global<UserAcknowledgment>(user);
        (true, ack.accepted_version, ack.accepted_at)
    }

    #[view]
    public fun get_current_terms_version(): u64 acquires TermsConfig {
        if (!exists<TermsConfig>(@NovaWalletGames)) return 0;
        borrow_global<TermsConfig>(@NovaWalletGames).current_version
    }

    #[test_only]
    public fun init_for_test(account: &signer) {
        init_module(account);
    }
}
