"""GitHub diary export. Optional: skip if no token/repo."""
import base64
from datetime import date
from typing import List

import httpx
from ..config import get_settings
from ..models import BabyEvent


def generate_markdown(events: List[BabyEvent], start: date, end: date) -> str:
    by_date = {}
    for e in events:
        d = e.created_at.date()
        if d not in by_date:
            by_date[d] = {"food": [], "skill": [], "note": []}
        by_date[d][e.event_type.value].append(e)
    lines = [f"# Дневник развития малыша\n\nПериод: {start} — {end}\n\n---\n"]
    for d in sorted(by_date.keys(), reverse=True):
        lines.append(f"\n## {d}\n")
        for kind in ("food", "skill", "note"):
            items = by_date[d][kind]
            if items:
                lines.append(f"### {kind}\n")
                for e in items:
                    lines.append(f"- {e.content}\n")
    return "\n".join(lines)


async def commit_to_github(events: List[BabyEvent], event_date: date) -> dict:
    """Commit day's events to GitHub via Contents API. Raises ValueError if not configured."""
    settings = get_settings()
    if not settings.GITHUB_ACCESS_TOKEN or not settings.GITHUB_REPO:
        raise ValueError("GitHub not configured")
    content = generate_markdown(events, event_date, event_date)
    path = f"{event_date.strftime('%Y')}/{event_date.strftime('%m')}/{event_date}.md"
    async with httpx.AsyncClient() as client:
        r = await client.put(
            f"https://api.github.com/repos/{settings.GITHUB_REPO}/contents/{path}",
            headers={
                "Authorization": f"Bearer {settings.GITHUB_ACCESS_TOKEN}",
                "Accept": "application/vnd.github.v3+json",
            },
            json={
                "message": f"Diary {event_date}",
                "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
            },
            timeout=15.0,
        )
        if r.status_code not in (200, 201):
            raise ValueError(f"GitHub contents API failed: {r.status_code} {r.text[:200]}")
        data = r.json()
        return {"sha": data.get("commit", {}).get("sha", "")}
