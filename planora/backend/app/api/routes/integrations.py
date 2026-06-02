from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.integrations.registry import list_adapters, get
from app.core.response import ok, fail

router = APIRouter(prefix="/integrations", tags=["Integrations"])


class ActionRequest(BaseModel):
    action: str
    payload: dict = {}


@router.get("")
async def list_integrations():
    """List all registered integration adapters."""
    return ok(list_adapters())


@router.get("/{name}/health")
async def integration_health(name: str):
    """Check health of a specific integration adapter."""
    try:
        adapter = get(name)
        healthy = await adapter.health_check()
        return ok({"name": name, "healthy": healthy})
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=fail(str(exc)))


@router.post("/{name}/call")
async def call_integration(name: str, body: ActionRequest):
    """Dispatch an action (search / book / cancel) to a specific adapter."""
    try:
        adapter = get(name)
        result = await adapter.call(body.action, body.payload)
        return ok(result)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=fail(str(exc)))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=fail(str(exc)))
