# Настройка фронтенда для GitHub Pages

## Важно: Настройка BACKEND_URL

Перед использованием приложения необходимо настроить `BACKEND_URL` в файле `docs/config.js`.

### Шаг 1: Найдите URL вашего Railway бэкенда

1. Откройте [Railway Dashboard](https://railway.app)
2. Выберите ваш backend сервис
3. Перейдите в **Settings** → **Networking**
4. Найдите **Public Domain** (например: `https://your-app.up.railway.app`)
5. Скопируйте этот URL

### Шаг 2: Обновите config.js

Откройте файл `docs/config.js` и замените:

```javascript
window.BACKEND_URL = 'https://your-app.railway.app';
```

на ваш реальный URL:

```javascript
window.BACKEND_URL = 'https://your-app.up.railway.app';
```

### Шаг 3: Закоммитьте и запушьте изменения

```bash
git add docs/config.js
git commit -m "Update BACKEND_URL"
git push
```

GitHub Pages автоматически обновится через несколько минут.

## Проверка работоспособности

1. Откройте ваш GitHub Pages сайт (обычно `https://ваш-username.github.io/family-game/`)
2. Откройте консоль браузера (F12)
3. Проверьте, что нет ошибок подключения к бэкенду
4. Если видите ошибку "BACKEND_URL не настроен" - обновите `docs/config.js`

## Устранение проблем

### Ошибка "Не удалось загрузить данные"

**Причина:** Неправильный `BACKEND_URL` или бэкенд не запущен

**Решение:**
1. Проверьте, что `BACKEND_URL` в `docs/config.js` указывает на ваш Railway бэкенд
2. Убедитесь, что бэкенд запущен (проверьте логи в Railway Dashboard)
3. Проверьте, что бэкенд доступен по указанному URL (откройте URL в браузере, должно быть `{"message":"FamilyQuest API",...}`)

### Ошибка CORS

**Причина:** Бэкенд не разрешает запросы с вашего GitHub Pages домена

**Решение:**
- CORS уже настроен на `allow_origins=["*"]` в `backend/app/main.py`, поэтому эта ошибка не должна возникать
- Если все же возникает, проверьте логи бэкенда в Railway

### Изменения не отображаются на GitHub Pages

**Причина:** Кэш браузера или файлы не обновлены в `docs/`

**Решение:**
1. Убедитесь, что вы скопировали файлы из `frontend/` в `docs/`
2. Закоммитьте и запушьте изменения
3. Подождите 1-2 минуты для обновления GitHub Pages
4. Очистите кэш браузера (Ctrl+Shift+R или Cmd+Shift+R)

## Структура файлов

- `frontend/` - исходные файлы фронтенда
- `docs/` - файлы для GitHub Pages (копируются из `frontend/`)

**Важно:** Всегда обновляйте файлы в `docs/` после изменений в `frontend/`!
