/**
 * Dashboard Component - современный личный кабинет
 */
import { timeTracker, DailyStats, WeeklyStats } from '../core/time-tracker.js';

export class DashboardComponent {
  private isOpen = false;
  private container: HTMLElement | null = null;
  private currentTheme: 'light' | 'dark' = 'light';
  private activeSection: string = 'dashboard';
  private statsUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  init(): void {
    this.createDashboard();
    this.bindEvents();
    this.loadTheme();
    this.loadSavedAvatar();
  }

  private createDashboard(): void {
    if (document.getElementById('dashboard-container')) return;

    this.container = document.createElement('div');
    this.container.id = 'dashboard-container';
    this.container.innerHTML = `
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

    document.body.appendChild(this.container);
  }

  private getDashboardContent(): string {
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
          <div class="metric-card">
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
            <button class="view-all-btn">Посмотреть все</button>
          </div>
          <div class="actions-table">
            <div class="table-header">
              <div class="table-cell">Дата</div>
              <div class="table-cell">Действие</div>
              <div class="table-cell">Статус</div>
            </div>
            <div class="table-body">
              <div class="table-row">
                <div class="table-cell">23.02.2026 13:45</div>
                <div class="table-cell">Создан новый документ</div>
                <div class="table-cell"><span class="status success">Успешно</span></div>
              </div>
              <div class="table-row">
                <div class="table-cell">23.02.2026 12:30</div>
                <div class="table-cell">Экспорт в PDF</div>
                <div class="table-cell"><span class="status success">Успешно</span></div>
              </div>
              <div class="table-row">
                <div class="table-cell">23.02.2026 11:15</div>
                <div class="table-cell">Изменение формул</div>
                <div class="table-cell"><span class="status success">Успешно</span></div>
              </div>
              <div class="table-row">
                <div class="table-cell">22.02.2026 18:20</div>
                <div class="table-cell">Синхронизация</div>
                <div class="table-cell"><span class="status warning">В процессе</span></div>
              </div>
              <div class="table-row">
                <div class="table-cell">22.02.2026 16:45</div>
                <div class="table-cell">Удаление листа</div>
                <div class="table-cell"><span class="status success">Успешно</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    // Close dashboard
    const overlay = document.getElementById('dashboardOverlay');
    overlay?.addEventListener('click', () => this.close());

    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = (item as HTMLElement).dataset.section;
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

  private bindProfileAvatarEvents(): void {
    const changeAvatarBtn = document.getElementById('changeProfileAvatarBtn');
    const avatarInput = document.getElementById('profileAvatarInput');

    changeAvatarBtn?.addEventListener('click', () => {
      avatarInput?.click();
    });

    avatarInput?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && file.type.startsWith('image/')) {
        this.handleAvatarUpload(file);
      }
    });
  }

  private handleAvatarUpload(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      
      // Сохраняем в localStorage
      localStorage.setItem('user-avatar', imageUrl);
      
      // Обновляем аватар в профиле
      const profileAvatarLarge = document.getElementById('profileAvatarLarge');
      if (profileAvatarLarge) {
        profileAvatarLarge.style.backgroundImage = `url(${imageUrl})`;
        profileAvatarLarge.style.backgroundSize = 'cover';
        profileAvatarLarge.style.backgroundPosition = 'center';
        profileAvatarLarge.style.backgroundRepeat = 'no-repeat';
        profileAvatarLarge.style.backgroundColor = 'transparent';
        profileAvatarLarge.textContent = ''; // Убираем текст когда есть фото
        profileAvatarLarge.classList.add('has-image'); // Добавляем класс для стилизации
      }

      // Обновляем аватар в шапке
      const userAvatarHeader = document.getElementById('userAvatarHeader');
      if (userAvatarHeader) {
        userAvatarHeader.style.backgroundImage = `url(${imageUrl})`;
        userAvatarHeader.style.backgroundSize = 'cover';
        userAvatarHeader.style.backgroundPosition = 'center';
        userAvatarHeader.style.backgroundRepeat = 'no-repeat';
        userAvatarHeader.style.backgroundColor = 'transparent';
        userAvatarHeader.textContent = ''; // Убираем текст когда есть фото
        userAvatarHeader.classList.add('has-image'); // Добавляем класс для стилизации
      }
      
      console.log('Avatar uploaded successfully');
    };
    reader.readAsDataURL(file);
  }

  private switchSection(section: string): void {
    this.activeSection = section;
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`)?.classList.add('active');

    // Update page title
    const titles: { [key: string]: string } = {
      dashboard: 'Dashboard',
      profile: 'Профиль',
      history: 'История',
      settings: 'Настройки',
      support: 'Поддержка'
    };
    
    const titleElement = document.getElementById('pageTitle');
    if (titleElement) {
      titleElement.textContent = titles[section] || 'Dashboard';
    }

    // Update content
    const contentElement = document.getElementById('dashboardContent');
    if (contentElement) {
      switch (section) {
        case 'profile':
          contentElement.innerHTML = this.getProfileContent();
          // Перепривязываем события для аватара после обновления HTML
          setTimeout(() => this.bindProfileAvatarEvents(), 100);
          break;
        case 'history':
          contentElement.innerHTML = this.getHistoryContent();
          break;
        case 'support':
          contentElement.innerHTML = this.getSupportContent();
          break;
        default:
          contentElement.innerHTML = this.getDashboardContent();
      }
    }
  }

  private getProfileContent(): string {
    return `
      <div class="profile-section">
        <div class="profile-card">
          <div class="profile-avatar">
            <div class="avatar-large" id="profileAvatarLarge">П</div>
            <input type="file" id="profileAvatarInput" accept="image/*" style="display: none;">
            <button class="change-avatar-btn" id="changeProfileAvatarBtn">Изменить фото</button>
          </div>
          <div class="profile-info">
            <h2>Пользователь</h2>
            <p class="profile-email">user@example.com</p>
            <div class="profile-stats">
              <div class="stat">
                <span class="stat-label">Дата регистрации</span>
                <span class="stat-value">15.01.2024</span>
              </div>
              <div class="stat">
                <span class="stat-label">План</span>
                <span class="stat-value">Pro</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private getHistoryContent(): string {
    return `
      <div class="history-section">
        <h2>История действий</h2>
        <p>Полная история ваших действий в приложении</p>
      </div>
    `;
  }

  private getSupportContent(): string {
    return `
      <div class="support-section">
        <h2>Поддержка</h2>
        <p>Свяжитесь с нашей командой поддержки</p>
      </div>
    `;
  }

  private toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme();
    this.saveTheme();
  }

  private applyTheme(): void {
    const root = document.documentElement;
    const sunIcon = document.querySelector('.theme-icon.sun');
    const moonIcon = document.querySelector('.theme-icon.moon');

    if (this.currentTheme === 'dark') {
      root.classList.add('dark-theme');
      sunIcon?.setAttribute('style', 'display: none');
      moonIcon?.setAttribute('style', 'display: block');
    } else {
      root.classList.remove('dark-theme');
      sunIcon?.setAttribute('style', 'display: block');
      moonIcon?.setAttribute('style', 'display: none');
    }
  }

  private loadTheme(): void {
    const saved = localStorage.getItem('dashboard-theme');
    if (saved === 'dark') {
      this.currentTheme = 'dark';
      this.applyTheme();
    }
  }

  private saveTheme(): void {
    localStorage.setItem('dashboard-theme', this.currentTheme);
  }

  private showNotifications(): void {
    // Получаем список уведомлений из localStorage
    const notifications = this.getNotifications();
    
    // Создаём модальное окно
    const modal = document.createElement('div');
    modal.className = 'notifications-modal';
    
    let notificationsHtml = '';
    if (notifications.length > 0) {
      notifications.forEach((n: {title: string, message: string, time: string, read: boolean}) => {
        notificationsHtml += `
          <div class="notification-item ${n.read ? 'read' : 'unread'}">
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
          </div>`;
      });
    } else {
      notificationsHtml = `
        <div class="no-notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <p>Нет уведомлений</p>
        </div>`;
    }
    
    modal.innerHTML = `
      <div class="notifications-overlay" id="notificationsOverlay"></div>
      <div class="notifications-panel">
        <div class="notifications-header">
          <h3>Уведомления</h3>
          <button class="close-btn" id="closeNotifications">&times;</button>
        </div>
        <div class="notifications-content">
          ${notificationsHtml}
        </div>
      </div>`;
    
    document.body.appendChild(modal);
    
    // Обработчики закрытия
    const overlay = document.getElementById('notificationsOverlay');
    const closeBtn = document.getElementById('closeNotifications');
    
    const closeModal = () => {
      modal.remove();
      // Отмечаем уведомления как прочитанные
      this.markNotificationsAsRead();
    };
    
    overlay?.addEventListener('click', closeModal);
    closeBtn?.addEventListener('click', closeModal);
    
    // Проматываем вниз
    setTimeout(() => {
      const content = modal.querySelector('.notifications-content');
      if (content) {
        content.scrollTop = content.scrollHeight;
      }
    }, 100);
  }

  private getNotifications(): Array<{title: string, message: string, time: string, read: boolean}> {
    // Получаем уведомления из localStorage
    try {
      const saved = localStorage.getItem('notifications');
      return saved ? JSON.parse(saved) : this.getDefaultNotifications();
    } catch {
      return this.getDefaultNotifications();
    }
  }

  private getDefaultNotifications(): Array<{title: string, message: string, time: string, read: boolean}> {
    return [
      { title: 'Добро пожаловать!', message: 'Спасибо за использование SmartTable', time: 'Сегодня', read: false },
      { title: 'Новая функция', message: 'Теперь вы можете загружать фото профиля', time: 'Вчера', read: false },
    ];
  }

  private markNotificationsAsRead(): void {
    const notifications = this.getNotifications();
    notifications.forEach(n => n.read = true);
    localStorage.setItem('notifications', JSON.stringify(notifications));
    
    // Скрываем badge
    const badge = document.querySelector('.notification-badge') as HTMLElement;
    if (badge) {
      badge.style.display = 'none';
    }
  }

  private openAIChat(): void {
    const aiChat = (window as any).aiChat;
    if (aiChat) {
      aiChat.open();
    }
  }

  private getActivityTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'spreadsheet': 'Таблицы',
      'dashboard': 'Личный кабинет',
      'ai_chat': 'AI Ассистент',
      'other': 'Другое',
      'none': 'Нет данных'
    };
    return labels[type] || type;
  }

  private getPercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  private updateDatabaseStats(): void {
    // Расчет размера базы данных
    let dbSize = 0;
    let messageCount = 0;

    // Получаем все данные из localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          dbSize += key.length + value.length;
          
          // Считаем сообщения AI
          if (key.includes('ai') || key.includes('chat') || key.includes('message')) {
            try {
              const data = JSON.parse(value);
              if (Array.isArray(data)) {
                messageCount += data.length;
              }
            } catch {
              // Игнорируем ошибки парсинга
            }
          }
        }
      }
    }

    // Расчет размера в KB/MB
    const dbSizeKB = Math.round(dbSize / 1024);
    const dbSizeMB = (dbSizeKB / 1024).toFixed(2);

    // Обновляем элементы хранилища
    const storageSizeElement = document.getElementById('storageSize');
    const freeSpaceElement = document.getElementById('freeSpace');
    const totalStorageSizeElement = document.getElementById('totalStorageSize');
    
    if (storageSizeElement) {
      storageSizeElement.textContent = `${dbSizeKB > 1024 ? `${dbSizeMB} MB` : `${dbSizeKB} KB`}`;
    }
    if (freeSpaceElement) {
      freeSpaceElement.textContent = `${Math.max(0, 10 - parseFloat(dbSizeMB)).toFixed(2)} MB`;
    }
    if (totalStorageSizeElement) {
      totalStorageSizeElement.textContent = `${dbSizeMB} MB`;
    }

    // Обновление карточки "Активность"
    this.updateActivityStats();

    // Обновление карточки "Документы"
    this.updateDocumentsStats();

    // Обновление секции XLSX файлов
    this.updateXLSXStats();
  }

  private updateActivityStats(): void {
    const activityValueElement = document.getElementById('activityValue');
    const activityChangeElement = document.getElementById('activityChange');

    if (!activityValueElement || !activityChangeElement) return;

    const today = new Date().toISOString().split('T')[0];
    const dailyStats = timeTracker.getDailyStats(today);
    const weeklyStats = timeTracker.getWeeklyStats();

    // Получаем статистику за вчера
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    const yesterdayStats = timeTracker.getDailyStats(yesterdayString);

    // Рассчитываем процент активности (отношение времени сегодня ко времени вчера)
    let activityPercent = 0;
    if (yesterdayStats.total_seconds > 0) {
      activityPercent = Math.round((dailyStats.total_seconds / yesterdayStats.total_seconds) * 100);
    } else if (dailyStats.total_seconds > 0) {
      activityPercent = 100; // Если вчера не было активности, а сегодня есть - это 100%
    }

    // Рассчитываем изменение по сравнению с прошлой неделей
    const lastWeekStart = new Date();
    lastWeekStart.setDate(lastWeekStart.getDate() - 7 - lastWeekStart.getDay());
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekStart.getDate() + 6);

    let lastWeekTotal = 0;
    for (let d = new Date(lastWeekStart); d <= lastWeekEnd; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayStats = timeTracker.getDailyStats(dateStr);
      lastWeekTotal += dayStats.total_seconds;
    }

    const thisWeekTotal = weeklyStats.total_seconds;
    let weekChange = 0;
    let weekChangeText = '';
    let changeClass = 'neutral';

    if (lastWeekTotal > 0) {
      weekChange = Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100);
      if (weekChange > 0) {
        weekChangeText = `+${weekChange}% за неделю`;
        changeClass = 'positive';
      } else if (weekChange < 0) {
        weekChangeText = `${weekChange}% за неделю`;
        changeClass = 'negative';
      } else {
        weekChangeText = 'Без изменений';
      }
    } else if (thisWeekTotal > 0) {
      weekChangeText = 'Новая неделя';
      changeClass = 'positive';
    } else {
      weekChangeText = 'Нет данных';
    }

    // Обновляем значения
    activityValueElement.textContent = `${activityPercent}%`;
    activityChangeElement.textContent = weekChangeText;

    // Обновляем класс для изменения
    activityChangeElement.className = `metric-change ${changeClass}`;
  }

  private updateDocumentsStats(): void {
    const documentsCountElement = document.getElementById('documentsCount');
    const documentsChangeElement = document.getElementById('documentsChange');

    if (!documentsCountElement || !documentsChangeElement) return;

    // Подсчитываем количество файлов/проектов в localStorage
    let totalFiles = 0;
    let newFilesToday = 0;
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        // Считаем файлы SmartTable (проекты, таблицы и т.д.)
        if (key.includes('project') || key.includes('sheet') || key.includes('table') || 
            key.includes('file') || key.endsWith('.json')) {
          totalFiles++;

          // Проверяем, создан ли файл сегодня
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const data = JSON.parse(value);
              // Проверяем дату создания
              if (data.createdAt && data.createdAt.startsWith(today)) {
                newFilesToday++;
              }
            }
          } catch {
            // Игнорируем ошибки парсинга
          }
        }
      }
    }

    // Также считаем JSON проекты
    totalFiles += this.countJSONProjects();

    // Обновляем значения
    documentsCountElement.textContent = totalFiles.toString();

    if (newFilesToday > 0) {
      documentsChangeElement.textContent = `+${newFilesToday} новых`;
      documentsChangeElement.className = 'metric-change positive';
    } else {
      documentsChangeElement.textContent = 'Нет новых';
      documentsChangeElement.className = 'metric-change neutral';
    }
  }

  private updateXLSXStats(): void {
    const xlsxCountElement = document.getElementById('xlsxCount');
    const xlsxTotalCountElement = document.getElementById('xlsxTotalCount');
    const xlsxDataSizeElement = document.getElementById('xlsxDataSize');

    if (!xlsxCountElement || !xlsxTotalCountElement || !xlsxDataSizeElement) return;

    const xlsxCount = this.countXLSXFiles();
    const xlsxSize = this.getXLSXDataSize();

    xlsxCountElement.textContent = `${xlsxCount} файлов`;
    xlsxTotalCountElement.textContent = xlsxCount.toString();
    xlsxDataSizeElement.textContent = this.formatBytes(xlsxSize);
  }

  private countJSONProjects(): number {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('project') || key.includes('json') || key.endsWith('.json'))) {
        count++;
      }
    }
    return count;
  }

  private countXLSXFiles(): number {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('xlsx') || key.includes('spreadsheet') || 
          key.includes('sheet') || key.includes('excel') || 
          key.includes('table') || key.endsWith('.xls'))) {
        count++;
      }
    }
    return count;
  }

  private getXLSXDataSize(): number {
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('xlsx') || key.includes('spreadsheet') || 
          key.includes('sheet') || key.includes('excel') || 
          key.includes('table') || key.endsWith('.xls'))) {
        const value = localStorage.getItem(key);
        if (value) {
          size += key.length + value.length;
        }
      }
    }
    return size;
  }

  private countTotalFiles(): number {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('file') || key.includes('document') || key.includes('sheet'))) {
        count++;
      }
    }
    return count;
  }

  private countAISessions(): number {
    try {
      const sessions = localStorage.getItem('ai_sessions');
      if (sessions) {
        const data = JSON.parse(sessions);
        return Array.isArray(data) ? data.length : 0;
      }
    } catch {
      // Игнорируем ошибки
    }
    return 0;
  }

  private countActiveSessions(): number {
    try {
      const currentSession = localStorage.getItem('time_tracker_current_session');
      if (currentSession) {
        const session = JSON.parse(currentSession);
        return session.is_active ? 1 : 0;
      }
    } catch {
      // Игнорируем ошибки
    }
    return 0;
  }

  private calculateStorageSize(): string {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    }
    
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    return `${sizeMB} MB`;
  }

  private calculateFreeSpace(): string {
    // localStorage обычно имеет лимит ~5-10MB
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    }
    
    const usedMB = totalSize / (1024 * 1024);
    const freeMB = Math.max(0, 10 - usedMB); // Предполагаем лимит 10MB
    return `${freeMB.toFixed(2)} MB`;
  }

  private bindStatsCardEvents(): void {
    console.log('[Dashboard] Binding stats card events...');
    
    // Добавляем клик на карточку хранилища
    const storageCard = this.container?.querySelector('.stat-icon.storage')?.closest('.stat-card') as HTMLElement;
    console.log('[Dashboard] Storage card found:', !!storageCard);
    
    if (storageCard) {
      storageCard.addEventListener('click', (e) => {
        console.log('[Dashboard] Storage card clicked!');
        e.preventDefault();
        e.stopPropagation();
        this.showStorageDetails();
      });
      storageCard.style.cursor = 'pointer';
      storageCard.style.position = 'relative';
      
      // Добавляем визуальный индикатор кликабельности
      storageCard.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
      console.log('[Dashboard] Storage card event listener added');
    }

    // Добавляем клики на другие карточки для будущей функциональности
    const dbCard = this.container?.querySelector('.stat-icon.database')?.closest('.stat-card') as HTMLElement;
    console.log('[Dashboard] DB card found:', !!dbCard);
    
    if (dbCard) {
      dbCard.addEventListener('click', (e) => {
        console.log('[Dashboard] DB card clicked!');
        e.preventDefault();
        e.stopPropagation();
        this.showDatabaseDetails();
      });
      dbCard.style.cursor = 'pointer';
      dbCard.style.position = 'relative';
      dbCard.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
      console.log('[Dashboard] DB card event listener added');
    }
  }

  private showStorageDetails(): void {
    const storageData = this.getDetailedStorageInfo();
    const aiSessionCount = this.countAISessions();
    const projectCount = this.countJSONProjects();
    
    const modal = document.createElement('div');
    modal.className = 'storage-modal-overlay';
    modal.innerHTML = `
      <div class="storage-modal">
        <div class="storage-modal-header">
          <h3>Детальная информация о хранилище</h3>
          <button class="storage-modal-close" onclick="this.closest('.storage-modal-overlay').remove()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="storage-modal-content">
          <div class="storage-overview">
            <div class="storage-chart">
              <div class="storage-circle">
                <div class="storage-fill" style="background: conic-gradient(var(--primary) ${storageData.percentage}%, var(--bg-secondary) ${storageData.percentage}%)"></div>
                <div class="storage-center">
                  <div class="storage-percentage">${storageData.percentage}%</div>
                  <div class="storage-label">Занято</div>
                </div>
              </div>
            </div>
            <div class="storage-stats">
              <div class="storage-stat">
                <span class="storage-stat-label">Всего:</span>
                <span class="storage-stat-value">10 MB</span>
              </div>
              <div class="storage-stat">
                <span class="storage-stat-label">Занято:</span>
                <span class="storage-stat-value">${storageData.usedMB} MB</span>
              </div>
              <div class="storage-stat">
                <span class="storage-stat-label">Свободно:</span>
                <span class="storage-stat-value">${storageData.freeMB} MB</span>
              </div>
            </div>
          </div>
          
          <div class="storage-sections">
            <!-- AI Сессии -->
            <div class="storage-section">
              <div class="storage-section-header" onclick="this.toggleSection('ai-section')">
                <div class="storage-section-info">
                  <div class="storage-section-icon ai">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                  </div>
                  <div class="storage-section-title">
                    <h4>AI Сессии</h4>
                    <p class="storage-section-count">${aiSessionCount} сессий</p>
                  </div>
                </div>
                <svg class="storage-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6,9 12,15 18,9"/>
                </svg>
              </div>
              <div class="storage-section-content" id="ai-section">
                <div class="storage-section-items">
                  <div class="storage-section-item">
                    <span class="item-label">Всего сессий:</span>
                    <span class="item-value">${aiSessionCount}</span>
                  </div>
                  <div class="storage-section-item">
                    <span class="item-label">Активных:</span>
                    <span class="item-value">${this.countActiveSessions()}</span>
                  </div>
                  <div class="storage-section-item">
                    <span class="item-label">Размер данных:</span>
                    <span class="item-value">${this.formatBytes(this.getAIDataSize())}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- XLSX Файлы -->
            <div class="storage-section">
              <div class="storage-section-header" onclick="this.toggleSection('xlsx-section')">
                <div class="storage-section-info">
                  <div class="storage-section-icon projects">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="8" y1="13" x2="16" y2="13"/>
                      <line x1="8" y1="17" x2="16" y2="17"/>
                    </svg>
                  </div>
                  <div class="storage-section-title">
                    <h4>Файлы XLSX</h4>
                    <p class="storage-section-count" id="xlsxCount">${this.countXLSXFiles()} файлов</p>
                  </div>
                </div>
                <svg class="storage-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6,9 12,15 18,9"/>
                </svg>
              </div>
              <div class="storage-section-content" id="xlsx-section">
                <div class="storage-section-items">
                  <div class="storage-section-item">
                    <span class="item-label">Всего файлов:</span>
                    <span class="item-value" id="xlsxTotalCount">${this.countXLSXFiles()}</span>
                  </div>
                  <div class="storage-section-item">
                    <span class="item-label">Размер данных:</span>
                    <span class="item-value" id="xlsxDataSize">${this.formatBytes(this.getXLSXDataSize())}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="storage-breakdown">
            <h4>Распределение по типам данных</h4>
            <div class="storage-items">
              ${storageData.categories.map(category => `
                <div class="storage-item">
                  <div class="storage-item-info">
                    <div class="storage-item-color" style="background: ${category.color}"></div>
                    <span class="storage-item-name">${category.name}</span>
                  </div>
                  <div class="storage-item-size">${category.size}</div>
                  <div class="storage-item-percentage">${category.percentage}%</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="storage-actions">
            <button class="storage-btn primary" onclick="this.clearStorage()">Очистить кэш</button>
            <button class="storage-btn secondary" onclick="this.exportStorage()">Экспорт данных</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Добавляем обработчики для кнопок
    const clearBtn = modal.querySelector('.storage-btn.primary');
    const exportBtn = modal.querySelector('.storage-btn.secondary');

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearStorageCache(modal));
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportStorageData());
    }

    // Добавляем обработчики для секций
    this.addSectionHandlers(modal);
  }

  private getDetailedStorageInfo() {
    let totalSize = 0;
    const categories: { [key: string]: { size: number, count: number } } = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          const size = key.length + value.length;
          totalSize += size;

          // Категоризируем данные
          let category = 'other';
          if (key.includes('ai') || key.includes('chat') || key.includes('message')) {
            category = 'ai';
          } else if (key.includes('project') || key.includes('json')) {
            category = 'projects';
          } else if (key.includes('time') || key.includes('session')) {
            category = 'sessions';
          } else if (key.includes('avatar') || key.includes('theme') || key.includes('settings')) {
            category = 'settings';
          }

          if (!categories[category]) {
            categories[category] = { size: 0, count: 0 };
          }
          categories[category].size += size;
          categories[category].count++;
        }
      }
    }

    const usedMB = (totalSize / (1024 * 1024)).toFixed(2);
    const freeMB = Math.max(0, 10 - parseFloat(usedMB)).toFixed(2);
    const percentage = Math.round((parseFloat(usedMB) / 10) * 100);

    const categoryData = [
      { name: 'AI данные', color: '#3b82f6', size: this.formatBytes(categories.ai?.size || 0), percentage: Math.round(((categories.ai?.size || 0) / totalSize) * 100) },
      { name: 'Проекты', color: '#10b981', size: this.formatBytes(categories.projects?.size || 0), percentage: Math.round(((categories.projects?.size || 0) / totalSize) * 100) },
      { name: 'Сессии', color: '#f59e0b', size: this.formatBytes(categories.sessions?.size || 0), percentage: Math.round(((categories.sessions?.size || 0) / totalSize) * 100) },
      { name: 'Настройки', color: '#8b5cf6', size: this.formatBytes(categories.settings?.size || 0), percentage: Math.round(((categories.settings?.size || 0) / totalSize) * 100) },
      { name: 'Другое', color: '#6b7280', size: this.formatBytes(categories.other?.size || 0), percentage: Math.round(((categories.other?.size || 0) / totalSize) * 100) }
    ];

    return {
      usedMB: parseFloat(usedMB),
      freeMB: parseFloat(freeMB),
      percentage,
      categories: categoryData
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private clearStorageCache(modal: HTMLElement): void {
    // Очищаем только кэш, сохраняя важные данные
    const keysToKeep = [
      'user-avatar',
      'dashboard-theme',
      'time_tracker_sessions',
      'time_tracker_current_session',
      'ai_sessions'
    ];

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !keysToKeep.includes(key)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Обновляем статистику
    this.updateDatabaseStats();
    
    // Показываем уведомление
    const notification = document.createElement('div');
    notification.className = 'storage-notification';
    notification.textContent = `Очищено ${keysToRemove.length} элементов кэша`;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
  }

  private exportStorageData(): void {
    const data: { [key: string]: any } = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value;
          }
        }
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smarttable-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private showDatabaseDetails(): void {
    // Заглушка для будущей функциональности
    alert('Детальная информация о базе данных будет доступна в следующем обновлении');
  }

  private showProjectsDetails(): void {
    // Заглушка для будущей функциональности
    alert('Детальная информация о проектах будет доступна в следующем обновлении');
  }

  private showSessionsDetails(): void {
    // Заглушка для будущей функциональности
    alert('Детальная информация о сессиях будет доступна в следующем обновлении');
  }

  private getAIDataSize(): number {
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('ai') || key.includes('chat') || key.includes('message') || key.includes('session'))) {
        const value = localStorage.getItem(key);
        if (value) {
          size += key.length + value.length;
        }
      }
    }
    return size;
  }

  private getProjectsDataSize(): number {
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('project') || key.includes('json') || key.endsWith('.json'))) {
        const value = localStorage.getItem(key);
        if (value) {
          size += key.length + value.length;
        }
      }
    }
    return size;
  }

  private addSectionHandlers(modal: HTMLElement): void {
    // Добавляем обработчики для переключения секций
    const aiHeader = modal.querySelector('.storage-section-header[onclick*="ai-section"]');
    const projectsHeader = modal.querySelector('.storage-section-header[onclick*="projects-section"]');

    if (aiHeader) {
      aiHeader.addEventListener('click', () => this.toggleSection('ai-section', modal));
    }

    if (projectsHeader) {
      projectsHeader.addEventListener('click', () => this.toggleSection('projects-section', modal));
    }
  }

  private toggleSection(sectionId: string, modal: HTMLElement): void {
    const section = modal.querySelector(`#${sectionId}`) as HTMLElement;
    const arrow = modal.querySelector(`.storage-section-header[onclick*="${sectionId}"] .storage-section-arrow`) as HTMLElement;
    
    if (section && arrow) {
      const isExpanded = section.style.display !== 'none';
      
      if (isExpanded) {
        section.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
      } else {
        section.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
      }
    }
  }

  private loadSavedAvatar(): void {
    const savedAvatar = localStorage.getItem('user-avatar');
    if (savedAvatar) {
      // Обновляем аватар в профиле
      const profileAvatarLarge = document.getElementById('profileAvatarLarge');
      if (profileAvatarLarge) {
        profileAvatarLarge.style.backgroundImage = `url(${savedAvatar})`;
        profileAvatarLarge.style.backgroundSize = 'cover';
        profileAvatarLarge.style.backgroundPosition = 'center';
        profileAvatarLarge.style.backgroundRepeat = 'no-repeat';
        profileAvatarLarge.style.backgroundColor = 'transparent';
        profileAvatarLarge.textContent = ''; // Убираем текст когда есть фото
        profileAvatarLarge.classList.add('has-image'); // Добавляем класс для стилизации
      }

      // Обновляем аватар в шапке
      const userAvatarHeader = document.getElementById('userAvatarHeader');
      if (userAvatarHeader) {
        userAvatarHeader.style.backgroundImage = `url(${savedAvatar})`;
        userAvatarHeader.style.backgroundSize = 'cover';
        userAvatarHeader.style.backgroundPosition = 'center';
        userAvatarHeader.style.backgroundRepeat = 'no-repeat';
        userAvatarHeader.style.backgroundColor = 'transparent';
        userAvatarHeader.textContent = ''; // Убираем текст когда есть фото
        userAvatarHeader.classList.add('has-image'); // Добавляем класс для стилизации
      }
    }
  }

  open(): void {
    if (this.isOpen || !this.container) return;
    
    this.isOpen = true;
    this.container.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Начинаем отслеживание времени в личном кабинете
    timeTracker.startSession('dashboard');
    
    // Обновляем статистику при открытии
    this.updateDatabaseStats();
    
    // Устанавливаем периодическое обновление статистики каждые 5 секунд
    this.statsUpdateInterval = setInterval(() => {
      this.updateDatabaseStats();
    }, 5000);
  }

  close(): void {
    if (!this.isOpen || !this.container) return;
    
    this.isOpen = false;
    this.container.style.display = 'none';
    document.body.style.overflow = '';
    
    // Очищаем интервал обновления статистики
    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval);
      this.statsUpdateInterval = null;
    }
    
    // Завершаем сессию личного кабинета
    timeTracker.endCurrentSession();
    
    // Начинаем отслеживание времени в таблицах (предполагаем, что это основная активность)
    timeTracker.startSession('spreadsheet');
  }

  destroy(): void {
    this.close();
    this.container?.remove();
  }
}
