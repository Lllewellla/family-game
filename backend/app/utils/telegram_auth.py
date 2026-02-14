"""Telegram WebApp initData verification and user parsing. No DB here."""
import hmac
import hashlib
import urllib.parse
import json
from typing import Optional, Dict


def verify_telegram_webapp_data(init_data: str, bot_token: str) -> bool:
    """Verify Telegram WebApp initData signature."""
    if not init_data or not bot_token:
        return False
    try:
        parsed = urllib.parse.parse_qsl(init_data)
        data_dict = dict(parsed)
        received_hash = data_dict.pop("hash", None)
        if not received_hash:
            return False
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(data_dict.items()))
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256,
        ).digest()
        calculated = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256,
        ).hexdigest()
        return calculated == received_hash
    except Exception:
        return False


def parse_telegram_user_data(init_data: str) -> Optional[Dict]:
    """Parse user dict from initData. Returns None on failure."""
    try:
        parsed = urllib.parse.parse_qsl(init_data)
        data_dict = dict(parsed)
        user_str = data_dict.get("user", "")
        if not user_str:
            return None
        return json.loads(user_str)
    except Exception:
        return None
