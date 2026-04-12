#!/bin/bash
# JointSave – Soroban deployment script (Stellar Testnet)
# Prerequisites: stellar CLI installed, funded testnet account

set -e

NETWORK="testnet"
SOURCE="deployer"   # stellar CLI identity name

echo "Building contracts..."
rustup run 1.85.0 cargo build --target wasm32-unknown-unknown --release \
  --manifest-path=contracts/factory/Cargo.toml
rustup run 1.85.0 cargo build --target wasm32-unknown-unknown --release \
  --manifest-path=contracts/rotational/Cargo.toml
rustup run 1.85.0 cargo build --target wasm32-unknown-unknown --release \
  --manifest-path=contracts/target/Cargo.toml
rustup run 1.85.0 cargo build --target wasm32-unknown-unknown --release \
  --manifest-path=contracts/flexible/Cargo.toml


echo ""
echo "Deploying JointSave Factory..."
FACTORY_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/jointsave_factory.wasm \
  --source "$SOURCE" \
  --network "$NETWORK")
echo "Factory contract ID: $FACTORY_ID"

echo ""
echo "Deploying Rotational Pool wasm..."
ROTATIONAL_WASM_HASH=$(stellar contract install \
  --wasm target/wasm32-unknown-unknown/release/jointsave_rotational.wasm \
  --source "$SOURCE" \
  --network "$NETWORK")
echo "Rotational wasm hash: $ROTATIONAL_WASM_HASH"

echo ""
echo "Deploying Target Pool wasm..."
TARGET_WASM_HASH=$(stellar contract install \
  --wasm target/wasm32-unknown-unknown/release/jointsave_target.wasm \
  --source "$SOURCE" \
  --network "$NETWORK")
echo "Target wasm hash: $TARGET_WASM_HASH"

echo ""
echo "Deploying Flexible Pool wasm..."
FLEXIBLE_WASM_HASH=$(stellar contract install \
  --wasm target/wasm32-unknown-unknown/release/jointsave_flexible.wasm \
  --source "$SOURCE" \
  --network "$NETWORK")
echo "Flexible wasm hash: $FLEXIBLE_WASM_HASH"

echo ""
echo "Deployment complete. Update your .env with:"
echo "NEXT_PUBLIC_FACTORY_CONTRACT_ID=$FACTORY_ID"
echo "NEXT_PUBLIC_ROTATIONAL_WASM_HASH=$ROTATIONAL_WASM_HASH"
echo "NEXT_PUBLIC_TARGET_WASM_HASH=$TARGET_WASM_HASH"
echo "NEXT_PUBLIC_FLEXIBLE_WASM_HASH=$FLEXIBLE_WASM_HASH"
