#!/bin/bash

#
# Enterprise App Kit Startup Script
# Handles dependency installation and service startup
#

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/logs"
PID_FILE="${SCRIPT_DIR}/.pids"

# Ensure log directory exists
mkdir -p "${LOG_DIR}"

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    
    # Read PIDs from file and kill processes
    if [ -f "${PID_FILE}" ]; then
        while IFS= read -r pid; do
            if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                echo "Stopping process $pid"
                kill -TERM "$pid" 2>/dev/null || true
            fi
        done < "${PID_FILE}"
        rm -f "${PID_FILE}"
    fi
    
    echo -e "${GREEN}Shutdown complete${NC}"
    exit 0
}

# Trap signals for graceful shutdown
trap cleanup SIGINT SIGTERM EXIT

echo "======================================"
echo "  Enterprise App Kit Startup"
echo "======================================"
echo ""

# Check Node.js version
echo -e "${GREEN}[1/4] Checking Node.js version...${NC}"
NODE_VERSION=$(node --version 2>/dev/null || echo "not found")
if [ "$NODE_VERSION" = "not found" ]; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
if [ "$NODE_MAJOR" -lt 20 ]; then
    echo -e "${RED}Error: Node.js 20.12+ is required (found: $NODE_VERSION)${NC}"
    exit 1
fi
echo -e "  ✓ Node.js $NODE_VERSION (OK)"

# Install Node.js dependencies
echo ""
echo -e "${GREEN}[2/4] Installing Node.js dependencies...${NC}"
if [ ! -d "${SCRIPT_DIR}/node_modules" ]; then
    echo "  Running npm install..."
    npm install --loglevel=error
else
    echo "  ✓ Dependencies already installed"
fi

# Validate package structure
echo ""
echo -e "${GREEN}[3/4] Validating package structure...${NC}"
if [ -f "${SCRIPT_DIR}/bin/ent-app-kit.js" ]; then
    echo "  ✓ CLI entry point found"
else
    echo -e "${RED}Error: CLI entry point missing at bin/ent-app-kit.js${NC}"
    exit 1
fi

if [ -f "${SCRIPT_DIR}/manifest.yaml" ]; then
    echo "  ✓ Kit manifest found"
else
    echo -e "${YELLOW}Warning: manifest.yaml not found${NC}"
fi

if [ -d "${SCRIPT_DIR}/payload" ]; then
    echo "  ✓ Payload directory exists"
else
    echo -e "${YELLOW}Warning: payload/ directory not found${NC}"
fi

# Run tests (optional, can be disabled with --skip-tests)
echo ""
echo -e "${GREEN}[4/4] Enterprise App Kit is ready${NC}"
echo ""
echo "======================================"
echo "  Available Commands"
echo "======================================"
echo ""
echo "  Setup workspace:"
echo "    npx ent-app-kit setup"
echo ""
echo "  Run with custom kit:"
echo "    npx ent-app-kit setup --kit-root /path/to/kit"
echo ""
echo "  View help:"
echo "    npx ent-app-kit --help"
echo ""
echo "======================================"
echo ""
echo -e "${YELLOW}Note: Enterprise App Kit is a CLI orchestrator.${NC}"
echo -e "${YELLOW}It does not run persistent services.${NC}"
echo -e "${YELLOW}Use the commands above to set up agent workspaces.${NC}"
echo ""
echo "Press Ctrl+C to exit"
echo ""

# Keep script running to maintain trap handlers
# This allows graceful cleanup if user presses Ctrl+C
while true; do
    sleep 1
done
