"""
Usage Tracker - Track LLM usage locally with cost estimation.

Stores usage data in SQLite for persistence across sessions.
"""
import time
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Optional
from sqlalchemy import Column, Integer, String, Float, DateTime, create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

Base = declarative_base()


# Pricing per 1M tokens (approximate, in USD)
PRICING = {
    # Anthropic
    "claude-sonnet-4-20250514": {"input": 3.0, "output": 15.0},
    "claude-sonnet-4-20250514": {"input": 3.0, "output": 15.0},
    "claude-3-5-sonnet-20241022": {"input": 3.0, "output": 15.0},
    "claude-3-5-haiku-20241022": {"input": 0.25, "output": 1.25},
    
    # OpenAI
    "codex-5.2": {"input": 10.0, "output": 30.0},
    "gpt-5-turbo": {"input": 5.0, "output": 15.0},
    "gpt-5-mini": {"input": 0.15, "output": 0.6},
    "gpt-4o": {"input": 2.5, "output": 10.0},
    "gpt-4o-mini": {"input": 0.15, "output": 0.6},
    
    # Google
    "gemini-3-pro": {"input": 1.25, "output": 5.0},
    "gemini-3-flash": {"input": 0.075, "output": 0.3},
    "gemini-2-ultra": {"input": 5.0, "output": 15.0},
    "gemini-2-pro": {"input": 1.25, "output": 5.0},
    
    # Ollama/Local (free)
    "llama4": {"input": 0.0, "output": 0.0},
    "llama3.3": {"input": 0.0, "output": 0.0},
    "llama3.2": {"input": 0.0, "output": 0.0},
    "mistral": {"input": 0.0, "output": 0.0},
    "mixtral": {"input": 0.0, "output": 0.0},
}

# Default pricing for unknown models
DEFAULT_PRICING = {"input": 1.0, "output": 5.0}


class UsageLog(Base):
    """SQLAlchemy model for usage logs."""
    __tablename__ = "usage_logs"
    
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    provider = Column(String, nullable=False)
    model = Column(String, nullable=False)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    estimated_cost = Column(Float, default=0.0)
    duration_ms = Column(Integer, default=0)
    project_id = Column(String, nullable=True)
    conversation_id = Column(String, nullable=True)


@dataclass
class UsageEntry:
    """A single usage entry."""
    provider: str
    model: str
    input_tokens: int
    output_tokens: int
    estimated_cost: float
    timestamp: datetime
    duration_ms: int = 0
    project_id: str = ""
    conversation_id: str = ""


class UsageTracker:
    """
    Tracks LLM usage locally with cost estimation.
    
    Features:
    - Persistent storage in SQLite
    - Cost estimation based on public pricing
    - Aggregation by period, provider, model
    - Session-level tracking
    """
    
    def __init__(self, db_path: str = "usage.db"):
        self.engine = create_engine(f"sqlite:///{db_path}")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        
        # Session-level tracking (for real-time display)
        self.session_usage: list[UsageEntry] = []
    
    def estimate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Estimate cost in USD for the given usage."""
        pricing = PRICING.get(model, DEFAULT_PRICING)
        
        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]
        
        return round(input_cost + output_cost, 6)
    
    def log_usage(
        self,
        provider: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        duration_ms: int = 0,
        project_id: str = "",
        conversation_id: str = "",
    ) -> UsageEntry:
        """Log a usage event."""
        estimated_cost = self.estimate_cost(model, input_tokens, output_tokens)
        
        entry = UsageEntry(
            provider=provider,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost=estimated_cost,
            timestamp=datetime.utcnow(),
            duration_ms=duration_ms,
            project_id=project_id,
            conversation_id=conversation_id,
        )
        
        # Add to session tracking
        self.session_usage.append(entry)
        
        # Persist to database
        session = self.Session()
        try:
            log = UsageLog(
                provider=provider,
                model=model,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                estimated_cost=estimated_cost,
                duration_ms=duration_ms,
                project_id=project_id,
                conversation_id=conversation_id,
            )
            session.add(log)
            session.commit()
        finally:
            session.close()
        
        return entry
    
    def get_session_summary(self) -> dict:
        """Get summary of current session usage."""
        total_input = sum(e.input_tokens for e in self.session_usage)
        total_output = sum(e.output_tokens for e in self.session_usage)
        total_cost = sum(e.estimated_cost for e in self.session_usage)
        
        by_provider: dict[str, dict] = {}
        by_model: dict[str, dict] = {}
        
        for entry in self.session_usage:
            # By provider
            if entry.provider not in by_provider:
                by_provider[entry.provider] = {
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "requests": 0,
                    "estimated_cost": 0.0,
                }
            by_provider[entry.provider]["input_tokens"] += entry.input_tokens
            by_provider[entry.provider]["output_tokens"] += entry.output_tokens
            by_provider[entry.provider]["requests"] += 1
            by_provider[entry.provider]["estimated_cost"] += entry.estimated_cost
            
            # By model
            if entry.model not in by_model:
                by_model[entry.model] = {
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "requests": 0,
                    "estimated_cost": 0.0,
                }
            by_model[entry.model]["input_tokens"] += entry.input_tokens
            by_model[entry.model]["output_tokens"] += entry.output_tokens
            by_model[entry.model]["requests"] += 1
            by_model[entry.model]["estimated_cost"] += entry.estimated_cost
        
        return {
            "total_input_tokens": total_input,
            "total_output_tokens": total_output,
            "total_requests": len(self.session_usage),
            "total_estimated_cost": round(total_cost, 4),
            "by_provider": by_provider,
            "by_model": by_model,
        }
    
    def get_usage(self, period: str = "week") -> dict:
        """
        Get usage summary for a given period.
        
        Args:
            period: "today", "week", or "month"
        """
        session = self.Session()
        try:
            # Calculate time range
            now = datetime.utcnow()
            if period == "today":
                start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            elif period == "week":
                start = now - timedelta(days=7)
            else:  # month
                start = now - timedelta(days=30)
            
            # Query logs
            logs = session.query(UsageLog).filter(
                UsageLog.timestamp >= start
            ).all()
            
            total_input = sum(l.input_tokens for l in logs)
            total_output = sum(l.output_tokens for l in logs)
            total_cost = sum(l.estimated_cost for l in logs)
            
            by_provider: dict[str, dict] = {}
            by_model: dict[str, dict] = {}
            daily: dict[str, dict] = {}
            
            for log in logs:
                # By provider
                if log.provider not in by_provider:
                    by_provider[log.provider] = {
                        "inputTokens": 0,
                        "outputTokens": 0,
                        "requests": 0,
                        "estimatedCost": 0.0,
                    }
                by_provider[log.provider]["inputTokens"] += log.input_tokens
                by_provider[log.provider]["outputTokens"] += log.output_tokens
                by_provider[log.provider]["requests"] += 1
                by_provider[log.provider]["estimatedCost"] += log.estimated_cost
                
                # By model
                if log.model not in by_model:
                    by_model[log.model] = {
                        "inputTokens": 0,
                        "outputTokens": 0,
                        "requests": 0,
                        "estimatedCost": 0.0,
                    }
                by_model[log.model]["inputTokens"] += log.input_tokens
                by_model[log.model]["outputTokens"] += log.output_tokens
                by_model[log.model]["requests"] += 1
                by_model[log.model]["estimatedCost"] += log.estimated_cost
                
                # Daily breakdown
                day = log.timestamp.strftime("%Y-%m-%d")
                if day not in daily:
                    daily[day] = {"inputTokens": 0, "outputTokens": 0, "requests": 0, "estimatedCost": 0.0}
                daily[day]["inputTokens"] += log.input_tokens
                daily[day]["outputTokens"] += log.output_tokens
                daily[day]["requests"] += 1
                daily[day]["estimatedCost"] += log.estimated_cost
            
            return {
                "totalInputTokens": total_input,
                "totalOutputTokens": total_output,
                "totalRequests": len(logs),
                "totalEstimatedCost": round(total_cost, 4),
                "byProvider": by_provider,
                "byModel": by_model,
                "daily": [{"date": k, **v} for k, v in sorted(daily.items())],
            }
        finally:
            session.close()
    
    def get_pricing(self) -> dict:
        """Get pricing table."""
        return PRICING
    
    def clear_session(self):
        """Clear session-level tracking."""
        self.session_usage = []
    
    async def fetch_anthropic_usage(
        self, 
        admin_api_key: str, 
        start_date: str, 
        end_date: str
    ) -> Optional[dict]:
        """
        Fetch usage from Anthropic API (requires Admin API key).
        
        Args:
            admin_api_key: Admin API key (sk-ant-admin-...)
            start_date: ISO 8601 start date
            end_date: ISO 8601 end date
        """
        import httpx
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    "https://api.anthropic.com/v1/organizations/usage_report/messages",
                    params={
                        "starting_at": start_date,
                        "ending_at": end_date,
                        "bucket_width": "1d",
                        "group_by[]": "model",
                    },
                    headers={
                        "anthropic-version": "2023-06-01",
                        "x-api-key": admin_api_key,
                    }
                )
                
                if response.status_code == 200:
                    return response.json()
                return {"error": f"HTTP {response.status_code}: {response.text[:200]}"}
        except Exception as e:
            return {"error": str(e)}
    
    async def fetch_openai_usage(
        self, 
        api_key: str, 
        start_time: int,
        end_time: int = None
    ) -> Optional[dict]:
        """
        Fetch usage from OpenAI API.
        
        Args:
            api_key: OpenAI API key
            start_time: Unix timestamp for start
            end_time: Unix timestamp for end (optional)
        """
        import httpx
        
        try:
            params = {"start_time": start_time}
            if end_time:
                params["end_time"] = end_time
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    "https://api.openai.com/v1/organization/usage/completions",
                    params=params,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                    }
                )
                
                if response.status_code == 200:
                    return response.json()
                return {"error": f"HTTP {response.status_code}: {response.text[:200]}"}
        except Exception as e:
            return {"error": str(e)}


# Singleton instance
usage_tracker = UsageTracker()
