/**
 * Dashboard Component - современный личный кабинет
 */
export class DashboardComponent {
  private isOpen = false;
  private container: HTMLElement | null = null;
  private currentTheme: 'light' | 'dark' = 'light';
  private activeSection: string = 'dashboard';

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
            <a href="#" class="nav-item" data-section="settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span>Настройки</span>
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
    return `
      <div class="dashboard-section">
        <!-- Welcome Section -->
        <div class="welcome-section">
          <h2 class="welcome-title">Добро пожаловать обратно! 👋</h2>
          <p class="welcome-subtitle">Вот ваша статистика и последние действия</p>
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
              <p class="metric-value">87%</p>
              <p class="metric-change positive">+12% за неделю</p>
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
              <p class="metric-value">24</p>
              <p class="metric-change positive">+5 новых</p>
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
              <p class="metric-value">142ч</p>
              <p class="metric-change neutral">+8ч за неделю</p>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon storage">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 7h16v10H4z"/>
                <path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/>
              </svg>
            </div>
            <div class="metric-content">
              <h3 class="metric-title">Хранилище</h3>
              <p class="metric-value">2.4GB</p>
              <p class="metric-change neutral">из 10GB</p>
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

    // Profile avatar upload
    this.bindProfileAvatarEvents();

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
      
      // Устанавливаем CSS переменные
      document.documentElement.style.setProperty('--avatar-image', `url(${imageUrl})`);
      document.documentElement.style.setProperty('--avatar-bg', 'transparent');
      
      // Обновляем аватар в профиле
      const profileAvatarLarge = document.getElementById('profileAvatarLarge');
      if (profileAvatarLarge) {
        profileAvatarLarge.style.backgroundImage = `url(${imageUrl})`;
        profileAvatarLarge.style.backgroundSize = 'cover';
        profileAvatarLarge.style.backgroundPosition = 'center';
        profileAvatarLarge.style.backgroundRepeat = 'no-repeat';
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
        userAvatarHeader.textContent = ''; // Убираем текст когда есть фото
        userAvatarHeader.classList.add('has-image'); // Добавляем класс для стилизации
      }

      // Сохраняем в localStorage
      localStorage.setItem('user-avatar', imageUrl);
      
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
        case 'settings':
          contentElement.innerHTML = this.getSettingsContent();
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

  private getSettingsContent(): string {
    return `
      <div class="settings-section">
        <h2>Настройки</h2>
        <p>Управление настройками приложения</p>
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
    alert('Уведомления: 3 новых сообщения');
  }

  private loadSavedAvatar(): void {
    const savedAvatar = localStorage.getItem('user-avatar');
    if (savedAvatar) {
      // Устанавливаем CSS переменные
      document.documentElement.style.setProperty('--avatar-image', `url(${savedAvatar})`);
      document.documentElement.style.setProperty('--avatar-bg', 'transparent');
      
      // Обновляем аватар в профиле
      const profileAvatarLarge = document.getElementById('profileAvatarLarge');
      if (profileAvatarLarge) {
        profileAvatarLarge.style.backgroundImage = `url(${savedAvatar})`;
        profileAvatarLarge.style.backgroundSize = 'cover';
        profileAvatarLarge.style.backgroundPosition = 'center';
        profileAvatarLarge.style.backgroundRepeat = 'no-repeat';
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
        userAvatarHeader.textContent = ''; // Убираем текст когда есть фото
        userAvatarHeader.classList.add('has-image'); // Добавляем класс для стилизации
      }
    } else {
      // Сбрасываем переменные если нет фото
      document.documentElement.style.setProperty('--avatar-image', 'none');
      document.documentElement.style.setProperty('--avatar-bg', 'var(--bg-secondary)');
    }
  }

  open(): void {
    if (this.isOpen || !this.container) return;
    
    this.isOpen = true;
    this.container.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  close(): void {
    if (!this.isOpen || !this.container) return;
    
    this.isOpen = false;
    this.container.style.display = 'none';
    document.body.style.overflow = '';
  }

  destroy(): void {
    this.close();
    this.container?.remove();
  }
}
