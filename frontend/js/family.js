/** Family page management */
const Family = {
    async loadFamilyPage() {
        // #region agent log
        const logData = {location:'family.js:3',message:'loadFamilyPage entry',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'B'};
        console.log('[DEBUG]', logData);
        // #endregion
        await Promise.all([
            this.loadFamilySharedHabits(),
            this.loadFamilyBabyNews(),
            this.loadFamilyPublicHabits()
        ]);
        // #region agent log
        // #endregion
    },
    
    async loadFamilySharedHabits() {
        try {
            App.addDebugLog('INFO', 'loadFamilySharedHabits: starting');
            const habits = await API.getSharedHabits();
            App.addDebugLog('INFO', `getSharedHabits: received ${habits?.length || 0} habits`);
            const members = await API.getFamilyMembers();
            App.addDebugLog('INFO', `getFamilyMembers: received ${members?.length || 0} members`);
            const startDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const endDate = new Date().toISOString().split('T')[0];
            const habitsWithLogs = await Promise.all(
                habits.map(async habit => {
                    const logs = await API.getHabitLogs(habit.id, startDate, endDate);
                    return { habit, logs };
                })
            );
            this.renderFamilySharedHabits(habitsWithLogs, members);
        } catch (error) {
            // #region agent log
            const logData4 = {location:'family.js:19',message:'loadFamilySharedHabits error',data:{error:error?.message,errorStack:error?.stack},timestamp:Date.now(),runId:'run1',hypothesisId:'B'};
            console.error('[DEBUG ERROR]', logData4);
            App.addDebugLog('ERROR', `loadFamilySharedHabits failed: ${error?.message}`, {error: error?.message});
            // #endregion
            console.error('Failed to load shared habits:', error);
            App.showError('Не удалось загрузить общие привычки');
        }
    },
    
    async loadFamilyBabyNews() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const events = await API.getBabyEvents(weekAgo, today);
            // Get last 10 events
            const recentEvents = events.slice(0, 10);
            this.renderFamilyBabyNews(recentEvents);
        } catch (error) {
            console.error('Failed to load baby news:', error);
            App.showError('Не удалось загрузить новости');
        }
    },
    
    async loadFamilyPublicHabits() {
        try {
            const members = await API.getFamilyMembers();
            // Find dad (Егор) and mom (Ирина)
            const dad = members.find(m => 
                (m.first_name && m.first_name.toLowerCase().includes('егор')) ||
                (m.username && m.username.toLowerCase().includes('егор'))
            );
            const mom = members.find(m => 
                (m.first_name && m.first_name.toLowerCase().includes('ирина')) ||
                (m.username && m.username.toLowerCase().includes('ирина'))
            );
            
            const [dadHabits, momHabits] = await Promise.all([
                dad ? API.getPublicHabits(dad.id) : Promise.resolve([]),
                mom ? API.getPublicHabits(mom.id) : Promise.resolve([])
            ]);
            await this.renderFamilyPublicHabitsWithProgress(dadHabits, 'family-dad-public-habits');
            await this.renderFamilyPublicHabitsWithProgress(momHabits, 'family-mom-public-habits');
        } catch (error) {
            console.error('Failed to load public habits:', error);
            App.showError('Не удалось загрузить публичные привычки');
        }
    },
    
    renderFamilySharedHabits(habitsWithLogs, members) {
        const container = document.getElementById('family-shared-habits');
        if (!container) return;
        if (habitsWithLogs.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">Нет общих привычек</p>';
            return;
        }
        container.innerHTML = habitsWithLogs.map(({ habit, logs }) =>
            this.renderFamilySharedHabit(habit, logs, members)
        ).join('');
        habitsWithLogs.forEach(({ habit }) => Habits.attachHabitListeners(habit));
    },

    renderFamilySharedHabit(habit, logs, members) {
        const today = new Date().toISOString().split('T')[0];
        const logsByUser = {};
        (logs || []).forEach(log => {
            const uid = log.user_id;
            if (!logsByUser[uid]) logsByUser[uid] = [];
            logsByUser[uid].push(log);
        });
        const adultMembers = members.filter(m => {
            const name = (m.first_name || m.username || '').toLowerCase();
            return name.includes('егор') || name.includes('ирина');
        });
        const membersStatus = adultMembers.map(member => {
            const memberLogs = logsByUser[member.id] || [];
            const completed = memberLogs.some(l => l.date === today);
            return { member, completed, logs: memberLogs };
        });
        const familyBonus = adultMembers.length > 0 && adultMembers.every(m => {
            const memberLogs = logsByUser[m.id] || [];
            return memberLogs.some(l => l.date === today);
        });
        const momDadLines = membersStatus.map(({ member, logs: memberLogs }) => {
            const progressHtml = Habits.renderHabitProgress(habit, memberLogs);
            const name = Habits.escapeHtml(member.first_name || member.username || '');
            return `<div class="mb-2"><span class="text-xs font-medium text-gray-600">${name}:</span> <div class="inline-block mt-1">${progressHtml}</div></div>`;
        }).join('');
        const habitId = typeof habit.id === 'string' ? habit.id : habit.id;
        return `
            <div class="habit-item bg-gray-50 rounded-xl p-4" data-habit-id="${habitId}">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <h3 class="font-semibold text-gray-800">${Habits.escapeHtml(habit.name)}</h3>
                        <span class="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700">Общая</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-sm text-gray-600">+${habit.xp_reward} XP</span>
                        <button type="button" class="p-1 text-gray-500 hover:text-blue-600 rounded" onclick="Settings.editHabit('${habitId}')" title="Редактировать">&#9998;</button>
                    </div>
                </div>
                <div class="flex items-center gap-2 mb-2 flex-wrap">
                    ${membersStatus.map(({ member, completed }) => `
                        <div class="flex items-center space-x-1">
                            <div class="habit-progress-dot ${completed ? 'completed' : 'empty'}" style="width:18px;height:18px;min-width:18px;" title="${completed ? 'Выполнено сегодня' : 'Не выполнено'}"></div>
                            <span class="text-xs text-gray-600">${Habits.escapeHtml(member.first_name || member.username || '')}</span>
                        </div>
                    `).join('')}
                    ${familyBonus ? '<span class="text-amber-500" title="Семейный бонус получен">⭐</span>' : ''}
                </div>
                <div class="mb-2">${momDadLines}</div>
                <div class="habit-control" data-habit-type="${habit.type}">
                    ${Habits.renderHabitControl(habit)}
                </div>
            </div>
        `;
    },
    
    renderFamilyBabyNews(events) {
        const container = document.getElementById('family-baby-news');
        if (!container) return;
        
        if (events.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">Нет новостей за последнюю неделю</p>';
            return;
        }
        
        container.innerHTML = events.map(event => Baby.renderEventCard(event)).join('');
    },
    
    async renderFamilyPublicHabitsWithProgress(habits, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (habits.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm text-center py-2">Нет публичных привычек</p>';
            return;
        }
        const startDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = new Date().toISOString().split('T')[0];
        const habitsWithLogs = await Promise.all(
            habits.map(async habit => {
                const logs = await API.getHabitLogs(habit.id, startDate, endDate);
                return { habit, logs };
            })
        );
        container.innerHTML = habitsWithLogs.map(({ habit, logs }) =>
            Habits.renderHabitCardWithProgress(habit, logs)
        ).join('');
        habitsWithLogs.forEach(({ habit }) => Habits.attachHabitListeners(habit));
    }
};
