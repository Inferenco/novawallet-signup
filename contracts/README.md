# Nova Games Contracts (Copied)

This directory contains the Games Move package copied from `/home/james/nova-wallet-1/contracts`.

## Included packages

- `games` (package name: `InferencoGames`)

## Scope in this repo

- These files are copied for source parity, review, and local Move workflows.
- Frontend integration in this dapp still targets existing deployed on-chain addresses.
- Wallet/profile/consent modules are read from deployed wallet package addresses configured in frontend env.
- `contracts/games/Move.toml` still references `Wallet = { local = "../wallet" }` from upstream; local Move build of games requires restoring that dependency path.
- Deployment/migration of these packages is out of scope for this port.
