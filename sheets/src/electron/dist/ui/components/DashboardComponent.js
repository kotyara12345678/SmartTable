/**
 * Dashboard Component - современный личный кабинет с функциональными действиями
 */
import { timeTracker } from '../core/time-tracker.js';
export class DashboardComponent {
    constructor() {
        this.isOpen = false;
        this.container = null;
        this.currentTheme = 'light';
        this.activeSection = 'dashboard';
        this.statsUpdateInterval = null;
        this.recentActions = [];
        this.currentAvatar = null;
        this.init();
    }
    init() {
        this.loadActions();
        this.loadAvatar();
        this.createDashboard();
        this.bindEvents();
        this.loadTheme();
        this.loadSavedAvatar();
        this.startStatsUpdate();
    }
    loadAvatar() {
        const savedAvatar = localStorage.getItem('user-avatar');
        if (savedAvatar) {
            this.currentAvatar = savedAvatar;
        }
    }
    loadActions() {
        try {
            const saved = localStorage.getItem('smarttable-actions');
            if (saved) {
                const actions = JSON.parse(saved);
                this.recentActions = actions.map((a) => ({
                    ...a,
                    date: new Date(a.date)
                }));
            }
        }
        catch (e) {
            console.error('[Dashboard] Failed to load actions:', e);
        }
    }
    saveActions() {
        try {
            localStorage.setItem('smarttable-actions', JSON.stringify(this.recentActions));
        }
        catch (e) {
            console.error('[Dashboard] Failed to save actions:', e);
        }
    }
    addAction(action) {
        const newAction = {
            id: `action-${Date.now()}`,
            date: new Date(),
            ...action
        };
        this.recentActions.unshift(newAction);
        // Храним только последние 50 действий
        if (this.recentActions.length > 50) {
            this.recentActions = this.recentActions.slice(0, 50);
        }
        this.saveActions();
        this.renderRecentActions();
    }
    startStatsUpdate() {
        // Обновляем статистику каждые 30 секунд
        this.statsUpdateInterval = setInterval(() => {
            this.updateDatabaseStats();
        }, 30000);
    }
    createDashboard() {
        if (document.getElementById('dashboard-container'))
            return;
        this.container = document.createElement('div');
        this.container.id = 'dashboard-container';
        this.container.innerHTML = this.getDashboardHTML();
        document.body.appendChild(this.container);
    }
    getDashboardHTML() {
        const today = new Date().toISOString().split('T')[0];
        const dailyStats = timeTracker.getDailyStats(today);
        const weeklyStats = timeTracker.getWeeklyStats();
        const totalStats = timeTracker.getTotalStats();
        return `
      <div class="dashboard-overlay" id="dashboardOverlay"></div>
      <div class="dashboard-wrapper">
        <!-- Sidebar -->
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <div class="logo">
              <svg viewBox="0 0 24 24" fill="currentColor" class="logo-icon">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
              </svg>
              <span class="logo-text">SmartTable</span>
            </div>
          </div>

          <nav class="sidebar-nav">
            <a href="#" class="nav-item active" data-section="dashboard">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
              <span>Dashboard</span>
            </a>
            <a href="#" class="nav-item" data-section="profile">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Профиль</span>
            </a>
            <a href="#" class="nav-item" data-section="history">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              <span>История</span>
            </a>
            <a href="#" class="nav-item" data-section="support">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span>Поддержка</span>
            </a>
          </nav>

          <div class="sidebar-footer">
            <button class="theme-toggle" id="themeToggle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="theme-icon sun">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="theme-icon moon" style="display: none;">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </button>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="dashboard-main">
          <!-- Header -->
          <header class="dashboard-header">
            <div class="header-left">
              <h1 class="page-title" id="pageTitle">Dashboard</h1>
            </div>
            <div class="header-right">
              <button class="ai-chat-btn" id="aiChatDashboardBtn" title="AI Ассистент">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
              <button class="notification-btn" id="notificationBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <span class="notification-badge">3</span>
              </button>
              <div class="user-avatar-header" id="userAvatarHeader">
                <span class="avatar-text">П</span>
              </div>
            </div>
          </header>

          <!-- Content Area -->
          <div class="dashboard-content" id="dashboardContent">
            ${this.getDashboardContent()}
          </div>
        </main>
      </div>
    `;
    }
    getDashboardContent() {
        const today = new Date().toISOString().split('T')[0];
        const dailyStats = timeTracker.getDailyStats(today);
        const weeklyStats = timeTracker.getWeeklyStats();
        const totalStats = timeTracker.getTotalStats();
        return `
      <div class="dashboard-section">
        <!-- Welcome Section -->
        <div class="welcome-section">
          <h2 class="welcome-title">Добро пожаловать обратно! </h2>
          <p class="welcome-subtitle">Вот ваша статистика и последние действия</p>
        </div>

        <!-- Time Stats Cards -->
        <div class="time-stats-grid">
          <div class="time-stat-card today">
            <div class="time-stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </div>
            <div class="time-stat-content">
              <h3 class="time-stat-title">Сегодня</h3>
              <p class="time-stat-value">${timeTracker.formatTime(dailyStats.total_seconds)}</p>
              <p class="time-stat-detail">${dailyStats.session_count} сессий</p>
            </div>
          </div>

          <div class="time-stat-card week">
            <div class="time-stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div class="time-stat-content">
              <h3 class="time-stat-title">Эта неделя</h3>
              <p class="time-stat-value">${timeTracker.formatTime(weeklyStats.total_seconds)}</p>
              <p class="time-stat-detail">В среднем ${timeTracker.formatTime(weeklyStats.average_daily_seconds)} в день</p>
            </div>
          </div>

          <div class="time-stat-card total">
            <div class="time-stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20V10"/>
                <path d="M18 20V4"/>
                <path d="M6 20v-4"/>
              </svg>
            </div>
            <div class="time-stat-content">
              <h3 class="time-stat-title">Всего</h3>
              <p class="time-stat-value">${totalStats.total_hours}ч</p>
              <p class="time-stat-detail">${totalStats.days_active} дней активности</p>
            </div>
          </div>

          <div class="time-stat-card favorite">
            <div class="time-stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
            </div>
            <div class="time-stat-content">
              <h3 class="time-stat-title">Любимая активность</h3>
              <p class="time-stat-value">${this.getActivityTypeLabel(totalStats.most_used_type)}</p>
              <p class="time-stat-detail">${totalStats.total_sessions} сессий всего</p>
            </div>
          </div>
        </div>

        <!-- Database & Storage Stats -->
        <div class="db-project-stats">
          <h3>Статистика базы данных</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon storage">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="10" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div class="stat-content">
                <h4>Хранилище</h4>
                <p class="stat-value" id="storageSize">0 MB</p>
                <p class="stat-detail">Свободно: <span id="freeSpace">0 MB</span></p>
              </div>
            </div>
          </div>
        </div>

        <!-- Activity Breakdown -->
        <div class="activity-breakdown">
          <h3>Распределение времени сегодня</h3>
          <div class="activity-bars">
            <div class="activity-bar">
              <div class="activity-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z"/>
                  <polyline points="14,2 14,8 20,8"/>
                </svg>
                <span>Таблицы</span>
              </div>
              <div class="activity-progress">
                <div class="activity-fill spreadsheet" style="width: ${this.getPercentage(dailyStats.spreadsheet_seconds, dailyStats.total_seconds)}%"></div>
                <span class="activity-time">${timeTracker.formatTime(dailyStats.spreadsheet_seconds)}</span>
              </div>
            </div>

            <div class="activity-bar">
              <div class="activity-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
                <span>Личный кабинет</span>
              </div>
              <div class="activity-progress">
                <div class="activity-fill dashboard" style="width: ${this.getPercentage(dailyStats.dashboard_seconds, dailyStats.total_seconds)}%"></div>
                <span class="activity-time">${timeTracker.formatTime(dailyStats.dashboard_seconds)}</span>
              </div>
            </div>

            <div class="activity-bar">
              <div class="activity-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>AI Ассистент</span>
              </div>
              <div class="activity-progress">
                <div class="activity-fill ai-chat" style="width: ${this.getPercentage(dailyStats.ai_chat_seconds, dailyStats.total_seconds)}%"></div>
                <span class="activity-time">${timeTracker.formatTime(dailyStats.ai_chat_seconds)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Metrics Cards -->
        <div class="metrics-grid">
          <div class="metric-card" id="activityMetricCard" title="Нажмите для подробностей">
            <div class="metric-icon activity">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
              </svg>
            </div>
            <div class="metric-content">
              <h3 class="metric-title">Активность</h3>
              <p class="metric-value" id="activityValue">0%</p>
              <p class="metric-change positive" id="activityChange">Загрузка...</p>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon documents">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
            </div>
            <div class="metric-content">
              <h3 class="metric-title">Документы</h3>
              <p class="metric-value" id="documentsCount">0</p>
              <p class="metric-change positive" id="documentsChange">Загрузка...</p>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-clock time">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </div>
            <div class="metric-content">
              <h3 class="metric-title">Время работы</h3>
              <p class="metric-value">${timeTracker.formatTime(dailyStats.total_seconds)}</p>
              <p class="metric-change neutral">+8ч за неделю</p>
            </div>
          </div>

        </div>

        <!-- Recent Actions Table -->
        <div class="recent-actions">
          <div class="section-header">
            <h3>Последние действия</h3>
            <button class="clear-history-btn" id="btnClearHistory">Очистить историю</button>
          </div>
          <div class="actions-table" id="recentActionsTable">
            ${this.getRecentActionsHTML()}
          </div>
        </div>
      </div>
    `;
    }
    getRecentActionsHTML() {
        if (this.recentActions.length === 0) {
            return `
        <div class="no-actions">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          <p>История действий пуста</p>
        </div>
      `;
        }
        return `
      <div class="table-header">
        <div class="table-cell">Дата</div>
        <div class="table-cell">Действие</div>
        <div class="table-cell">Статус</div>
      </div>
      <div class="table-body">
        ${this.recentActions.slice(0, 10).map(action => `
          <div class="table-row">
            <div class="table-cell">${this.formatDate(action.date)}</div>
            <div class="table-cell">${action.action}</div>
            <div class="table-cell"><span class="status ${action.status}">${this.getStatusLabel(action.status)}</span></div>
          </div>
        `).join('')}
      </div>
    `;
    }
    renderRecentActions() {
        const table = document.getElementById('recentActionsTable');
        if (table) {
            table.innerHTML = this.getRecentActionsHTML();
        }
    }
    formatDate(date) {
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    getStatusLabel(status) {
        const labels = {
            success: 'Успешно',
            warning: 'В процессе',
            error: 'Ошибка',
            pending: 'Ожидание'
        };
        return labels[status] || status;
    }
    getActivityTypeLabel(type) {
        const labels = {
            spreadsheet: 'Таблицы',
            dashboard: 'Личный кабинет',
            ai_chat: 'AI Ассистент',
            settings: 'Настройки'
        };
        return labels[type] || type;
    }
    getPercentage(value, total) {
        if (total === 0)
            return 0;
        return Math.round((value / total) * 100);
    }
    bindEvents() {
        // Close dashboard
        const overlay = document.getElementById('dashboardOverlay');
        overlay?.addEventListener('click', () => this.close());
        // Navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                if (section) {
                    this.switchSection(section);
                }
            });
        });
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        themeToggle?.addEventListener('click', () => this.toggleTheme());
        // User avatar
        const userAvatar = document.getElementById('userAvatarHeader');
        userAvatar?.addEventListener('click', () => this.close());
        // Notifications
        const notificationBtn = document.getElementById('notificationBtn');
        notificationBtn?.addEventListener('click', () => this.showNotifications());
        // AI Chat
        const aiChatBtn = document.getElementById('aiChatDashboardBtn');
        aiChatBtn?.addEventListener('click', () => this.openAIChat());
        // Activity Metric Card
        document.getElementById('activityMetricCard')?.addEventListener('click', () => {
            this.showActivityDetail();
        });
        // Clear history
        document.getElementById('btnClearHistory')?.addEventListener('click', () => this.clearHistory());
        // Profile avatar upload
        this.bindProfileAvatarEvents();
        // Обновляем статистику БД и проектов
        this.updateDatabaseStats();
        // Добавляем обработчики для карточек статистики
        this.bindStatsCardEvents();
        // Prevent close on content click
        const wrapper = this.container?.querySelector('.dashboard-wrapper');
        wrapper?.addEventListener('click', (e) => e.stopPropagation());
    }
    showActivityDetail() {
        const today = new Date().toISOString().split('T')[0];
        const dailyStats = timeTracker.getDailyStats(today);
        const stats = [
            {
                icon: `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
        `,
                title: 'Работа с таблицами',
                time: timeTracker.formatTime(dailyStats.spreadsheet_seconds),
                detail: `Ячеек: ${this.getCellsFilled()}`,
                color: 'spreadsheet'
            },
            {
                icon: `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
        `,
                title: 'Личный кабинет',
                time: timeTracker.formatTime(dailyStats.dashboard_seconds),
                detail: `Открытий: ${this.getDashboardOpens()}`,
                color: 'dashboard'
            },
            {
                icon: `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1v-1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
            <circle cx="7.5" cy="14.5" r="1.5"/>
            <circle cx="16.5" cy="14.5" r="1.5"/>
          </svg>
        `,
                title: 'AI Ассистент',
                time: timeTracker.formatTime(dailyStats.ai_chat_seconds),
                detail: `Запросов: ${this.getAIRequests()}`,
                color: 'ai'
            },
            {
                icon: `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        `,
                title: 'Настройки',
                time: '-',
                detail: `Изменений: ${this.getSettingsChanges()}`,
                color: 'settings'
            }
        ];
        // Создаём модальное окно с деталями
        const modal = document.createElement('div');
        modal.className = 'activity-detail-modal';
        modal.innerHTML = `
      <div class="activity-detail-overlay"></div>
      <div class="activity-detail-panel">
        <div class="activity-detail-panel-header">
          <h3>Детальная активность</h3>
          <button class="close-activity-detail">×</button>
        </div>
        <div class="activity-detail-panel-content">
          <div class="activity-summary">
            <div class="activity-total">
              <span class="activity-total-label">Всего сегодня</span>
              <span class="activity-total-value">${timeTracker.formatTime(dailyStats.total_seconds)}</span>
            </div>
            <div class="activity-percent">${this.getPercentage(dailyStats.total_seconds, 8 * 3600)}% от 8 часов</div>
          </div>
          <div class="activity-stats-list">
            ${stats.map(stat => `
              <div class="activity-stat-item ${stat.color}">
                <div class="activity-stat-icon">${stat.icon}</div>
                <div class="activity-stat-info">
                  <div class="activity-stat-title">${stat.title}</div>
                  <div class="activity-stat-detail">${stat.detail}</div>
                </div>
                <div class="activity-stat-time">${stat.time}</div>
              </div>
            `).join('')}
          </div>
          <button class="activity-action-btn" id="activityActionBtn">Перейти к таблице</button>
        </div>
      </div>
    `;
        document.body.appendChild(modal);
        // Закрытие
        const closeBtn = modal.querySelector('.close-activity-detail');
        const overlay = modal.querySelector('.activity-detail-overlay');
        const actionBtn = modal.querySelector('#activityActionBtn');
        closeBtn?.addEventListener('click', () => modal.remove());
        overlay?.addEventListener('click', () => modal.remove());
        actionBtn?.addEventListener('click', () => {
            this.close();
            modal.remove();
        });
        // Добавляем действие в историю
        this.addAction({
            action: 'Просмотр детальной активности',
            type: 'other',
            status: 'success'
        });
    }
    getCellsFilled() {
        let count = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('cell-'))
                count++;
        }
        return count;
    }
    getDashboardOpens() {
        const saved = localStorage.getItem('dashboard-opens');
        return saved ? parseInt(saved) : 0;
    }
    getAIRequests() {
        const saved = localStorage.getItem('ai-requests');
        return saved ? parseInt(saved) : 0;
    }
    getSettingsChanges() {
        const saved = localStorage.getItem('settings-changes');
        return saved ? parseInt(saved) : 0;
    }
    openAIChat() {
        const aiPanel = document.getElementById('ai-panel-container');
        if (aiPanel) {
            aiPanel.classList.add('open');
        }
    }
    clearHistory() {
        const confirmed = confirm('Вы уверены, что хотите очистить историю действий?');
        if (confirmed) {
            this.recentActions = [];
            this.saveActions();
            this.renderRecentActions();
            this.addAction({
                action: 'Очистка истории',
                type: 'delete',
                status: 'success'
            });
        }
    }
    bindProfileAvatarEvents() {
        const changeAvatarBtn = document.getElementById('changeProfileAvatarBtn');
        const avatarInput = document.getElementById('profileAvatarInput');
        changeAvatarBtn?.addEventListener('click', () => {
            avatarInput?.click();
        });
        avatarInput?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file && file.type.startsWith('image/')) {
                this.handleAvatarUpload(file);
            }
        });
    }
    handleAvatarUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target?.result;
            localStorage.setItem('user-avatar', imageUrl);
            const profileAvatarLarge = document.getElementById('profileAvatarLarge');
            if (profileAvatarLarge) {
                profileAvatarLarge.style.backgroundImage = `url(${imageUrl})`;
                profileAvatarLarge.style.backgroundSize = 'cover';
                profileAvatarLarge.style.backgroundPosition = 'center';
                profileAvatarLarge.style.backgroundRepeat = 'no-repeat';
                profileAvatarLarge.style.backgroundColor = 'transparent';
                profileAvatarLarge.textContent = '';
                profileAvatarLarge.classList.add('has-image');
            }
            const userAvatarHeader = document.getElementById('userAvatarHeader');
            if (userAvatarHeader) {
                userAvatarHeader.style.backgroundImage = `url(${imageUrl})`;
                userAvatarHeader.style.backgroundSize = 'cover';
                userAvatarHeader.style.backgroundPosition = 'center';
                userAvatarHeader.style.backgroundRepeat = 'no-repeat';
                userAvatarHeader.style.backgroundColor = 'transparent';
                userAvatarHeader.textContent = '';
                userAvatarHeader.classList.add('has-image');
            }
            this.addAction({
                action: 'Обновление аватара',
                type: 'settings',
                status: 'success'
            });
        };
        reader.readAsDataURL(file);
    }
    switchSection(section) {
        this.activeSection = section;
        // Обновляем активный пункт меню
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });
        // Обновляем заголовок
        const titles = {
            dashboard: 'Dashboard',
            profile: 'Профиль',
            history: 'История',
            support: 'Поддержка'
        };
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = titles[section] || 'Dashboard';
        }
        // Переключаем контент
        const content = document.getElementById('dashboardContent');
        if (content) {
            switch (section) {
                case 'dashboard':
                    content.innerHTML = this.getDashboardContent();
                    // Перепривязываем обработчик для карточки активности
                    setTimeout(() => {
                        document.getElementById('activityMetricCard')?.addEventListener('click', () => {
                            this.showActivityDetail();
                        });
                    }, 0);
                    document.getElementById('btnClearHistory')?.addEventListener('click', () => this.clearHistory());
                    break;
                case 'profile':
                    content.innerHTML = this.getProfileContent();
                    break;
                case 'history':
                    content.innerHTML = this.getHistoryContent();
                    break;
                case 'support':
                    content.innerHTML = this.getSupportContent();
                    break;
            }
        }
    }
    getProfileContent() {
        const userName = localStorage.getItem('user-name') || 'Пользователь';
        const userEmail = localStorage.getItem('user-email') || 'user@example.com';
        return `
      <div class="dashboard-section">
        <div class="profile-section">
          <h2>Профиль пользователя</h2>
          <div class="profile-avatar-large" id="profileAvatarLarge">
            ${this.currentAvatar ? '' : userName.charAt(0).toUpperCase()}
          </div>
          <input type="file" id="profileAvatarInput" accept="image/*" style="display: none;">
          <button class="change-avatar-btn" id="changeProfileAvatarBtn">Изменить фото</button>

          <div class="profile-form">
            <div class="form-group">
              <label>Имя</label>
              <input type="text" id="profileName" value="${userName}">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="profileEmail" value="${userEmail}">
            </div>
            <button class="save-profile-btn" id="saveProfileBtn">Сохранить</button>
          </div>
        </div>
      </div>
    `;
    }
    getHistoryContent() {
        return `
      <div class="dashboard-section">
        <h2>История действий</h2>
        <div class="full-history" id="fullHistoryTable">
          ${this.getRecentActionsHTML()}
        </div>
        <button class="clear-history-btn" id="btnClearFullHistory">Очистить всю историю</button>
      </div>
    `;
    }
    getSupportContent() {
        return `
      <div class="support-section">
        <h2>Поддержка</h2>
        <p class="support-description">Свяжитесь с нашей командой поддержки или присоединяйтесь к сообществу</p>

        <div class="support-links">
          <a href="https://t.me/SmarTable_chat" target="_blank" rel="noopener noreferrer" class="support-link telegram">
            <div class="support-link-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-8.609 3.33c-2.068.8-4.133 1.598-5.724 2.21a405.15 405.15 0 0 1-2.849 1.09c-.42.147-.99.332-1.473.901-.728.968.835 1.798 1.56 2.155.526.26 1.082.573 1.626.877.568.318 1.153.63 1.704.856.606.25 1.315.425 1.936.068.486-.28 1.015-.634 1.513-.968l5.853-3.93c.176-.118.404-.133.526.023.121.155.075.39-.068.535L9.52 16.44c-.356.355-.74.68-1.146.968-.406.288-.856.54-1.33.698-.474.158-.99.21-1.473.095-.483-.115-.93-.36-1.305-.695-.375-.335-.68-.75-.89-1.215-.21-.465-.315-.97-.315-1.48V9.625"/>
                <path d="M21.198 2.433l-2.433 18.735c-.168 1.293-1.293 2.15-2.586 1.982a2.29 2.29 0 0 1-1.724-1.293l-2.15-5.165 4.3 4.3c.43.43 1.075.573 1.648.358.573-.215.932-.788.86-1.433l-.716-7.165c-.072-.645.287-1.218.86-1.433.573-.215 1.218-.072 1.648.358l4.3 4.3V2.433z"/>
              </svg>
            </div>
            <div class="support-link-content">
              <h3>Telegram-чат сообщества</h3>
              <p>Общайтесь с другими пользователями, делитесь опытом и получайте помощь</p>
              <span class="support-link-hint">Откроется в браузере</span>
            </div>
            <div class="support-link-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15,3 21,3 21,9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </div>
          </a>
        </div>
      </div>
    `;
    }
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        this.saveTheme();
        this.addAction({
            action: `Применена ${this.currentTheme === 'light' ? 'светлая' : 'тёмная'} тема`,
            type: 'theme',
            status: 'success'
        });
    }
    applyTheme() {
        const root = document.documentElement;
        const sunIcon = document.querySelector('.theme-icon.sun');
        const moonIcon = document.querySelector('.theme-icon.moon');
        if (this.currentTheme === 'dark') {
            root.classList.add('dark-theme');
            sunIcon?.setAttribute('style', 'display: none');
            moonIcon?.setAttribute('style', 'display: block');
        }
        else {
            root.classList.remove('dark-theme');
            sunIcon?.setAttribute('style', 'display: block');
            moonIcon?.setAttribute('style', 'display: none');
        }
    }
    loadTheme() {
        const saved = localStorage.getItem('dashboard-theme');
        if (saved === 'dark') {
            this.currentTheme = 'dark';
            this.applyTheme();
        }
    }
    saveTheme() {
        localStorage.setItem('dashboard-theme', this.currentTheme);
    }
    showNotifications() {
        const notifications = [
            { title: 'Добро пожаловать!', message: 'Начните работу с SmartTable', time: '2 мин назад' },
            { title: 'Обновление', message: 'Доступна новая версия приложения', time: '1 час назад' },
            { title: 'Напоминание', message: 'Не забудьте сохранить файл', time: '3 часа назад' }
        ];
        const modal = document.createElement('div');
        modal.className = 'notifications-modal';
        modal.innerHTML = `
      <div class="notifications-overlay"></div>
      <div class="notifications-panel">
        <div class="notifications-header">
          <h3>Уведомления</h3>
          <button class="close-notifications">×</button>
        </div>
        <div class="notifications-list">
          ${notifications.map(n => `
            <div class="notification-item unread">
              <div class="notification-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <div class="notification-text">
                <p class="notification-title">${n.title}</p>
                <p class="notification-message">${n.message}</p>
                <span class="notification-time">${n.time}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
        document.body.appendChild(modal);
        modal.querySelector('.close-notifications')?.addEventListener('click', () => {
            modal.remove();
        });
        modal.querySelector('.notifications-overlay')?.addEventListener('click', () => {
            modal.remove();
        });
    }
    updateDatabaseStats() {
        try {
            // Получаем размер localStorage
            let totalSize = 0;
            for (const key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length * 2; // UTF-16
                }
            }
            const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
            const freeSpace = (5 - parseFloat(sizeMB)).toFixed(2); // Лимит 5MB
            const storageSize = document.getElementById('storageSize');
            const freeSpaceEl = document.getElementById('freeSpace');
            if (storageSize)
                storageSize.textContent = `${sizeMB} MB`;
            if (freeSpaceEl)
                freeSpaceEl.textContent = `${freeSpace} MB`;
            // Обновляем количество документов
            const docsCount = Object.keys(localStorage).filter(k => k.startsWith('smarttable-doc-')).length;
            const documentsCount = document.getElementById('documentsCount');
            if (documentsCount)
                documentsCount.textContent = docsCount.toString();
            // Обновляем активность
            const activityValue = document.getElementById('activityValue');
            if (activityValue) {
                const today = new Date().toISOString().split('T')[0];
                const dailyStats = timeTracker.getDailyStats(today);
                const activity = Math.min(100, Math.round((dailyStats.total_seconds / (8 * 3600)) * 100));
                activityValue.textContent = `${activity}%`;
            }
        }
        catch (e) {
            console.error('[Dashboard] Failed to update stats:', e);
        }
    }
    bindStatsCardEvents() {
        // Добавляем кликабельность для карточек
        const statCards = document.querySelectorAll('.time-stat-card, .metric-card, .stat-card');
        statCards.forEach(card => {
            card.addEventListener('click', () => {
                card.classList.add('clicked');
                setTimeout(() => card.classList.remove('clicked'), 200);
            });
        });
    }
    loadSavedAvatar() {
        const savedAvatar = localStorage.getItem('user-avatar');
        if (savedAvatar) {
            const userAvatarHeader = document.getElementById('userAvatarHeader');
            if (userAvatarHeader) {
                userAvatarHeader.style.backgroundImage = `url(${savedAvatar})`;
                userAvatarHeader.style.backgroundSize = 'cover';
                userAvatarHeader.style.backgroundPosition = 'center';
                userAvatarHeader.style.backgroundRepeat = 'no-repeat';
                userAvatarHeader.style.backgroundColor = 'transparent';
                userAvatarHeader.textContent = '';
                userAvatarHeader.classList.add('has-image');
            }
        }
    }
    open() {
        if (this.isOpen || !this.container)
            return;
        this.isOpen = true;
        this.container.style.display = 'block';
        document.body.style.overflow = 'hidden';
        // Обновляем статистику при открытии
        this.updateDatabaseStats();
        this.renderRecentActions();
    }
    close() {
        if (!this.isOpen || !this.container)
            return;
        this.isOpen = false;
        this.container.style.display = 'none';
        document.body.style.overflow = '';
    }
    toggle() {
        if (this.isOpen) {
            this.close();
        }
        else {
            this.open();
        }
    }
    destroy() {
        if (this.statsUpdateInterval) {
            clearInterval(this.statsUpdateInterval);
        }
        this.close();
        this.container?.remove();
    }
}
//# sourceMappingURL=DashboardComponent.js.map