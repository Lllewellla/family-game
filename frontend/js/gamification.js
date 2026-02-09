/** Gamification features */
const Gamification = {
    async loadStats() {
        try {
            const stats = await API.getStats();
            this.renderStats(stats);
            
            // Try to load family quest
            try {
                const quest = await API.getFamilyQuest();
                this.renderFamilyQuest(quest);
            } catch (error) {
                // No active quest, hide quest section
                const questSection = document.getElementById('family-quest');
                if (questSection) questSection.classList.add('hidden');
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    },
    
    async loadFamilyMembers() {
        try {
            const members = await API.getFamilyMembers();
            this.renderFamilyAvatars(members);
        } catch (error) {
            console.error('Failed to load family members:', error);
        }
    },
    
    renderStats(stats) {
        // Update user stats in settings
        const statsContainer = document.getElementById('user-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="flex justify-between items-center py-2">
                    <span class="text-gray-600">Уровень</span>
                    <span class="text-2xl font-bold text-orange-600">${stats.level}</span>
                </div>
                <div class="flex justify-between items-center py-2">
                    <span class="text-gray-600">Всего XP</span>
                    <span class="text-xl font-semibold text-gray-800">${stats.total_xp}</span>
                </div>
                <div class="flex justify-between items-center py-2">
                    <span class="text-gray-600">До следующего уровня</span>
                    <span class="text-lg font-semibold text-gray-700">${stats.xp_for_next_level} XP</span>
                </div>
            `;
        }
        
        // Load family avatars
        this.loadFamilyMembers();
        
        // Load family stats (no longer needed, but keep for compatibility)
    },
    
    async loadFamilyStats() {
        // Family stats block removed, this method kept for compatibility
    },
    
    renderFamilyStats(stats) {
        // Family stats block removed, this method kept for compatibility
    },
    
    renderFamilyAvatars(members) {
        const container = document.getElementById('avatars-container');
        if (!container) return;
        
        // Ограничиваем до 3 членов семьи: Егор, Ирина, Миша
        // Фильтруем и сортируем по имени
        const familyMembers = members
            .filter(member => {
                const name = (member.first_name || member.username || '').toLowerCase();
                return name.includes('егор') || name.includes('ирина') || name.includes('миша');
            })
            .slice(0, 3);
        
        // Сортируем: Егор, Ирина, Миша
        const sortedMembers = familyMembers.sort((a, b) => {
            const nameA = (a.first_name || a.username || '').toLowerCase();
            const nameB = (b.first_name || b.username || '').toLowerCase();
            const order = ['егор', 'ирина', 'миша'];
            const indexA = order.findIndex(o => nameA.includes(o));
            const indexB = order.findIndex(o => nameB.includes(o));
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });
        
        // Отображаем только аватары без текста (компактный вид для header)
        let html = sortedMembers.map(member => {
            const name = member.first_name || member.username || '?';
            const initial = name.charAt(0).toUpperCase();
            const level = member.level || 1;
            
            return `
                <div class="flex flex-col items-center" title="${name} (Lv.${level})">
                    <div class="avatar w-10 h-10 text-sm">
                        ${initial}
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    },
    
    openInviteModal() {
        const modal = document.getElementById('invite-member-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    },
    
    closeInviteModal() {
        const modal = document.getElementById('invite-member-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.getElementById('invite-member-form').reset();
        }
    },
    
    async inviteMember() {
        const username = document.getElementById('invite-username').value.trim();
        const telegramId = document.getElementById('invite-telegram-id').value.trim();
        
        if (!username && !telegramId) {
            App.showError('Пожалуйста, введите username или Telegram ID');
            return;
        }
        
        try {
            App.showLoading();
            await API.inviteUserToFamily(telegramId || null, username || null);
            App.showSuccess('Пользователь добавлен в семью!');
            this.closeInviteModal();
            await this.loadFamilyMembers();
        } catch (error) {
            console.error('Failed to invite member:', error);
            App.showError(error.message || 'Не удалось добавить пользователя');
        } finally {
            App.hideLoading();
        }
    },
    
    renderFamilyQuest(quest) {
        const questSection = document.getElementById('family-quest');
        const questName = document.getElementById('quest-name');
        const progressBar = document.getElementById('quest-progress-bar');
        const progressText = document.getElementById('quest-progress-text');
        
        if (!questSection) return;
        
        questSection.classList.remove('hidden');
        
        if (questName) questName.textContent = quest.name;
        
        const progressPercent = quest.target_xp > 0 
            ? Math.min(100, (quest.current_xp / quest.target_xp) * 100)
            : 0;
        
        if (progressBar) {
            progressBar.style.width = `${progressPercent}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${quest.current_xp} / ${quest.target_xp} XP`;
        }
    },
    
    showXPGain(amount, prefix = "") {
        // Create floating XP indicator
        const xpIndicator = document.createElement('div');
        xpIndicator.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg font-bold text-xl z-50 xp-gain';
        xpIndicator.textContent = prefix ? `${prefix} +${amount} XP` : `+${amount} XP`;
        
        document.body.appendChild(xpIndicator);
        
        setTimeout(() => {
            xpIndicator.style.opacity = '0';
            xpIndicator.style.transform = 'translate(-50%, -20px)';
            xpIndicator.style.transition = 'all 0.5s ease-out';
            
            setTimeout(() => {
                document.body.removeChild(xpIndicator);
            }, 500);
        }, 1000);
    }
};
