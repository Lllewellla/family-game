# Настройка Git и подключение к репозиторию

Репозиторий уже настроен на подключение к: **https://github.com/Lllewellla/family-game**

## Первоначальная настройка

Если git еще не инициализирован, выполните:

```bash
git init
git remote add origin https://github.com/Lllewellla/family-game.git
```

## Проверка подключения

```bash
git remote -v
```

Должно показать:
```
origin  https://github.com/Lllewellla/family-game.git (fetch)
origin  https://github.com/Lllewellla/family-game.git (push)
```

## Первый коммит и push

```bash
# Добавить все файлы
git add .

# Создать первый коммит
git commit -m "Initial commit: FamilyQuest implementation"

# Отправить в репозиторий
git push -u origin main
```

Если ветка называется `master` вместо `main`:

```bash
git branch -M main
git push -u origin main
```

## Обновление репозитория

После внесения изменений:

```bash
git add .
git commit -m "Описание изменений"
git push
```

## Если репозиторий уже содержит файлы

Если в удаленном репозитории уже есть файлы, сначала получите их:

```bash
git fetch origin
git pull origin main --allow-unrelated-histories
```

Затем разрешите конфликты (если есть) и сделайте push.

## Настройка GitHub Pages

После того как код будет в репозитории:

1. Скопируйте содержимое `frontend/` в папку `docs/`:
```bash
mkdir -p docs
cp -r frontend/* docs/
```

2. Обновите `docs/config.js` с URL вашего Railway backend

3. Закоммитьте и запушьте:
```bash
git add docs/
git commit -m "Add frontend for GitHub Pages"
git push
```

4. В настройках GitHub репозитория:
   - Settings → Pages
   - Source: Deploy from a branch
   - Branch: main, Folder: /docs
   - Save

## Важно

- Не коммитьте файл `.env` с реальными токенами
- Используйте `.env.example` как шаблон
- Все секреты должны быть в переменных окружения Railway, а не в коде
