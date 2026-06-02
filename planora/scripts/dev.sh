#!/bin/bash
set -e

echo "Starting Planora development services..."
echo "Frontend:     http://localhost:3000"
echo "Backend API:  http://localhost:8000/api/docs"
echo "Realtime:     ws://localhost:4000"

npx concurrently \
  --names "frontend,backend,realtime" \
  --prefix-colors "blue,green,yellow" \
  "cd frontend && npm run dev" \
  "cd backend && uvicorn app.main:app --reload --port 8000" \
  "cd realtime && npm run dev"
