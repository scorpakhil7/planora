from typing import Any


_REGISTRY: dict[str, str] = {}


def register(name: str, template: str) -> None:
    """Register a named prompt template."""
    _REGISTRY[name] = template


def render(name: str, **kwargs: Any) -> str:
    """Retrieve and format a named prompt template."""
    if name not in _REGISTRY:
        raise KeyError(f"Prompt '{name}' not registered.")
    return _REGISTRY[name].format(**kwargs)


def list_prompts() -> list[str]:
    return list(_REGISTRY.keys())
