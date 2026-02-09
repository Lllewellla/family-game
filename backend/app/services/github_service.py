"""GitHub integration service for diary export."""
import httpx
import os
import base64
from datetime import date, datetime
from typing import List
from ..models import BabyEvent


def generate_markdown_diary(events: List[BabyEvent], start_date: date, end_date: date) -> str:
    """Generate Markdown content from baby events."""
    markdown = f"# Дневник развития малыша\n\n"
    markdown += f"Период: {start_date.strftime('%d.%m.%Y')} - {end_date.strftime('%d.%m.%Y')}\n\n"
    markdown += "---\n\n"
    
    # Group events by date
    events_by_date = {}
    for event in events:
        event_date = event.created_at.date()
        if event_date not in events_by_date:
            events_by_date[event_date] = {
                "food": [],
                "skill": [],
                "note": []
            }
        events_by_date[event_date][event.event_type.value].append(event)
    
    # Sort dates
    sorted_dates = sorted(events_by_date.keys(), reverse=True)
    
    for event_date in sorted_dates:
        markdown += f"## {event_date.strftime('%d.%m.%Y')}\n\n"
        
        date_events = events_by_date[event_date]
        
        # Food events
        if date_events["food"]:
            markdown += "### Еда\n"
            for event in date_events["food"]:
                markdown += f"- {event.content}\n"
            markdown += "\n"
        
        # Skill events
        if date_events["skill"]:
            markdown += "### Навыки\n"
            for event in date_events["skill"]:
                markdown += f"- {event.content}\n"
            markdown += "\n"
        
        # Notes
        if date_events["note"]:
            markdown += "### Заметки\n"
            for event in date_events["note"]:
                markdown += f"{event.content}\n\n"
        
        markdown += "---\n\n"
    
    return markdown


async def commit_to_github(events: List[BabyEvent], event_date: date) -> dict:
    """
    Commit baby diary to GitHub repository.
    
    Returns:
        Dictionary with commit info or None if failed
    """
    github_token = os.getenv("GITHUB_ACCESS_TOKEN")
    github_repo = os.getenv("GITHUB_REPO")
    
    if not github_token or not github_repo:
        raise ValueError("GitHub credentials not configured")
    
    # Generate markdown content
    markdown_content = generate_markdown_diary(events, event_date, event_date)
    
    # Prepare file path: YYYY/MM/YYYY-MM-DD.md
    year = event_date.strftime("%Y")
    month = event_date.strftime("%m")
    filename = f"{year}/{month}/{event_date.strftime('%Y-%m-%d')}.md"
    
    # Encode content
    content_bytes = markdown_content.encode('utf-8')
    content_base64 = base64.b64encode(content_bytes).decode('utf-8')
    
    # GitHub API URL
    api_url = f"https://api.github.com/repos/{github_repo}/contents/{filename}"
    
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    async with httpx.AsyncClient() as client:
        # Check if file exists
        try:
            get_response = await client.get(api_url, headers=headers)
            if get_response.status_code == 200:
                # File exists, get SHA for update
                existing_file = get_response.json()
                sha = existing_file["sha"]
                
                # Update file
                data = {
                    "message": f"Update baby diary for {event_date.strftime('%Y-%m-%d')}",
                    "content": content_base64,
                    "sha": sha
                }
            else:
                # File doesn't exist, create new
                data = {
                    "message": f"Add baby diary for {event_date.strftime('%Y-%m-%d')}",
                    "content": content_base64
                }
            
            # Create/update file
            response = await client.put(api_url, headers=headers, json=data)
            
            if response.status_code in [200, 201]:
                return response.json()
            else:
                raise Exception(f"GitHub API error: {response.status_code} - {response.text}")
                
        except httpx.HTTPError as e:
            raise Exception(f"HTTP error: {str(e)}")
