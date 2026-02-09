"""Telegram WebApp authentication utilities."""
import hmac
import hashlib
import urllib.parse
from typing import Optional, Dict
import os


def verify_telegram_webapp_data(init_data: str, bot_token: str) -> bool:
    """
    Verify Telegram WebApp initData signature.
    
    Args:
        init_data: Raw initData string from Telegram.WebApp.initData
        bot_token: Telegram bot token
        
    Returns:
        True if signature is valid, False otherwise
    """
    try:
        # Parse init_data
        parsed_data = urllib.parse.parse_qsl(init_data)
        data_dict = dict(parsed_data)
        
        # Extract hash and data
        received_hash = data_dict.pop('hash', None)
        if not received_hash:
            return False
        
        # Create data check string
        data_check_string = '\n'.join(
            f"{key}={value}" 
            for key, value in sorted(data_dict.items())
        )
        
        # Calculate secret key
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        # Calculate hash
        calculated_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        return calculated_hash == received_hash
    except Exception:
        return False


def parse_telegram_user_data(init_data: str) -> Optional[Dict]:
    """
    Parse user data from Telegram initData.
    
    Args:
        init_data: Raw initData string
        
    Returns:
        Dictionary with user data or None if parsing fails
    """
    try:
        parsed_data = urllib.parse.parse_qsl(init_data)
        data_dict = dict(parsed_data)
        
        user_data_str = data_dict.get('user', '')
        if not user_data_str:
            return None
        
        # Parse user JSON
        import json
        user_data = json.loads(user_data_str)
        return user_data
    except Exception:
        return None
