"""Helper for communicating with a local Llama-like server (Ollama/OpenAI-compatible).

Provides a convenient function `chat_with_local_model` that sends a message and
returns the assistant response as text.
"""

from typing import Optional
import logging

try:
    from openai import OpenAI
except Exception:
    OpenAI = None


def _detect_language(text: str) -> str:
    """Very small heuristic to detect Russian vs English using character scripts.

    This is intentionally lightweight (no external dependency). It looks at the
    number of Cyrillic vs Latin characters and returns 'ru' or 'en'.
    """
    cyrillic = sum(1 for ch in text if '\u0400' <= ch <= '\u04FF')
    latin = sum(1 for ch in text if 'A' <= ch <= 'Z' or 'a' <= ch <= 'z')
    if cyrillic > latin and cyrillic > 0:
        return 'ru'
    if latin > 0:
        return 'en'
    return 'en'


_LANG_NAME = {'ru': 'Russian', 'en': 'English'}


def _is_greeting(text: str) -> bool:
    """Check whether the message is a simple greeting (short and common greetings).

    This avoids sending greetings to the model which sometimes returns long unrelated texts.
    """
    if not text:
        return False
    s = text.lower()
    # Common greetings in Russian and English
    greetings = ['привет', 'здравствуйте', 'здравствуй', 'прив', 'hi', 'hello', 'hey', 'hiya', 'хай']
    # Simple heuristic: if the message is short (<= 3 words) and contains a greeting token
    tokens = [t.strip('.,!?') for t in s.split()]
    if len(tokens) <= 4 and any(g in tokens or g == s for g in greetings):
        return True
    return False


_GREETINGS_REPLY = {
    'ru': 'Привет! Чем могу помочь?',
    'en': 'Hello! How can I help you today?'
}


def _is_name_question(text: str) -> bool:
    """Detects simple name questions like 'Как тебя зовут' or 'What is your name'."""
    if not text:
        return False
    s = text.lower()
    patterns = ['как тебя зовут', 'как вас зовут', 'как тебя зовут?', 'как вас зовут?', 'what is your name', "what's your name", 'как тебя зовут', 'как тебя зовут?']
    return any(p in s for p in patterns)


_NAME_REPLY = {
    'ru': 'Меня зовут Smart AI',
    'en': 'My name is Smart AI'
}


def chat_with_local_model(message: str, model: str = "tinyllama", base_url: str = "http://localhost:11434/v1", api_key: str = "ollama") -> Optional[str]:
    """Send a message to a local OpenAI-compatible server (e.g., Ollama) and return the text reply.

    Returns None on failure.
    """
    if OpenAI is None:
        return None

    try:
        logger = logging.getLogger(__name__)
        client = OpenAI(base_url=base_url, api_key=api_key)
        # Detect user's language (used later and for greetings)
        lang = _detect_language(message)
        lang_name = _LANG_NAME.get(lang, lang)

        # If this is a short greeting, return a canned reply to avoid unpredictable model outputs
        try:
            if _is_greeting(message):
                return _GREETINGS_REPLY.get(lang, _GREETINGS_REPLY['en'])
            # If user asks for the name, return the enforced name per policy
            if _is_name_question(message):
                return _NAME_REPLY.get(lang, _NAME_REPLY['en'])
        except Exception:
            # ignore and continue to call the model
            pass

        # Stricter system prompt to keep responses concise and relevant
        system_prompt = {
            "role": "system",
            "content": (
                "You are a concise, helpful assistant. Keep answers short and relevant to the user's request. "
                "Do not invent phone numbers, addresses, or long scripts. Always reply in the user's language."
            )
        }
        system_prompt_lang = {
            "role": "system",
            "content": f"If the user's message is in {lang_name}, respond in {lang_name}. Respond concisely."
        }
        messages = [system_prompt, system_prompt_lang, {"role": "user", "content": message}]
        logger.debug("Sending messages to model: %s", messages)
        response = client.chat.completions.create(
            model=model,
            messages=messages
        )
        logger.debug("Raw response from model: %r", response)

        # Safe extraction
        content = None
        if hasattr(response, 'choices') and len(response.choices) > 0:
            choice = response.choices[0]
            # Some clients use message or text
            if hasattr(choice, 'message') and hasattr(choice.message, 'content'):
                content = choice.message.content
            elif hasattr(choice, 'text'):
                content = choice.text

        if content:
            resp_lang = _detect_language(content)
            logger.debug("Detected response language: %s (expected %s)", resp_lang, lang)
            # If response language doesn't match detected user language, try one stronger retry
            if resp_lang != lang:
                logger.info("Response language mismatch. Retrying with stronger language instruction.")
                system_prompt_force = {
                    "role": "system",
                    "content": f"Respond ONLY in {lang_name}. Do not translate or answer in any other language. If the user's message is in {lang_name}, answer only in {lang_name}."
                }
                messages = [system_prompt, system_prompt_lang, system_prompt_force, {"role": "user", "content": message}]
                try:
                    response2 = client.chat.completions.create(model=model, messages=messages)
                    logger.debug("Raw response (retry): %r", response2)
                    content2 = None
                    if hasattr(response2, 'choices') and len(response2.choices) > 0:
                        choice2 = response2.choices[0]
                        if hasattr(choice2, 'message') and hasattr(choice2.message, 'content'):
                            content2 = choice2.message.content
                        elif hasattr(choice2, 'text'):
                            content2 = choice2.text
                    if content2:
                        content = content2
                except Exception:
                    logger.exception("Retry failed")

            # Re-check language after retry and if still mismatched, ask the model to translate its reply
            try:
                if content:
                    resp_lang2 = _detect_language(content)
                    if resp_lang2 != lang:
                        logger.info("Response still in %s after retry — attempting translation to %s", resp_lang2, lang)
                        translation_prompt = {
                            "role": "system",
                            "content": f"You are a concise translation assistant. Translate the following text into {lang_name} in 1-2 short sentences and do NOT add explanations."
                        }
                        messages_translate = [system_prompt, system_prompt_lang, translation_prompt, {"role": "user", "content": f"Translate this: {content}"}]
                        try:
                            response3 = client.chat.completions.create(model=model, messages=messages_translate)
                            logger.debug("Raw response (translation attempt): %r", response3)
                            content3 = None
                            if hasattr(response3, 'choices') and len(response3.choices) > 0:
                                choice3 = response3.choices[0]
                                if hasattr(choice3, 'message') and hasattr(choice3.message, 'content'):
                                    content3 = choice3.message.content
                                elif hasattr(choice3, 'text'):
                                    content3 = choice3.text
                            if content3:
                                content = content3
                        except Exception:
                            logger.exception("Translation attempt failed")
            except Exception:
                logger.exception("Post-retry translation logic failed")
        else:
            logger.warning("Model returned no content for message: %s", message)

        return content
    except Exception:
        logging.exception("chat_with_local_model failed")
        return None

