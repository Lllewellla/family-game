# Структура проекта FamilyQuest

## Backend (FastAPI)

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # Точка входа FastAPI приложения
│   ├── models.py                  # SQLAlchemy модели (User, Habit, BabyEvent, etc.)
│   ├── schemas.py                 # Pydantic схемы для валидации
│   ├── database.py                # Настройка подключения к БД
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── users.py               # Аутентификация и управление пользователями
│   │   ├── habits.py              # CRUD операции с привычками
│   │   ├── baby.py                # Дневник малыша
│   │   ├── gamification.py        # XP, уровни, квесты
│   │   └── export.py               # Экспорт дневника
│   ├── services/
│   │   ├── __init__.py
│   │   ├── xp_service.py          # Логика начисления XP и стриков
│   │   ├── github_service.py      # Экспорт в GitHub
│   │   └── ai_service.py           # AI-обработка через OpenRouter
│   ├── telegram/
│   │   ├── __init__.py
│   │   └── bot.py                 # Telegram бот
│   └── utils/
│       ├── __init__.py
│       └── telegram_auth.py        # Утилиты для проверки Telegram auth
├── tasks/
│   ├── __init__.py
│   └── cron_jobs.py               # Фоновые задачи (авто-экспорт)
├── requirements.txt                # Python зависимости
├── .env.example                   # Пример переменных окружения
├── Procfile                       # Конфигурация для Railway
└── railway.json                   # Конфигурация Railway
```

## Frontend (Telegram Mini App)

```
frontend/
├── index.html                     # Главная страница
├── config.js                      # Конфигурация (BACKEND_URL)
├── css/
│   └── styles.css                 # Кастомные стили
└── js/
    ├── api.js                     # API клиент
    ├── app.js                     # Основная логика приложения
    ├── habits.js                  # Управление привычками
    ├── baby.js                    # Дневник малыша
    ├── gamification.js            # XP и уровни
    └── settings.js                # Настройки и экспорт
```

## Документация

```
├── README.md                      # Основная документация
├── DEPLOYMENT.md                  # Инструкция по деплою
└── PROJECT_STRUCTURE.md           # Этот файл
```

## База данных

### Таблицы:
- `users` - Пользователи (Telegram ID, уровень, XP)
- `families` - Семьи (группировка пользователей)
- `habits` - Привычки (тип, расписание, приватность)
- `habit_logs` - Логи выполнения привычек
- `baby_events` - События дневника малыша
- `family_quests` - Семейные квесты
- `streaks` - Стрики выполнения привычек

## API Endpoints

### Аутентификация
- `POST /api/auth/verify` - Проверка Telegram initData
- `GET /api/users/me` - Текущий пользователь
- `GET /api/users/family` - Члены семьи

### Привычки
- `GET /api/habits` - Список всех привычек
- `GET /api/habits/today` - Привычки на сегодня
- `POST /api/habits` - Создать привычку
- `PUT /api/habits/{id}` - Обновить привычку
- `DELETE /api/habits/{id}` - Удалить привычку
- `POST /api/habits/{id}/complete` - Отметить выполнение

### Дневник малыша
- `GET /api/baby/events` - События (с фильтрацией)
- `POST /api/baby/events` - Добавить событие
- `PUT /api/baby/events/{id}` - Обновить событие
- `DELETE /api/baby/events/{id}` - Удалить событие
- `GET /api/baby/summary/{date}` - AI-саммари дня

### Геймификация
- `GET /api/gamification/stats` - Статистика пользователя
- `GET /api/gamification/family-quest` - Текущий квест
- `POST /api/gamification/family-quest` - Создать квест
- `GET /api/gamification/leaderboard` - Таблица лидеров

### Экспорт
- `GET /api/export/diary` - Экспорт дневника (Markdown)
- `POST /api/export/diary/backup` - Ручной бэкап в GitHub

## Переменные окружения

### Backend (.env)
```
TELEGRAM_BOT_TOKEN=...
DATABASE_URL=... (автоматически от Railway)
GITHUB_ACCESS_TOKEN=...
GITHUB_REPO=username/repo
OPENROUTER_API_KEY=... (опционально)
ADMIN_IDS=123456789
MINI_APP_URL=https://...
BACKEND_URL=https://... (для фронтенда)
```

## Особенности реализации

1. **Аутентификация**: Используется Telegram WebApp initData для проверки подлинности
2. **Геймификация**: Система XP с формулой `level = sqrt(total_xp / 100) + 1`
3. **Стрики**: Автоматический расчет серий выполнения с бонусами за 3/7/30 дней
4. **Экспорт**: Автоматический коммит в GitHub раз в сутки через cron
5. **AI**: Интеграция с OpenRouter для генерации красивых саммари дня

## Следующие шаги

1. Настроить переменные окружения
2. Задеплоить backend на Railway
3. Задеплоить frontend на GitHub Pages
4. Настроить Telegram бота
5. Протестировать все функции
