(function () {
  // Гарантируем видимые цвета, если Telegram не подставил тему или подставил пустые значения
  var root = document.documentElement;
  var style = getComputedStyle(root);
  var vars = [
    ['--tg-theme-bg-color', '#ffffff'],
    ['--tg-theme-text-color', '#1a1a1a'],
    ['--tg-theme-hint-color', '#555555'],
    ['--tg-theme-button-color', '#2481cc'],
    ['--tg-theme-button-text-color', '#ffffff'],
    ['--tg-theme-secondary-bg-color', '#f0f0f0']
  ];
  vars.forEach(function (pair) {
    var val = style.getPropertyValue(pair[0]).trim();
    if (!val) root.style.setProperty(pair[0], pair[1]);
  });

  const content = document.getElementById('content');
  const nav = document.querySelector('.nav');

  function show(pageId) {
    content.innerHTML = '<p class="loading">Загрузка...</p>';
    if (pageId === 'habits') loadHabits();
    else if (pageId === 'baby') loadBaby();
    else if (pageId === 'gamification') loadGamification();
    else if (pageId === 'family') loadFamily();
    else if (pageId === 'settings') loadSettings();
    else content.innerHTML = '<p class="page-title">Выберите раздел</p>';
  }

  function loadHabits() {
    API.get('/api/habits/today')
      .then(habits => {
        let html = '<h2 class="page-title">Привычки на сегодня</h2>';
        if (!habits.length) html += '<p>Нет привычек на сегодня</p>';
        else {
          habits.forEach(h => {
            html += `<div class="card" data-habit-id="${h.id}"><strong>${h.name}</strong> (${h.xp_reward} XP) <button class="btn" data-complete="${h.id}">Выполнено</button></div>`;
          });
        }
        content.innerHTML = html;
        content.querySelectorAll('[data-complete]').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.dataset.complete;
            const today = new Date().toISOString().slice(0, 10);
            API.post(`/api/habits/${id}/complete`, { date: today, value: null })
              .then(() => loadHabits())
              .catch(e => { content.querySelector('.error')?.remove(); btn.insertAdjacentHTML('afterend', `<p class="error">${e.message}</p>`); });
          });
        });
      })
      .catch(e => { content.innerHTML = `<p class="error">${e.message}</p>`); 
  }

  function loadBaby() {
    API.get('/api/baby/events')
      .then(events => {
        let html = '<h2 class="page-title">Дневник малыша</h2>';
        if (!events.length) html += '<p>Пока нет записей</p>';
        else events.forEach(e => { html += `<div class="card"><small>${e.event_type}</small> ${e.content}</div>`; });
        content.innerHTML = html;
      })
      .catch(e => { content.innerHTML = `<p class="error">${e.message}</p>`); 
  }

  function loadGamification() {
    API.get('/api/gamification/stats')
      .then(s => {
        content.innerHTML = `
          <h2 class="page-title">Статистика</h2>
          <div class="card"><strong>Уровень ${s.level}</strong><br>XP: ${s.total_xp} (до следующего: ${s.xp_for_next_level})</div>
          ${s.family_quest_progress ? `<div class="card">Квест: ${s.family_quest_progress.name} — ${s.family_quest_progress.current_xp}/${s.family_quest_progress.target_xp} XP</div>` : ''}
        `;
      })
      .catch(e => { content.innerHTML = `<p class="error">${e.message}</p>`); 
  }

  function loadFamily() {
    API.get('/api/users/family')
      .then(members => {
        let html = '<h2 class="page-title">Семья</h2>';
        if (!members.length) html += '<p>Нет участников</p>';
        else members.forEach(m => { html += `<div class="card">${m.first_name || m.username || m.telegram_id} — ур. ${m.level}</div>`; });
        content.innerHTML = html;
      })
      .catch(e => { content.innerHTML = `<p class="error">${e.message}</p>`); 
  }

  function loadSettings() {
    content.innerHTML = '<h2 class="page-title">Настройки</h2><div class="card">Backend: ' + (window.BACKEND_URL || 'не задан') + '</div>';
  }

  nav.addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-page]');
    if (btn) show(btn.dataset.page);
  });

  if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
  }

  if (!window.BACKEND_URL) {
    content.innerHTML = '<p class="error">Не задан BACKEND_URL. Проверьте config.js.</p>';
    return;
  }
  show('habits');
})();
