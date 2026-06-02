# Planora

Production-grade monorepo for the Planora platform.

## Architecture

```
planora/
├── frontend/        Next.js 14 + TypeScript + Tailwind CSS
├── backend/         FastAPI (Python) REST API
├── mobile/          React Native Expo app
├── realtime/        Node.js WebSocket services (Socket.IO)
├── ai/              AI orchestration layer (LangChain)
├── integrations/    External API abstractions
├── database/        Schemas + Alembic migrations
├── config/          Centralized environment management
├── scripts/         Setup and utility scripts
├── docker-compose.yml
└── .env.example
```

## Quick Start

### Prerequisites

- Node.js >= 18
- Python >= 3.12
- Docker & Docker Compose (optional)

### Option 1: Docker (recommended)

```bash
cp .env.example .env
# Edit .env with your values
docker compose up --build
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/docs
- Realtime: ws://localhost:4000

### Option 2: Manual Setup

```bash
# Run the setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Start all services
chmod +x scripts/dev.sh
./scripts/dev.sh
```

### Individual Services

```bash
# Frontend
cd frontend && npm run dev

# Backend
cd backend && uvicorn app.main:app --reload --port 8000

# Mobile
cd mobile && npx expo start

# Realtime
cd realtime && npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values. See `config/settings.py` for the full configuration schema.

## Database Migrations

```bash
cd database
alembic upgrade head      # Apply migrations
alembic revision --autogenerate -m "description"  # Create migration
```

## Project Structure Details

| Module         | Stack                        | Purpose                        |
| -------------- | ---------------------------- | ------------------------------ |
| `frontend`     | Next.js 14, Tailwind, TS     | Web application                |
| `backend`      | FastAPI, SQLAlchemy, Pydantic | REST API + business logic      |
| `mobile`       | React Native, Expo           | iOS / Android app              |
| `realtime`     | Node.js, Socket.IO, Redis    | WebSocket event distribution   |
| `ai`           | LangChain, OpenAI            | AI agent orchestration         |
| `integrations` | TypeScript, Axios            | Third-party API abstraction    |
| `database`     | Alembic, PostgreSQL          | Schema management + migrations |
| `config`       | Python dataclasses           | Centralized env configuration  |
