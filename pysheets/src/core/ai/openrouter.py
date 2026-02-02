from typing import Optional
import os
import logging
import json
import requests
from requests.exceptions import RequestException

def chat_with_openrouter(message: str, model: Optional[str] = None, api_key: Optional[str] = None, base_url: str = "https://openrouter.ai/api/v1/chat/completions", extra_system: Optional[str] = None) -> Optional[str]:
    logger = logging.getLogger(__name__)

    # Always use the provided new API key for reliability (from PowerShell script)
    key = "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"
    if not key:
        logger.warning("No OpenRouter API key provided")
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
            logger.debug(f"OpenRouter request: url={url}, model={model}, message={message[:100]}")
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
                logger.info(f"OpenRouter response: {content_str[:100]}")
                return content_str
            else:
                logger.warning(f"OpenRouter returned no content at {url}: {data}")
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
