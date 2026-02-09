/** Main application logic */
const App = {
    currentUser: null,
    currentTab: 'dashboard',
    
    init() {
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
        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('hidden', !content.id.startsWith(tabName));
        });
        
        this.currentTab = tabName;
        
        // Load tab-specific data
        if (tabName === 'dashboard') {
            Habits.loadTodayHabits();
            Gamification.loadStats();
        } else if (tabName === 'baby') {
            Baby.loadEvents();
        } else if (tabName === 'settings') {
            Settings.loadSettings();
        }
    },
    
    async loadUserData() {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:61',message:'loadUserData entry',data:{hasTelegram:!!window.Telegram?.WebApp,hasInitData:!!window.Telegram?.WebApp?.initData,initDataLength:window.Telegram?.WebApp?.initData?.length||0},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        try {
            this.showLoading();
            
            // Check if running in Telegram WebApp
            const hasTelegramWebApp = !!window.Telegram?.WebApp;
            const initData = window.Telegram?.WebApp?.initData || '';
            
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:68',message:'Telegram check',data:{hasTelegramWebApp,initDataLength:initData.length,initDataEmpty:!initData},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            
            if (!hasTelegramWebApp || !initData) {
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:72',message:'Missing Telegram WebApp',data:{hasTelegramWebApp,hasInitData:!!initData},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
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
            fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:95',message:'Before verifyAuth',data:{initDataLength:initData.length},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
            const authResponse = await API.verifyAuth(initData);
            this.currentUser = authResponse.user;
            
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:100',message:'After verifyAuth',data:{hasUser:!!this.currentUser,userId:this.currentUser?.id},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
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
            fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:112',message:'loadUserData success',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
        } catch (error) {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/600ec16e-f3a9-41b7-bb5f-b658a8312e0e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:116',message:'loadUserData error',data:{errorMessage:error.message,errorStack:error.stack},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
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
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.showAlert(message);
        } else {
            alert(message);
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
