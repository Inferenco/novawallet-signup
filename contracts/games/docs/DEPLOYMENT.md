# Games Contract Deployment Guide

This document details the process for deploying the `InferencoGames` smart contracts to the Cedra blockchain (Testnet or Mainnet).

## Prerequisites

- **Cedra CLI**: Ensure you have the latest `cedra` CLI installed.
- **Network Access**: Access to `testnet.cedra.dev`.

## 1. Configure Profile (GAMES_ADMIN_V4)

We will use a new profile `GAMES_ADMIN_V4` for the reorganized contracts. The CLI can generate a fresh keypair and configure the profile in one step.

```bash
# Initialize profile (generates new keys automatically)
cedra init \
  --profile GAMES_ADMIN_V4 \
  --network Testnet \
  --assume-yes
```

This updates `.cedra/config.yaml` with the new profile and derives your account address.

### Fund the Account
The CLI will output your new account address (e.g., `0xd287...`). You must fund it to pay for gas.
- **Testnet**: Use the [Cedra Faucet](https://faucet.cedra.dev).
- **Manual**: `cedra account fund --profile GAMES_ADMIN_V4`

## 2. Package Configuration

Before deploying, you must set the `NovaWalletGames` named address in `Move.toml` to match your deployment account.
The games package is now self-contained for casino consent; `gaming_consent` is published as `NovaWalletGames::gaming_consent`.
The separate wallet package is still used by the frontend for `wallet::user_profiles`, but it is not a Move dependency of `contracts/games`.

1. detailed in `config.yaml` (or check CLI output).
2. Open `contracts/games/Move.toml`.
3. Update `NovaWalletGames` with your new profile's address.

```toml
[addresses]
NovaWalletGames = "0xdac17287f4397d5b803390c0bd0db7354ec52bf9ed3bef5e2130d6e126b55bdd"
```

## 3. Deployment

Deploy the package using `{PACKAGE_NAME}`.

### Command
```bash
cedra move publish \
  --package-dir contracts/games \
  --profile GAMES_ADMIN_V4 \
  --override-size-check \
  --included-artifacts none \
  --named-addresses NovaWalletGames=0xdac17287f4397d5b803390c0bd0db7354ec52bf9ed3bef5e2130d6e126b55bdd \
  --assume-yes
```

## 4. Post-Deployment

After deployment, the account used becomes the **Owner/Admin**.

#### Initialize Game Registry
```bash
cedra move run \
  --profile GAMES_ADMIN_V4 \
  --function-id 'NovaWalletGames::game_registry::init_module'
```

#### Register Texas Hold'em
Note: Module name is now `poker_texas_holdem`.

```bash
cedra move run \
  --profile GAMES_ADMIN_V4 \
  --function-id 'NovaWalletGames::poker_texas_holdem::register_game'
```

#### Admin Functions
- Create Tables (`poker_texas_holdem::create_table`)
- Register Games (`game_registry::register_game`)
- Update Global Limits (`chips::update_global_max_table_buy_in`)
- Update casino terms (`gaming_consent::set_terms`)
- Governance (`chips::initiate_governance_action`)

### Contract Address Reference

When calling functions, use the deployed address:
- **Module Address**: `0xdac17287f4397d5b803390c0bd0db7354ec52bf9ed3bef5e2130d6e126b55bdd`
- **Named Address**: `NovaWalletGames`
