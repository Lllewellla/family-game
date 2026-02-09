/** Habits management */
const Habits = {
    async loadTodayHabits() {
        try {
            const habits = await API.getTodayHabits();
            // Проверяем, что habits определен перед использованием
            if (habits === undefined || habits === null) {
                console.error('Habits is undefined or null');
                App.showError('Не удалось загрузить привычки');
                return;
            }
            this.renderHabits(habits);
        } catch (error) {
            if (App.addDebugLog) App.addDebugLog('ERROR', 'loadTodayHabits failed', { message: error?.message });
            console.error('Failed to load habits:', error);
            App.showError('Не удалось загрузить привычки');
        }
    },
    
    renderHabits(habits) {
        const container = document.getElementById('habits-list');
        if (!container) return;
        
        // Проверяем, что habits определен и является массивом
        if (!habits || !Array.isArray(habits)) {
            console.error('Habits is not defined or not an array:', habits);
            container.innerHTML = '<p class="text-gray-500 text-center py-8">Ошибка загрузки привычек</p>';
            return;
        }
        
        if (habits.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">Нет привычек на сегодня</p>';
            return;
        }
        
        container.innerHTML = habits.map(habit => this.renderHabitItem(habit)).join('');
        
        // Attach event listeners
        habits.forEach(habit => {
            this.attachHabitListeners(habit);
        });
    },
    
    renderHabitItem(habit) {
        const isCompleted = false; // TODO: Check if completed today
        
        return `
            <div class="habit-item bg-gray-50 rounded-xl p-4 ${isCompleted ? 'opacity-60' : ''}" data-habit-id="${habit.id}">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-800 mb-1">${this.escapeHtml(habit.name)}</h3>
                        <p class="text-sm text-gray-600">+${habit.xp_reward} XP</p>
                    </div>
                    <div class="habit-control" data-habit-type="${habit.type}">
                        ${this.renderHabitControl(habit)}
                    </div>
                </div>
            </div>
        `;
    },
    
    renderHabitControl(habit) {
        switch (habit.type) {
            case 'boolean':
                return `
                    <button class="complete-btn w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center text-2xl hover:bg-green-100 transition-colors">
                        ✓
                    </button>
                `;
            case 'scale':
                return `
                    <div class="flex items-center space-x-2">
                        <input type="range" min="1" max="5" value="3" class="scale-input w-24">
                        <span class="scale-value text-lg font-semibold text-orange-600 w-8 text-center">3</span>
                    </div>
                `;
            case 'quantity':
                return `
                    <div class="flex items-center space-x-2">
                        <button class="quantity-btn minus w-10 h-10 rounded-full bg-gray-200 text-xl">-</button>
                        <span class="quantity-value text-lg font-semibold text-orange-600 w-12 text-center">0</span>
                        <button class="quantity-btn plus w-10 h-10 rounded-full bg-gray-200 text-xl">+</button>
                    </div>
                `;
            case 'checklist':
                return `
                    <button class="checklist-btn px-4 py-2 btn-gradient text-white font-semibold">
                        Открыть
                    </button>
                `;
            default:
                return '';
        }
    },
    
    attachHabitListeners(habit) {
        const item = document.querySelector(`[data-habit-id="${habit.id}"]`);
        if (!item) return;
        
        const control = item.querySelector('.habit-control');
        
        switch (habit.type) {
            case 'boolean':
                const completeBtn = control.querySelector('.complete-btn');
                if (completeBtn) {
                    completeBtn.addEventListener('click', () => this.completeHabit(habit.id));
                }
                break;
            case 'scale':
                const scaleInput = control.querySelector('.scale-input');
                const scaleValue = control.querySelector('.scale-value');
                if (scaleInput && scaleValue) {
                    scaleInput.addEventListener('input', (e) => {
                        scaleValue.textContent = e.target.value;
                    });
                    scaleInput.addEventListener('change', () => {
                        this.completeHabit(habit.id, { value: parseInt(scaleInput.value) });
                    });
                }
                break;
            case 'quantity':
                const minusBtn = control.querySelector('.minus');
                const plusBtn = control.querySelector('.plus');
                const quantityValue = control.querySelector('.quantity-value');
                if (minusBtn && plusBtn && quantityValue) {
                    let value = 0;
                    minusBtn.addEventListener('click', () => {
                        if (value > 0) {
                            value--;
                            quantityValue.textContent = value;
                            this.completeHabit(habit.id, { value });
                        }
                    });
                    plusBtn.addEventListener('click', () => {
                        value++;
                        quantityValue.textContent = value;
                        this.completeHabit(habit.id, { value });
                    });
                }
                break;
        }
    },
    
    async completeHabit(habitId, value = null) {
        try {
            App.showLoading();
            const result = await API.completeHabit(habitId, value);
            
            // Show XP gain animation
            if (result.xp_earned) {
                Gamification.showXPGain(result.xp_earned);
            }
            
            // Show family XP notification if awarded
            if (result.family_xp_awarded && result.family_xp_amount) {
                setTimeout(() => {
                    Gamification.showXPGain(result.family_xp_amount, 'Семья получила');
                }, 500);
                App.showSuccess(`+${result.xp_earned} XP! Семья получила +${result.family_xp_amount} XP!`);
            } else {
                App.showSuccess(`+${result.xp_earned} XP!`);
            }
            
            // Reload habits and stats
            await this.loadTodayHabits();
            await Gamification.loadStats();
            await Gamification.loadFamilyStats();
        } catch (error) {
            console.error('Failed to complete habit:', error);
            App.showError('Не удалось отметить привычку');
        } finally {
            App.hideLoading();
        }
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    renderHabitProgress(habit, logs) {
        if (!logs || logs.length === 0) {
            return '<div class="text-sm text-gray-500">Нет данных</div>';
        }
        
        switch (habit.type) {
            case 'boolean':
                return this.renderBooleanProgress(logs);
            case 'quantity':
                return this.renderQuantityProgress(habit, logs);
            case 'checklist':
                // For weekly target habits
                if (habit.schedule_type === 'weekly') {
                    return this.renderWeeklyProgress(habit, logs);
                }
                return this.renderBooleanProgress(logs);
            default:
                return '';
        }
    },
    
    renderBooleanProgress(logs) {
        // Get last 7 days: 3 past, today, 3 future
        const today = new Date();
        const days = [];
        for (let i = -3; i <= 3; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            days.push(date.toISOString().split('T')[0]);
        }
        
        const logsByDate = {};
        logs.forEach(log => {
            logsByDate[log.date] = log;
        });
        
        const circles = days.map((date, index) => {
            const isToday = index === 3;
            const isFuture = index > 3;
            const log = logsByDate[date];
            const completed = !!log;
            
            if (isFuture) {
                return `<div class="w-8 h-8 rounded-full border-2 border-gray-200 bg-white"></div>`;
            }
            
            return `<div class="w-8 h-8 rounded-full ${completed ? 'bg-green-500' : 'bg-gray-200'} ${isToday ? 'ring-2 ring-orange-500' : ''}" title="${date}"></div>`;
        });
        
        return `<div class="flex items-center space-x-2">${circles.join('')}</div>`;
    },
    
    renderQuantityProgress(habit, logs) {
        const today = new Date().toISOString().split('T')[0];
        const todayLog = logs.find(log => log.date === today);
        const currentValue = todayLog && todayLog.value ? (todayLog.value.value || todayLog.value.quantity || 0) : 0;
        
        const targetValue = habit.target_value ? (habit.target_value.target || habit.target_value) : null;
        
        if (targetValue === null) {
            return `<div class="text-2xl font-bold text-orange-600">${currentValue}</div>`;
        }
        
        const isExceeded = currentValue > targetValue;
        const isGood = currentValue >= targetValue * 0.9; // 90% of target
        
        return `
            <div class="flex items-baseline space-x-2">
                <span class="text-2xl font-bold ${isExceeded ? 'text-red-600' : isGood ? 'text-green-600' : 'text-orange-600'}">${currentValue}</span>
                <span class="text-sm text-gray-500">/ ${targetValue}</span>
            </div>
        `;
    },
    
    renderWeeklyProgress(habit, logs) {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        
        const weekLogs = logs.filter(log => {
            const logDate = new Date(log.date);
            return logDate >= weekStart && logDate <= today;
        });
        
        const completedCount = weekLogs.length;
        const targetValue = habit.target_value ? (habit.target_value.target || habit.target_value) : 7;
        const percentage = Math.min((completedCount / targetValue) * 100, 100);
        
        return `
            <div class="space-y-1">
                <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Прогресс</span>
                    <span class="font-semibold ${completedCount >= targetValue ? 'text-green-600' : 'text-gray-600'}">${completedCount}/${targetValue}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-gradient-default h-2 rounded-full transition-all" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }
};
