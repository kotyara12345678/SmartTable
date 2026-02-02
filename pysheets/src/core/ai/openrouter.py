from typing import Optional
import os
import logging
import json
import requests
import random
from requests.exceptions import RequestException

# List of available API keys
OPENROUTER_KEYS = [
    "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",
    "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",
    "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",
    "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",
    "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",
    "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",
    "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",
    "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",
    "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",
    "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",
    "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",
]

# Track dead keys (401 errors)
_dead_keys = set()

def _get_valid_key() -> Optional[str]:
    """Get a random valid API key, excluding dead ones. Returns None if all keys are dead."""
    global _dead_keys
    valid_keys = [k for k in OPENROUTER_KEYS if k not in _dead_keys]
    if not valid_keys:
        # All keys are dead; reset and try again
        _dead_keys.clear()
        valid_keys = OPENROUTER_KEYS
    return random.choice(valid_keys) if valid_keys else None

def _mark_key_dead(key: str):
    """Mark a key as dead (401 error)."""
    global _dead_keys
    _dead_keys.add(key)

def chat_with_openrouter(message: str, model: Optional[str] = None, api_key: Optional[str] = None, base_url: str = "https://openrouter.ai/api/v1/chat/completions", extra_system: Optional[str] = None) -> Optional[str]:
    logger = logging.getLogger(__name__)

    # Use provided key or pick a random valid one from the list
    if api_key:
        key = api_key
    else:
        key = _get_valid_key()
        if not key:
            logger.error("No valid OpenRouter API keys available")
            return None

    # Use deepseek/deepseek-chat as default model (from PowerShell script)
    env_model = os.environ.get("OPENROUTER_MODEL")
    model = model or env_model or "deepseek/deepseek-chat"

    # Always answer in clear Russian (as in PS script)
    user_message = f"Answer in clear Russian. {message}"

    # Build messages: optional extra_system then user message
    messages = []
    if extra_system:
        messages.append({"role": "system", "content": extra_system})
    messages.append({"role": "user", "content": user_message})

    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": 400,
    }

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    # Try multiple base URLs in case of DNS issues (openrouter.ai vs api.openrouter.ai)
    tried = []
    candidates = [base_url]
    env_base = os.environ.get("OPENROUTER_BASE_URL")
    if env_base:
        candidates.append(env_base)
    candidates.extend([
        "https://api.openrouter.ai/v1/chat/completions",
        "https://openrouter.ai/api/v1/chat/completions",
    ])

    for url in dict.fromkeys(candidates):  # preserve order, dedupe
        if not url or url in tried:
            continue
        tried.append(url)
        try:
            logger.debug(f"OpenRouter request: url={url}, model={model}, key={key[:20]}..., message={message[:100]}")
            resp = requests.post(url, json=payload, headers=headers, timeout=30)
            resp.raise_for_status()

            # Decode robustly: prefer resp.encoding, fallback to utf-8
            raw = resp.content
            enc = resp.encoding or 'utf-8'
            try:
                text = raw.decode(enc, errors='replace') if isinstance(raw, (bytes, bytearray)) else str(raw)
            except Exception:
                text = raw.decode('utf-8', errors='replace') if isinstance(raw, (bytes, bytearray)) else str(raw)

            # Parse JSON safely
            try:
                data = json.loads(text)
            except Exception:
                # Fallback to requests' json() which may handle streaming/bytes
                try:
                    data = resp.json()
                except Exception:
                    logger.warning("Failed to parse OpenRouter response as JSON; returning raw text")
                    return text

            logger.debug(f"OpenRouter raw response: {data}")
            content = None
            if isinstance(data, dict) and data.get("choices"):
                choice = data["choices"][0]
                if isinstance(choice, dict) and choice.get("message") and "content" in choice["message"]:
                    content = choice["message"]["content"]
                elif isinstance(choice, dict) and "text" in choice:
                    content = choice["text"]

            if content:
                # Ensure string and proper Unicode
                content_str = str(content)
                # Remove double asterisks (Markdown formatting)
                content_str = content_str.replace("**", "")
                logger.info(f"OpenRouter response: {content_str[:100]}")
                return content_str
            else:
                logger.warning(f"OpenRouter returned no content at {url}: {data}")
                # try next candidate
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                logger.warning(f"Key {key[:20]}... is dead (401); marking as invalid")
                _mark_key_dead(key)
            logger.warning(f"OpenRouter request to {url} failed: {e}")
            # try next candidate
        except RequestException as e:
            logger.warning(f"OpenRouter request to {url} failed: {e}")
            # try next candidate
        except Exception as e:
            logger.exception(f"Unexpected error when calling OpenRouter at {url}: {e}")
            # try next candidate

    # If we reached here, all attempts failed
    logger.error("All OpenRouter endpoints failed; check network/DNS/VPN settings")
    return None
