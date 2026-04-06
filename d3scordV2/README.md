# ⬡ D3scord — Blockchain-Gated Chat Platform

A production-ready, fully decentralized Discord clone where:
- **Wallet = Identity** (MetaMask, no passwords)
- **Channels are NFT-gated** (ERC-721 on-chain membership)
- **Chat is real-time** (Socket.io, persisted to disk)
- **Everything is real** — no fakes, no simulations

---

## Stack

| Layer | Tech |
|---|---|
| Smart Contract | Solidity 0.8.17 + OpenZeppelin ERC-721 |
| Local Blockchain | Hardhat |
| Web3 Library | ethers.js v5 |
| Real-time Chat | Socket.io v4 |
| Message Persistence | JSON file (swap for MongoDB/PostgreSQL for prod) |
| Frontend | React 18 |
| Wallet Auth | MetaMask |

---

## Prerequisites

- **Node.js v18+** — https://nodejs.org
- **MetaMask** browser extension — https://metamask.io
- **Git**

---

## Setup (3 Terminals)

### 1 — Install everything

```bash
# Root (contracts)
npm install

# Server
cd server && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

---

### 2 — Compile & test the contract

```bash
npx hardhat compile
npx hardhat test
```

All 12 tests should pass.

---

### TERMINAL 1 — Start local blockchain

```bash
npx hardhat node
```

Keep this running. You will see 20 test accounts each with 10,000 ETH.
**Copy Account #0's private key** — you'll need it for MetaMask.

---

### Configure MetaMask

Add the Hardhat network manually:

| Field | Value |
|---|---|
| Network Name | Hardhat Local |
| RPC URL | http://127.0.0.1:8545 |
| Chain ID | 31337 |
| Currency Symbol | ETH |

Then: **MetaMask → Import Account → paste Account #0 private key**

> You get 10,000 test ETH. Use this to join paid channels.

---

### TERMINAL 2 — Deploy contract

```bash
npm run deploy:local
```

This automatically:
- Deploys D3scord.sol to your local chain
- Creates 5 channels (general, announcements, defi-talk, nft-alpha, dev-lounge)
- Writes contract address to `frontend/src/config.json`
- Copies ABI to `frontend/src/abis/D3scord.json`
- Writes `server/contract.json`

**You never need to touch config files manually.**

---

### TERMINAL 2 — Start chat server

```bash
npm run server
```

Server runs on `http://localhost:3030`
Messages are saved to `server/messages.json` — they survive restarts.

---

### TERMINAL 3 — Start frontend

```bash
npm run client
```

Opens `http://localhost:3000`

---

## All Commands

```bash
npx hardhat compile                              # Compile contracts
npx hardhat test                                 # Run contract tests
npx hardhat node                                 # Start local chain (Terminal 1)
npm run deploy:local                             # Deploy to local (Terminal 2)
npm run server                                   # Start Socket.io server (Terminal 2)
npm run client                                   # Start React frontend (Terminal 3)

# Testnet deploy (fill .env first)
npm run deploy:sepolia
```

---

## Channels

| Channel | Cost | Gated? |
|---|---|---|
| #general | FREE | No |
| #announcements | FREE | No |
| #defi-talk | 0.05 ETH | Yes — NFT mint |
| #nft-alpha | 0.10 ETH | Yes — NFT mint |
| #dev-lounge | 0.25 ETH | Yes — NFT mint |

---

## How It Works

**Authentication**: No username/password. MetaMask signs `eth_requestAccounts`. Your wallet address is your identity.

**Token-gating**: Clicking a paid channel calls `mint(channelId)` on the smart contract with the required ETH. This mints an ERC-721 NFT to your wallet. The contract records `hasJoined[id][address] = true` on-chain permanently. You only pay once per channel per wallet.

**Messaging**: Messages go through Socket.io WebSockets. The server stores them in `messages.json` (persists across restarts). The blockchain only handles access control — storing messages on-chain would be expensive and slow.

**Cross-machine**: Works on any machine as long as it points to the same blockchain RPC and chat server. For production: deploy contract to a real network (Sepolia/mainnet) and host the server on a VPS.

---

## Testnet Deploy

Create a `.env` file:

```
PRIVATE_KEY=your_wallet_private_key_without_0x
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
```

Then:

```bash
npm run deploy:sepolia
```

Update `REACT_APP_SERVER_URL` in `frontend/.env` to point to your hosted server.

---

## Project Structure

```
d3scord/
├── contracts/
│   └── D3scord.sol          ← ERC-721 smart contract
├── scripts/
│   └── deploy.js            ← Deploys + auto-configures everything
├── test/
│   └── D3scord.test.js      ← 12 contract tests
├── server/
│   ├── index.js             ← Socket.io server (real-time + persistence)
│   ├── messages.json        ← Created at runtime (message store)
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.js           ← Main app (real ethers.js + socket.io)
│   │   ├── config.json      ← Auto-written by deploy script
│   │   ├── abis/D3scord.json← Auto-copied by deploy script
│   │   └── components/
│   │       ├── Nav.js
│   │       ├── Sidebar.js
│   │       ├── ChannelPanel.js
│   │       ├── ChatArea.js
│   │       └── MembersPanel.js
│   └── package.json
├── hardhat.config.js
└── package.json
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| MetaMask "nonce too high" | MetaMask → Settings → Advanced → Reset Account |
| "No D3scord contract on chain" | Run `npm run deploy:local` again |
| Chat shows "Offline" | Run `npm run server` |
| Wrong network error | Switch MetaMask to Hardhat Local (chainId 31337) |
| Module not found | Run `npm install` in root, server/, and frontend/ |
