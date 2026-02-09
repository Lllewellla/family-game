/** Personal habits page management */
const Personal = {
    async loadPersonalHabits() {
        // #region agent log
        const logData1 = {location:'personal.js:3',message:'loadPersonalHabits entry',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'D'};
        console.log('[DEBUG]', logData1);
        // #endregion
        try {
            const habits = await API.getPersonalHabits();
            // #region agent log
            const logData2 = {location:'personal.js:6',message:'getPersonalHabits response',data:{habitsCount:habits?.length||0},timestamp:Date.now(),runId:'run1',hypothesisId:'D'};
            console.log('[DEBUG]', logData2);
            // #endregion
            this.renderPersonalHabits(habits);
        } catch (error) {
            if (App.addDebugLog) App.addDebugLog('ERROR', 'loadPersonalHabits failed', { message: error?.message });
            console.error('Failed to load personal habits:', error);
            App.showError('Не удалось загрузить привычки');
        }
    },
    
    async renderPersonalHabits(habits) {
        // #region agent log
        const logData1 = {location:'personal.js:14',message:'renderPersonalHabits entry',data:{habitsCount:habits?.length||0},timestamp:Date.now(),runId:'run1',hypothesisId:'E'};
        console.log('[DEBUG]', logData1);
        // #endregion
        const container = document.getElementById('personal-habits-list');
        // #region agent log
        const logData2 = {location:'personal.js:16',message:'container check',data:{containerExists:!!container,containerId:'personal-habits-list'},timestamp:Date.now(),runId:'run1',hypothesisId:'E'};
        console.log('[DEBUG]', logData2);
        if (!container) {
            App.addDebugLog('ERROR', 'Container personal-habits-list not found!');
        } else {
            App.addDebugLog('INFO', 'Container personal-habits-list found');
        }
        // #endregion
        if (!container) return;
        
        if (habits.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">Нет привычек</p>';
            return;
        }
        
        // Load logs for each habit to show progress
        const habitsWithProgress = await Promise.all(
            habits.map(async habit => {
                const startDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                const endDate = new Date().toISOString().split('T')[0];
                const logs = await API.getHabitLogs(habit.id, startDate, endDate);
                return { habit, logs };
            })
        );
        
        container.innerHTML = habitsWithProgress.map(({ habit, logs }) => 
            this.renderPersonalHabit(habit, logs)
        ).join('');
        
        // Attach event listeners
        habits.forEach(habit => {
            Habits.attachHabitListeners(habit);
        });
    },
    
    renderPersonalHabit(habit, logs) {
        const progressHtml = Habits.renderHabitProgress(habit, logs);
        
        return `
            <div class="habit-item bg-gray-50 rounded-xl p-4" data-habit-id="${habit.id}">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-semibold text-gray-800">${Habits.escapeHtml(habit.name)}</h3>
                    <span class="text-sm text-gray-600">+${habit.xp_reward} XP</span>
                </div>
                ${progressHtml}
                <div class="habit-control mt-3" data-habit-type="${habit.type}">
                    ${Habits.renderHabitControl(habit)}
                </div>
            </div>
        `;
    }
};
