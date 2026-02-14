"""Single place: verify initData + get or create user."""
from datetime import date, timedelta
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import User, Family, FamilyQuest, UserRole
from ..utils.telegram_auth import verify_telegram_webapp_data, parse_telegram_user_data


def verify_and_get_user(init_data: str, db: Session) -> User:
    """
    Verify Telegram initData, parse user, return existing or create new user.
    Raises ValueError if init_data invalid or missing.
    """
    settings = get_settings()
    if not settings.TELEGRAM_BOT_TOKEN:
        raise ValueError("Bot token not configured")
    if not verify_telegram_webapp_data(init_data, settings.TELEGRAM_BOT_TOKEN):
        raise ValueError("Invalid Telegram signature")
    user_data = parse_telegram_user_data(init_data)
    if not user_data:
        raise ValueError("Could not parse user data")
    telegram_id = str(user_data.get("id", ""))
    if not telegram_id:
        raise ValueError("Missing user id")

    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if user:
        if user.username != user_data.get("username") or user.first_name != user_data.get("first_name"):
            user.username = user_data.get("username")
            user.first_name = user_data.get("first_name")
            db.commit()
            db.refresh(user)
        return user

    family = Family()
    db.add(family)
    db.flush()
    user = User(
        telegram_id=telegram_id,
        username=user_data.get("username"),
        first_name=user_data.get("first_name"),
        family_id=family.id,
        role=UserRole.ADMIN,
    )
    db.add(user)
    db.flush()
    # Стартовый квест для новой семьи, чтобы не было пусто
    start = date.today()
    end = start + timedelta(days=7)
    quest = FamilyQuest(
        family_id=family.id,
        name="Первый квест",
        target_xp=100,
        start_date=start,
        end_date=end,
    )
    db.add(quest)
    db.commit()
    db.refresh(user)
    return user
