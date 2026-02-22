/**
 * Settings Panel Component - панель настроек приложения
 */
import { themeManager } from '../core/theme-manager.js';
export class SettingsPanelComponent {
    constructor() {
        this.panel = null;
        this.themeGallery = null;
        this.accentColorsGrid = null;
        this.accentColors = [
            '#10b981', '#3b82f6', '#8b5cf6', '#f97316',
            '#ef4444', '#eab308', '#22c55e', '#06b6d4',
            '#f43f5e', '#a855f7', '#14b8a6', '#f59e0b'
        ];
        const container = document.getElementById('settings-panel-container');
        if (!container) {
            throw new Error('settings-panel-container not found');
        }
        this.container = container;
    }
    async init() {
        this.render();
        this.initElements();
        this.bindEvents();
        this.renderThemeGallery();
        this.renderAccentColors();
    }
    render() {
        this.container.innerHTML = `
      <div class="settings-panel-overlay" id="settingsPanelOverlay"></div>
      <div class="settings-panel" id="settingsPanel">
        <div class="settings-header">
          <div class="settings-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Настройки
          </div>
          <button class="btn-close-settings" id="btnCloseSettings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="settings-body" style="display: flex; flex: 1; overflow: hidden;">
          <div class="settings-tabs">
            <div class="settings-tab-group">
              <div class="settings-tab-parent" data-parent="appearance">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M9 3v18"/>
                  <path d="M15 9h6"/>
                </svg>
                <span>Внешний вид</span>
                <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;margin-left:auto;">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              <div class="settings-tab-children" id="appearanceChildren">
                <button class="settings-tab-child active" data-tab="themes">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                  </svg>
                  Темы
                </button>
                <button class="settings-tab-child" data-tab="accent">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 2a10 10 0 0 1 10 10"/>
                  </svg>
                  Акцент
                </button>
                <button class="settings-tab-child" data-tab="animations">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Анимации
                </button>
                <button class="settings-tab-child" data-tab="custom">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                    <path d="M2 2l7.586 7.586"/>
                    <circle cx="11" cy="11" r="2"/>
                  </svg>
                  Создать тему
                </button>
              </div>
            </div>
          </div>

          <div class="settings-content">
            <!-- Вкладка: Галерея тем -->
            <div class="settings-pane active" id="themesPane">
              <div class="pane-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px;">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
                <h2>Темы оформления</h2>
              </div>
              <div class="theme-gallery" id="themeGallery"></div>
            </div>

            <!-- Вкладка: Выбор акцентного цвета -->
            <div class="settings-pane" id="accentPane">
              <div class="pane-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px;">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 2a10 10 0 0 1 10 10"/>
                </svg>
                <h2>Акцентный цвет</h2>
              </div>
              <div class="accent-color-section">
                <div class="accent-color-title">Выберите акцентный цвет</div>
                <div class="accent-colors-grid" id="accentColorsGrid"></div>
              </div>
            </div>

            <!-- Вкладка: Анимации -->
            <div class="settings-pane" id="animationsPane">
              <div class="pane-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px;">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <h2>Анимации</h2>
              </div>
              <div class="settings-section">
                <div class="setting-item">
                  <div class="setting-item-info">
                    <div class="setting-item-label">Анимация выделения</div>
                    <div class="setting-item-description">Плавная анимация при выделении ячеек</div>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" id="toggleSelectionAnimation" checked>
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Вкладка: Создание пользовательской темы -->
            <div class="settings-pane" id="customPane">
              <div class="pane-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px;">
                  <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                  <path d="M2 2l7.586 7.586"/>
                  <circle cx="11" cy="11" r="2"/>
                </svg>
                <h2>Создать тему</h2>
              </div>
              <div class="theme-editor">
                <div class="editor-field">
                  <label class="editor-label">Название темы</label>
                  <input type="text" class="editor-input" id="customThemeName" placeholder="Например: Летний вечер">
                </div>
                <div class="editor-field">
                  <label class="editor-label">Описание</label>
                  <input type="text" class="editor-input" id="customThemeDesc" placeholder="Короткое описание темы">
                </div>
                <div class="editor-field">
                  <label class="editor-label">Категория</label>
                  <select class="editor-input" id="customThemeCategory">
                    <option value="light">Светлая</option>
                    <option value="dark">Тёмная</option>
                  </select>
                </div>
                <div class="editor-field">
                  <label class="editor-label">Основной цвет</label>
                  <div class="color-picker-wrapper">
                    <input type="color" class="editor-input color-preview" id="customPrimaryColor" value="#10b981">
                    <input type="text" class="editor-input" id="customPrimaryColorText" value="#10b981" style="flex:1;">
                  </div>
                </div>
                <div class="editor-field">
                  <label class="editor-label">Цвет фона</label>
                  <div class="color-picker-wrapper">
                    <input type="color" class="editor-input color-preview" id="customBgColor" value="#f8f9fa">
                    <input type="text" class="editor-input" id="customBgColorText" value="#f8f9fa" style="flex:1;">
                  </div>
                </div>
                <button class="btn-save-theme" id="btnSaveCustomTheme">Сохранить тему</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    }
    initElements() {
        this.panel = document.getElementById('settingsPanel');
        this.themeGallery = document.getElementById('themeGallery');
        this.accentColorsGrid = document.getElementById('accentColorsGrid');
    }
    bindEvents() {
        // Закрытие панели
        document.getElementById('btnCloseSettings')?.addEventListener('click', () => {
            this.close();
        });
        // Закрытие по клику на overlay
        document.getElementById('settingsPanelOverlay')?.addEventListener('click', () => {
            this.close();
        });
        // Клик по родительской вкладке (сворачивание/разворачивание)
        document.querySelectorAll('.settings-tab-parent').forEach(parent => {
            parent.addEventListener('click', () => {
                const children = document.getElementById('appearanceChildren');
                if (children) {
                    children.classList.toggle('open');
                    parent.classList.toggle('active');
                }
            });
        });
        // Переключение дочерних вкладок
        document.querySelectorAll('.settings-tab-child').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const target = e.currentTarget;
                this.switchTab(target.dataset.tab || 'themes');
            });
        });
        // Сохранение пользовательской темы
        document.getElementById('btnSaveCustomTheme')?.addEventListener('click', () => {
            this.saveCustomTheme();
        });
        // Синхронизация color picker и text input
        this.setupColorPickers();
        // Обработчик переключателя анимации
        const toggleAnimation = document.getElementById('toggleSelectionAnimation');
        if (toggleAnimation) {
            // Загрузить сохранённое значение
            const savedValue = localStorage.getItem('smarttable-selection-animation');
            if (savedValue !== null) {
                toggleAnimation.checked = savedValue === 'true';
            }
            toggleAnimation.addEventListener('change', (e) => {
                const value = e.target.checked;
                localStorage.setItem('smarttable-selection-animation', value.toString());
                this.applySelectionAnimation(value);
            });
        }
    }
    applySelectionAnimation(enabled) {
        const cellGrid = document.getElementById('cellGrid');
        if (cellGrid) {
            if (enabled) {
                cellGrid.style.transition = 'all 0.2s ease';
            }
            else {
                cellGrid.style.transition = 'none';
            }
        }
        // Сохранить в глобальную область для renderer
        window.selectionAnimationEnabled = enabled;
    }
    switchTab(tabId) {
        // Переключить дочерние кнопки
        document.querySelectorAll('.settings-tab-child').forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-tab') === tabId) {
                tab.classList.add('active');
            }
        });
        // Переключить панели
        document.querySelectorAll('.settings-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        const activePane = document.getElementById(`${tabId}Pane`);
        if (activePane) {
            activePane.classList.add('active');
        }
        // Если это не themes, перерисовать галерею при открытии themes
        if (tabId === 'themes') {
            this.renderThemeGallery();
        }
    }
    renderThemeGallery() {
        if (!this.themeGallery)
            return;
        const themes = themeManager.getAllThemes();
        const currentTheme = themeManager.getCurrentTheme();
        this.themeGallery.innerHTML = themes.map(theme => `
      <div class="theme-card ${theme.id === currentTheme?.id ? 'active' : ''}" data-theme-id="${theme.id}">
        <div class="theme-preview" style="background: ${theme.colors['bg-color']}">
          <div class="theme-preview-header" style="background: ${theme.colors['ribbon-bg']}"></div>
          <div class="theme-preview-body">
            <div class="theme-preview-cell" style="background: ${theme.colors['surface-color']}"></div>
            <div class="theme-preview-cell" style="background: ${theme.colors['selected-bg']}"></div>
          </div>
        </div>
        <div class="theme-info">
          <div class="theme-name">${theme.name}</div>
          <div class="theme-description">${theme.description}</div>
          <span class="theme-category-badge ${theme.category}">${theme.category === 'light' ? 'Светлая' : 'Тёмная'}</span>
        </div>
      </div>
    `).join('');
        // Клик по теме
        this.themeGallery.querySelectorAll('.theme-card').forEach(card => {
            card.addEventListener('click', () => {
                const themeId = card.getAttribute('data-theme-id');
                if (themeId) {
                    themeManager.applyTheme(themeId);
                    this.renderThemeGallery();
                    // Обновить CSS переменные
                    this.updateThemePreview();
                }
            });
        });
    }
    renderAccentColors() {
        if (!this.accentColorsGrid)
            return;
        const currentTheme = themeManager.getCurrentTheme();
        const currentAccent = currentTheme?.colors['accent-color'] || '#10b981';
        this.accentColorsGrid.innerHTML = this.accentColors.map(color => `
      <button class="accent-color-btn ${color === currentAccent ? 'active' : ''}" 
              style="background: ${color}" 
              data-color="${color}">
      </button>
    `).join('');
        // Клик по цвету
        this.accentColorsGrid.querySelectorAll('.accent-color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.getAttribute('data-color');
                if (color) {
                    this.setAccentColor(color);
                }
            });
        });
    }
    setAccentColor(color) {
        const root = document.documentElement;
        root.style.setProperty('--accent-color', color);
        root.style.setProperty('--primary-color', color);
        // Обновить UI
        this.accentColorsGrid?.querySelectorAll('.accent-color-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-color') === color);
        });
        // Сохранить в localStorage
        localStorage.setItem('smarttable-accent-color', color);
    }
    setupColorPickers() {
        const primaryColorPicker = document.getElementById('customPrimaryColor');
        const primaryColorText = document.getElementById('customPrimaryColorText');
        const bgColorPicker = document.getElementById('customBgColor');
        const bgColorText = document.getElementById('customBgColorText');
        if (primaryColorPicker && primaryColorText) {
            primaryColorPicker.addEventListener('input', (e) => {
                primaryColorText.value = e.target.value;
            });
            primaryColorText.addEventListener('input', (e) => {
                primaryColorPicker.value = e.target.value;
            });
        }
        if (bgColorPicker && bgColorText) {
            bgColorPicker.addEventListener('input', (e) => {
                bgColorText.value = e.target.value;
            });
            bgColorText.addEventListener('input', (e) => {
                bgColorPicker.value = e.target.value;
            });
        }
    }
    saveCustomTheme() {
        const name = document.getElementById('customThemeName').value.trim();
        const description = document.getElementById('customThemeDesc').value.trim();
        const categoryValue = document.getElementById('customThemeCategory').value;
        const primaryColor = document.getElementById('customPrimaryColor').value;
        const bgColor = document.getElementById('customBgColor').value;
        if (!name || !primaryColor || !bgColor) {
            alert('Заполните название и выберите цвета!');
            return;
        }
        const themeId = `custom-${Date.now()}`;
        const theme = {
            id: themeId,
            name,
            description: description || 'Пользовательская тема',
            category: 'custom',
            colors: {
                'bg-color': bgColor,
                'surface-color': categoryValue === 'light' ? '#ffffff' : '#1e293b',
                'border-color': categoryValue === 'light' ? '#e5e7eb' : '#334155',
                'border-light': categoryValue === 'light' ? '#f3f4f6' : '#1e293b',
                'text-primary': categoryValue === 'light' ? '#1f2937' : '#f1f5f9',
                'text-secondary': categoryValue === 'light' ? '#6b7280' : '#94a3b8',
                'text-muted': categoryValue === 'light' ? '#9ca3af' : '#64748b',
                'hover-bg': categoryValue === 'light' ? '#f3f4f6' : '#334155',
                'selected-bg': primaryColor + '20',
                'selected-border': primaryColor,
                'header-bg': categoryValue === 'light' ? '#f9fafb' : '#1e293b',
                'header-hover': categoryValue === 'light' ? '#e5e7eb' : '#334155',
                'ribbon-bg': categoryValue === 'light' ? '#fafbfc' : '#1e293b',
                'primary-color': primaryColor,
                'primary-hover': primaryColor,
                'primary-light': primaryColor + '20',
                'accent-color': primaryColor
            }
        };
        themeManager.addCustomTheme(theme);
        themeManager.applyTheme(themeId);
        this.renderThemeGallery();
        alert(`Тема "${name}" сохранена!`);
        // Очистить форму
        document.getElementById('customThemeName').value = '';
        document.getElementById('customThemeDesc').value = '';
    }
    updateThemePreview() {
        // Перерисовать галерею для обновления активной темы
        this.renderThemeGallery();
    }
    open() {
        if (this.panel) {
            this.panel.classList.add('open');
        }
        const overlay = document.getElementById('settingsPanelOverlay');
        if (overlay) {
            overlay.classList.add('open');
        }
        // Развернуть родительскую вкладку
        const children = document.getElementById('appearanceChildren');
        const parent = document.querySelector('.settings-tab-parent');
        if (children && parent) {
            setTimeout(() => {
                children.classList.add('open');
                parent.classList.add('active');
            }, 100);
        }
        // Перерисовать галерею тем при открытии
        this.renderThemeGallery();
    }
    close() {
        if (this.panel) {
            this.panel.classList.remove('open');
        }
        const overlay = document.getElementById('settingsPanelOverlay');
        if (overlay) {
            overlay.classList.remove('open');
        }
    }
    toggle() {
        if (this.panel?.classList.contains('open')) {
            this.close();
        }
        else {
            this.open();
        }
    }
    destroy() {
        this.panel = null;
        this.themeGallery = null;
        this.accentColorsGrid = null;
    }
}
//# sourceMappingURL=SettingsPanelComponent.js.map