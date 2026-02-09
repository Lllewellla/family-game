/** Personal habits page management */
const Personal = {
    async loadPersonalHabits() {
        try {
            const habits = await API.getPersonalHabits();
            this.renderPersonalHabits(habits);
        } catch (error) {
            console.error('Failed to load personal habits:', error);
            App.showError('Не удалось загрузить привычки');
        }
    },
    
    async renderPersonalHabits(habits) {
        const container = document.getElementById('personal-habits-list');
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
