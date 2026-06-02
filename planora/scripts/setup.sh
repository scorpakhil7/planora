#!/bin/bash
set -e

echo "=== Planora Setup ==="

echo "Installing frontend dependencies..."
cd frontend && npm install && cd ..

echo "Installing backend dependencies..."
cd backend && pip install -r requirements.txt && cd ..

echo "Installing mobile dependencies..."
cd mobile && npm install && cd ..

echo "Installing realtime dependencies..."
cd realtime && npm install && cd ..

echo "Installing AI dependencies..."
cd ai && pip install -r requirements.txt && cd ..

echo "Installing integrations dependencies..."
cd integrations && npm install && cd ..

echo "Copying environment file..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — update values before running."
else
  echo ".env already exists, skipping."
fi

echo "=== Setup complete ==="
