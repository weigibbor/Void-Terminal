#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "[VoidNotch] Building release binary..."
swift build -c release --arch arm64

BINARY=".build/release/VoidNotch"

if [ -f "$BINARY" ]; then
    echo "[VoidNotch] Signing binary..."
    codesign --force --options runtime \
        --sign "Developer ID Application: GE Labs (LE6BHLWBPY)" \
        --entitlements Resources/VoidNotch.entitlements \
        "$BINARY" 2>/dev/null || echo "[VoidNotch] Warning: Code signing skipped (no cert found)"

    echo "[VoidNotch] Build complete: $BINARY"
    ls -lh "$BINARY"
else
    echo "[VoidNotch] ERROR: Binary not found"
    exit 1
fi
