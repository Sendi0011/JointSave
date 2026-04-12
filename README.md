# JointSave 🌐
### Community Savings Circles on Stellar

**JointSave** is a decentralized community savings platform built on **Stellar**, enabling trusted groups to automate contributions, payouts, and transparency using Soroban smart contracts.

---

## Overview

Across the world, millions of people rely on informal savings groups to pool money and support one another. While these systems foster trust and cooperation, they often face problems like missed payments, fraud, and lack of transparency.

**JointSave solves this by putting savings groups onchain — on Stellar.**
Funds are managed by Soroban smart contracts, ensuring automation, transparency, and fairness for everyone.

---

## Key Features

- **Rotational Mode** – Members take turns receiving the full pool payout.
- **Target Pool Mode** – Groups save toward a shared goal.
- **Flexible Pool Mode** – Members deposit anytime and optionally earn yield.
- **Onchain Trust** – Every group is governed by a Soroban smart contract escrow.
- **Transparent Tracking** – Every transaction is verifiable on Stellar.
- **Auto Enforcement** – Late deposits are flagged; missed rounds trigger penalties.

---

## Tech Stack

**Smart Contracts (Rust / Soroban)**
- `jointsave-factory` – Registry for all deployed pools
- `jointsave-rotational` – Rotational savings pool
- `jointsave-target` – Goal-based savings pool
- `jointsave-flexible` – Flexible deposits with optional yield

**Frontend**
- **Next.js** + **Tailwind CSS** – Responsive, mobile-first interface
- **Stellar Wallets Kit** – Freighter and multi-wallet support
- **Stellar SDK** – Soroban contract interaction
- **Supabase** – Off-chain metadata storage

**Infrastructure**
- **Stellar Network** – Fast, low-cost, and energy-efficient
- **Soroban** – Stellar's smart contract platform

---

## Getting Started

### Smart Contracts

```bash
cd smartContract
rustup target add wasm32-unknown-unknown
stellar contract build
./scripts/deploy.sh
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Fill in your Supabase and Stellar contract IDs
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_FACTORY_CONTRACT_ID=
NEXT_PUBLIC_TOKEN_CONTRACT_ID=native
```

---

## Roadmap

**Phase 1 – MVP (Current)**
- Group creation & contributions on Stellar
- Rotational / Target / Flexible modes
- Wallet connection and basic dashboard

**Phase 2 – Enhancement**
- Yield integrations with Stellar DeFi
- Mobile app
- Group chat
- Reputation system

**Phase 3 – Scale**
- Social onboarding
- Fiat on-ramp
- Microloan marketplace
- DAO governance

---

Built with ❤️ for communities worldwide. Powered by Stellar.
