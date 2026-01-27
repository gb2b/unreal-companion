"""
LLM Service - Multi-provider support (Anthropic, OpenAI, Google, Ollama, Custom)
"""
import logging
import time
import httpx
from typing import Literal
from dataclasses import dataclass, field
from anthropic import Anthropic
from openai import OpenAI

logger = logging.getLogger(__name__)

# Lazy import to avoid circular dependency
_metrics_collector = None

def get_metrics_collector():
    """Get the metrics collector singleton (lazy import)."""
    global _metrics_collector
    if _metrics_collector is None:
        from services.metrics import metrics_collector
        _metrics_collector = metrics_collector
    return _metrics_collector

LLMProvider = Literal["anthropic", "openai", "google", "ollama", "custom"]


@dataclass
class CustomEndpoint:
    """Configuration for a custom OpenAI-compatible endpoint."""
    id: str
    name: str
    base_url: str  # e.g., "https://api.together.xyz/v1"
    api_key: str = ""
    default_model: str = ""
    headers: dict = field(default_factory=dict)  # Custom headers if needed
    is_connected: bool = False

# Default models per provider
DEFAULT_MODELS = {
    "anthropic": "claude-sonnet-4-20250514",
    "openai": "gpt-4o",
    "google": "gemini-2.0-flash",
    "ollama": "llama3.2",
}

# Available models per provider
AVAILABLE_MODELS = {
    "anthropic": [
        {"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet 4", "tier": "flagship"},
        {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet", "tier": "balanced"},
        {"id": "claude-3-5-haiku-20241022", "name": "Claude 3.5 Haiku", "tier": "fast"},
    ],
    "openai": [
        {"id": "codex-5.2", "name": "Codex 5.2", "tier": "code"},
        {"id": "gpt-5-turbo", "name": "GPT-5 Turbo", "tier": "flagship"},
        {"id": "gpt-5-mini", "name": "GPT-5 Mini", "tier": "fast"},
        {"id": "gpt-4o", "name": "GPT-4o", "tier": "legacy"},
        {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "tier": "legacy"},
    ],
    "google": [
        {"id": "gemini-3-pro", "name": "Gemini 3 Pro", "tier": "flagship"},
        {"id": "gemini-3-flash", "name": "Gemini 3 Flash", "tier": "fast"},
        {"id": "gemini-2-ultra", "name": "Gemini 2 Ultra", "tier": "legacy"},
        {"id": "gemini-2-pro", "name": "Gemini 2 Pro", "tier": "legacy"},
    ],
    "ollama": [
        # Popular local models (dynamically updated from Ollama server)
        {"id": "llama4", "name": "Llama 4", "tier": "flagship"},
        {"id": "llama3.3", "name": "Llama 3.3 (70B)", "tier": "large"},
        {"id": "llama3.2", "name": "Llama 3.2 (3B)", "tier": "small"},
        {"id": "mistral-large", "name": "Mistral Large", "tier": "flagship"},
        {"id": "mistral", "name": "Mistral 7B", "tier": "small"},
        {"id": "mixtral", "name": "Mixtral 8x7B", "tier": "large"},
        {"id": "codellama", "name": "Code Llama", "tier": "code"},
        {"id": "deepseek-coder-v3", "name": "DeepSeek Coder V3", "tier": "code"},
        {"id": "qwen2.5-coder", "name": "Qwen 2.5 Coder", "tier": "code"},
        {"id": "phi-4", "name": "Phi-4", "tier": "small"},
        {"id": "gemma2", "name": "Gemma 2", "tier": "small"},
    ],
}


class LLMService:
    def __init__(self):
        self._anthropic: Anthropic | None = None
        self._openai: OpenAI | None = None
        
        # Current config (can be overridden per-request)
        self.current_provider: LLMProvider = "anthropic"
        self.current_model: str = DEFAULT_MODELS["anthropic"]
        
        # Custom model (user-defined, takes precedence if set)
        self.custom_model: str = ""
        
        # API keys (loaded from env or set dynamically)
        self.anthropic_api_key: str = ""
        self.openai_api_key: str = ""
        self.google_api_key: str = ""
        self.ollama_url: str = "http://localhost:11434"
        
        # Custom endpoints (OpenAI-compatible)
        self.custom_endpoints: dict[str, CustomEndpoint] = {}
        self.current_custom_endpoint_id: str | None = None
    
    def configure(
        self,
        provider: LLMProvider | None = None,
        model: str | None = None,
        custom_model: str | None = None,
        anthropic_key: str | None = None,
        openai_key: str | None = None,
        google_key: str | None = None,
        ollama_url: str | None = None,
    ):
        """Update LLM configuration."""
        logger.debug(f"configure() called with provider={provider}, model={model}")

        if provider:
            self.current_provider = provider
            if not model and not custom_model:
                self.current_model = DEFAULT_MODELS.get(provider, "")
            logger.info(f"Provider set to: {provider}")
        if model:
            self.current_model = model
            self.custom_model = ""  # Clear custom if selecting predefined
            logger.info(f"Model set to: {model}")
        if custom_model is not None:
            self.custom_model = custom_model
            if custom_model:  # If non-empty, use as current model
                self.current_model = custom_model
                logger.info(f"Custom model set to: {custom_model}")
        if anthropic_key is not None:
            self.anthropic_api_key = anthropic_key
            self._anthropic = None  # Reset client
            logger.info(f"Anthropic API key {'set' if anthropic_key else 'cleared'} (len={len(anthropic_key) if anthropic_key else 0})")
        if openai_key is not None:
            self.openai_api_key = openai_key
            self._openai = None  # Reset client
            logger.info(f"OpenAI API key {'set' if openai_key else 'cleared'}")
        if google_key is not None:
            self.google_api_key = google_key
            logger.info(f"Google API key {'set' if google_key else 'cleared'}")
        if ollama_url is not None:
            self.ollama_url = ollama_url
            logger.info(f"Ollama URL set to: {ollama_url}")
    
    def get_config(self) -> dict:
        """Return current configuration (without keys)."""
        return {
            "provider": self.current_provider,
            "model": self.current_model,
            "custom_model": self.custom_model,
            "ollama_url": self.ollama_url,
            "has_anthropic_key": bool(self.anthropic_api_key),
            "has_openai_key": bool(self.openai_api_key),
            "has_google_key": bool(self.google_api_key),
            "custom_endpoint_id": self.current_custom_endpoint_id,
        }
    
    # Custom Endpoint Management
    def add_custom_endpoint(self, endpoint: CustomEndpoint) -> None:
        """Add a custom OpenAI-compatible endpoint."""
        self.custom_endpoints[endpoint.id] = endpoint
    
    def remove_custom_endpoint(self, endpoint_id: str) -> bool:
        """Remove a custom endpoint."""
        if endpoint_id in self.custom_endpoints:
            del self.custom_endpoints[endpoint_id]
            if self.current_custom_endpoint_id == endpoint_id:
                self.current_custom_endpoint_id = None
            return True
        return False
    
    def get_custom_endpoints(self) -> list[dict]:
        """Get all custom endpoints (without API keys)."""
        return [
            {
                "id": e.id,
                "name": e.name,
                "base_url": e.base_url,
                "default_model": e.default_model,
                "is_connected": e.is_connected,
            }
            for e in self.custom_endpoints.values()
        ]
    
    def set_custom_endpoint(self, endpoint_id: str) -> bool:
        """Set the current custom endpoint."""
        if endpoint_id in self.custom_endpoints:
            self.current_custom_endpoint_id = endpoint_id
            self.current_provider = "custom"
            endpoint = self.custom_endpoints[endpoint_id]
            if endpoint.default_model:
                self.current_model = endpoint.default_model
            return True
        return False
    
    async def test_custom_endpoint(self, endpoint_id: str) -> dict:
        """Test a custom endpoint connection."""
        if endpoint_id not in self.custom_endpoints:
            return {"ok": False, "error": "Endpoint not found"}
        
        endpoint = self.custom_endpoints[endpoint_id]
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                headers = {
                    "Content-Type": "application/json",
                    **endpoint.headers,
                }
                if endpoint.api_key:
                    headers["Authorization"] = f"Bearer {endpoint.api_key}"
                
                # Try to list models or send a minimal chat request
                response = await client.get(
                    f"{endpoint.base_url}/models",
                    headers=headers
                )
                
                if response.status_code == 200:
                    endpoint.is_connected = True
                    return {"ok": True, "models": response.json().get("data", [])}
                
                # Some endpoints don't support /models, try a chat request
                response = await client.post(
                    f"{endpoint.base_url}/chat/completions",
                    headers=headers,
                    json={
                        "model": endpoint.default_model or "gpt-3.5-turbo",
                        "messages": [{"role": "user", "content": "Hi"}],
                        "max_tokens": 5,
                    }
                )
                
                if response.status_code == 200:
                    endpoint.is_connected = True
                    return {"ok": True}
                
                endpoint.is_connected = False
                return {"ok": False, "error": f"HTTP {response.status_code}: {response.text[:100]}"}
                
        except httpx.ConnectError:
            endpoint.is_connected = False
            return {"ok": False, "error": f"Cannot connect to {endpoint.base_url}"}
        except Exception as e:
            endpoint.is_connected = False
            return {"ok": False, "error": str(e)}
    
    @property
    def anthropic_client(self) -> Anthropic | None:
        if self._anthropic is None and self.anthropic_api_key:
            self._anthropic = Anthropic(api_key=self.anthropic_api_key)
        return self._anthropic
    
    @property
    def openai_client(self) -> OpenAI | None:
        if self._openai is None and self.openai_api_key:
            self._openai = OpenAI(api_key=self.openai_api_key)
        return self._openai
    
    def is_available(self, provider: LLMProvider | None = None) -> bool:
        """Check if a provider is configured and available."""
        provider = provider or self.current_provider
        
        if provider == "anthropic":
            return bool(self.anthropic_api_key)
        elif provider == "openai":
            return bool(self.openai_api_key)
        elif provider == "google":
            return bool(self.google_api_key)
        elif provider == "ollama":
            # Ollama is available if the server responds
            return True  # We'll check on actual call
        return False
    
    async def chat(
        self,
        messages: list[dict],
        system: str = "",
        tools: list[dict] | None = None,
        max_tokens: int = 4096,
        provider: LLMProvider | None = None,
        model: str | None = None,
        session_id: str = "",
    ) -> dict:
        """Send messages to LLM and get response."""
        provider = provider or self.current_provider
        model = model or self.current_model

        if provider == "anthropic":
            return await self._chat_anthropic(messages, system, tools, max_tokens, model, session_id)
        elif provider == "openai":
            return await self._chat_openai(messages, system, tools, max_tokens, model, session_id)
        elif provider == "google":
            return await self._chat_google(messages, system, tools, max_tokens, model, session_id)
        elif provider == "ollama":
            return await self._chat_ollama(messages, system, max_tokens, model, session_id)
        elif provider == "custom":
            return await self._chat_custom(messages, system, max_tokens, model, session_id)
        else:
            return {"text": f"Unknown provider: {provider}", "error": True}
    
    async def _chat_anthropic(
        self,
        messages: list[dict],
        system: str,
        tools: list[dict] | None,
        max_tokens: int,
        model: str,
        session_id: str = "",
    ) -> dict:
        """Chat with Anthropic Claude."""
        logger.info(f"Anthropic API call: model={model}, messages={len(messages)}, system_len={len(system)}")

        # Calculate context size for metrics
        context_chars = len(system) + sum(len(str(m.get("content", ""))) for m in messages)

        # Start metrics tracking
        collector = get_metrics_collector()
        metrics = collector.new_call(
            session_id=session_id,
            call_type="chat",
            provider="anthropic",
            model=model,
            context_size_chars=context_chars,
        )

        if not self.anthropic_client:
            logger.error("Anthropic API key not configured!")
            metrics.mark_error("API key not configured")
            collector.save_metrics(metrics)
            return {
                "text": "Anthropic API key not configured. Add it in Settings.",
                "error": True,
            }

        kwargs = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": messages,
        }

        if system:
            kwargs["system"] = system
            logger.debug(f"System prompt: {system[:200]}...")

        if tools:
            kwargs["tools"] = tools

        try:
            logger.debug(f"Sending request to Anthropic...")
            response = self.anthropic_client.messages.create(**kwargs)

            # Extract text from response
            text_content = ""
            for block in response.content:
                if hasattr(block, 'text'):
                    text_content += block.text

            # Mark complete with token counts
            metrics.mark_complete(
                input_tokens=response.usage.input_tokens,
                output_tokens=response.usage.output_tokens,
            )
            collector.save_metrics(metrics)

            logger.info(
                f"Anthropic response: {response.usage.input_tokens}+{response.usage.output_tokens} tokens, "
                f"{metrics.time_to_complete_ms:.0f}ms, stop={response.stop_reason}"
            )
            logger.debug(f"Response text: {text_content[:500]}...")

            return {
                "text": text_content,
                "content": response.content,
                "stop_reason": response.stop_reason,
                "usage": {
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens
                }
            }
        except Exception as e:
            metrics.mark_error(str(e))
            collector.save_metrics(metrics)
            logger.error(f"Anthropic error after {metrics.time_to_complete_ms:.0f}ms: {e}")
            return {"text": f"Anthropic error: {str(e)}", "error": True}
    
    async def _chat_openai(
        self,
        messages: list[dict],
        system: str,
        tools: list[dict] | None,
        max_tokens: int,
        model: str,
        session_id: str = "",
    ) -> dict:
        """Chat with OpenAI."""
        # Calculate context size for metrics
        context_chars = len(system) + sum(len(str(m.get("content", ""))) for m in messages)

        # Start metrics tracking
        collector = get_metrics_collector()
        metrics = collector.new_call(
            session_id=session_id,
            call_type="chat",
            provider="openai",
            model=model,
            context_size_chars=context_chars,
        )

        if not self.openai_client:
            metrics.mark_error("API key not configured")
            collector.save_metrics(metrics)
            return {
                "text": "OpenAI API key not configured. Add it in Settings.",
                "error": True,
            }

        # Prepend system message for OpenAI
        openai_messages = []
        if system:
            openai_messages.append({"role": "system", "content": system})
        openai_messages.extend(messages)

        try:
            response = self.openai_client.chat.completions.create(
                model=model,
                messages=openai_messages,
                max_tokens=max_tokens,
            )

            input_tokens = response.usage.prompt_tokens if response.usage else 0
            output_tokens = response.usage.completion_tokens if response.usage else 0

            metrics.mark_complete(input_tokens=input_tokens, output_tokens=output_tokens)
            collector.save_metrics(metrics)

            return {
                "text": response.choices[0].message.content or "",
                "stop_reason": response.choices[0].finish_reason,
                "usage": {
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                }
            }
        except Exception as e:
            metrics.mark_error(str(e))
            collector.save_metrics(metrics)
            return {"text": f"OpenAI error: {str(e)}", "error": True}
    
    async def _chat_google(
        self,
        messages: list[dict],
        system: str,
        tools: list[dict] | None,
        max_tokens: int,
        model: str,
        session_id: str = "",
    ) -> dict:
        """Chat with Google Gemini via OpenAI-compatible API."""
        # Calculate context size for metrics
        context_chars = len(system) + sum(len(str(m.get("content", ""))) for m in messages)

        # Start metrics tracking
        collector = get_metrics_collector()
        metrics = collector.new_call(
            session_id=session_id,
            call_type="chat",
            provider="google",
            model=model,
            context_size_chars=context_chars,
        )

        if not self.google_api_key:
            metrics.mark_error("API key not configured")
            collector.save_metrics(metrics)
            return {
                "text": "Google API key not configured. Add it in Settings.",
                "error": True,
            }

        # Google has OpenAI-compatible endpoint
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                google_messages = []
                if system:
                    google_messages.append({"role": "system", "content": system})
                google_messages.extend(messages)

                response = await client.post(
                    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.google_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": google_messages,
                        "max_tokens": max_tokens,
                    }
                )

                if response.status_code != 200:
                    metrics.mark_error(f"HTTP {response.status_code}")
                    collector.save_metrics(metrics)
                    return {"text": f"Google API error: {response.text}", "error": True}

                data = response.json()
                input_tokens = data.get("usage", {}).get("prompt_tokens", 0)
                output_tokens = data.get("usage", {}).get("completion_tokens", 0)

                metrics.mark_complete(input_tokens=input_tokens, output_tokens=output_tokens)
                collector.save_metrics(metrics)

                return {
                    "text": data["choices"][0]["message"]["content"],
                    "stop_reason": data["choices"][0]["finish_reason"],
                    "usage": {
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens,
                    }
                }
        except Exception as e:
            metrics.mark_error(str(e))
            collector.save_metrics(metrics)
            return {"text": f"Google API error: {str(e)}", "error": True}
    
    async def _chat_custom(
        self,
        messages: list[dict],
        system: str,
        max_tokens: int,
        model: str,
        session_id: str = "",
    ) -> dict:
        """Chat with a custom OpenAI-compatible endpoint."""
        # Calculate context size for metrics
        context_chars = len(system) + sum(len(str(m.get("content", ""))) for m in messages)

        # Start metrics tracking
        collector = get_metrics_collector()
        metrics = collector.new_call(
            session_id=session_id,
            call_type="chat",
            provider="custom",
            model=model,
            context_size_chars=context_chars,
        )

        if not self.current_custom_endpoint_id:
            metrics.mark_error("No endpoint selected")
            collector.save_metrics(metrics)
            return {
                "text": "No custom endpoint selected. Configure one in Settings.",
                "error": True,
            }

        endpoint = self.custom_endpoints.get(self.current_custom_endpoint_id)
        if not endpoint:
            metrics.mark_error("Endpoint not found")
            collector.save_metrics(metrics)
            return {
                "text": "Custom endpoint not found.",
                "error": True,
            }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                custom_messages = []
                if system:
                    custom_messages.append({"role": "system", "content": system})
                custom_messages.extend(messages)

                headers = {
                    "Content-Type": "application/json",
                    **endpoint.headers,
                }
                if endpoint.api_key:
                    headers["Authorization"] = f"Bearer {endpoint.api_key}"

                response = await client.post(
                    f"{endpoint.base_url}/chat/completions",
                    headers=headers,
                    json={
                        "model": model or endpoint.default_model,
                        "messages": custom_messages,
                        "max_tokens": max_tokens,
                    }
                )

                if response.status_code != 200:
                    metrics.mark_error(f"HTTP {response.status_code}")
                    collector.save_metrics(metrics)
                    return {"text": f"Custom endpoint error: {response.text}", "error": True}

                data = response.json()
                input_tokens = data.get("usage", {}).get("prompt_tokens", 0)
                output_tokens = data.get("usage", {}).get("completion_tokens", 0)

                metrics.mark_complete(input_tokens=input_tokens, output_tokens=output_tokens)
                collector.save_metrics(metrics)

                return {
                    "text": data["choices"][0]["message"]["content"],
                    "stop_reason": data["choices"][0].get("finish_reason", "stop"),
                    "usage": {
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens,
                    }
                }
        except httpx.ConnectError:
            metrics.mark_error(f"Connection failed to {endpoint.base_url}")
            collector.save_metrics(metrics)
            return {
                "text": f"Cannot connect to {endpoint.base_url}. Is the server running?",
                "error": True,
            }
        except Exception as e:
            metrics.mark_error(str(e))
            collector.save_metrics(metrics)
            return {"text": f"Custom endpoint error: {str(e)}", "error": True}
    
    async def _chat_ollama(
        self,
        messages: list[dict],
        system: str,
        max_tokens: int,
        model: str,
        session_id: str = "",
    ) -> dict:
        """Chat with Ollama (local)."""
        # Calculate context size for metrics
        context_chars = len(system) + sum(len(str(m.get("content", ""))) for m in messages)

        # Start metrics tracking
        collector = get_metrics_collector()
        metrics = collector.new_call(
            session_id=session_id,
            call_type="chat",
            provider="ollama",
            model=model,
            context_size_chars=context_chars,
        )

        # Prepend system message
        ollama_messages = []
        if system:
            ollama_messages.append({"role": "system", "content": system})
        ollama_messages.extend(messages)

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.ollama_url}/api/chat",
                    json={
                        "model": model,
                        "messages": ollama_messages,
                        "stream": False,
                        "options": {
                            "num_predict": max_tokens,
                        }
                    }
                )

                if response.status_code != 200:
                    metrics.mark_error(f"HTTP {response.status_code}")
                    collector.save_metrics(metrics)
                    return {
                        "text": f"Ollama error: {response.text}",
                        "error": True,
                    }

                data = response.json()
                input_tokens = data.get("prompt_eval_count", 0)
                output_tokens = data.get("eval_count", 0)

                metrics.mark_complete(input_tokens=input_tokens, output_tokens=output_tokens)
                collector.save_metrics(metrics)

                return {
                    "text": data.get("message", {}).get("content", ""),
                    "stop_reason": "stop",
                    "usage": {
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens,
                    }
                }
        except httpx.ConnectError:
            metrics.mark_error(f"Connection failed to {self.ollama_url}")
            collector.save_metrics(metrics)
            return {
                "text": f"Cannot connect to Ollama at {self.ollama_url}. Is Ollama running?",
                "error": True,
            }
        except Exception as e:
            metrics.mark_error(str(e))
            collector.save_metrics(metrics)
            return {"text": f"Ollama error: {str(e)}", "error": True}
    
    async def fetch_models_from_api(self, provider: LLMProvider) -> dict:
        """Fetch available models directly from the provider's API."""
        try:
            if provider == "anthropic":
                if not self.anthropic_api_key:
                    return {"models": AVAILABLE_MODELS.get("anthropic", []), "error": "No API key"}
                try:
                    # Anthropic now has a models endpoint: https://api.anthropic.com/v1/models
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        response = await client.get(
                            "https://api.anthropic.com/v1/models",
                            headers={
                                "x-api-key": self.anthropic_api_key,
                                "anthropic-version": "2023-06-01"
                            }
                        )
                        if response.status_code == 200:
                            data = response.json()
                            models = []
                            for m in data.get("data", []):
                                model_id = m.get("id", "")
                                display_name = m.get("display_name", model_id)
                                models.append({
                                    "id": model_id,
                                    "name": display_name,
                                    "tier": "api"
                                })
                            return {"models": models, "supports_custom": True}
                        else:
                            # Fallback to static list
                            return {"models": AVAILABLE_MODELS.get("anthropic", []), "supports_custom": True}
                except Exception as e:
                    return {"models": AVAILABLE_MODELS.get("anthropic", []), "error": str(e)}
            
            elif provider == "openai":
                if not self.openai_api_key:
                    return {"models": AVAILABLE_MODELS.get("openai", []), "error": "No API key"}
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        response = await client.get(
                            "https://api.openai.com/v1/models",
                            headers={"Authorization": f"Bearer {self.openai_api_key}"}
                        )
                        if response.status_code == 200:
                            data = response.json()
                            models = []
                            for m in data.get("data", []):
                                model_id = m.get("id", "")
                                # Filter to only chat models
                                if any(x in model_id for x in ["gpt", "o1", "o3", "codex"]):
                                    models.append({
                                        "id": model_id,
                                        "name": model_id,
                                        "tier": "api"
                                    })
                            # Sort by name
                            models.sort(key=lambda x: x["id"])
                            return {"models": models, "supports_custom": True}
                except Exception as e:
                    return {"models": AVAILABLE_MODELS.get("openai", []), "error": str(e)}
            
            elif provider == "google":
                if not self.google_api_key:
                    return {"models": AVAILABLE_MODELS.get("google", []), "error": "No API key"}
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        response = await client.get(
                            f"https://generativelanguage.googleapis.com/v1beta/models?key={self.google_api_key}"
                        )
                        if response.status_code == 200:
                            data = response.json()
                            models = []
                            for m in data.get("models", []):
                                name = m.get("name", "").replace("models/", "")
                                if "gemini" in name.lower():
                                    models.append({
                                        "id": name,
                                        "name": m.get("displayName", name),
                                        "tier": "api"
                                    })
                            return {"models": models, "supports_custom": True}
                except Exception as e:
                    return {"models": AVAILABLE_MODELS.get("google", []), "error": str(e)}
            
            elif provider == "ollama":
                try:
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        response = await client.get(f"{self.ollama_url}/api/tags")
                        if response.status_code == 200:
                            data = response.json()
                            models = []
                            for m in data.get("models", []):
                                name = m.get("name", "")
                                models.append({
                                    "id": name,
                                    "name": name,
                                    "tier": "installed",
                                    "installed": True
                                })
                            return {"models": models, "supports_custom": True}
                except Exception as e:
                    return {"models": AVAILABLE_MODELS.get("ollama", []), "error": str(e)}
            
            return {"models": [], "supports_custom": True}
        except Exception as e:
            return {"models": AVAILABLE_MODELS.get(provider, []), "error": str(e)}
    
    async def test_connection(self, provider: LLMProvider | None = None) -> dict:
        """Test if the provider is configured and working."""
        provider = provider or self.current_provider
        
        if provider == "anthropic":
            if not self.anthropic_api_key:
                return {"ok": False, "error": "No API key configured"}
            try:
                # Quick test with minimal request
                response = self.anthropic_client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=10,
                    messages=[{"role": "user", "content": "Hi"}]
                )
                return {"ok": True, "model": response.model}
            except Exception as e:
                return {"ok": False, "error": str(e)}
        
        elif provider == "openai":
            if not self.openai_api_key:
                return {"ok": False, "error": "No API key configured"}
            try:
                response = self.openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=10,
                    messages=[{"role": "user", "content": "Hi"}]
                )
                return {"ok": True, "model": response.model}
            except Exception as e:
                return {"ok": False, "error": str(e)}
        
        elif provider == "google":
            if not self.google_api_key:
                return {"ok": False, "error": "No API key configured"}
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(
                        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.google_api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": "gemini-3-flash",
                            "messages": [{"role": "user", "content": "Hi"}],
                            "max_tokens": 10,
                        }
                    )
                    if response.status_code == 200:
                        return {"ok": True, "model": "gemini-3-flash"}
                    return {"ok": False, "error": response.text}
            except Exception as e:
                return {"ok": False, "error": str(e)}
        
        elif provider == "ollama":
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.get(f"{self.ollama_url}/api/tags")
                    if response.status_code == 200:
                        models = response.json().get("models", [])
                        return {
                            "ok": True,
                            "models": [m.get("name") for m in models]
                        }
                    return {"ok": False, "error": f"HTTP {response.status_code}"}
            except httpx.ConnectError:
                return {"ok": False, "error": f"Cannot connect to {self.ollama_url}"}
            except Exception as e:
                return {"ok": False, "error": str(e)}
        
        return {"ok": False, "error": "Unknown provider"}


    async def stream(
        self,
        system_prompt: str = "",
        user_prompt: str = "",
        provider: LLMProvider | None = None,
        model: str | None = None,
        session_id: str = "",
    ) -> "AsyncIterator[str]":
        """
        Stream response from LLM (for workflows).

        Args:
            system_prompt: System message
            user_prompt: User message
            provider: LLM provider
            model: Model to use
            session_id: Session ID for metrics

        Yields:
            Chunks of the response
        """
        provider = provider or self.current_provider
        model = model or self.current_model

        messages = [{"role": "user", "content": user_prompt}]

        # Calculate context size for metrics
        context_chars = len(system_prompt) + len(user_prompt)

        # Start metrics tracking
        collector = get_metrics_collector()
        metrics = collector.new_call(
            session_id=session_id,
            call_type="stream",
            provider=provider,
            model=model,
            context_size_chars=context_chars,
        )

        output_chars = 0

        if provider == "anthropic" and self.anthropic_client:
            try:
                with self.anthropic_client.messages.stream(
                    model=model,
                    max_tokens=4096,
                    system=system_prompt,
                    messages=messages,
                ) as stream:
                    for text in stream.text_stream:
                        if not metrics.first_token_received:
                            metrics.mark_first_token()
                        output_chars += len(text)
                        yield text

                # Estimate tokens (approx 4 chars per token)
                metrics.mark_complete(
                    input_tokens=context_chars // 4,
                    output_tokens=output_chars // 4,
                )
                collector.save_metrics(metrics)
            except Exception as e:
                metrics.mark_error(str(e))
                collector.save_metrics(metrics)
                yield f"[Error: {str(e)}]"

        elif provider == "openai" and self.openai_client:
            try:
                openai_messages = []
                if system_prompt:
                    openai_messages.append({"role": "system", "content": system_prompt})
                openai_messages.extend(messages)

                stream = self.openai_client.chat.completions.create(
                    model=model,
                    messages=openai_messages,
                    max_tokens=4096,
                    stream=True,
                )

                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        if not metrics.first_token_received:
                            metrics.mark_first_token()
                        text = chunk.choices[0].delta.content
                        output_chars += len(text)
                        yield text

                # Estimate tokens (approx 4 chars per token)
                metrics.mark_complete(
                    input_tokens=context_chars // 4,
                    output_tokens=output_chars // 4,
                )
                collector.save_metrics(metrics)
            except Exception as e:
                metrics.mark_error(str(e))
                collector.save_metrics(metrics)
                yield f"[Error: {str(e)}]"

        else:
            # Fallback to non-streaming (metrics tracked in chat())
            result = await self.chat(
                messages=messages,
                system=system_prompt,
                provider=provider,
                model=model,
                session_id=session_id,
            )
            yield result.get("text", "[No response]")
    
    async def complete(
        self,
        prompt: str = "",
        system: str = "",
        provider: LLMProvider | None = None,
        model: str | None = None,
        session_id: str = "",
        # Alternative parameter names for compatibility
        system_prompt: str = "",
        user_prompt: str = "",
    ) -> str:
        """
        Simple completion (non-streaming).

        Args:
            prompt: User prompt (or use user_prompt)
            system: System prompt (or use system_prompt)
            provider: LLM provider
            model: Model to use
            session_id: Session ID for metrics

        Returns:
            Response text
        """
        # Support both naming conventions
        actual_prompt = prompt or user_prompt
        actual_system = system or system_prompt

        if not actual_prompt:
            return "[Error: No prompt provided]"

        result = await self.chat(
            messages=[{"role": "user", "content": actual_prompt}],
            system=actual_system,
            provider=provider,
            model=model,
            session_id=session_id,
        )
        return result.get("text", "")

    # Prompt pour forcer le thinking
    THINKING_INSTRUCTION = """Before responding, think through your analysis step by step.
Wrap your thinking in <thinking> tags, then provide your response.

<thinking>
- Point 1: Brief analysis...
- Point 2: Brief analysis...
- Point 3: Brief analysis...
</thinking>

Your response here."""

    async def stream_with_thinking(
        self,
        prompt: str,
        system: str = "",
        history: list = None,
        provider: LLMProvider | None = None,
        model: str | None = None,
        session_id: str = "",
    ):
        """
        Stream LLM response with thinking extraction.
        
        Injects thinking instruction, parses <thinking> blocks,
        and emits structured events.
        
        Args:
            prompt: User prompt
            system: System prompt
            history: Optional conversation history
            provider: LLM provider
            model: Model to use
            session_id: Session ID for metrics
            
        Yields:
            Dict with type: "thinking", "token", or "complete"
            - thinking: {"type": "thinking", "content": "Point d'analyse..."}
            - token: {"type": "token", "content": "text chunk"}
            - complete: {"type": "complete"}
        """
        provider = provider or self.current_provider
        model = model or self.current_model
        history = history or []
        
        # Add thinking instruction to prompt
        full_prompt = self.THINKING_INSTRUCTION + "\n\n" + prompt
        
        # Build messages
        messages = []
        for msg in history[-10:]:  # Keep last 10 messages for context
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        messages.append({"role": "user", "content": full_prompt})
        
        # State for parsing thinking blocks
        in_thinking = False
        thinking_buffer = ""
        response_buffer = ""
        thinking_done = False
        
        # Start metrics
        collector = get_metrics_collector()
        metrics = collector.new_call(
            session_id=session_id,
            call_type="stream",
            provider=provider,
            model=model,
            context_size_chars=len(system) + len(full_prompt),
        )
        
        output_chars = 0
        
        try:
            if provider == "anthropic" and self.anthropic_client:
                with self.anthropic_client.messages.stream(
                    model=model,
                    max_tokens=4096,
                    system=system,
                    messages=messages,
                ) as stream:
                    for token in stream.text_stream:
                        if not metrics.first_token_received:
                            metrics.mark_first_token()
                        
                        output_chars += len(token)
                        
                        # Parse thinking blocks
                        if "<thinking>" in token and not thinking_done:
                            in_thinking = True
                            # Extract what's before <thinking>
                            before = token.split("<thinking>")[0]
                            if before.strip():
                                yield {"type": "token", "content": before}
                            # Keep what's after for thinking buffer
                            after = token.split("<thinking>", 1)[1] if "<thinking>" in token else ""
                            thinking_buffer += after
                            continue
                        
                        if "</thinking>" in token and in_thinking:
                            in_thinking = False
                            thinking_done = True
                            
                            # Extract what's before </thinking>
                            parts = token.split("</thinking>", 1)
                            thinking_buffer += parts[0]
                            
                            # Emit thinking points
                            for line in thinking_buffer.strip().split('\n'):
                                line = line.strip().lstrip('-').lstrip('•').strip()
                                if line:
                                    yield {"type": "thinking", "content": line}
                            
                            thinking_buffer = ""
                            
                            # Continue with what's after </thinking>
                            if len(parts) > 1 and parts[1].strip():
                                response_buffer += parts[1]
                                yield {"type": "token", "content": parts[1]}
                            continue
                        
                        if in_thinking:
                            thinking_buffer += token
                        else:
                            response_buffer += token
                            yield {"type": "token", "content": token}
                
                # Mark complete
                metrics.mark_complete(
                    input_tokens=output_chars // 4,
                    output_tokens=output_chars // 4,
                )
                collector.save_metrics(metrics)
                yield {"type": "complete"}
                
            elif provider == "openai" and self.openai_client:
                openai_messages = []
                if system:
                    openai_messages.append({"role": "system", "content": system})
                openai_messages.extend(messages)
                
                stream = self.openai_client.chat.completions.create(
                    model=model,
                    messages=openai_messages,
                    max_tokens=4096,
                    stream=True,
                )
                
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        token = chunk.choices[0].delta.content
                        
                        if not metrics.first_token_received:
                            metrics.mark_first_token()
                        
                        output_chars += len(token)
                        
                        # Same parsing logic as anthropic
                        if "<thinking>" in token and not thinking_done:
                            in_thinking = True
                            before = token.split("<thinking>")[0]
                            if before.strip():
                                yield {"type": "token", "content": before}
                            after = token.split("<thinking>", 1)[1] if "<thinking>" in token else ""
                            thinking_buffer += after
                            continue
                        
                        if "</thinking>" in token and in_thinking:
                            in_thinking = False
                            thinking_done = True
                            parts = token.split("</thinking>", 1)
                            thinking_buffer += parts[0]
                            
                            for line in thinking_buffer.strip().split('\n'):
                                line = line.strip().lstrip('-').lstrip('•').strip()
                                if line:
                                    yield {"type": "thinking", "content": line}
                            
                            thinking_buffer = ""
                            if len(parts) > 1 and parts[1].strip():
                                yield {"type": "token", "content": parts[1]}
                            continue
                        
                        if in_thinking:
                            thinking_buffer += token
                        else:
                            yield {"type": "token", "content": token}
                
                metrics.mark_complete(
                    input_tokens=output_chars // 4,
                    output_tokens=output_chars // 4,
                )
                collector.save_metrics(metrics)
                yield {"type": "complete"}
                
            else:
                # Fallback: non-streaming with fake thinking
                logger.warning(f"Provider {provider} doesn't support streaming, using fallback")
                
                # Emit fake thinking
                yield {"type": "thinking", "content": "Analyzing your request..."}
                yield {"type": "thinking", "content": "Formulating response..."}
                
                # Get non-streaming response
                result = await self.chat(
                    messages=messages,
                    system=system,
                    provider=provider,
                    model=model,
                    session_id=session_id,
                )
                
                response_text = result.get("text", "")
                
                # Emit as single token
                yield {"type": "token", "content": response_text}
                yield {"type": "complete"}
                
        except Exception as e:
            logger.exception(f"Streaming error: {e}")
            metrics.mark_error(str(e))
            collector.save_metrics(metrics)
            yield {"type": "error", "content": str(e)}


# Singleton instance
llm_service = LLMService()
