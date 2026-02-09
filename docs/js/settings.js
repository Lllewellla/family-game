/** Settings page */
const Settings = {
    async loadSettings() {
        await this.loadStats();
        await this.loadAllHabits();
    },
    
    async loadStats() {
        try {
            const stats = await API.getStats();
            Gamification.renderStats(stats);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    },
    
    async loadAllHabits() {
        try {
            const habits = await API.getHabits();
            this.renderAllHabits(habits);
        } catch (error) {
            console.error('Failed to load habits:', error);
        }
    },
    
    renderAllHabits(habits) {
        const container = document.getElementById('all-habits-list');
        if (!container) return;
        
        if (habits.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">Нет привычек</p>';
            return;
        }
        
        container.innerHTML = habits.map(habit => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex-1">
                    <h4 class="font-semibold text-gray-800">${this.escapeHtml(habit.name)}</h4>
                    <p class="text-xs text-gray-600">${this.getHabitTypeLabel(habit.type)} • ${this.getPrivacyLabel(habit.privacy)}</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" class="sr-only peer" ${habit.is_active ? 'checked' : ''} 
                           onchange="Settings.toggleHabit('${habit.id}', this.checked)">
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
            </div>
        `).join('');
    },
    
    async toggleHabit(habitId, isActive) {
        try {
            await API.updateHabit(habitId, { is_active: isActive });
        } catch (error) {
            console.error('Failed to toggle habit:', error);
            App.showError('Не удалось изменить статус привычки');
        }
    },
    
    async exportDiary() {
        try {
            App.showLoading();
            
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30); // Last 30 days
            const startDateStr = startDate.toISOString().split('T')[0];
            
            await API.exportDiary(startDateStr, endDate);
            
            App.showSuccess('Дневник экспортирован!');
        } catch (error) {
            console.error('Failed to export diary:', error);
            App.showError('Не удалось экспортировать дневник');
        } finally {
            App.hideLoading();
        }
    },
    
    getHabitTypeLabel(type) {
        const labels = {
            boolean: 'Да/Нет',
            scale: 'Шкала 1-5',
            quantity: 'Количество',
            checklist: 'Чек-лист'
        };
        return labels[type] || type;
    },
    
    getPrivacyLabel(privacy) {
        const labels = {
            personal: 'Личная',
            public: 'Публичная',
            shared: 'Общая'
        };
        return labels[privacy] || privacy;
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Setup export button
document.addEventListener('DOMContentLoaded', () => {
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => Settings.exportDiary());
    }
});
