from app.integrations.base import BaseAdapter
from app.integrations.irctc import IRCTCAdapter
from app.integrations.redbus import RedBusAdapter
from app.integrations.flights import FlightsAdapter
from app.integrations.hotels import HotelsAdapter


_ADAPTERS: dict[str, BaseAdapter] = {}


def register(adapter: BaseAdapter) -> None:
    """Register an adapter instance by name."""
    _ADAPTERS[adapter.name] = adapter


def get(name: str) -> BaseAdapter:
    if name not in _ADAPTERS:
        raise KeyError(f"Integration adapter '{name}' not registered.")
    return _ADAPTERS[name]


def list_adapters() -> list[str]:
    return list(_ADAPTERS.keys())


def _bootstrap() -> None:
    """Auto-register all known adapters on import."""
    for adapter in [IRCTCAdapter(), RedBusAdapter(), FlightsAdapter(), HotelsAdapter()]:
        register(adapter)


_bootstrap()
