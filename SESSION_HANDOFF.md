# Пакет для новой сессии — FamilyQuest

Краткое состояние проекта, чтобы продолжить работу в новой сессии.

## Что это

**FamilyQuest** — геймифицированный трекер привычек в формате Telegram Mini App. Backend на FastAPI (Railway), фронт на Vanilla JS (GitHub Pages из папки `docs/`).

## Структура

```
backend/          # FastAPI, PostgreSQL, Telegram bot (только уведомления + menu button)
  app/
    main.py      # Точка входа, lifespan без run_bot (polling не в этом процессе)
    config.py    # Pydantic Settings, те же имена переменных что в Railway
    database.py  # SQLAlchemy, get_db, session_scope
    models.py    # User, Family, Habit, HabitLog, BabyEvent, FamilyQuest, Streak
    routers/    # users, habits, baby, gamification, export
    services/   # auth, xp_service, ai_service, github_service
    tasks/       # cron: daily_backup, update_family_quests
    telegram/   # bot.py — setup_menu_button, notify_*, run_bot (не вызывать из main)
frontend/        # Исходники Mini App
docs/            # Копия фронта для GitHub Pages (деплой сюда)
```

## Деплой

- **Backend:** Railway, root = `backend`, переменные из `RAILWAY_VARIABLES.md` (не менять значения).
- **Frontend:** GitHub Pages → Source: branch main, folder `/docs`.
- **BACKEND_URL** в `frontend/config.js` и `docs/config.js` должен совпадать с URL приложения на Railway.

## Что сделано в этой сессии

1. Пересборка с нуля по плану: один конфиг, auth-сервис, опциональные cron и бот.
2. Исправлен конфликт event loop: бот не запускается через `run_polling()` в процессе uvicorn; при старте вызываются только `setup_menu_button()` и уведомления через `Bot().send_message()`.
3. В `run_bot()` добавлена защита: при вызове из уже запущенного loop сразу выход (для старых деплоев).
4. Активный квест: при создании семьи и при запросе статистики создаётся «Первый квест», если его ещё нет.
5. Отображение в Telegram: принудительная светлая тема и тёмный текст в Mini App, чтобы не было белого на белом; подсказки на пустых вкладках; вкладка «Квесты» = статистика и квест.

## Известные ограничения

- **Добавить привычку** из интерфейса нельзя — только через API. В планах: кнопка/форма «Добавить привычку» на фронте.
- **Команда /start** боту не обрабатывается (бот не в polling). Пользователи открывают приложение через кнопку «Открыть Трекер». При необходимости можно добавить webhook в FastAPI.
- Тексты и кнопки на вкладках минимальные; при ошибке API показывается сообщение «Откройте из Telegram».

## Как запустить локально

```bash
cd backend
cp .env.example .env   # заполнить DATABASE_URL и при необходимости TELEGRAM_BOT_TOKEN и др.
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Фронт: открыть `frontend/index.html` или `docs/index.html` (для проверки API нужен Telegram или подмена initData).

## Дальнейшие шаги (идеи для новой сессии)

1. Форма «Добавить привычку» на вкладке Привычки или Настройки.
2. Кнопки управления: редактировать/удалить привычку, фильтр по дню.
3. Webhook для бота, чтобы обрабатывать /start в том же процессе.
4. Улучшить пустые состояния и подсказки на всех вкладках.

## Важно

- После изменений во фронте копировать обновления в `docs/` и пушить — иначе GitHub Pages не обновится.
- Переменные Railway не менять; при добавлении новых — описать в `RAILWAY_VARIABLES.md`.
