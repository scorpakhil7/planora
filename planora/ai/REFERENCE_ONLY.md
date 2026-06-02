# AI — Reference / Standalone Research Layer

> **This directory is NOT a primary runtime dependency of the Planora platform.**

## Purpose

Use this folder for:
- Standalone AI experiments and prototyping (LangChain chains, agent graphs, evals)
- Research scripts that run independently of the backend service
- Exploring new models or orchestration patterns before integrating them

## Runtime AI Layer

All production AI logic lives in the backend:

```
backend/app/ai/
├── planner.py     — PlannerService (goal → ordered steps)
└── prompts.py     — PromptManager (template registration + rendering)
```

The backend's `/api/ai/*` endpoints are the entry point for all AI capabilities at runtime.

## Contributing

Once a prototype in this folder is proven, port it into `backend/app/ai/` and expose it via a new route in `backend/app/api/routes/ai.py`.
