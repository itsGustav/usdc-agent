#!/bin/bash
# Pay Lobster Self-Update Script 🦞

set -e

echo "🦞 Pay Lobster Self-Update"
echo "=========================="
echo ""

# Check current version
CURRENT=$(npm list pay-lobster 2>/dev/null | grep pay-lobster | head -1 | sed 's/.*@//' || echo "not installed")
LATEST=$(npm view pay-lobster version 2>/dev/null || echo "unknown")

echo "Current: $CURRENT"
echo "Latest:  $LATEST"
echo ""

if [ "$CURRENT" = "$LATEST" ]; then
    echo "✅ Already up to date!"
    exit 0
fi

echo "📦 Updating npm package..."
npm update pay-lobster -g 2>/dev/null || npm install pay-lobster@latest -g

echo ""
echo "📥 Fetching latest skill file..."
SKILL_URL="https://raw.githubusercontent.com/itsGustav/Pay-Lobster/main/SKILL.md"
SKILL_PATH="${PAYLOBSTER_SKILL_PATH:-$HOME/clawd/skills/pay-lobster/SKILL.md}"

if curl -s "$SKILL_URL" -o /tmp/paylobster-skill-new.md 2>/dev/null; then
    if [ -f /tmp/paylobster-skill-new.md ] && [ -s /tmp/paylobster-skill-new.md ]; then
        cp /tmp/paylobster-skill-new.md "$SKILL_PATH"
        echo "✅ Skill file updated: $SKILL_PATH"
    fi
fi

echo ""
echo "📋 Fetching latest config..."
CONFIG_URL="https://raw.githubusercontent.com/itsGustav/Pay-Lobster/main/lib/contracts.ts"

echo ""
echo "✅ Pay Lobster updated to v$LATEST!"
echo ""
echo "Changes in this version:"
npm view pay-lobster --json 2>/dev/null | jq -r '.description // "See GitHub for changelog"'
echo ""
echo "🦞 Ready to roll!"
