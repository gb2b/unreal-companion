"""
Logging Configuration for Unreal Companion Server

Provides:
- Console output (colored)
- File logging with rotation
- Request/response logging middleware
- Structured logging for debugging
"""

import logging
import logging.handlers
import sys
from pathlib import Path
from datetime import datetime
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import time
import json


# === Log Directory ===

LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)


# === Custom Formatter with Colors ===

class ColoredFormatter(logging.Formatter):
    """Formatter with ANSI colors for console output."""

    COLORS = {
        "DEBUG": "\033[36m",     # Cyan
        "INFO": "\033[32m",      # Green
        "WARNING": "\033[33m",   # Yellow
        "ERROR": "\033[31m",     # Red
        "CRITICAL": "\033[35m",  # Magenta
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, "")
        record.levelname = f"{color}{record.levelname}{self.RESET}"
        return super().format(record)


# === Setup Functions ===

def setup_logging(
    level: str = "INFO",
    log_file: str = "server.log",
    max_bytes: int = 10 * 1024 * 1024,  # 10 MB
    backup_count: int = 5,
) -> logging.Logger:
    """
    Configure logging for the application.

    Args:
        level: Minimum log level (DEBUG, INFO, WARNING, ERROR)
        log_file: Name of the log file
        max_bytes: Max size before rotation
        backup_count: Number of backup files to keep

    Returns:
        Root logger
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Clear existing handlers
    root_logger.handlers.clear()

    # === Console Handler ===
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    console_format = ColoredFormatter(
        "%(asctime)s │ %(levelname)-8s │ %(name)-20s │ %(message)s",
        datefmt="%H:%M:%S"
    )
    console_handler.setFormatter(console_format)
    root_logger.addHandler(console_handler)

    # === File Handler (with rotation) ===
    log_path = LOG_DIR / log_file
    file_handler = logging.handlers.RotatingFileHandler(
        log_path,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    file_handler.setLevel(logging.DEBUG)
    file_format = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)-25s | %(filename)s:%(lineno)d | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    file_handler.setFormatter(file_format)
    root_logger.addHandler(file_handler)

    # === API Calls File (separate log for LLM calls) ===
    api_log_path = LOG_DIR / "api_calls.log"
    api_handler = logging.handlers.RotatingFileHandler(
        api_log_path,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    api_handler.setLevel(logging.DEBUG)
    api_handler.setFormatter(file_format)

    # Create dedicated logger for API calls
    api_logger = logging.getLogger("api_calls")
    api_logger.addHandler(api_handler)
    api_logger.propagate = False  # Don't duplicate to root

    # === Reduce noise from libraries ===
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("anthropic").setLevel(logging.INFO)
    logging.getLogger("openai").setLevel(logging.INFO)

    root_logger.info(f"Logging initialized - Level: {level}, File: {log_path}")

    return root_logger


def get_logger(name: str) -> logging.Logger:
    """Get a logger for a specific module."""
    return logging.getLogger(name)


# === Request Logging Middleware ===

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all HTTP requests and responses."""

    def __init__(self, app, logger_name: str = "http"):
        super().__init__(app)
        self.logger = logging.getLogger(logger_name)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip health checks and static assets
        if request.url.path in ("/health", "/api") or request.url.path.startswith("/assets"):
            return await call_next(request)

        start_time = time.time()

        # Log request
        self.logger.info(f"→ {request.method} {request.url.path}")

        # Process request
        try:
            response = await call_next(request)
            duration = (time.time() - start_time) * 1000

            # Log response
            status_color = "\033[32m" if response.status_code < 400 else "\033[31m"
            self.logger.info(
                f"← {status_color}{response.status_code}\033[0m {request.method} {request.url.path} ({duration:.1f}ms)"
            )

            return response

        except Exception as e:
            duration = (time.time() - start_time) * 1000
            self.logger.error(
                f"✗ {request.method} {request.url.path} ({duration:.1f}ms) - {type(e).__name__}: {e}"
            )
            raise


# === LLM Call Logger ===

def log_llm_call(
    provider: str,
    model: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    duration_ms: float = 0,
    error: str | None = None,
    context: dict | None = None,
):
    """Log an LLM API call for debugging and cost tracking."""
    logger = logging.getLogger("api_calls")

    data = {
        "timestamp": datetime.now().isoformat(),
        "provider": provider,
        "model": model,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": prompt_tokens + completion_tokens,
        "duration_ms": round(duration_ms, 1),
        "error": error,
    }

    if context:
        data["context"] = context

    if error:
        logger.error(f"LLM Error: {provider}/{model} - {error}")
    else:
        logger.info(
            f"LLM Call: {provider}/{model} - {prompt_tokens}+{completion_tokens} tokens, {duration_ms:.0f}ms"
        )

    # Also write as JSON for easy parsing
    json_log_path = LOG_DIR / "api_calls.jsonl"
    with open(json_log_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(data) + "\n")
