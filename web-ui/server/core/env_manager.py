"""
Environment Variables Manager

Safely read and write API keys to .env file.
"""

import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# .env file location (in server directory)
ENV_FILE = Path(__file__).parent.parent / ".env"


def _read_env_file() -> dict[str, str]:
    """Read all variables from .env file."""
    env_vars = {}
    if ENV_FILE.exists():
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    # Remove quotes if present
                    value = value.strip().strip("'").strip('"')
                    env_vars[key.strip()] = value
    return env_vars


def _write_env_file(env_vars: dict[str, str]) -> None:
    """Write all variables to .env file."""
    lines = []
    for key, value in sorted(env_vars.items()):
        # Quote value if it contains spaces or special characters
        if " " in value or "'" in value or '"' in value:
            value = f'"{value}"'
        lines.append(f"{key}={value}")

    with open(ENV_FILE, "w", encoding="utf-8") as f:
        f.write("# Unreal Companion Environment Configuration\n")
        f.write("# Auto-generated - do not edit manually while server is running\n\n")
        f.write("\n".join(lines))
        f.write("\n")

    logger.info(f"Saved {len(env_vars)} variables to {ENV_FILE}")


def get_env(key: str, default: str = "") -> str:
    """Get environment variable, checking .env file first."""
    # Check .env file
    env_vars = _read_env_file()
    if key in env_vars:
        return env_vars[key]
    # Fallback to actual environment
    return os.environ.get(key, default)


def set_env(key: str, value: str) -> None:
    """Set environment variable and persist to .env file."""
    env_vars = _read_env_file()

    if value:
        env_vars[key] = value
        logger.info(f"Setting {key} (len={len(value)})")
    else:
        # Remove the key if value is empty
        env_vars.pop(key, None)
        logger.info(f"Removing {key}")

    _write_env_file(env_vars)

    # Also update the current process environment
    if value:
        os.environ[key] = value
    elif key in os.environ:
        del os.environ[key]


def save_api_key(provider: str, key: str) -> None:
    """Save an API key for a provider."""
    key_mapping = {
        "anthropic": "ANTHROPIC_API_KEY",
        "openai": "OPENAI_API_KEY",
        "google": "GOOGLE_API_KEY",
        "meshy": "MESHY_API_KEY",
    }

    env_key = key_mapping.get(provider.lower())
    if env_key:
        set_env(env_key, key)
    else:
        logger.warning(f"Unknown provider: {provider}")


def get_api_key(provider: str) -> str:
    """Get an API key for a provider."""
    key_mapping = {
        "anthropic": "ANTHROPIC_API_KEY",
        "openai": "OPENAI_API_KEY",
        "google": "GOOGLE_API_KEY",
        "meshy": "MESHY_API_KEY",
    }

    env_key = key_mapping.get(provider.lower())
    if env_key:
        return get_env(env_key, "")
    return ""
