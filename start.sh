#!/bin/bash

echo "==================================="
echo "🚀 Starting Probuild ERP"
echo "==================================="
echo ""
echo "Environment Information:"
echo "  NODE_ENV: ${NODE_ENV:-not set}"
echo "  PORT: ${PORT:-not set}"
echo "  DATABASE_URL: ${DATABASE_URL:+***set***}"
echo "  DATABASE_URL: ${DATABASE_URL:-❌ NOT SET}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set!"
  echo "Please set it in Railway dashboard → Variables tab"
  exit 1
fi

echo "✅ DATABASE_URL is configured"
echo ""

# Check if built files exist
if [ -f "dist/index.cjs" ]; then
  echo "✅ Found built server file (dist/index.cjs)"
  echo "🚀 Starting production server..."
  echo ""
  exec node dist/index.cjs
else
  echo "⚠️  Built server file not found, using tsx..."
  echo "🚀 Starting with tsx (slower but works)..."
  echo ""
  exec tsx server/index.ts
fi
