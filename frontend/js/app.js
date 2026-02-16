(function () {
  var root = document.documentElement;
  if (window.Telegram && window.Telegram.WebApp) {
    root.style.setProperty('--tg-theme-bg-color', '#ffffff');
    root.style.setProperty('--tg-theme-text-color', '#1a1a1a');
    root.style.setProperty('--tg-theme-hint-color', '#555555');
    root.style.setProperty('--tg-theme-button-color', '#2481cc');
    root.style.setProperty('--tg-theme-button-text-color', '#ffffff');
    root.style.setProperty('--tg-theme-secondary-bg-color', '#f0f0f0');
  } else {
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
  }

  const content = document.getElementById('content');
  const nav = document.querySelector('.nav');
  const overlay = document.getElementById('habit-form-overlay');

  var habitsFilter = 'today';
  var habitsViewArchived = false;

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
    var endpoint = habitsFilter === 'today' ? '/api/habits/today' : '/api/habits';
    if (habitsViewArchived && endpoint === '/api/habits') endpoint = '/api/habits?include_inactive=1';
    API.get(endpoint)
      .then(habits => {
        var html = '<h2 class="page-title">Привычки</h2>';
        html += '<div class="filter-row">';
        html += '<button type="button" class="' + (habitsFilter === 'today' ? 'active ' : '') + '" data-filter="today">На сегодня</button>';
        html += '<button type="button" class="' + (habitsFilter === 'all' ? 'active ' : '') + '" data-filter="all">Все</button>';
        html += '<button type="button" class="btn" id="btn-add-habit">Добавить привычку</button>';
        html += ' <button type="button" class="btn btn-secondary" id="btn-archive">' + (habitsViewArchived ? 'Активные' : 'Архив') + '</button>';
        html += '</div>';
        if (habitsViewArchived && endpoint.indexOf('include_inactive') >= 0) {
          habits = habits.filter(function (h) { return !h.is_active; });
        }
        if (!habits.length) {
          html += '<p class="empty-hint">' + (habitsViewArchived ? 'Нет привычек в архиве.' : 'Нет привычек. Нажмите «Добавить привычку», чтобы создать первую.') + '</p>';
        } else {
          habits.forEach(h => {
            var ht = h.type || 'boolean';
            var isArchived = !h.is_active;
            html += '<div class="card habit-card" data-habit-id="' + h.id + '" data-habit-type="' + ht + '">';
            html += '<strong>' + escapeHtml(h.name) + '</strong>';
            if (h.description) html += '<br><small class="empty-hint">' + escapeHtml(h.description) + '</small>';
            html += ' <span class="empty-hint">(' + h.xp_reward + ' XP)</span>';
            if (!isArchived) {
              html += '<div class="habit-tracking" data-habit-id="' + h.id + '" data-habit-type="' + ht + '"></div>';
            }
            html += '<div class="habit-actions" data-habit-id="' + h.id + '" data-habit-type="' + ht + '">';
            html += '<button type="button" class="btn btn-secondary" data-edit="' + h.id + '">Изменить</button>';
            if (isArchived) {
              html += ' <button type="button" class="btn" data-restore="' + h.id + '">Восстановить</button>';
            } else {
              html += ' <button type="button" class="btn btn-secondary" data-archive="' + h.id + '">В архив</button>';
            }
            html += '</div></div>';
          });
        }
        content.innerHTML = html;
        if (!habitsViewArchived) fillHabitTracking(habits);
        var archiveBtn = document.getElementById('btn-archive');
        if (archiveBtn) {
          archiveBtn.addEventListener('click', function () {
            habitsViewArchived = !habitsViewArchived;
            habitsFilter = 'all';
            loadHabits();
          });
        }
        content.querySelectorAll('[data-filter]').forEach(btn => {
          btn.addEventListener('click', function () {
            habitsFilter = this.dataset.filter;
            loadHabits();
          });
        });
        var addBtn = document.getElementById('btn-add-habit');
        if (addBtn) addBtn.addEventListener('click', showAddHabitForm);
        bindHabitCardActions(habits);
      })
      .catch(e => {
        content.innerHTML = '<p class="error">Ошибка загрузки. Откройте приложение из Telegram (кнопка «Открыть Трекер» у бота).</p><p class="empty-hint">' + e.message + '</p>';
      });
  }

  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function fillHabitTracking(habits) {
    var today = new Date().toISOString().slice(0, 10);
    content.querySelectorAll('.habit-tracking').forEach(container => {
      var habitId = container.dataset.habitId;
      var type = container.dataset.habitType;
      var habit = habits.find(h => h.id === habitId);
      if (!habit) return;
      if (type === 'boolean') {
        var from = new Date();
        from.setDate(from.getDate() - 3);
        var to = new Date();
        to.setDate(to.getDate() + 2);
        API.get('/api/habits/' + habitId + '/logs?from_date=' + from.toISOString().slice(0, 10) + '&to_date=' + to.toISOString().slice(0, 10))
          .then(logs => {
            var doneSet = {};
            logs.forEach(l => { doneSet[l.date] = true; });
            var dates = [];
            for (var i = -3; i <= 2; i++) {
              var d = new Date();
              d.setDate(d.getDate() + i);
              dates.push(d.toISOString().slice(0, 10));
            }
            var labels = ['−3', '−2', '−1', 'Сегодня', '+1', '+2'];
            var html = '<div class="circles-row">';
            dates.forEach((d, idx) => {
              var isToday = d === today;
              var done = !!doneSet[d];
              var isFuture = d > today;
              var cls = 'circle';
              if (done) cls += ' done';
              if (isToday) cls += ' today';
              if (isFuture) cls += ' future';
              var title = labels[idx];
              if (isToday) html += '<button type="button" class="' + cls + '" data-habit-id="' + habitId + '" data-date="' + d + '" data-done="' + (done ? '1' : '0') + '" title="' + title + '">' + (done ? '✓' : '') + '</button>';
              else html += '<span class="' + cls + '" title="' + title + '">' + (done ? '✓' : '') + '</span>';
            });
            html += '</div>';
            container.innerHTML = html;
            container.querySelectorAll('button.circle').forEach(btn => {
              btn.addEventListener('click', function () {
                var id = this.dataset.habitId;
                var date = this.dataset.date;
                var isDone = this.dataset.done === '1';
                var p = isDone
                  ? API.post('/api/habits/' + id + '/uncomplete', { date: date, value: null })
                  : API.post('/api/habits/' + id + '/complete', { date: date, value: null });
                p.then(() => loadHabits()).catch(e => showErrorNear(this, e.message));
              });
            });
          })
          .catch(() => { container.innerHTML = '<p class="empty-hint">Не удалось загрузить историю</p>'; });
      } else if (type === 'times_per_week') {
        API.get('/api/habits/' + habitId + '/stats')
          .then(stats => {
            var done = stats.weekly_done != null ? stats.weekly_done : 0;
            var target = stats.weekly_target != null ? stats.weekly_target : 1;
            var pct = target ? Math.min(100, Math.round(done / target * 100)) : 0;
            var html = '<div class="progress-bar"><div class="progress-bar-fill" style="width:' + pct + '%"></div></div>';
            html += '<p class="empty-hint">' + done + ' / ' + target + ' за неделю</p>';
            html += '<button type="button" class="btn" data-weekly-complete="' + habitId + '">Отметить выполнение</button>';
            container.innerHTML = html;
            container.querySelector('[data-weekly-complete]').addEventListener('click', function () {
              API.post('/api/habits/' + habitId + '/complete', { date: today, value: null })
                .then(() => loadHabits())
                .catch(e => showErrorNear(this, e.message));
            });
          })
          .catch(() => {
            container.innerHTML = '<button type="button" class="btn" data-weekly-complete="' + habitId + '">Отметить выполнение</button>';
            container.querySelector('[data-weekly-complete]').addEventListener('click', function () {
              API.post('/api/habits/' + habitId + '/complete', { date: today, value: null })
                .then(() => loadHabits())
                .catch(e => showErrorNear(this, e.message));
            });
          });
      } else if (type === 'quantity') {
        var targetVal = (habit.target_value && habit.target_value.daily_target) || 0;
        var comp = (habit.target_value && habit.target_value.comparison) || '>=';
        container.innerHTML =
          '<label class="form-row">Введите значение за сегодня: <input type="number" class="quantity-input" data-habit-id="' + habitId + '" placeholder="' + targetVal + '" style="width:100px;padding:6px;margin-left:8px"></label>' +
          '<p class="empty-hint">Цель: ' + (comp === '>=' ? '≥' : '≤') + ' ' + targetVal + '</p>' +
          '<button type="button" class="btn" data-quantity-submit="' + habitId + '">Сохранить</button>';
        container.querySelector('[data-quantity-submit]').addEventListener('click', function () {
          var input = container.querySelector('.quantity-input');
          var num = input && parseFloat(input.value);
          if (num == null || isNaN(num)) { showErrorNear(this, 'Введите число'); return; }
          API.post('/api/habits/' + habitId + '/complete', { date: today, value: { number: num } })
            .then(() => loadHabits())
            .catch(e => showErrorNear(this, e.message));
        });
      } else if (type === 'scale') {
        container.innerHTML = '<p class="empty-hint">Оценка 1–5:</p><div class="scale-buttons">';
        for (var k = 1; k <= 5; k++) {
          container.innerHTML += '<button type="button" class="scale-btn" data-habit-id="' + habitId + '" data-scale="' + k + '">' + k + '</button>';
        }
        container.innerHTML += '</div>';
        container.querySelectorAll('.scale-btn').forEach(btn => {
          btn.addEventListener('click', function () {
            var id = this.dataset.habitId;
            var scale = parseInt(this.dataset.scale, 10);
            API.post('/api/habits/' + id + '/complete', { date: today, value: { scale: scale } })
              .then(() => loadHabits())
              .catch(e => showErrorNear(this, e.message));
          });
        });
      } else {
        container.innerHTML = '<button type="button" class="btn" data-complete="' + habitId + '">Выполнено</button>';
        container.querySelector('[data-complete]').addEventListener('click', function () {
          API.post('/api/habits/' + habitId + '/complete', { date: today, value: null })
            .then(() => loadHabits())
            .catch(e => showErrorNear(this, e.message));
        });
      }
    });
  }

  function bindHabitCardActions(habits) {
    content.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', function () {
        var id = this.dataset.edit;
        showEditHabitForm(id);
      });
    });
    content.querySelectorAll('[data-archive]').forEach(btn => {
      btn.addEventListener('click', function () {
        var id = this.dataset.archive;
        if (!confirm('Убрать привычку в архив? Её можно будет вернуть.')) return;
        API.put('/api/habits/' + id, { is_active: false })
          .then(() => loadHabits())
          .catch(e => showErrorNear(this, e.message));
      });
    });
    content.querySelectorAll('[data-restore]').forEach(btn => {
      btn.addEventListener('click', function () {
        var id = this.dataset.restore;
        API.put('/api/habits/' + id, { is_active: true })
          .then(() => { habitsViewArchived = false; loadHabits(); })
          .catch(e => showErrorNear(this, e.message));
      });
    });
  }

  function showErrorNear(el, msg) {
    content.querySelectorAll('.error').forEach(e => e.remove());
    el.insertAdjacentHTML('afterend', '<p class="error">' + escapeHtml(msg) + '</p>');
  }

  function showAddHabitForm() {
    API.get('/api/users/family')
      .then(members => {
        overlay.innerHTML = buildHabitFormHtml(null, members);
        overlay.hidden = false;
        bindHabitFormSubmit(null, members);
        bindHabitFormVisibility();
      })
      .catch(() => {
        overlay.innerHTML = buildHabitFormHtml(null, []);
        overlay.hidden = false;
        bindHabitFormSubmit(null, []);
        bindHabitFormVisibility();
      });
  }

  function showEditHabitForm(habitId) {
    API.get('/api/habits')
      .then(habits => {
        var habit = habits.find(h => h.id === habitId);
        if (!habit) { loadHabits(); return; }
        return API.get('/api/users/family').then(members => {
          overlay.innerHTML = buildHabitFormHtml(habit, members || []);
          overlay.hidden = false;
          bindHabitFormSubmit(habitId, members || []);
          bindHabitFormVisibility();
        });
      })
      .catch(e => { content.innerHTML = '<p class="error">' + escapeHtml(e.message) + '</p>'; });
  }

  function buildHabitFormHtml(habit, members) {
    var isEdit = !!habit;
    var name = (habit && habit.name) || '';
    var desc = (habit && habit.description) || '';
    var type = (habit && habit.type) || 'boolean';
    var privacy = (habit && habit.privacy) || 'personal';
    var scheduleType = (habit && habit.schedule_type) || 'daily';
    var scheduleConfig = habit && habit.schedule_config ? habit.schedule_config : {};
    var targetValue = habit && habit.target_value ? habit.target_value : {};
    var xpReward = (habit && habit.xp_reward) || 10;
    var weeklyTarget = targetValue.weekly_target || scheduleConfig.weekly_target || 5;
    var dailyTarget = targetValue.daily_target || 10000;
    var comparison = targetValue.comparison || '>=';
    var minToCount = targetValue.min_to_count != null ? targetValue.min_to_count : 1;
    var days = scheduleConfig.days || [0, 1, 2, 3, 4];

    var html = '<div class="modal" id="habit-form-modal">';
    html += '<h3>' + (isEdit ? 'Изменить привычку' : 'Новая привычка') + '</h3>';
    html += '<form id="habit-form">';
    html += '<div class="form-row"><label>Название</label><input type="text" name="name" value="' + escapeHtml(name) + '" required></div>';
    html += '<div class="form-row"><label>Описание (необязательно)</label><textarea name="description">' + escapeHtml(desc) + '</textarea></div>';
    html += '<div class="form-row"><label>Тип</label><select name="type">';
    html += '<option value="boolean"' + (type === 'boolean' ? ' selected' : '') + '>Да/нет</option>';
    html += '<option value="times_per_week"' + (type === 'times_per_week' ? ' selected' : '') + '>X раз в неделю</option>';
    html += '<option value="quantity"' + (type === 'quantity' ? ' selected' : '') + '>Количество (число в день)</option>';
    html += '<option value="scale"' + (type === 'scale' ? ' selected' : '') + '>Шкала 1–5</option>';
    html += '</select></div>';
    html += '<div class="form-row"><label>Для кого</label><select name="privacy">';
    html += '<option value="personal"' + (privacy === 'personal' ? ' selected' : '') + '>Личная</option>';
    html += '<option value="public"' + (privacy === 'public' ? ' selected' : '') + '>Публичная (в семье)</option>';
    html += '<option value="shared"' + (privacy === 'shared' ? ' selected' : '') + '>Общая семейная</option>';
    html += '</select></div>';
    html += '<div class="form-row"><label>Периодичность</label><select name="schedule_type">';
    html += '<option value="daily"' + (scheduleType === 'daily' ? ' selected' : '') + '>Ежедневно</option>';
    html += '<option value="weekly"' + (scheduleType === 'weekly' ? ' selected' : '') + '>По дням недели</option>';
    html += '<option value="weekly_target"' + (scheduleType === 'weekly_target' ? ' selected' : '') + '>X раз в неделю</option>';
    html += '</select></div>';
    html += '<div class="form-row" id="row-days"><label>Дни недели (пн–вс)</label><div class="days-row">';
    for (var i = 0; i < 7; i++) {
      var checked = days.indexOf(i) >= 0 ? ' checked' : '';
      html += '<label><input type="checkbox" name="day" value="' + i + '"' + checked + '> ' + ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i] + '</label>';
    }
    html += '</div></div>';
    html += '<div class="form-row" id="row-weekly-target"><label>Цель: раз в неделю</label><input type="number" name="weekly_target" min="1" max="21" value="' + weeklyTarget + '"></div>';
    html += '<div class="form-row" id="row-daily-target"><label>Цель за день</label><input type="number" name="daily_target" min="0" value="' + dailyTarget + '"></div>';
    html += '<div class="form-row" id="row-comparison"><label>Хорошо, когда значение</label><select name="comparison">';
    html += '<option value=">="' + (comparison === '>=' ? ' selected' : '') + '>≥ цели (напр. шаги)</option>';
    html += '<option value="<="' + (comparison === '<=' ? ' selected' : '') + '>≤ цели (напр. калории)</option>';
    html += '</select></div>';
    html += '<div class="form-row" id="row-min-scale"><label>Минимум по шкале для зачёта (1–5)</label><input type="number" name="min_to_count" min="1" max="5" value="' + minToCount + '"></div>';
    if (members.length) {
      html += '<div class="form-row" id="row-by-user"><label>Цели по участникам (общая привычка)</label><div class="by-user-row">';
      members.forEach(m => {
        var uid = m.id;
        var label = m.first_name || m.username || uid;
        var byUser = targetValue.by_user || {};
        var val = byUser[uid] != null ? byUser[uid] : (type === 'times_per_week' ? weeklyTarget : dailyTarget);
        html += '<label style="display:block;margin-bottom:4px">' + escapeHtml(label) + ': <input type="number" name="by_user_' + uid + '" value="' + val + '" style="width:80px;display:inline-block"></label>';
      });
      html += '</div></div>';
    }
    html += '<div class="form-row"><label>XP за выполнение</label><input type="number" name="xp_reward" min="1" value="' + xpReward + '"></div>';
    if (isEdit) {
      html += '<div class="form-row"><label>Цели действуют с даты (необязательно)</label><input type="date" name="goal_effective_from" value="' + (habit.goal_effective_from || '') + '"></div>';
    }
    html += '<div class="form-actions"><button type="button" class="btn btn-secondary" id="habit-form-cancel">Отмена</button><button type="submit" class="btn">' + (isEdit ? 'Сохранить' : 'Создать') + '</button></div>';
    html += '</form></div>';
    return html;
  }

  function bindHabitFormVisibility() {
    var form = document.getElementById('habit-form');
    if (!form) return;
    function updateVisibility() {
      var type = form.querySelector('[name="type"]').value;
      var scheduleType = form.querySelector('[name="schedule_type"]').value;
      var privacy = form.querySelector('[name="privacy"]').value;
      var rowDays = document.getElementById('row-days');
      var rowWeeklyTarget = document.getElementById('row-weekly-target');
      var rowDailyTarget = document.getElementById('row-daily-target');
      var rowComparison = document.getElementById('row-comparison');
      var rowMinScale = document.getElementById('row-min-scale');
      var rowByUser = document.getElementById('row-by-user');
      if (rowDays) rowDays.hidden = scheduleType !== 'weekly';
      if (rowWeeklyTarget) rowWeeklyTarget.hidden = type !== 'times_per_week' && scheduleType !== 'weekly_target';
      if (rowDailyTarget) rowDailyTarget.hidden = type !== 'quantity';
      if (rowComparison) rowComparison.hidden = type !== 'quantity';
      if (rowMinScale) rowMinScale.hidden = type !== 'scale';
      if (rowByUser) rowByUser.hidden = privacy !== 'shared';
    }
    form.querySelectorAll('select, input').forEach(el => { el.addEventListener('change', updateVisibility); });
    updateVisibility();
  }

  function buildHabitPayload(form, members) {
    var type = form.querySelector('[name="type"]').value;
    var scheduleType = form.querySelector('[name="schedule_type"]').value;
    var privacy = form.querySelector('[name="privacy"]').value;
    var scheduleConfig = null;
    if (scheduleType === 'weekly') {
      var days = [];
      form.querySelectorAll('input[name="day"]:checked').forEach(cb => days.push(parseInt(cb.value, 10)));
      scheduleConfig = { days: days.length ? days : [0, 1, 2, 3, 4] };
    } else if (scheduleType === 'weekly_target' || type === 'times_per_week') {
      var wt = parseInt(form.querySelector('[name="weekly_target"]').value, 10) || 5;
      scheduleConfig = { weekly_target: wt };
    }
    var targetValue = {};
    if (type === 'times_per_week') {
      targetValue.weekly_target = parseInt(form.querySelector('[name="weekly_target"]').value, 10) || 5;
    } else if (type === 'quantity') {
      targetValue.daily_target = parseFloat(form.querySelector('[name="daily_target"]').value) || 10000;
      targetValue.comparison = form.querySelector('[name="comparison"]').value || '>=';
    } else if (type === 'scale') {
      targetValue.min_to_count = parseInt(form.querySelector('[name="min_to_count"]').value, 10) || 1;
    }
    if (privacy === 'shared' && members.length) {
      targetValue.by_user = {};
      members.forEach(m => {
        var input = form.querySelector('[name="by_user_' + m.id + '"]');
        if (input) targetValue.by_user[m.id] = parseFloat(input.value) || targetValue.weekly_target || targetValue.daily_target || 0;
      });
    }
    var payload = {
      name: form.querySelector('[name="name"]').value.trim(),
      description: form.querySelector('[name="description"]').value.trim() || null,
      type: type,
      schedule_type: scheduleType,
      schedule_config: scheduleConfig,
      privacy: privacy,
      xp_reward: parseInt(form.querySelector('[name="xp_reward"]').value, 10) || 10,
      target_value: Object.keys(targetValue).length ? targetValue : null
    };
    var goalFrom = form.querySelector('[name="goal_effective_from"]');
    if (goalFrom && goalFrom.value) payload.goal_effective_from = goalFrom.value;
    return payload;
  }

  function bindHabitFormSubmit(habitId, members) {
    var form = document.getElementById('habit-form');
    var cancelBtn = document.getElementById('habit-form-cancel');
    if (!form) return;
    cancelBtn.addEventListener('click', function () { overlay.hidden = true; });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.hidden = true;
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var payload = buildHabitPayload(form, members);
      if (habitId) delete payload.type;
      var p = habitId
        ? API.put('/api/habits/' + habitId, payload)
        : API.post('/api/habits', payload);
      p.then(function () {
        overlay.hidden = true;
        loadHabits();
      }).catch(function (err) {
        var errEl = form.querySelector('.form-error');
        if (errEl) errEl.remove();
        form.insertAdjacentHTML('afterbegin', '<p class="error form-error">' + escapeHtml(err.message) + '</p>');
      });
    });
  }

  function loadBaby() {
    API.get('/api/baby/events')
      .then(events => {
        var html = '<h2 class="page-title">Дневник малыша</h2>';
        if (!events.length) html += '<p>Пока нет записей</p>';
        else events.forEach(e => { html += '<div class="card"><small>' + e.event_type + '</small> ' + escapeHtml(e.content) + '</div>'; });
        content.innerHTML = html;
      })
      .catch(e => { content.innerHTML = '<p class="error">Ошибка загрузки.</p><p class="empty-hint">' + e.message + '</p>'; });
  }

  function loadGamification() {
    API.get('/api/gamification/stats')
      .then(s => {
        content.innerHTML =
          '<h2 class="page-title">Статистика и квест</h2>' +
          '<div class="card"><strong>Уровень ' + s.level + '</strong><br><span style="color:#1a1a1a">XP: ' + s.total_xp + '</span> (до след. уровня: ' + s.xp_for_next_level + ')</div>' +
          (s.family_quest_progress ? '<div class="card"><strong>Квест: ' + escapeHtml(s.family_quest_progress.name) + '</strong><br>Прогресс: ' + s.family_quest_progress.current_xp + ' / ' + s.family_quest_progress.target_xp + ' XP</div>' : '<div class="card">Активный квест подгружается.</div>');
      })
      .catch(e => { content.innerHTML = '<p class="error">Ошибка загрузки. Откройте из Telegram.</p><p class="empty-hint">' + e.message + '</p>'; });
  }

  function loadFamily() {
    API.get('/api/users/family')
      .then(members => {
        var html = '<h2 class="page-title">Семья</h2>';
        if (!members.length) html += '<p>Нет участников</p>';
        else members.forEach(m => { html += '<div class="card">' + escapeHtml(m.first_name || m.username || m.telegram_id) + ' — ур. ' + m.level + '</div>'; });
        content.innerHTML = html;
      })
      .catch(e => { content.innerHTML = '<p class="error">Ошибка загрузки.</p><p class="empty-hint">' + e.message + '</p>'; });
  }

  function loadSettings() {
    content.innerHTML = '<h2 class="page-title">Настройки</h2><div class="card">Backend: ' + (window.BACKEND_URL || 'не задан') + '</div>';
  }

  nav.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-page]');
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
