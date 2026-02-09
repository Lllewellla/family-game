/** Settings page */
const Settings = {
    async loadSettings() {
        // Initialize settings content in modal
        const settingsContent = document.getElementById('settings-content');
        if (!settingsContent) {
            App.addDebugLog('ERROR', 'settings-content container not found!');
            return;
        }
        
        // Clear and rebuild settings content
        settingsContent.innerHTML = `
            <div class="bg-white rounded-xl p-4 shadow-sm mb-4">
                <h2 class="text-lg font-semibold mb-4 text-gray-800">Статистика</h2>
                <div id="user-stats" class="space-y-2">
                    <!-- Stats will be loaded here -->
                </div>
            </div>
            <div class="bg-white rounded-xl p-4 shadow-sm mb-4">
                <h2 class="text-lg font-semibold mb-4 text-gray-800">Экспорт</h2>
                <button id="export-btn" class="w-full py-3 btn-gradient text-white font-semibold">
                    📥 Скачать дневник
                </button>
            </div>
        `;
        
        // Re-attach export button handler
        document.getElementById('export-btn')?.addEventListener('click', () => {
            API.exportBabyDiary();
        });
        
        await this.loadStats();
        await this.loadAllHabits();
    },
    
    async loadStats() {
        try {
            const stats = await API.getStats();
            Gamification.renderStats(stats);
        } catch (error) {
            console.error('Failed to load stats:', error);
            App.addDebugLog('ERROR', `Failed to load stats: ${error?.message}`);
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
        // Settings content is now in modal
        const settingsContent = document.getElementById('settings-content');
        if (!settingsContent) {
            App.addDebugLog('ERROR', 'settings-content container not found!');
            return;
        }
        
        // Create or find all-habits-list inside settings-content
        let container = document.getElementById('all-habits-list');
        if (!container) {
            // Create the container if it doesn't exist
            const habitsSection = document.createElement('div');
            habitsSection.className = 'bg-white rounded-xl p-4 shadow-sm mb-4';
            habitsSection.innerHTML = `
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-semibold text-gray-800">Все привычки</h2>
                    <button id="add-habit-btn" class="px-4 py-2 btn-gradient text-white font-semibold text-sm">+ Добавить</button>
                </div>
                <div id="all-habits-list" class="space-y-3"></div>
            `;
            settingsContent.appendChild(habitsSection);
            container = document.getElementById('all-habits-list');
        }
        
        if (!container) {
            App.addDebugLog('ERROR', 'Failed to create all-habits-list container');
            return;
        }
        
        if (habits.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">Нет привычек</p>';
            return;
        }
        
        container.innerHTML = habits.map(habit => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex-1">
                    <h4 class="font-semibold text-gray-800">${this.escapeHtml(habit.name)}</h4>
                    <p class="text-xs text-gray-600">${this.getHabitTypeLabel(habit.type)} • ${this.getPrivacyLabel(habit.privacy)} • +${habit.xp_reward} XP</p>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="Settings.editHabit('${habit.id}')" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Редактировать">
                        ✏️
                    </button>
                    <button onclick="Settings.deleteHabit('${habit.id}')" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Удалить">
                        🗑️
                    </button>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" class="sr-only peer" ${habit.is_active ? 'checked' : ''} 
                               onchange="Settings.toggleHabit('${habit.id}', this.checked)">
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                </div>
            </div>
        `).join('');
    },
    
    async toggleHabit(habitId, isActive) {
        try {
            await API.updateHabit(habitId, { is_active: isActive });
            App.showSuccess('Статус привычки обновлен');
        } catch (error) {
            console.error('Failed to toggle habit:', error);
            App.showError(error.message || 'Не удалось изменить статус привычки');
        }
    },
    
    openHabitModal(habit = null) {
        const modal = document.getElementById('habit-modal');
        const title = document.getElementById('habit-modal-title');
        const form = document.getElementById('habit-form');
        const habitId = document.getElementById('habit-id');
        const habitName = document.getElementById('habit-name');
        const habitType = document.getElementById('habit-type');
        const habitSchedule = document.getElementById('habit-schedule');
        const habitPrivacy = document.getElementById('habit-privacy');
        const habitXp = document.getElementById('habit-xp');
        
        if (habit) {
            // Edit mode
            title.textContent = 'Редактировать привычку';
            habitId.value = habit.id;
            habitName.value = habit.name;
            habitType.value = habit.type;
            habitSchedule.value = habit.schedule_type;
            habitPrivacy.value = habit.privacy;
            habitXp.value = habit.xp_reward;
        } else {
            // Create mode
            title.textContent = 'Добавить привычку';
            form.reset();
            habitId.value = '';
            habitXp.value = '10';
        }
        
        modal.classList.remove('hidden');
    },
    
    closeHabitModal() {
        const modal = document.getElementById('habit-modal');
        modal.classList.add('hidden');
        document.getElementById('habit-form').reset();
    },
    
    async saveHabit() {
        const habitId = document.getElementById('habit-id').value;
        const habitData = {
            name: document.getElementById('habit-name').value.trim(),
            type: document.getElementById('habit-type').value,
            schedule_type: document.getElementById('habit-schedule').value,
            privacy: document.getElementById('habit-privacy').value,
            xp_reward: parseInt(document.getElementById('habit-xp').value)
        };
        
        if (!habitData.name) {
            App.showError('Пожалуйста, введите название привычки');
            return;
        }
        
        try {
            App.showLoading();
            
            if (habitId) {
                // Update existing habit
                await API.updateHabit(habitId, habitData);
                App.showSuccess('Привычка обновлена!');
            } else {
                // Create new habit
                await API.createHabit(habitData);
                App.showSuccess('Привычка создана!');
            }
            
            this.closeHabitModal();
            await this.loadAllHabits();
            
            // Reload today's habits if on dashboard
            if (App.currentTab === 'dashboard') {
                await Habits.loadTodayHabits();
            }
        } catch (error) {
            console.error('Failed to save habit:', error);
            App.showError(error.message || 'Не удалось сохранить привычку');
        } finally {
            App.hideLoading();
        }
    },
    
    async editHabit(habitId) {
        try {
            const habits = await API.getHabits();
            const habit = habits.find(h => h.id === habitId);
            if (habit) {
                this.openHabitModal(habit);
            }
        } catch (error) {
            console.error('Failed to load habit:', error);
            App.showError('Не удалось загрузить привычку');
        }
    },
    
    async deleteHabit(habitId) {
        if (!confirm('Вы уверены, что хотите удалить эту привычку?')) {
            return;
        }
        
        try {
            App.showLoading();
            await API.deleteHabit(habitId);
            App.showSuccess('Привычка удалена!');
            await this.loadAllHabits();
            
            // Reload today's habits if on dashboard
            if (App.currentTab === 'dashboard') {
                await Habits.loadTodayHabits();
            }
        } catch (error) {
            console.error('Failed to delete habit:', error);
            App.showError(error.message || 'Не удалось удалить привычку');
        } finally {
            App.hideLoading();
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

// Setup event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => Settings.exportDiary());
    }
    
    // Add habit button
    const addHabitBtn = document.getElementById('add-habit-btn');
    if (addHabitBtn) {
        addHabitBtn.addEventListener('click', () => Settings.openHabitModal());
    }
    
    // Habit modal
    const habitModal = document.getElementById('habit-modal');
    const cancelHabitBtn = document.getElementById('cancel-habit-btn');
    const habitForm = document.getElementById('habit-form');
    
    if (cancelHabitBtn) {
        cancelHabitBtn.addEventListener('click', () => Settings.closeHabitModal());
    }
    
    if (habitForm) {
        habitForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await Settings.saveHabit();
        });
    }
    
    // Close modal on background click
    if (habitModal) {
        habitModal.addEventListener('click', (e) => {
            if (e.target === habitModal) {
                Settings.closeHabitModal();
            }
        });
    }
});
