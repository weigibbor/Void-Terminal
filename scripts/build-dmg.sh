#!/bin/bash
set -e

# Build DMG with create-dmg (proper retina background + icon positions)
# Requires: brew install create-dmg

RELEASE_DIR="$(cd "$(dirname "$0")/.." && pwd)/release"
BUILD_DIR="$(cd "$(dirname "$0")/.." && pwd)/build"
APP_PATH="$RELEASE_DIR/mac-arm64/Void Terminal.app"
VERSION=$(node -p "require('$(cd "$(dirname "$0")/.." && pwd)/package.json').version")
DMG_PATH="$RELEASE_DIR/Void Terminal-${VERSION}-arm64.dmg"

echo "[DMG] Building Void Terminal v${VERSION}..."

# Remove old DMG
rm -f "$DMG_PATH"

# Build with create-dmg (TablePlus-style layout)
create-dmg \
  --volname "Void Terminal" \
  --volicon "$BUILD_DIR/icon.icns" \
  --background "$BUILD_DIR/dmg-bg@2x.png" \
  --window-pos 200 120 \
  --window-size 660 440 \
  --icon-size 140 \
  --text-size 14 \
  --icon "Void Terminal.app" 175 195 \
  --app-drop-link 485 195 \
  --no-internet-enable \
  "$DMG_PATH" \
  "$APP_PATH"

echo "[DMG] Done: $DMG_PATH"
ls -lh "$DMG_PATH"
