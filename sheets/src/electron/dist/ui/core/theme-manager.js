/**
 * Theme Manager - управление темами приложения
 */
export class ThemeManager {
    constructor() {
        this.currentTheme = null;
        this.themes = [];
        this.defaultTheme = 'emerald-day';
    }
    static getInstance() {
        if (!ThemeManager.instance) {
            ThemeManager.instance = new ThemeManager();
        }
        return ThemeManager.instance;
    }
    /**
     * Загрузить темы из JSON файла
     */
    async loadThemes() {
        try {
            // Используем абсолютный путь для Electron
            const basePath = window.location.href.includes('index.html')
                ? window.location.href.substring(0, window.location.href.lastIndexOf('/')) + '/'
                : './';
            const response = await fetch(basePath + 'themes-gallery.json');
            // Проверяем, что файл существует
            if (!response.ok) {
                console.log('[ThemeManager] themes-gallery.json not found, using defaults');
                this.loadDefaultThemes();
                return;
            }
            const data = await response.json();
            this.themes = data.themes;
            this.defaultTheme = data.defaultTheme;
            console.log('[ThemeManager] Themes loaded:', this.themes.length);
        }
        catch (error) {
            console.log('[ThemeManager] Failed to load themes, using defaults:', error);
            // Загрузить дефолтную тему
            this.loadDefaultThemes();
        }
    }
    /**
     * Загрузить дефолтные темы (fallback)
     */
    loadDefaultThemes() {
        this.themes = [
            {
                id: 'emerald-day',
                name: 'Изумрудный день',
                category: 'light',
                description: 'Свежесть утреннего леса',
                colors: {
                    'bg-color': '#f8f9fa',
                    'surface-color': '#ffffff',
                    'border-color': '#e5e7eb',
                    'border-light': '#f3f4f6',
                    'text-primary': '#1f2937',
                    'text-secondary': '#6b7280',
                    'text-muted': '#9ca3af',
                    'hover-bg': '#f3f4f6',
                    'selected-bg': '#d1fae5',
                    'selected-border': '#10b981',
                    'header-bg': '#f9fafb',
                    'header-hover': '#e5e7eb',
                    'ribbon-bg': '#fafbfc',
                    'primary-color': '#10b981',
                    'primary-hover': '#059669',
                    'primary-light': '#d1fae5',
                    'accent-color': '#34d399'
                }
            },
            {
                id: 'ocean-depths',
                name: 'Глубина океана',
                category: 'dark',
                description: 'Таинственная глубина океана',
                colors: {
                    'bg-color': '#0f172a',
                    'surface-color': '#1e293b',
                    'border-color': '#334155',
                    'border-light': '#1e293b',
                    'text-primary': '#f1f5f9',
                    'text-secondary': '#94a3b8',
                    'text-muted': '#64748b',
                    'hover-bg': '#334155',
                    'selected-bg': '#1e3a5f',
                    'selected-border': '#3b82f6',
                    'header-bg': '#1e293b',
                    'header-hover': '#334155',
                    'ribbon-bg': '#1e293b',
                    'primary-color': '#3b82f6',
                    'primary-hover': '#2563eb',
                    'primary-light': '#1e3a5f',
                    'accent-color': '#60a5fa'
                }
            }
        ];
    }
    /**
     * Применить тему
     */
    applyTheme(themeId) {
        const theme = this.themes.find(t => t.id === themeId);
        if (!theme) {
            console.error('[ThemeManager] Theme not found:', themeId);
            return false;
        }
        this.currentTheme = theme;
        this.applyThemeColors(theme.colors);
        this.saveCurrentTheme(themeId);
        console.log('[ThemeManager] Theme applied:', theme.name);
        return true;
    }
    /**
     * Применить цвета темы к CSS переменным
     */
    applyThemeColors(colors) {
        const root = document.documentElement;
        Object.entries(colors).forEach(([property, value]) => {
            root.style.setProperty(`--${property}`, value);
        });
        // Добавить класс темы для дополнительных стилей
        root.setAttribute('data-theme', this.currentTheme?.id || '');
        root.setAttribute('data-theme-category', this.currentTheme?.category || 'light');
    }
    /**
     * Сохранить текущую тему в localStorage
     */
    saveCurrentTheme(themeId) {
        localStorage.setItem('smarttable-theme', themeId);
    }
    /**
     * Загрузить сохранённую тему
     */
    loadSavedTheme() {
        return localStorage.getItem('smarttable-theme');
    }
    /**
     * Инициализировать тему при загрузке
     */
    async initTheme() {
        // Сначала загрузим дефолтные темы
        this.loadDefaultThemes();
        // Затем попробуем загрузить из JSON
        await this.loadThemes();
        // Загрузим пользовательские темы
        this.loadCustomThemes();
        // Применим сохранённую тему
        const savedTheme = this.loadSavedTheme();
        if (savedTheme && this.themes.find(t => t.id === savedTheme)) {
            this.applyTheme(savedTheme);
        }
        else {
            this.applyTheme(this.defaultTheme);
        }
    }
    /**
     * Получить все темы
     */
    getAllThemes() {
        return this.themes;
    }
    /**
     * Получить темы по категории
     */
    getThemesByCategory(category) {
        return this.themes.filter(t => t.category === category);
    }
    /**
     * Получить текущую тему
     */
    getCurrentTheme() {
        return this.currentTheme;
    }
    /**
     * Добавить пользовательскую тему
     */
    addCustomTheme(theme) {
        this.themes.push(theme);
        this.saveCustomThemes();
        console.log('[ThemeManager] Custom theme added:', theme.name);
    }
    /**
     * Сохранить пользовательские темы
     */
    saveCustomThemes() {
        const customThemes = this.themes.filter(t => !['emerald-day', 'ocean-depths', 'sunset-glow', 'lavender-dream',
            'midnight-storm', 'forest-morning', 'cherry-blossom',
            'arctic-night', 'desert-sand', 'coffee-house'].includes(t.id));
        localStorage.setItem('smarttable-custom-themes', JSON.stringify(customThemes));
    }
    /**
     * Загрузить пользовательские темы
     */
    loadCustomThemes() {
        const saved = localStorage.getItem('smarttable-custom-themes');
        if (saved) {
            try {
                const customThemes = JSON.parse(saved);
                customThemes.forEach(theme => {
                    if (!this.themes.find(t => t.id === theme.id)) {
                        this.themes.push(theme);
                    }
                });
                console.log('[ThemeManager] Custom themes loaded:', customThemes.length);
            }
            catch (error) {
                console.error('[ThemeManager] Failed to load custom themes:', error);
            }
        }
    }
    /**
     * Удалить пользовательскую тему
     */
    removeCustomTheme(themeId) {
        const index = this.themes.findIndex(t => t.id === themeId);
        if (index > -1) {
            const theme = this.themes[index];
            // Не удалять встроенные темы
            if (theme.category === 'custom') {
                this.themes.splice(index, 1);
                this.saveCustomThemes();
                console.log('[ThemeManager] Custom theme removed:', themeId);
                return true;
            }
        }
        return false;
    }
}
// Экспорт единственного экземпляра
export const themeManager = ThemeManager.getInstance();
//# sourceMappingURL=theme-manager.js.map