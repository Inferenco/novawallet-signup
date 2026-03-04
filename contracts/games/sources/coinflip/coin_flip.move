/// Simple Treasury-Backed Coin Flip
///
/// Players bet chips on heads/tails. Bets are deposited into the chip treasury.
/// If the player wins, the treasury pays out 2x bet (return of stake + winnings).
module NovaWalletGames::coin_flip {
    use std::signer;
    use std::string;
    use cedra_framework::event;
    use cedra_framework::randomness;
    use cedra_framework::timestamp;
    use NovaWalletGames::chips;
    use NovaWalletGames::core_stats;
    use NovaWalletGames::game_registry::{Self, GameCapability};

    // ============================================
    // ERROR CODES
    // ============================================

    /// Coin flip game is already registered
    const E_ALREADY_REGISTERED: u64 = 1;
    /// Coin flip game is not registered
    const E_NOT_REGISTERED: u64 = 2;
    /// Bet amount must be greater than zero
    const E_ZERO_BET: u64 = 3;
    /// Treasury cannot cover potential payout
    const E_HOUSE_INSUFFICIENT: u64 = 4;

    // ============================================
    // DATA STRUCTURES
    // ============================================

    struct CoinFlipConfig has key {
        game_capability: GameCapability,
        game_id: u64,
        round_nonce: u64,
        total_flips: u64,
        total_bet_volume: u128,
        total_payout_volume: u128,
    }

    // ============================================
    // EVENTS
    // ============================================

    #[event]
    struct CoinFlipPlayed has drop, store {
        game_id: u64,
        player: address,
        guess_heads: bool,
        result_heads: bool,
        bet_amount: u64,
        payout_amount: u64,
        round_nonce: u64,
        timestamp: u64,
    }

    // ============================================
    // GAME REGISTRATION
    // ============================================

    /// Register coin flip in the game registry as treasury-enabled.
    public entry fun register_game(owner: &signer) {
        assert!(!exists<CoinFlipConfig>(@NovaWalletGames), E_ALREADY_REGISTERED);

        let capability = game_registry::register_game(
            owner,
            string::utf8(b"Coin Flip"),
            true
        );
        let game_id = game_registry::get_game_id(&capability);

        move_to(owner, CoinFlipConfig {
            game_capability: capability,
            game_id,
            round_nonce: 0,
            total_flips: 0,
            total_bet_volume: 0,
            total_payout_volume: 0,
        });
    }

    // ============================================
    // GAMEPLAY
    // ============================================

    // Play one coin flip round.
    // - `guess_heads = true` means HEADS
    // - `guess_heads = false` means TAILS
    #[randomness]
    entry fun play(
        player: &signer,
        guess_heads: bool,
        bet_amount: u64
    ) acquires CoinFlipConfig {
        assert!(exists<CoinFlipConfig>(@NovaWalletGames), E_NOT_REGISTERED);
        assert!(bet_amount > 0, E_ZERO_BET);

        let player_addr = signer::address_of(player);

        let (cap, game_id, round_nonce) = {
            let config = borrow_global<CoinFlipConfig>(@NovaWalletGames);
            (config.game_capability, config.game_id, config.round_nonce)
        };

        // House must be able to cover winner net gain before the bet is collected.
        let house_before = chips::get_chip_treasury_balance();
        assert!(house_before >= bet_amount, E_HOUSE_INSUFFICIENT);

        chips::deposit_house_takings_with_cap(&cap, player_addr, bet_amount);

        let result_heads = randomness::u64_range(0, 2) == 0;
        let payout_amount = 0u64;
        if (result_heads == guess_heads) {
            payout_amount = bet_amount + bet_amount;
            chips::payout_from_treasury_with_cap(&cap, player_addr, payout_amount);
            // Track net win amount in cross-game stats.
            core_stats::record_win(&cap, player_addr, bet_amount);
        };

        core_stats::record_participation(&cap, player_addr);

        let config = borrow_global_mut<CoinFlipConfig>(@NovaWalletGames);
        config.round_nonce = config.round_nonce + 1;
        config.total_flips = config.total_flips + 1;
        config.total_bet_volume = config.total_bet_volume + (bet_amount as u128);
        config.total_payout_volume = config.total_payout_volume + (payout_amount as u128);

        event::emit(CoinFlipPlayed {
            game_id,
            player: player_addr,
            guess_heads,
            result_heads,
            bet_amount,
            payout_amount,
            round_nonce,
            timestamp: timestamp::now_seconds(),
        });
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    #[view]
    public fun is_registered(): bool {
        exists<CoinFlipConfig>(@NovaWalletGames)
    }

    #[view]
    public fun get_game_id(): u64 acquires CoinFlipConfig {
        if (!exists<CoinFlipConfig>(@NovaWalletGames)) {
            return 0
        };
        borrow_global<CoinFlipConfig>(@NovaWalletGames).game_id
    }

    #[view]
    public fun get_round_nonce(): u64 acquires CoinFlipConfig {
        if (!exists<CoinFlipConfig>(@NovaWalletGames)) {
            return 0
        };
        borrow_global<CoinFlipConfig>(@NovaWalletGames).round_nonce
    }

    #[view]
    /// Returns (total_flips, total_bet_volume, total_payout_volume)
    public fun get_game_stats(): (u64, u128, u128) acquires CoinFlipConfig {
        if (!exists<CoinFlipConfig>(@NovaWalletGames)) {
            return (0, 0, 0)
        };
        let config = borrow_global<CoinFlipConfig>(@NovaWalletGames);
        (config.total_flips, config.total_bet_volume, config.total_payout_volume)
    }

    #[view]
    public fun can_cover_bet(bet_amount: u64): bool {
        chips::get_chip_treasury_balance() >= bet_amount
    }

    #[test_only]
    #[lint::allow_unsafe_randomness]
    public fun play_for_test(
        player: &signer,
        guess_heads: bool,
        bet_amount: u64
    ) acquires CoinFlipConfig {
        play(player, guess_heads, bet_amount);
    }
}
