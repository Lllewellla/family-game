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
        try {
            this.showLoading();
            
            // Verify auth
            const initData = window.Telegram?.WebApp?.initData || '';
            if (initData) {
                const authResponse = await API.verifyAuth(initData);
                this.currentUser = authResponse.user;
            } else {
                // Fallback: try to get current user directly
                this.currentUser = await API.getCurrentUser();
            }
            
            // Update UI
            const userNameEl = document.getElementById('user-name');
            if (userNameEl && this.currentUser) {
                userNameEl.textContent = `Привет, ${this.currentUser.first_name || this.currentUser.username || 'Пользователь'}!`;
            }
            
            // Load dashboard data
            await Habits.loadTodayHabits();
            await Gamification.loadStats();
            
        } catch (error) {
            console.error('Failed to load user data:', error);
            const errorMessage = error.message || 'Не удалось загрузить данные';
            
            // Check if BACKEND_URL is not configured
            if (window.BACKEND_URL && window.BACKEND_URL.includes('your-app.railway.app')) {
                this.showError('Ошибка: BACKEND_URL не настроен. Пожалуйста, обновите config.js с реальным URL вашего Railway бэкенда.');
            } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
                this.showError('Не удалось подключиться к серверу. Проверьте BACKEND_URL в config.js и убедитесь, что бэкенд запущен.');
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
