"""
Metrics API endpoints for performance monitoring and baseline reporting.
"""
from fastapi import APIRouter
from services.metrics import metrics_collector

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("")
def get_session_metrics():
    """
    Get performance metrics for the current session.

    Returns:
        Session metrics including avg TTFT, TTC, token counts, etc.
    """
    return metrics_collector.get_session_metrics()


@router.get("/baseline")
def get_baseline_report(days: int = 7):
    """
    Get baseline performance report from historical data.

    Args:
        days: Number of days to include (default 7)

    Returns:
        Baseline report with averages, percentiles, and objectives.
    """
    return metrics_collector.get_baseline_report(days)


@router.post("/clear")
def clear_session_metrics():
    """Clear session-level metrics."""
    metrics_collector.clear_session()
    return {"success": True}
