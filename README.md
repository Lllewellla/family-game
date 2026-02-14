# FamilyQuest

Геймифицированный семейный трекер привычек в формате Telegram Mini App (привычки, дневник малыша, квесты, экспорт в GitHub).

## Стек

- **Backend:** FastAPI, PostgreSQL, SQLAlchemy, Telegram Bot, APScheduler
- **Frontend:** Vanilla JS, Telegram WebApp SDK
- **Деплой:** Backend — Railway, Frontend — GitHub Pages (папка `docs/`)

## Локальный запуск backend

```bash
cd backend
cp .env.example .env   # заполнить DATABASE_URL и при необходимости остальное
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Проверка: http://localhost:8000/health → `{"status":"healthy"}`.

## Деплой

### Railway (backend)

1. Подключите репозиторий к Railway, выберите корень или папку `backend`.
2. Добавьте PostgreSQL; переменная `DATABASE_URL` подставится автоматически.
3. Остальные переменные задайте в Railway Dashboard (см. `RAILWAY_VARIABLES.md`). **Менять значения не нужно** — используйте уже настроенные.
4. Деплой по push; старт: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (указано в Procfile).

### GitHub Pages (frontend)

1. В настройках репозитория: **Pages** → Source: **Deploy from a branch** → Branch: **main** → папка **/docs**.
2. Фронт будет доступен по адресу `https://<username>.github.io/<repo>/`.
3. Этот URL укажите в переменной `MINI_APP_URL` в Railway (если ещё не указан).
4. В `frontend/config.js` и `docs/config.js` задан `BACKEND_URL` — URL вашего приложения на Railway (например `https://family-game-production.up.railway.app`). При смене домена Railway обновите оба файла.

## Структура

```
backend/          # FastAPI, app/, requirements.txt, Procfile, railway.json
frontend/         # Исходники Mini App (index.html, js/, css/, config.js)
docs/             # Копия фронта для GitHub Pages
```

Переменные окружения: см. `RAILWAY_VARIABLES.md`.
