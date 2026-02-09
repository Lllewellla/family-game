/** Family page management */
const Family = {
    async loadFamilyPage() {
        // #region agent log
        const logData = {location:'family.js:3',message:'loadFamilyPage entry',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'B'};
        console.log('[DEBUG]', logData);
        fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
        // #endregion
        await Promise.all([
            this.loadFamilySharedHabits(),
            this.loadFamilyBabyNews(),
            this.loadFamilyPublicHabits()
        ]);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'family.js:9',message:'loadFamilyPage completed',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
    },
    
    async loadFamilySharedHabits() {
        // #region agent log
        const logData1 = {location:'family.js:12',message:'loadFamilySharedHabits entry',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'B'};
        console.log('[DEBUG]', logData1);
        App.addDebugLog('INFO', 'loadFamilySharedHabits: starting');
        fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData1)}).catch(()=>{});
        // #endregion
        try {
            const habits = await API.getSharedHabits();
            // #region agent log
            const logData2 = {location:'family.js:15',message:'getSharedHabits response',data:{habitsCount:habits?.length||0,habits:habits},timestamp:Date.now(),runId:'run1',hypothesisId:'B'};
            console.log('[DEBUG]', logData2);
            App.addDebugLog('INFO', `getSharedHabits: received ${habits?.length || 0} habits`);
            fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData2)}).catch(()=>{});
            // #endregion
            const members = await API.getFamilyMembers();
            // #region agent log
            const logData3 = {location:'family.js:17',message:'getFamilyMembers response',data:{membersCount:members?.length||0},timestamp:Date.now(),runId:'run1',hypothesisId:'B'};
            console.log('[DEBUG]', logData3);
            App.addDebugLog('INFO', `getFamilyMembers: received ${members?.length || 0} members`);
            fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData3)}).catch(()=>{});
            // #endregion
            this.renderFamilySharedHabits(habits, members);
        } catch (error) {
            // #region agent log
            const logData4 = {location:'family.js:19',message:'loadFamilySharedHabits error',data:{error:error?.message,errorStack:error?.stack},timestamp:Date.now(),runId:'run1',hypothesisId:'B'};
            console.error('[DEBUG ERROR]', logData4);
            App.addDebugLog('ERROR', `loadFamilySharedHabits failed: ${error?.message}`, {error: error?.message});
            fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData4)}).catch(()=>{});
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
            
            this.renderFamilyPublicHabits(dadHabits, mom ? mom.first_name || mom.username : 'Мама', 'family-dad-public-habits');
            this.renderFamilyPublicHabits(momHabits, mom ? mom.first_name || mom.username : 'Мама', 'family-mom-public-habits');
        } catch (error) {
            console.error('Failed to load public habits:', error);
            App.showError('Не удалось загрузить публичные привычки');
        }
    },
    
    renderFamilySharedHabits(habits, members) {
        // #region agent log
        const logData1 = {location:'family.js:67',message:'renderFamilySharedHabits entry',data:{habitsCount:habits?.length||0,membersCount:members?.length||0},timestamp:Date.now(),runId:'run1',hypothesisId:'C'};
        console.log('[DEBUG]', logData1);
        fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData1)}).catch(()=>{});
        // #endregion
        const container = document.getElementById('family-shared-habits');
        // #region agent log
        const logData2 = {location:'family.js:69',message:'container check',data:{containerExists:!!container,containerId:'family-shared-habits'},timestamp:Date.now(),runId:'run1',hypothesisId:'C'};
        console.log('[DEBUG]', logData2);
        if (!container) {
            App.addDebugLog('ERROR', 'Container family-shared-habits not found!');
        } else {
            App.addDebugLog('INFO', 'Container family-shared-habits found');
        }
        fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData2)}).catch(()=>{});
        // #endregion
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
