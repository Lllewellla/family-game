/** API client for FamilyQuest */
const API = {
    baseURL: window.BACKEND_URL || 'https://your-app.railway.app',
    
    async request(endpoint, options = {}) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:5',message:'API request entry',data:{endpoint,hasTelegram:!!window.Telegram?.WebApp,hasInitData:!!window.Telegram?.WebApp?.initData},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        const initData = window.Telegram?.WebApp?.initData || '';
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:10',message:'Before fetch',data:{endpoint,initDataLength:initData.length,initDataEmpty:!initData},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        const headers = {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': initData,
            ...options.headers
        };
        
        const url = `${this.baseURL}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:25',message:'After fetch',data:{endpoint,status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
                }
                const errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}`;
                
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:35',message:'API error',data:{endpoint,status:response.status,errorMessage,errorData},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                
                throw new Error(errorMessage);
            }
            
            const result = await response.json();
            
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:42',message:'API request success',data:{endpoint,hasResult:!!result},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
            return result;
        } catch (error) {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:47',message:'API request catch',data:{endpoint,errorMessage:error.message,errorName:error.name},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            
            console.error('API request failed:', error);
            throw error;
        }
    },
    
    // Auth
    async verifyAuth(initData) {
        return this.request('/api/auth/verify', {
            method: 'POST',
            body: JSON.stringify({ init_data: initData })
        });
    },
    
    async getCurrentUser() {
        return this.request('/api/users/me');
    },
    
    async getFamilyMembers() {
        return this.request('/api/users/family');
    },
    
    async inviteUserToFamily(telegramId=null, username=null) {
        const data = {}
        if (telegramId) data.telegram_id = telegramId
        if (username) data.username = username
        return this.request('/api/users/family/invite', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },
    
    // Habits
    async getHabits() {
        return this.request('/api/habits');
    },
    
    async getTodayHabits() {
        return this.request('/api/habits/today');
    },
    
    async createHabit(habitData) {
        return this.request('/api/habits', {
            method: 'POST',
            body: JSON.stringify(habitData)
        });
    },
    
    async updateHabit(habitId, habitData) {
        return this.request(`/api/habits/${habitId}`, {
            method: 'PUT',
            body: JSON.stringify(habitData)
        });
    },
    
    async deleteHabit(habitId) {
        return this.request(`/api/habits/${habitId}`, {
            method: 'DELETE'
        });
    },
    
    async completeHabit(habitId, value = null) {
        return this.request(`/api/habits/${habitId}/complete`, {
            method: 'POST',
            body: JSON.stringify({
                habit_id: habitId,
                date: new Date().toISOString().split('T')[0],
                value: value
            })
        });
    },
    
    // Baby events
    async getBabyEvents(startDate, endDate, eventType) {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (eventType) params.append('event_type', eventType);
        
        return this.request(`/api/baby/events?${params}`);
    },
    
    async createBabyEvent(eventData) {
        return this.request('/api/baby/events', {
            method: 'POST',
            body: JSON.stringify(eventData)
        });
    },
    
    async updateBabyEvent(eventId, eventData) {
        return this.request(`/api/baby/events/${eventId}`, {
            method: 'PUT',
            body: JSON.stringify(eventData)
        });
    },
    
    async deleteBabyEvent(eventId) {
        return this.request(`/api/baby/events/${eventId}`, {
            method: 'DELETE'
        });
    },
    
    async getBabySummary(date) {
        return this.request(`/api/baby/summary/${date}`);
    },
    
    // Gamification
    async getStats() {
        return this.request('/api/gamification/stats');
    },
    
    async getFamilyStats() {
        return this.request('/api/gamification/family-stats');
    },
    
    async getFamilyQuest() {
        return this.request('/api/gamification/family-quest');
    },
    
    async createFamilyQuest(questData) {
        return this.request('/api/gamification/family-quest', {
            method: 'POST',
            body: JSON.stringify(questData)
        });
    },
    
    async getLeaderboard() {
        return this.request('/api/gamification/leaderboard');
    },
    
    // Export
    async exportDiary(startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        const response = await fetch(
            `${this.baseURL}/api/export/diary?${params}`,
            {
                headers: {
                    'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
                }
            }
        );
        
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `baby_diary_${startDate}_${endDate}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
};
