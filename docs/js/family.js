/** Family page management */
const Family = {
    async loadFamilyPage() {
        await Promise.all([
            this.loadFamilySharedHabits(),
            this.loadFamilyBabyNews(),
            this.loadFamilyPublicHabits()
        ]);
    },
    
    async loadFamilySharedHabits() {
        try {
            const habits = await API.getSharedHabits();
            const members = await API.getFamilyMembers();
            this.renderFamilySharedHabits(habits, members);
        } catch (error) {
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
            
            this.renderFamilyPublicHabits(dadHabits, mom ? mom.first_name || mom.username : 'Мама', 'family-dad-public-habits');
            this.renderFamilyPublicHabits(momHabits, mom ? mom.first_name || mom.username : 'Мама', 'family-mom-public-habits');
        } catch (error) {
            console.error('Failed to load public habits:', error);
            App.showError('Не удалось загрузить публичные привычки');
        }
    },
    
    renderFamilySharedHabits(habits, members) {
        const container = document.getElementById('family-shared-habits');
        if (!container) return;
        
        if (habits.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">Нет общих привычек</p>';
            return;
        }
        
        container.innerHTML = habits.map(habit => 
            this.renderFamilySharedHabit(habit, members)
        ).join('');
        
        // Attach event listeners
        habits.forEach(habit => {
            Habits.attachHabitListeners(habit);
        });
    },
    
    renderFamilySharedHabit(habit, members) {
        // Get completion status for each adult member
        const adultMembers = members.filter(m => {
            const name = (m.first_name || m.username || '').toLowerCase();
            return name.includes('егор') || name.includes('ирина');
        });
        
        const membersStatus = adultMembers.map(member => {
            // TODO: Check if member completed habit today
            return { member, completed: false };
        });
        
        return `
            <div class="habit-item bg-gray-50 rounded-xl p-4" data-habit-id="${habit.id}">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-semibold text-gray-800">${Habits.escapeHtml(habit.name)}</h3>
                    <span class="text-sm text-gray-600">+${habit.xp_reward} XP</span>
                </div>
                <div class="flex items-center space-x-2 mb-2">
                    ${membersStatus.map(({ member, completed }) => `
                        <div class="flex items-center space-x-1">
                            <div class="w-6 h-6 rounded-full ${completed ? 'bg-green-500' : 'bg-gray-300'}"></div>
                            <span class="text-xs text-gray-600">${Habits.escapeHtml(member.first_name || member.username || '')}</span>
                        </div>
                    `).join('')}
                </div>
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
    
    renderFamilyPublicHabits(habits, userName, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (habits.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm text-center py-2">Нет публичных привычек</p>';
            return;
        }
        
        container.innerHTML = habits.map(habit => 
            Habits.renderHabitItem(habit)
        ).join('');
        
        // Attach event listeners
        habits.forEach(habit => {
            Habits.attachHabitListeners(habit);
        });
    }
};
