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
    
    async loadFamilyStats() {
        try {
            const stats = await API.getFamilyStats();
            this.renderFamilyStats(stats);
        } catch (error) {
            console.error('Failed to load family stats:', error);
            // Hide family stats if user doesn't belong to a family
            const familyStatsEl = document.getElementById('family-stats');
            if (familyStatsEl) {
                familyStatsEl.classList.add('hidden');
            }
        }
    },
    
    renderFamilyStats(stats) {
        const levelEl = document.getElementById('family-level');
        const totalXpEl = document.getElementById('family-total-xp');
        const xpNextEl = document.getElementById('family-xp-next');
        
        if (levelEl) levelEl.textContent = stats.level;
        if (totalXpEl) totalXpEl.textContent = stats.total_xp;
        if (xpNextEl) xpNextEl.textContent = ${stats.xp_for_next_level} XP;
    },

        // Update user stats in settings
        const statsContainer = document.getElementById('user-stats');
        if (statsContainer) {
            statsContainer.innerHTML = 
                <div class="flex justify-between items-center py-2">
                    <span class="text-gray-600">РЈСЂРѕРІРµРЅСЊ</span>
                    <span class="text-2xl font-bold text-orange-600"></span>
                </div>
                <div class="flex justify-between items-center py-2">
                    <span class="text-gray-600">Р’СЃРµРіРѕ XP</span>
                    <span class="text-xl font-semibold text-gray-800"></span>
                </div>
                <div class="flex justify-between items-center py-2">
                    <span class="text-gray-600">Р”Рѕ СЃР»РµРґСѓСЋС‰РµРіРѕ СѓСЂРѕРІРЅСЏ</span>
                    <span class="text-lg font-semibold text-gray-700"> XP</span>
                </div>
            ;
        }
        
        // Load family avatars
        this.loadFamilyMembers();
        
        // Load family stats
        this.loadFamilyStats();
    },
    
    renderFamilyAvatars(members) {
        const container = document.getElementById('avatars-container');
        if (!container) return;
        
        const isAdmin = App.currentUser && App.currentUser.role === 'admin';
        
        let html = members.map(member => 
            <div class="flex flex-col items-center">
                <div class="avatar mb-2">
                    
                </div>
                <p class="text-xs font-semibold text-gray-700"></p>
                <p class="text-xs text-gray-500">Lv.</p>
            </div>
        ).join('');
        
        if (isAdmin) {
            html += 
                <div class="flex flex-col items-center">
                    <button id="add-family-member-btn" class="avatar mb-2 bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center text-gray-600 text-xl">
                        +
                    </button>
                    <p class="text-xs font-semibold text-gray-700">Р”РѕР±Р°РІРёС‚СЊ</p>
                </div>
            ;
        }
        
        container.innerHTML = html;
        
        if (isAdmin) {
            const addBtn = document.getElementById('add-family-member-btn');
            if (addBtn) {
                addBtn.addEventListener('click', () => this.openInviteModal());
            }
        }
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
            App.showError('РџРѕР¶Р°Р»СѓР№СЃС‚Р°, РІРІРµРґРёС‚Рµ username РёР»Рё Telegram ID');
            return;
        }
        
        try {
            App.showLoading();
            await API.inviteUserToFamily(telegramId || null, username || null);
            App.showSuccess('РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РґРѕР±Р°РІР»РµРЅ РІ СЃРµРјСЊСЋ!');
            this.closeInviteModal();
            await this.loadFamilyMembers();
        } catch (error) {
            console.error('Failed to invite member:', error);
            App.showError(error.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ РґРѕР±Р°РІРёС‚СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ');
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
            progressBar.style.width = ${progressPercent}%;
        }
        
        if (progressText) {
            progressText.textContent = ${quest.current_xp} /  XP;
        }
    },
    
    showXPGain(amount, prefix = "") {
        // Create floating XP indicator
        const xpIndicator = document.createElement('div');
        xpIndicator.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg font-bold text-xl z-50 xp-gain';
        xpIndicator.textContent = prefix ? ${prefix} + XP : + XP;
        
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
