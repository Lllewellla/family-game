/** Main application logic */
const App = {
    currentUser: null,
    currentTab: 'dashboard',
    
    init() {
        // #region agent log
        App.addDebugLog('INFO', 'App.init: starting', {hasFamily: typeof Family !== 'undefined', hasPersonal: typeof Personal !== 'undefined', hasBaby: typeof Baby !== 'undefined'});
        // #endregion
        
        // Initialize Telegram WebApp
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            
            // Set theme colors
            window.Telegram.WebApp.setHeaderColor('#fb923c');
            window.Telegram.WebApp.setBackgroundColor('#fff7ed');
        }
        
        // Setup tab navigation
        this.setupTabs();
        
        // Load initial data
        this.loadUserData();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // #region agent log
        App.addDebugLog('INFO', 'App.init: completed');
        // #endregion
    },
    
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });
    },
    
    switchTab(tabName) {
        // #region agent log
        const logData = {location:'app.js:37',message:'switchTab called',data:{tabName,hasFamily:typeof Family!=='undefined',hasPersonal:typeof Personal!=='undefined',hasBaby:typeof Baby!=='undefined'},timestamp:Date.now(),runId:'run1',hypothesisId:'A'};
        console.log('[DEBUG]', logData);
        App.addDebugLog('INFO', `switchTab: ${tabName}`, {hasFamily: typeof Family !== 'undefined', hasPersonal: typeof Personal !== 'undefined', hasBaby: typeof Baby !== 'undefined'});
        // #endregion
        
        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            const expectedId = `${tabName}-tab`;
            const isActive = content.id === expectedId;
            content.classList.toggle('hidden', !isActive);
            // #region agent log
            if (isActive) {
                App.addDebugLog('INFO', `Showing tab: ${expectedId}`, {contentId: content.id, isHidden: content.classList.contains('hidden')});
            }
            // #endregion
        });
        
        this.currentTab = tabName;
        
        // Load tab-specific data
        if (tabName === 'family') {
            // #region agent log
            const logData1 = {location:'app.js:51',message:'Loading family tab',data:{familyDefined:typeof Family!=='undefined'},timestamp:Date.now(),runId:'run1',hypothesisId:'A'};
            console.log('[DEBUG]', logData1);
            // #endregion
            if (typeof Family !== 'undefined') {
                // #region agent log
                const logData2 = {location:'app.js:53',message:'Calling Family.loadFamilyPage',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'A'};
                console.log('[DEBUG]', logData2);
                App.addDebugLog('INFO', 'Calling Family.loadFamilyPage');
                // #endregion
                Family.loadFamilyPage();
            } else {
                // #region agent log
                const logData3 = {location:'app.js:55',message:'Family module not defined',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'A'};
                console.error('[DEBUG ERROR]', logData3);
                App.addDebugLog('ERROR', 'Family module not defined!');
                // #endregion
            }
        } else if (tabName === 'personal') {
            // #region agent log
            const logData4 = {location:'app.js:57',message:'Loading personal tab',data:{personalDefined:typeof Personal!=='undefined'},timestamp:Date.now(),runId:'run1',hypothesisId:'A'};
            console.log('[DEBUG]', logData4);
            // #endregion
            if (typeof Personal !== 'undefined') {
                // #region agent log
                const logData5 = {location:'app.js:59',message:'Calling Personal.loadPersonalHabits',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'A'};
                console.log('[DEBUG]', logData5);
                App.addDebugLog('INFO', 'Calling Personal.loadPersonalHabits');
                // #endregion
                Personal.loadPersonalHabits();
            } else {
                // #region agent log
                const logData6 = {location:'app.js:61',message:'Personal module not defined',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'A'};
                console.error('[DEBUG ERROR]', logData6);
                App.addDebugLog('ERROR', 'Personal module not defined!');
                // #endregion
            }
        } else if (tabName === 'baby') {
            Baby.loadEvents();
        }
    },
    
    async loadUserData() {
        // #region agent log
        // #endregion
        
        try {
            this.showLoading();
            
            // Check if running in Telegram WebApp
            const hasTelegramWebApp = !!window.Telegram?.WebApp;
            const initData = window.Telegram?.WebApp?.initData || '';
            
            // #region agent log
            // #endregion
            
            if (!hasTelegramWebApp || !initData) {
                // #region agent log
                // #endregion
                
                const userNameEl = document.getElementById('user-name');
                if (userNameEl) {
                    userNameEl.textContent = 'Откройте приложение через Telegram бота';
                }
                
                // Show message in the app
                const appContainer = document.getElementById('app');
                if (appContainer) {
                    appContainer.innerHTML = `
                        <div class="flex items-center justify-center min-h-screen">
                            <div class="bg-white rounded-xl p-6 shadow-lg max-w-md text-center">
                                <h2 class="text-2xl font-bold text-orange-600 mb-4">⚠️ Требуется Telegram</h2>
                                <p class="text-gray-700 mb-4">Это приложение работает только внутри Telegram.</p>
                                <p class="text-gray-600 text-sm mb-4">Пожалуйста, откройте приложение через вашего Telegram бота.</p>
                                <p class="text-gray-500 text-xs">Если вы используете бота, убедитесь, что Menu Button настроен правильно.</p>
                            </div>
                        </div>
                    `;
                }
                return;
            }
            
            // Verify auth
            // #region agent log
            // #endregion
            
            const authResponse = await API.verifyAuth(initData);
            this.currentUser = authResponse.user;
            
            // #region agent log
            // #endregion
            
            // Update UI
            const userNameEl = document.getElementById('user-name');
            if (userNameEl && this.currentUser) {
                userNameEl.textContent = `Привет, ${this.currentUser.first_name || this.currentUser.username || 'Пользователь'}!`;
            }
            
            // Load dashboard data
            await Habits.loadTodayHabits();
            await Gamification.loadStats();
            
            // #region agent log
            // #endregion
            
        } catch (error) {
            // #region agent log
            // #endregion
            
            console.error('Failed to load user data:', error);
            const errorMessage = error.message || 'Не удалось загрузить данные';
            
            // Check if BACKEND_URL is not configured
            if (window.BACKEND_URL && window.BACKEND_URL.includes('your-app.railway.app')) {
                this.showError('Ошибка: BACKEND_URL не настроен. Пожалуйста, обновите config.js с реальным URL вашего Railway бэкенда.');
            } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
                this.showError('Не удалось подключиться к серверу. Проверьте BACKEND_URL в config.js и убедитесь, что бэкенд запущен.');
            } else if (errorMessage.includes('Missing Telegram init data')) {
                const userNameEl = document.getElementById('user-name');
                if (userNameEl) {
                    userNameEl.textContent = 'Откройте приложение через Telegram бота';
                }
                this.showError('Это приложение работает только внутри Telegram. Пожалуйста, откройте его через вашего Telegram бота.');
            } else {
                this.showError(`Ошибка: ${errorMessage}`);
            }
        } finally {
            this.hideLoading();
        }
    },
    
    setupEventListeners() {
        // Add event modal
        const addEventBtn = document.getElementById('add-event-btn');
        const addEventModal = document.getElementById('add-event-modal');
        const cancelEventBtn = document.getElementById('cancel-event-btn');
        const addEventForm = document.getElementById('add-event-form');
        
        if (addEventBtn) {
            addEventBtn.addEventListener('click', () => {
                addEventModal.classList.remove('hidden');
            });
        }
        
        if (cancelEventBtn) {
            cancelEventBtn.addEventListener('click', () => {
                addEventModal.classList.add('hidden');
                addEventForm.reset();
            });
        }
        

        
        // Invite member modal
        const inviteMemberForm = document.getElementById('invite-member-form');
        const cancelInviteBtn = document.getElementById('cancel-invite-btn');
        
        if (cancelInviteBtn) {
            cancelInviteBtn.addEventListener('click', () => {
                Gamification.closeInviteModal();
            });
        }
        
        if (inviteMemberForm) {
            inviteMemberForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await Gamification.inviteMember();
            });
        }
        if (addEventForm) {
            addEventForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await Baby.handleAddEvent();
            });
        }
    },
    
    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.classList.remove('hidden');
    },
    
    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.classList.add('hidden');
    },
    
    showError(message) {
        this.addDebugLog('ERROR', message);
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.showAlert(message);
        } else {
            alert(message);
        }
    },
    
    addDebugLog(type, message, data = null) {
        const panel = document.getElementById('debug-log-panel');
        const content = document.getElementById('debug-log-content');
        if (!panel || !content) return;
        
        panel.style.display = 'block';
        // Clear placeholder on first log
        if (content.textContent.includes('Логи появятся')) {
            content.innerHTML = '';
        }
        const time = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `mb-1 ${type === 'ERROR' ? 'text-red-600' : 'text-gray-700'}`;
        logEntry.innerHTML = `<span class="font-mono">[${time}]</span> <span class="font-semibold">[${type}]</span> ${message}${data ? ` <span class="text-gray-500">${JSON.stringify(data)}</span>` : ''}`;
        content.appendChild(logEntry);
        content.scrollTop = content.scrollHeight;
        
        // Keep only last 20 logs
        while (content.children.length > 20) {
            content.removeChild(content.firstChild);
        }
    },
    
    showSuccess(message) {
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.showAlert(message);
        } else {
            alert(message);
        }
    }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}
