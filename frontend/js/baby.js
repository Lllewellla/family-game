/** Baby diary management */
const Baby = {
    async loadEvents() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const events = await API.getBabyEvents(today, today);
            this.renderEvents(events);
        } catch (error) {
            console.error('Failed to load events:', error);
            App.showError('Не удалось загрузить события');
        }
    },
    
    renderEvents(events) {
        const container = document.getElementById('baby-events-list');
        if (!container) return;
        
        if (events.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">Нет событий за сегодня</p>';
            return;
        }
        
        // Group by type
        const eventsByType = {
            food: events.filter(e => e.event_type === 'food'),
            skill: events.filter(e => e.event_type === 'skill'),
            note: events.filter(e => e.event_type === 'note')
        };
        
        let html = '';
        
        if (eventsByType.food.length > 0) {
            html += '<div class="mb-4"><h3 class="text-sm font-semibold text-gray-600 mb-2">🍎 Еда</h3>';
            html += eventsByType.food.map(e => this.renderEventCard(e)).join('');
            html += '</div>';
        }
        
        if (eventsByType.skill.length > 0) {
            html += '<div class="mb-4"><h3 class="text-sm font-semibold text-gray-600 mb-2">🎯 Навыки</h3>';
            html += eventsByType.skill.map(e => this.renderEventCard(e)).join('');
            html += '</div>';
        }
        
        if (eventsByType.note.length > 0) {
            html += '<div class="mb-4"><h3 class="text-sm font-semibold text-gray-600 mb-2">📝 Заметки</h3>';
            html += eventsByType.note.map(e => this.renderEventCard(e)).join('');
            html += '</div>';
        }
        
        container.innerHTML = html;
    },
    
    renderEventCard(event) {
        const time = new Date(event.created_at).toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const icons = {
            food: '🍎',
            skill: '🎯',
            note: '📝'
        };
        
        return `
            <div class="event-card mb-3">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center mb-1">
                            <span class="text-xl mr-2">${icons[event.event_type]}</span>
                            <p class="text-gray-800">${this.escapeHtml(event.content)}</p>
                        </div>
                        <p class="text-xs text-gray-500">${time}</p>
                    </div>
                </div>
            </div>
        `;
    },
    
    async handleAddEvent() {
        const modal = document.getElementById('add-event-modal');
        const eventType = document.getElementById('event-type').value;
        const content = document.getElementById('event-content').value.trim();
        
        if (!content) {
            App.showError('Пожалуйста, заполните описание');
            return;
        }
        
        // Check if user belongs to a family
        if (!App.currentUser || !App.currentUser.family_id) {
            App.showError('Вы должны быть членом семьи для добавления событий. Пожалуйста, обратитесь к администратору.');
            return;
        }
        
        try {
            App.showLoading();
            
            await API.createBabyEvent({
                event_type: eventType,
                content: content
            });
            
            modal.classList.add('hidden');
            document.getElementById('add-event-form').reset();
            
            await this.loadEvents();
            
            App.showSuccess('Событие добавлено!');
        } catch (error) {
            console.error('Failed to create event:', error);
            const errorMessage = error.message || 'Не удалось добавить событие';
            App.showError(errorMessage);
        } finally {
            App.hideLoading();
        }
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
