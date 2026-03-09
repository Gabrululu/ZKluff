#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Deploy ZKluff contracts to Starknet Sepolia testnet
# =============================================================================
#
# Prerequisites:
#   - starkli   (https://github.com/xJonathanLEI/starkli)
#   - Scarb     (https://docs.swmansion.com/scarb/)
#   - A funded Starknet Sepolia account (see README for setup)
#
# Environment variables required (set in .env or export manually):
#   STARKNET_ACCOUNT   — path to account keystore (starkli account file)
#   STARKNET_KEYSTORE  — path to encrypted keystore
#   STARKNET_RPC       — RPC endpoint (default: public Sepolia below)
#
# Usage:
#   export STARKNET_ACCOUNT=~/.starkli-wallets/deployer/account.json
#   export STARKNET_KEYSTORE=~/.starkli-wallets/deployer/keystore.json
#   bash scripts/deploy.sh
# =============================================================================

set -euo pipefail

RPC="${STARKNET_RPC:-https://starknet-sepolia.public.blastapi.io/rpc/v0_7}"
CONTRACTS_DIR="$(cd "$(dirname "$0")/../contracts" && pwd)"
ARTIFACTS_DIR="$CONTRACTS_DIR/target/dev"

echo "==> Building contracts with Scarb..."
cd "$CONTRACTS_DIR"
scarb build

echo ""
echo "==> Deploying MockToken..."
TOKEN_CLASS_HASH=$(starkli declare \
  "$ARTIFACTS_DIR/zkbluff_MockToken.contract_class.json" \
  --rpc "$RPC" \
  --account "$STARKNET_ACCOUNT" \
  --keystore "$STARKNET_KEYSTORE" \
  --watch 2>&1 | grep "Class hash" | awk '{print $NF}')

echo "   MockToken class hash: $TOKEN_CLASS_HASH"

TOKEN_ADDRESS=$(starkli deploy \
  "$TOKEN_CLASS_HASH" \
  str:'ZKluffToken' str:'ZKT' \
  --rpc "$RPC" \
  --account "$STARKNET_ACCOUNT" \
  --keystore "$STARKNET_KEYSTORE" \
  --watch 2>&1 | grep "Contract address" | awk '{print $NF}')

echo "   MockToken deployed at: $TOKEN_ADDRESS"

echo ""
echo "==> Deploying Verifier..."
VERIFIER_CLASS_HASH=$(starkli declare \
  "$ARTIFACTS_DIR/zkbluff_Verifier.contract_class.json" \
  --rpc "$RPC" \
  --account "$STARKNET_ACCOUNT" \
  --keystore "$STARKNET_KEYSTORE" \
  --watch 2>&1 | grep "Class hash" | awk '{print $NF}')

echo "   Verifier class hash: $VERIFIER_CLASS_HASH"

# VK hash placeholder — replace with actual Groth16 VK hash after circuit setup
VK_HASH="0x0"

VERIFIER_ADDRESS=$(starkli deploy \
  "$VERIFIER_CLASS_HASH" \
  "$VK_HASH" \
  --rpc "$RPC" \
  --account "$STARKNET_ACCOUNT" \
  --keystore "$STARKNET_KEYSTORE" \
  --watch 2>&1 | grep "Contract address" | awk '{print $NF}')

echo "   Verifier deployed at: $VERIFIER_ADDRESS"

echo ""
echo "==> Deploying Game..."
GAME_CLASS_HASH=$(starkli declare \
  "$ARTIFACTS_DIR/zkbluff_Game.contract_class.json" \
  --rpc "$RPC" \
  --account "$STARKNET_ACCOUNT" \
  --keystore "$STARKNET_KEYSTORE" \
  --watch 2>&1 | grep "Class hash" | awk '{print $NF}')

echo "   Game class hash: $GAME_CLASS_HASH"

GAME_ADDRESS=$(starkli deploy \
  "$GAME_CLASS_HASH" \
  "$TOKEN_ADDRESS" \
  "$VERIFIER_ADDRESS" \
  --rpc "$RPC" \
  --account "$STARKNET_ACCOUNT" \
  --keystore "$STARKNET_KEYSTORE" \
  --watch 2>&1 | grep "Contract address" | awk '{print $NF}')

echo "   Game deployed at: $GAME_ADDRESS"

echo ""
echo "==> Writing frontend .env..."
FRONTEND_ENV="$(cd "$(dirname "$0")/../frontend" && pwd)/.env"
cat > "$FRONTEND_ENV" <<EOF
VITE_GAME_ADDRESS=$GAME_ADDRESS
VITE_TOKEN_ADDRESS=$TOKEN_ADDRESS
VITE_VERIFIER_ADDRESS=$VERIFIER_ADDRESS
VITE_STARKNET_RPC=$RPC
EOF

echo "   Written to $FRONTEND_ENV"
echo ""
echo "==> Deployment complete!"
echo ""
echo "  Game:     $GAME_ADDRESS"
echo "  Token:    $TOKEN_ADDRESS"
echo "  Verifier: $VERIFIER_ADDRESS"
echo ""
echo "Next steps:"
echo "  1. Compile circuits: cd circuits && npm install && npm run build:all"
echo "  2. Run trusted setup: npm run setup:declaration"
echo "  3. Update VK_HASH in this script with the real verification key hash"
echo "  4. Re-deploy the Verifier with the correct VK hash"
echo "  5. Copy circuit artifacts to frontend/public/circuits/"
echo "  6. cd frontend && npm install && npm run dev"
