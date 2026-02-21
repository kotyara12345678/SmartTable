/**
 * WidgetLoader - загрузчик и менеджер виджетов
 */
export class WidgetLoader {
    constructor(containerId = 'app') {
        this.widgets = new Map();
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }
        this.container = container;
    }
    /**
     * Зарегистрировать виджет
     */
    register(name, widget) {
        this.widgets.set(name, widget);
    }
    /**
     * Получить виджет по имени
     */
    get(name) {
        return this.widgets.get(name);
    }
    /**
     * Создать контейнер для виджета
     */
    createContainer(id, className = '') {
        const container = document.createElement('div');
        container.id = id;
        if (className)
            container.className = className;
        this.container.appendChild(container);
        return container;
    }
    /**
     * Инициализировать все виджеты
     */
    async initAll() {
        const initPromises = [];
        this.widgets.forEach((widget, name) => {
            if (typeof widget.init === 'function') {
                initPromises.push(widget.init().catch((error) => {
                    console.error(`[WidgetLoader] Failed to init widget "${name}":`, error);
                }));
            }
        });
        await Promise.all(initPromises);
        console.log('[WidgetLoader] All widgets initialized');
    }
    /**
     * Очистить все виджеты
     */
    destroyAll() {
        this.widgets.forEach((widget, name) => {
            if (typeof widget.destroy === 'function') {
                widget.destroy();
            }
        });
        this.widgets.clear();
        this.container.innerHTML = '';
        console.log('[WidgetLoader] All widgets destroyed');
    }
}
// Глобальный экземпляр
export const widgetLoader = new WidgetLoader('app');
//# sourceMappingURL=widget-loader.js.map