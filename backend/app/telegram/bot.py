"""Telegram bot: /start, menu button, notifications. Uses config, no os.getenv in handlers."""
import logging
from sqlalchemy.orm import Session

from ..config import get_settings

logger = logging.getLogger(__name__)


async def notify_level_up(user, new_level: int, db: Session):
    """Send level-up message to user. Optional: skip if no token."""
    settings = get_settings()
    if not settings.TELEGRAM_BOT_TOKEN:
        return
    try:
        from telegram import Bot
        bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
        await bot.send_message(
            chat_id=user.telegram_id,
            text=f"🎉 Поздравляем! Вы достигли {new_level} уровня!",
        )
    except Exception as e:
        logger.warning("Failed to send level-up notification: %s", e)


async def notify_family_quest_completed(family_id: str, quest_name: str, db: Session):
    settings = get_settings()
    if not settings.TELEGRAM_BOT_TOKEN:
        return
    try:
        from telegram import Bot
        from ..models import User
        bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
        members = db.query(User).filter(User.family_id == family_id).all()
        text = f"🏆 Семейный квест '{quest_name}' выполнен! Отличная работа!"
        for member in members:
            try:
                await bot.send_message(chat_id=member.telegram_id, text=text)
            except Exception as e:
                logger.warning("Notify member %s failed: %s", member.telegram_id, e)
    except Exception as e:
        logger.warning("Notify family quest failed: %s", e)


async def notify_deploy_complete():
    """Optional: send 'Deploy complete' to DEPLOY_NOTIFY_CHAT_ID. Do not block startup."""
    settings = get_settings()
    if not settings.TELEGRAM_BOT_TOKEN or not settings.DEPLOY_NOTIFY_CHAT_ID:
        return
    chat_id = (settings.DEPLOY_NOTIFY_CHAT_ID or "").strip()
    if not chat_id:
        return
    try:
        from telegram import Bot
        bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
        await bot.send_message(chat_id=chat_id, text="✅ Деплой завершён. Бот готов к работе.")
        logger.info("Deploy notification sent to %s", chat_id)
    except Exception as e:
        logger.warning("Deploy notification failed: %s", e)


async def setup_menu_button():
    settings = get_settings()
    if not settings.TELEGRAM_BOT_TOKEN or not settings.MINI_APP_URL:
        return
    try:
        from telegram import Bot, BotCommand
        bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
        await bot.set_chat_menu_button(
            menu_button={"type": "web_app", "text": "Открыть Трекер", "web_app": {"url": settings.MINI_APP_URL}}
        )
        await bot.set_my_commands([BotCommand("start", "Начать работу с ботом")])
        logger.info("Menu button set")
    except Exception as e:
        logger.warning("Menu button setup failed: %s", e)


def create_bot_application():
    settings = get_settings()
    if not settings.TELEGRAM_BOT_TOKEN:
        return None
    from telegram.ext import Application, CommandHandler
    from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup

    async def start(update: Update, context):
        url = (settings.MINI_APP_URL or "").strip() or "https://example.com"
        kb = InlineKeyboardMarkup([[InlineKeyboardButton("Открыть Трекер", web_app={"url": url})]])
        await update.message.reply_text(
            "👋 Добро пожаловать в FamilyQuest! Нажмите кнопку ниже.",
            reply_markup=kb,
        )

    app = Application.builder().token(settings.TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    return app


async def run_bot():
    """Run bot polling in background. Optional: app works without bot."""
    app = create_bot_application()
    if not app:
        return
    await setup_menu_button()
    logger.info("Starting bot polling...")
    await app.run_polling(allowed_updates=["message", "callback_query"])
