#!/bin/bash

#
# Enterprise App Kit Stop Script
# Gracefully stops any running processes
#

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="${SCRIPT_DIR}/.pids"

echo "======================================"
echo "  Enterprise App Kit Stop"
echo "======================================"
echo ""

# Check if PID file exists
if [ ! -f "${PID_FILE}" ]; then
    echo -e "${YELLOW}No running processes found (PID file does not exist)${NC}"
    echo ""
    echo "If processes are still running, you can:"
    echo "  1. Find them: ps aux | grep ent-app-kit"
    echo "  2. Kill them: kill -TERM <pid>"
    exit 0
fi

# Stop processes listed in PID file
echo "Stopping processes..."
STOPPED_COUNT=0
NOT_RUNNING_COUNT=0

while IFS= read -r pid; do
    if [ -z "$pid" ]; then
        continue
    fi
    
    if kill -0 "$pid" 2>/dev/null; then
        echo -e "  Stopping process ${pid}..."
        kill -TERM "$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
        
        # Wait up to 5 seconds for graceful shutdown
        for i in {1..10}; do
            if ! kill -0 "$pid" 2>/dev/null; then
                break
            fi
            sleep 0.5
        done
        
        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "  ${YELLOW}Force killing process ${pid}${NC}"
            kill -KILL "$pid" 2>/dev/null || true
        fi
        
        STOPPED_COUNT=$((STOPPED_COUNT + 1))
    else
        NOT_RUNNING_COUNT=$((NOT_RUNNING_COUNT + 1))
    fi
done < "${PID_FILE}"

# Remove PID file
rm -f "${PID_FILE}"

echo ""
echo "======================================"
echo "  Summary"
echo "======================================"
echo "  Stopped: ${STOPPED_COUNT} process(es)"
if [ $NOT_RUNNING_COUNT -gt 0 ]; then
    echo "  Already stopped: ${NOT_RUNNING_COUNT} process(es)"
fi
echo ""
echo -e "${GREEN}Stop complete${NC}"
