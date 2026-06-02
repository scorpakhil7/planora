# Integrations — Reference / Node.js Prototype Layer

> **This directory is NOT a primary runtime dependency of the Planora platform.**

## Purpose

Use this folder for:
- TypeScript / Node.js integration prototypes (webhook handlers, SDK experiments, etc.)
- Rapid exploration of third-party APIs before writing Python adapters
- Tooling that only makes sense in a Node.js runtime (Webhooks, OAuth flows, etc.)

## Runtime Integration Layer

All production integration logic lives in the backend (Python):

```
backend/app/integrations/
├── base.py        — BaseAdapter ABC (initialize, health_check, call)
└── registry.py    — Adapter registry (register, get, list_adapters)
```

The backend's `/api/integrations/*` endpoints are the entry point for all integrations at runtime.

## Contributing

Once a prototype in this folder is proven, implement it as a Python `BaseAdapter` subclass in `backend/app/integrations/` and register it in `backend/app/main.py`.
