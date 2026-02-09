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
    },
    
    renderFamilyAvatars(members) {
        const container = document.getElementById('avatars-container');
        if (!container) return;
        
        container.innerHTML = members.map(member => `
            <div class="flex flex-col items-center">
                <div class="avatar mb-2">
                    ${member.first_name ? member.first_name[0].toUpperCase() : '?'}
                </div>
                <p class="text-xs font-semibold text-gray-700">${member.first_name || member.username || 'Пользователь'}</p>
                <p class="text-xs text-gray-500">Lv.${member.level}</p>
            </div>
        `).join('');
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
    
    showXPGain(amount) {
        // Create floating XP indicator
        const xpIndicator = document.createElement('div');
        xpIndicator.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg font-bold text-xl z-50 xp-gain';
        xpIndicator.textContent = `+${amount} XP`;
        
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
