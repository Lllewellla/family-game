"""Telegram bot for notifications and menu."""
import os
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, BotCommand
from telegram.ext import Application, CommandHandler, ContextTypes
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import User, FamilyQuest

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Mini App URL (will be set from environment)
MINI_APP_URL = os.getenv("MINI_APP_URL", "https://your-username.github.io/family-game-tracker/")


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command."""
    keyboard = [
        [InlineKeyboardButton("Открыть Трекер", web_app={"url": MINI_APP_URL})]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "👋 Добро пожаловать в FamilyQuest!\n\n"
        "Трекер привычек для всей семьи с элементами RPG.\n"
        "Нажмите кнопку ниже, чтобы открыть приложение.",
        reply_markup=reply_markup
    )


async def notify_level_up(user: User, new_level: int, db: Session):
    """Send level up notification to user."""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        logger.warning("Bot token not configured, skipping notification")
        return
    
    try:
        from telegram import Bot
        bot = Bot(token=bot_token)
        
        message = f"🎉 Поздравляем! Вы достигли {new_level} уровня!"
        
        await bot.send_message(
            chat_id=user.telegram_id,
            text=message
        )
    except Exception as e:
        logger.error(f"Failed to send notification: {e}")


async def notify_family_quest_completed(family_id: str, quest_name: str, db: Session):
    """Send notification about completed family quest."""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        return
    
    try:
        from telegram import Bot
        bot = Bot(token=bot_token)
        
        family_members = db.query(User).filter(User.family_id == family_id).all()
        
        message = f"🏆 Семейный квест '{quest_name}' выполнен! Отличная работа!"
        
        for member in family_members:
            try:
                await bot.send_message(
                    chat_id=member.telegram_id,
                    text=message
                )
            except Exception as e:
                logger.error(f"Failed to notify user {member.telegram_id}: {e}")
    except Exception as e:
        logger.error(f"Failed to send quest notification: {e}")


async def notify_deploy_complete():
    """Send a message to the configured chat that deploy is complete and bot is ready."""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("DEPLOY_NOTIFY_CHAT_ID")
    if not bot_token or not chat_id or not chat_id.strip():
        return
    chat_id = chat_id.strip()
    try:
        from telegram import Bot
        bot = Bot(token=bot_token)
        await bot.send_message(
            chat_id=chat_id,
            text="✅ Деплой завершён. Бот готов к работе."
        )
        logger.info("Deploy notification sent to chat %s", chat_id)
    except Exception as e:
        logger.warning("Failed to send deploy notification: %s", e)


async def setup_menu_button():
    """Set up menu button pointing to Mini App."""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        logger.warning("Bot token not configured, skipping menu button setup")
        return
    
    try:
        from telegram import Bot
        bot = Bot(token=bot_token)
        
        await bot.set_chat_menu_button(
            menu_button={
                "type": "web_app",
                "text": "Открыть Трекер",
                "web_app": {"url": MINI_APP_URL}
            }
        )
        
        # Set commands
        commands = [
            BotCommand("start", "Начать работу с ботом"),
        ]
        await bot.set_my_commands(commands)
        
        logger.info("Menu button and commands set successfully")
    except Exception as e:
        logger.error(f"Failed to setup menu button: {e}")


def create_bot_application():
    """Create and configure Telegram bot application."""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        logger.warning("Bot token not configured, bot will not start")
        return None
    
    application = Application.builder().token(bot_token).build()
    
    # Add handlers
    application.add_handler(CommandHandler("start", start_command))
    
    return application


async def run_bot():
    """Run the bot (for polling mode)."""
    application = create_bot_application()
    if not application:
        return
    
    # Setup menu button
    await setup_menu_button()
    
    # Start polling
    logger.info("Starting bot polling...")
    await application.run_polling(allowed_updates=Update.ALL_TYPES)
