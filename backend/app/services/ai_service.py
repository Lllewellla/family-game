"""Optional AI summary via OpenRouter. Graceful fallback if no key."""
from datetime import date
from typing import List

from ..config import get_settings
from ..models import BabyEvent


def summarize_events(events: List[BabyEvent], day: date) -> str:
    """Return AI summary if OPENROUTER_API_KEY set, else simple text."""
    settings = get_settings()
    if not events:
        return ""
    if not settings.OPENROUTER_API_KEY:
        parts = [f"- [{e.event_type.value}] {e.content}" for e in events]
        return "\n".join(parts)
    try:
        import httpx
        text = "\n".join(f"{e.event_type.value}: {e.content}" for e in events)
        r = httpx.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"},
            json={
                "model": "openai/gpt-3.5-turbo",
                "messages": [
                    {"role": "user", "content": f"Кратко резюмируй день малыша ({day}):\n{text}"}
                ],
                "max_tokens": 200,
            },
            timeout=15.0,
        )
        if r.status_code != 200:
            return _fallback_summary(events)
        data = r.json()
        choice = (data.get("choices") or [None])[0]
        if not choice:
            return _fallback_summary(events)
        return (choice.get("message") or {}).get("content", "").strip() or _fallback_summary(events)
    except Exception:
        return _fallback_summary(events)


def _fallback_summary(events: List[BabyEvent]) -> str:
    return "\n".join(f"- [{e.event_type.value}] {e.content}" for e in events)
