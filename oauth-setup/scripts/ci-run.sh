#!/bin/bash

# CI Helper Script for oauth-setup tests
# This script installs dependencies and runs tests with proper environment variables

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== OAuth Setup CI Runner ===${NC}"
echo ""

# Get the script directory and navigate to oauth-setup root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OAUTH_SETUP_DIR="$(dirname "$SCRIPT_DIR")"

cd "$OAUTH_SETUP_DIR"

echo -e "${YELLOW}Working directory: $OAUTH_SETUP_DIR${NC}"
echo ""

# Step 1: Install dependencies
echo -e "${GREEN}Step 1: Installing dependencies...${NC}"
if [ -f "package-lock.json" ]; then
    npm ci
else
    npm install
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 2: Set up environment variables with placeholders
echo -e "${GREEN}Step 2: Setting up environment variables...${NC}"

# Use provided secrets if available, otherwise use test placeholders
export TIKTOK_CLIENT_ID="${TIKTOK_CLIENT_ID:-test-client-id-placeholder}"
export TIKTOK_CLIENT_SECRET="${TIKTOK_CLIENT_SECRET:-test-client-secret-placeholder}"
export TIKTOK_REDIRECT_URI="${TIKTOK_REDIRECT_URI:-http://localhost:3000/auth/tiktok/callback}"
export ALLOWED_REDIRECT_URIS="${ALLOWED_REDIRECT_URIS:-http://localhost:3000/auth/tiktok/callback}"
export JWT_SECRET="${JWT_SECRET:-test-jwt-secret-for-ci}"
export SESSION_SECRET="${SESSION_SECRET:-test-session-secret-for-ci}"
export NODE_ENV="${NODE_ENV:-test}"

echo "Environment variables configured:"
echo "  TIKTOK_CLIENT_ID: ${TIKTOK_CLIENT_ID:0:10}..."
echo "  TIKTOK_REDIRECT_URI: $TIKTOK_REDIRECT_URI"
echo "  NODE_ENV: $NODE_ENV"
echo -e "${GREEN}✓ Environment configured${NC}"
echo ""

# Step 3: Run tests
echo -e "${GREEN}Step 3: Running tests...${NC}"
echo ""

# Run tests and capture exit code
npm test
TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
else
    echo -e "${RED}✗ Tests failed with exit code $TEST_EXIT_CODE${NC}"
fi

echo ""
echo -e "${GREEN}=== CI Run Complete ===${NC}"

# Exit with the test exit code
exit $TEST_EXIT_CODE
