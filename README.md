# ZKluff — Liar's Poker on Starknet

> Project completed for Re{define} Hackathon | Starknet

## Deployed Contracts — Starknet Sepolia

| Contract | Address |
|---|---|
| **Game** | [`0x0128267c881b5b75bad09430ab1367c353add8874f9e64f803e8289fe57ed990`](https://sepolia.starkscan.co/contract/0x0128267c881b5b75bad09430ab1367c353add8874f9e64f803e8289fe57ed990) |
| **MockToken (ZKT)** | [`0x02010c02949e50158d233d05563fa286bdadf111b17b54567c7b7660a57ab215`](https://sepolia.starkscan.co/contract/0x02010c02949e50158d233d05563fa286bdadf111b17b54567c7b7660a57ab215) |
| **Verifier** | [`0x04030868f637ecd4f64d8b8f7045738dce2ed28d8df87157d42dd114083f2f99`](https://sepolia.starkscan.co/contract/0x04030868f637ecd4f64d8b8f7045738dce2ed28d8df87157d42dd114083f2f99) |

ZKluff is a two-player bluffing card game deployed on Starknet. Players declare poker-style hand ranks without ever revealing their cards. Zero-knowledge proofs — generated entirely in the browser — let the smart contract verify that a declaration is truthful while keeping every card value completely private.

## How It Works

### Game Flow

1. **Create / Join** — Player A creates a room and deposits a bet in ERC-20 tokens. Player B joins and matches the bet. The pot is locked in the contract.
2. **Commit** — Both players locally pick five cards, compute `commitment = Poseidon(card1..card5, salt)`, and submit only the commitment hash on-chain. Cards never leave the browser.
3. **Declare** — The active player claims a hand rank (e.g. "I have at least a Full House"). The browser generates a Groth16 ZK proof that the claim is consistent with the committed hand, then submits `(declaration, proof)` to the contract.
4. **Challenge or Fold** — The opponent can:
   - **Challenge**: the contract already verified the proof in step 3; if it accepted, the declarer wins the pot.
   - **Fold**: concede the round; the active player wins the pot.
5. **Resolution** — The winner receives the full pot via an ERC-20 transfer.

### Zero-Knowledge Proofs

Two Groth16 circuits (Circom 2.x + snarkjs) handle the cryptographic guarantees:

| Circuit | Private inputs | Public inputs | Proves |
|---|---|---|---|
| `hand_commitment` | cards[5], salt | commitment | commitment = Poseidon(cards, salt) |
| `declaration_valid` | cards[5], salt | commitment, declaration_type | commitment is correct AND the declared rank holds for those cards |

All proof generation runs client-side. The Cairo `Verifier` contract accepts the Groth16 proof and two public inputs, and is designed to integrate with [Garaga](https://github.com/keep-starknet-strange/garaga) for native on-chain BN254 pairing checks.

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contracts | Cairo 2.6+, Scarb, Starknet Foundry |
| ZK circuits | Circom 2.1, snarkjs 0.7 (Groth16) |
| On-chain verifier | Garaga (Groth16 on BN254) |
| Hash function | Poseidon (native to Starknet, efficient in Circom) |
| Frontend | React 18, Vite 5 |
| Wallet | Starknet.js + @starknet-react/core (Argent X / Braavos) |
| Testnet | Starknet Sepolia |

## Project Structure

```
ZKluff/
├── contracts/          Cairo smart contracts (Scarb project)
│   ├── Scarb.toml
│   └── src/
│       ├── lib.cairo
│       ├── game.cairo       Main game logic
│       ├── verifier.cairo   Groth16 ZK verifier stub (Garaga-compatible)
│       └── mock_token.cairo ERC-20 for testnet bets
├── circuits/           Circom ZK circuits
│   ├── hand_commitment.circom
│   ├── declaration_valid.circom
│   └── package.json
├── frontend/           React + Vite UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── WalletConnect.jsx
│   │   │   ├── GameLobby.jsx
│   │   │   ├── HandDisplay.jsx
│   │   │   ├── DeclareModal.jsx
│   │   │   ├── CalloutButton.jsx
│   │   │   └── GameStatus.jsx
│   │   ├── hooks/
│   │   │   ├── useGame.js
│   │   │   └── useProofGenerator.js
│   │   └── utils/
│   │       ├── proof.js
│   │       └── starknet.js
│   └── package.json
└── scripts/
    └── deploy.sh
```

## Setup Instructions

### Prerequisites

- [Rust + Cargo](https://rustup.rs) (for Circom compiler)
- [Scarb](https://docs.swmansion.com/scarb/) >= 2.6
- [starkli](https://github.com/xJonathanLEI/starkli)
- Node.js >= 20

### 1. Install circuit dependencies

```bash
cd circuits
npm install
```

### 2. Install Circom

```bash
# macOS / Linux via cargo
cargo install circom
```

### 3. Compile circuits and run trusted setup

```bash
cd circuits

# Compile both circuits
npm run build:all

# Download a Powers of Tau file (phase 1 — use hermez 12 for small circuits)
# Replace with a larger ptau if your circuit has more constraints
curl -O https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau
mv powersOfTau28_hez_final_12.ptau pot12_final.ptau

# Phase 2 setup for each circuit
npm run setup:commitment
npm run setup:declaration

# (Optional) Contribute randomness for production security
snarkjs zkey contribute build/declaration_valid_0000.zkey build/declaration_valid_final.zkey --name="contributor1"

# Export verification keys
npm run export:vk:commitment
npm run export:vk:declaration
```

### 4. Copy circuit artifacts to frontend

```bash
mkdir -p frontend/public/circuits
cp -r circuits/build/hand_commitment_js frontend/public/circuits/
cp -r circuits/build/declaration_valid_js frontend/public/circuits/
cp circuits/build/hand_commitment_final.zkey frontend/public/circuits/
cp circuits/build/declaration_valid_final.zkey frontend/public/circuits/
cp circuits/build/hand_commitment_vk.json frontend/public/circuits/
cp circuits/build/declaration_valid_vk.json frontend/public/circuits/
```

### 5. Configure frontend environment

The contracts are already deployed on Sepolia. Create `frontend/.env`:

```env
VITE_GAME_CONTRACT=0x0128267c881b5b75bad09430ab1367c353add8874f9e64f803e8289fe57ed990
VITE_TOKEN_CONTRACT=0x02010c02949e50158d233d05563fa286bdadf111b17b54567c7b7660a57ab215
VITE_VERIFIER_CONTRACT=0x04030868f637ecd4f64d8b8f7045738dce2ed28d8df87157d42dd114083f2f99
VITE_STARKNET_RPC=https://starknet-sepolia.public.blastapi.io/rpc/v0_7
```

To redeploy (e.g. after contract changes):

```bash
export STARKNET_ACCOUNT=~/.starkli-wallets/deployer/account.json
export STARKNET_KEYSTORE=~/.starkli-wallets/deployer/keystore.json
bash scripts/deploy.sh
```

### 5b. Mint test tokens

Before playing, each wallet needs ZKT tokens. Call `mint` on the MockToken contract via starkli:

```bash
starkli invoke \
  0x02010c02949e50158d233d05563fa286bdadf111b17b54567c7b7660a57ab215 \
  mint <YOUR_WALLET_ADDRESS> u256:1000000000000000000000 \
  --account $STARKNET_ACCOUNT --keystore $STARKNET_KEYSTORE
```

Or use [Starkscan's write interface](https://sepolia.starkscan.co/contract/0x02010c02949e50158d233d05563fa286bdadf111b17b54567c7b7660a57ab215#write-contract).

### 6. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in a browser with Argent X or Braavos installed, connected to Starknet Sepolia.

## Manual Steps Still Required

| Step | Why |
|---|---|
| Circom compilation | Requires the Circom binary (compiled from Rust) |
| Trusted setup ceremony | Groth16 requires per-circuit `ptau` + `zkey` files |
| Replace verifier stub | `verifier.cairo` returns `true` until Garaga integration is wired in |
| Update VK hash | After trusted setup, pass the real VK hash to the Verifier constructor |
| Fund deployer wallet | Need Sepolia ETH from [faucet](https://starknet-faucet.vercel.app/) |
| Mint test tokens | Call `mock_token.mint()` via starkli or the frontend |
