# Переменные окружения для Railway

Этот файл содержит список всех переменных окружения, которые нужно настроить в Railway Dashboard.

## Обязательные переменные

### Telegram Bot
```
TELEGRAM_BOT_TOKEN
```
- **Описание**: Токен вашего Telegram бота от BotFather
- **Как получить**: 
  1. Откройте [@BotFather](https://t.me/botfather) в Telegram
  2. Отправьте `/newbot` и следуйте инструкциям
  3. Скопируйте полученный токен
- **Пример**: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`

### Database (автоматически)
```
DATABASE_URL
```
- **Описание**: URL подключения к PostgreSQL
- **Как получить**: Railway автоматически создает эту переменную при добавлении PostgreSQL сервиса
- **Не нужно настраивать вручную** - Railway сделает это автоматически

### GitHub Integration
```
GITHUB_ACCESS_TOKEN
```
- **Описание**: Personal Access Token от GitHub для экспорта дневника
- **Как получить**:
  1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
  2. Generate new token (classic)
  3. Выберите scope `repo` (полный доступ к репозиториям)
  4. Скопируйте токен
- **Пример**: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

```
GITHUB_REPO
```
- **Описание**: Репозиторий для экспорта дневника малыша
- **Формат**: `username/repository-name`
- **Пример**: `Lllewellla/baby-diary`
- **Важно**: Репозиторий должен существовать на GitHub (можно создать пустой приватный)

### Frontend URL
```
MINI_APP_URL
```
- **Описание**: URL вашего фронтенда на GitHub Pages
- **Формат**: `https://username.github.io/repository-name/`
- **Пример**: `https://Lllewellla.github.io/family-game/`
- **Важно**: Укажите после настройки GitHub Pages

### Backend URL (для фронтенда)
```
BACKEND_URL
```
- **Описание**: URL вашего Railway приложения
- **Формат**: `https://your-app-name.railway.app`
- **Как получить**: После деплоя Railway покажет URL в Dashboard
- **Пример**: `https://familyquest-production.up.railway.app`

## Опциональные переменные

### AI Integration (OpenRouter)
```
OPENROUTER_API_KEY
```
- **Описание**: API ключ от OpenRouter для AI-обработки заметок
- **Как получить**: 
  1. Зарегистрируйтесь на [OpenRouter](https://openrouter.ai/)
  2. Создайте API ключ в настройках
  3. Скопируйте ключ
- **Опционально**: Если не указан, AI-функции будут использовать простой формат без обработки

### Admin IDs
```
ADMIN_IDS
```
- **Описание**: Telegram ID администраторов (через запятую)
- **Как получить свой Telegram ID**:
  1. Откройте [@userinfobot](https://t.me/userinfobot) в Telegram
  2. Бот покажет ваш ID
- **Пример**: `123456789` или `123456789,987654321` (несколько админов)
- **Опционально**: Первый пользователь автоматически становится админом

## Инструкция по настройке в Railway

1. **Откройте Railway Dashboard**
   - Зайдите на [railway.app](https://railway.app)
   - Выберите ваш проект

2. **Добавьте PostgreSQL**
   - Нажмите "New" → "Database" → "Add PostgreSQL"
   - Railway автоматически создаст `DATABASE_URL`

3. **Настройте переменные**
   - Выберите ваш сервис (backend)
   - Перейдите на вкладку "Variables"
   - Нажмите "New Variable"
   - Добавьте каждую переменную из списка выше

4. **Проверьте переменные**
   - Убедитесь, что все обязательные переменные добавлены
   - Проверьте, что значения корректны (без лишних пробелов)

5. **Деплой**
   - Railway автоматически перезапустит приложение после добавления переменных
   - Проверьте логи в разделе "Deployments"

## Чек-лист переменных

Отметьте после добавления каждой переменной:

- [ ] `TELEGRAM_BOT_TOKEN` - Токен Telegram бота
- [ ] `DATABASE_URL` - Автоматически от Railway (PostgreSQL)
- [ ] `GITHUB_ACCESS_TOKEN` - GitHub Personal Access Token
- [ ] `GITHUB_REPO` - Репозиторий для дневника (username/repo)
- [ ] `MINI_APP_URL` - URL GitHub Pages фронтенда
- [ ] `BACKEND_URL` - URL Railway приложения
- [ ] `OPENROUTER_API_KEY` - (Опционально) OpenRouter API ключ
- [ ] `ADMIN_IDS` - (Опционально) Telegram ID администраторов

## Проверка работоспособности

После настройки всех переменных:

1. **Проверьте логи Railway**
   - Должны быть сообщения об успешном запуске
   - Не должно быть ошибок подключения к БД

2. **Проверьте API**
   - Откройте `https://your-backend-url.railway.app/health`
   - Должен вернуться `{"status": "healthy"}`

3. **Проверьте Telegram бота**
   - Откройте вашего бота в Telegram
   - Отправьте `/start`
   - Бот должен ответить

## Безопасность

⚠️ **Важно**:
- Никогда не коммитьте реальные токены в git
- Файл `.env` уже добавлен в `.gitignore`
- Используйте только переменные окружения Railway
- Не делитесь токенами публично

## Troubleshooting

### Ошибка подключения к БД
- Проверьте, что PostgreSQL сервис добавлен
- Убедитесь, что `DATABASE_URL` установлен автоматически

### Бот не отвечает
- Проверьте `TELEGRAM_BOT_TOKEN`
- Убедитесь, что токен правильный (без пробелов)
- Проверьте логи Railway на ошибки

### GitHub экспорт не работает
- Проверьте `GITHUB_ACCESS_TOKEN` и права доступа
- Убедитесь, что `GITHUB_REPO` указан в правильном формате
- Проверьте, что репозиторий существует

### Frontend не подключается к backend
- Проверьте `BACKEND_URL` в Railway
- Обновите `frontend/config.js` с правильным URL
- Убедитесь, что CORS настроен правильно
