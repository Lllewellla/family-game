/** API client for FamilyQuest */
const API = {
    baseURL: window.BACKEND_URL || 'https://your-app.railway.app',
    
    async request(endpoint, options = {}) {
        const initData = window.Telegram?.WebApp?.initData || '';
        
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
            
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
                }
                const errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}`;
                throw new Error(errorMessage);
            }
            
            return await response.json();
        } catch (error) {
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
