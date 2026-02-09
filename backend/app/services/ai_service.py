"""AI service for generating baby diary summaries."""
import httpx
import os
from datetime import date
from typing import Dict, List, Any


async def generate_baby_summary(events_by_type: Dict[str, List[Dict[str, Any]]], event_date: date) -> str:
    """
    Generate a beautiful summary of baby's day using OpenRouter API.
    
    Args:
        events_by_type: Dictionary with 'food', 'skill', 'note' keys containing event lists
        event_date: Date of the events
        
    Returns:
        Generated summary text
    """
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    
    if not openrouter_key:
        # Fallback to simple summary if API key not configured
        return _generate_simple_summary(events_by_type, event_date)
    
    # Prepare events text
    events_text = f"Дата: {event_date.strftime('%d.%m.%Y')}\n\n"
    
    if events_by_type.get("food"):
        events_text += "Еда:\n"
        for event in events_by_type["food"]:
            events_text += f"- {event['content']}\n"
        events_text += "\n"
    
    if events_by_type.get("skill"):
        events_text += "Навыки:\n"
        for event in events_by_type["skill"]:
            events_text += f"- {event['content']}\n"
        events_text += "\n"
    
    if events_by_type.get("note"):
        events_text += "Заметки:\n"
        for event in events_by_type["note"]:
            events_text += f"{event['content']}\n"
    
    # Prepare prompt
    prompt = f"""Создай красивый и теплый дневник развития малыша на основе следующих событий:

{events_text}

Требования:
- Пиши от первого лица (от имени родителя)
- Используй теплый, нежный тон
- Структурируй текст по разделам (еда, навыки, заметки)
- Добавь эмоциональную окраску, но будь лаконичным
- Если информации мало, напиши короткую заметку
- Формат: Markdown с заголовками

Дневник:"""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openrouter_key}",
                    "HTTP-Referer": "https://familyquest.app",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "openai/gpt-3.5-turbo",  # Using cheaper model
                    "messages": [
                        {
                            "role": "system",
                            "content": "Ты помощник для создания дневника развития малыша. Пишешь теплые, нежные заметки от имени родителя."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.7,
                    "max_tokens": 500
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                summary = result["choices"][0]["message"]["content"]
                return summary.strip()
            else:
                # Fallback on API error
                return _generate_simple_summary(events_by_type, event_date)
                
    except Exception as e:
        # Fallback on any error
        return _generate_simple_summary(events_by_type, event_date)


def _generate_simple_summary(events_by_type: Dict[str, List[Dict[str, Any]]], event_date: date) -> str:
    """Generate a simple summary without AI."""
    summary = f"# {event_date.strftime('%d.%m.%Y')}\n\n"
    
    total_events = sum(len(events) for events in events_by_type.values())
    
    if total_events == 0:
        return f"За {event_date.strftime('%d.%m.%Y')} событий не зафиксировано."
    
    if events_by_type.get("food"):
        summary += "### Еда\n"
        for event in events_by_type["food"]:
            summary += f"- {event['content']}\n"
        summary += "\n"
    
    if events_by_type.get("skill"):
        summary += "### Навыки\n"
        for event in events_by_type["skill"]:
            summary += f"- {event['content']}\n"
        summary += "\n"
    
    if events_by_type.get("note"):
        summary += "### Заметки\n"
        for event in events_by_type["note"]:
            summary += f"{event['content']}\n\n"
    
    return summary
