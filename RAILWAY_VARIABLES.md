# Переменные окружения Railway

**Значения не меняем** — они уже настроены в Railway Dashboard. Новый код только читает те же имена переменных.

## Список переменных (имена как в Railway)

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | PostgreSQL (создаётся Railway при добавлении БД) |
| `TELEGRAM_BOT_TOKEN` | Токен бота от BotFather |
| `MINI_APP_URL` | URL фронтенда на GitHub Pages |
| `BACKEND_URL` | URL бэкенда на Railway |
| `GITHUB_ACCESS_TOKEN` | GitHub Personal Access Token для экспорта дневника |
| `GITHUB_REPO` | Репозиторий в формате `username/repo` |
| `OPENROUTER_API_KEY` | (Опционально) OpenRouter для AI-саммари |
| `ADMIN_IDS` | (Опционально) Telegram ID админов через запятую |
| `DEPLOY_NOTIFY_CHAT_ID` | (Опционально) Чат для сообщения «Деплой завершён» |

Локально: скопируйте `backend/.env.example` в `backend/.env` и подставьте свои значения. В git не коммитить `.env`.
