"""
Metrics Service - Track LLM performance metrics for baseline and optimization.

Extends usage_tracker with timing and performance data.
"""
import time
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import Optional
from contextlib import contextmanager
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.orm import Session

from services.usage_tracker import Base, usage_tracker

logger = logging.getLogger("metrics")


class PerformanceLog(Base):
    """SQLAlchemy model for performance logs."""
    __tablename__ = "performance_logs"

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    session_id = Column(String, nullable=True)
    call_type = Column(String, nullable=False)  # chat, complete, stream, workflow_step

    # Timing (in milliseconds)
    time_to_first_token_ms = Column(Float, nullable=True)
    time_to_complete_ms = Column(Float, nullable=True)

    # Tokens
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    context_size_chars = Column(Integer, default=0)

    # Provider info
    provider = Column(String, nullable=False)
    model = Column(String, nullable=False)

    # Error tracking
    error = Column(Text, nullable=True)


@dataclass
class LLMCallMetrics:
    """Metrics for a single LLM call."""
    call_id: str
    session_id: str = ""
    call_type: str = "chat"
    start_time: float = field(default_factory=time.time)

    # Timing
    time_to_first_token_ms: Optional[float] = None
    time_to_complete_ms: Optional[float] = None
    first_token_received: bool = False

    # Tokens
    input_tokens: int = 0
    output_tokens: int = 0
    context_size_chars: int = 0

    # Provider
    provider: str = ""
    model: str = ""

    # Error
    error: Optional[str] = None

    def mark_first_token(self):
        """Mark when the first token is received."""
        if not self.first_token_received:
            self.time_to_first_token_ms = (time.time() - self.start_time) * 1000
            self.first_token_received = True

    def mark_complete(self, input_tokens: int = 0, output_tokens: int = 0):
        """Mark the call as complete."""
        self.time_to_complete_ms = (time.time() - self.start_time) * 1000
        if input_tokens:
            self.input_tokens = input_tokens
        if output_tokens:
            self.output_tokens = output_tokens

    def mark_error(self, error: str):
        """Mark the call as failed."""
        self.time_to_complete_ms = (time.time() - self.start_time) * 1000
        self.error = error


class MetricsCollector:
    """
    Collects and analyzes LLM performance metrics.

    Uses the same database as usage_tracker for consistency.
    """

    def __init__(self):
        # Create table if needed
        Base.metadata.create_all(usage_tracker.engine)
        self.Session = usage_tracker.Session

        # In-memory metrics for current session
        self._session_metrics: list[LLMCallMetrics] = []
        self._call_counter = 0

    def new_call(
        self,
        session_id: str = "",
        call_type: str = "chat",
        provider: str = "",
        model: str = "",
        context_size_chars: int = 0,
    ) -> LLMCallMetrics:
        """Create a new metrics tracker for an LLM call."""
        self._call_counter += 1
        call_id = f"{session_id or 'anon'}_{self._call_counter}_{int(time.time())}"

        metrics = LLMCallMetrics(
            call_id=call_id,
            session_id=session_id,
            call_type=call_type,
            provider=provider,
            model=model,
            context_size_chars=context_size_chars,
        )
        return metrics

    @contextmanager
    def track_call(
        self,
        session_id: str = "",
        call_type: str = "chat",
        provider: str = "",
        model: str = "",
        context_size_chars: int = 0,
    ):
        """
        Context manager for tracking an LLM call.

        Usage:
            with metrics_collector.track_call(...) as metrics:
                # Do LLM call
                metrics.mark_first_token()  # When first token received
            # Automatically saved on exit
        """
        metrics = self.new_call(
            session_id=session_id,
            call_type=call_type,
            provider=provider,
            model=model,
            context_size_chars=context_size_chars,
        )
        try:
            yield metrics
        except Exception as e:
            metrics.mark_error(str(e))
            raise
        finally:
            if metrics.time_to_complete_ms is None:
                metrics.mark_complete()
            self.save_metrics(metrics)

    def save_metrics(self, metrics: LLMCallMetrics):
        """Save metrics to database and in-memory session."""
        # Add to session tracking
        self._session_metrics.append(metrics)

        # Log to console
        self._log_metrics(metrics)

        # Persist to database
        session = self.Session()
        try:
            log = PerformanceLog(
                session_id=metrics.session_id,
                call_type=metrics.call_type,
                time_to_first_token_ms=metrics.time_to_first_token_ms,
                time_to_complete_ms=metrics.time_to_complete_ms,
                input_tokens=metrics.input_tokens,
                output_tokens=metrics.output_tokens,
                context_size_chars=metrics.context_size_chars,
                provider=metrics.provider,
                model=metrics.model,
                error=metrics.error,
            )
            session.add(log)
            session.commit()
        except Exception as e:
            logger.error(f"Failed to save metrics: {e}")
            session.rollback()
        finally:
            session.close()

    def _log_metrics(self, metrics: LLMCallMetrics):
        """Log metrics to console."""
        ttft = f"{metrics.time_to_first_token_ms:.0f}ms" if metrics.time_to_first_token_ms else "N/A"
        ttc = f"{metrics.time_to_complete_ms:.0f}ms" if metrics.time_to_complete_ms else "N/A"
        status = "ERROR" if metrics.error else "OK"

        logger.info(
            f"LLM_METRICS | {status} | "
            f"type={metrics.call_type} | "
            f"ttft={ttft} | ttc={ttc} | "
            f"in={metrics.input_tokens} | out={metrics.output_tokens} | "
            f"ctx={metrics.context_size_chars} | "
            f"provider={metrics.provider} | model={metrics.model}"
        )

    def get_session_metrics(self) -> dict:
        """Get metrics summary for current session."""
        if not self._session_metrics:
            return {
                "total_calls": 0,
                "avg_ttft_ms": None,
                "avg_ttc_ms": None,
                "avg_input_tokens": 0,
                "avg_output_tokens": 0,
                "avg_context_chars": 0,
                "error_rate": 0,
                "calls_by_type": {},
            }

        calls = self._session_metrics
        total = len(calls)

        # Calculate averages (excluding None values)
        ttfts = [c.time_to_first_token_ms for c in calls if c.time_to_first_token_ms is not None]
        ttcs = [c.time_to_complete_ms for c in calls if c.time_to_complete_ms is not None]
        inputs = [c.input_tokens for c in calls]
        outputs = [c.output_tokens for c in calls]
        contexts = [c.context_size_chars for c in calls]
        errors = [c for c in calls if c.error]

        # Group by call type
        by_type: dict[str, dict] = {}
        for c in calls:
            if c.call_type not in by_type:
                by_type[c.call_type] = {"count": 0, "avg_ttc_ms": 0, "ttcs": []}
            by_type[c.call_type]["count"] += 1
            if c.time_to_complete_ms:
                by_type[c.call_type]["ttcs"].append(c.time_to_complete_ms)

        for call_type, data in by_type.items():
            if data["ttcs"]:
                data["avg_ttc_ms"] = sum(data["ttcs"]) / len(data["ttcs"])
            del data["ttcs"]

        return {
            "total_calls": total,
            "avg_ttft_ms": sum(ttfts) / len(ttfts) if ttfts else None,
            "avg_ttc_ms": sum(ttcs) / len(ttcs) if ttcs else None,
            "avg_input_tokens": sum(inputs) / len(inputs) if inputs else 0,
            "avg_output_tokens": sum(outputs) / len(outputs) if outputs else 0,
            "avg_context_chars": sum(contexts) / len(contexts) if contexts else 0,
            "error_rate": len(errors) / total if total > 0 else 0,
            "calls_by_type": by_type,
        }

    def get_baseline_report(self, days: int = 7) -> dict:
        """
        Generate a baseline report from historical data.

        Args:
            days: Number of days to include in the report
        """
        session = self.Session()
        try:
            start = datetime.utcnow() - timedelta(days=days)
            logs = session.query(PerformanceLog).filter(
                PerformanceLog.timestamp >= start,
                PerformanceLog.error.is_(None)  # Only successful calls
            ).all()

            if not logs:
                return {
                    "period_days": days,
                    "total_calls": 0,
                    "message": "No data available. Use the app to generate baseline data."
                }

            # Calculate metrics
            ttfts = [l.time_to_first_token_ms for l in logs if l.time_to_first_token_ms]
            ttcs = [l.time_to_complete_ms for l in logs if l.time_to_complete_ms]
            inputs = [l.input_tokens for l in logs if l.input_tokens]
            contexts = [l.context_size_chars for l in logs if l.context_size_chars]

            # Group by call type
            by_type: dict[str, dict] = {}
            for log in logs:
                if log.call_type not in by_type:
                    by_type[log.call_type] = {
                        "count": 0,
                        "avg_ttft_ms": 0,
                        "avg_ttc_ms": 0,
                        "ttfts": [],
                        "ttcs": [],
                    }
                by_type[log.call_type]["count"] += 1
                if log.time_to_first_token_ms:
                    by_type[log.call_type]["ttfts"].append(log.time_to_first_token_ms)
                if log.time_to_complete_ms:
                    by_type[log.call_type]["ttcs"].append(log.time_to_complete_ms)

            for call_type, data in by_type.items():
                if data["ttfts"]:
                    data["avg_ttft_ms"] = round(sum(data["ttfts"]) / len(data["ttfts"]), 2)
                if data["ttcs"]:
                    data["avg_ttc_ms"] = round(sum(data["ttcs"]) / len(data["ttcs"]), 2)
                del data["ttfts"]
                del data["ttcs"]

            # Percentiles for TTFT
            ttft_p50 = None
            ttft_p95 = None
            if ttfts:
                sorted_ttfts = sorted(ttfts)
                ttft_p50 = sorted_ttfts[len(sorted_ttfts) // 2]
                ttft_p95 = sorted_ttfts[int(len(sorted_ttfts) * 0.95)]

            return {
                "period_days": days,
                "total_calls": len(logs),
                "metrics": {
                    "ttft": {
                        "avg_ms": round(sum(ttfts) / len(ttfts), 2) if ttfts else None,
                        "p50_ms": round(ttft_p50, 2) if ttft_p50 else None,
                        "p95_ms": round(ttft_p95, 2) if ttft_p95 else None,
                        "target_ms": 500,  # Objective
                    },
                    "ttc": {
                        "avg_ms": round(sum(ttcs) / len(ttcs), 2) if ttcs else None,
                    },
                    "tokens": {
                        "avg_input": round(sum(inputs) / len(inputs), 0) if inputs else 0,
                        "target_input": 3000,  # Objective (after optimization)
                    },
                    "context": {
                        "avg_chars": round(sum(contexts) / len(contexts), 0) if contexts else 0,
                        "target_chars": 8000,  # ~2000 tokens
                    },
                },
                "by_call_type": by_type,
                "objectives": {
                    "ttft_target_ms": 500,
                    "context_target_tokens": 2000,
                    "calls_per_workflow_start": 1,  # Currently 2
                }
            }
        finally:
            session.close()

    def clear_session(self):
        """Clear session metrics."""
        self._session_metrics = []


# Singleton instance
metrics_collector = MetricsCollector()
