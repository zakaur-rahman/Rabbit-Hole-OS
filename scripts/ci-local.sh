#!/bin/bash
set -e

echo "Installing deps..."
npm ci --legacy-peer-deps
python3 -m pip install -r apps/backend/requirements.txt ruff --quiet

echo "Lint..."
npx turbo run lint typecheck
ruff check apps/backend/ --select E,W,F --ignore E501,E402,E701,F841

echo "Testing..."
npx turbo run test

echo "Building..."
npx turbo run build

echo "Docker..."
docker build -f apps/web/Dockerfile -t cognode-web:test .
docker build -f apps/backend/Dockerfile -t cognode-backend:test .

echo "✅ All checks passed"
