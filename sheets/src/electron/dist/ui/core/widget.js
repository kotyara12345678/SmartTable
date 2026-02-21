/**
 * Базовый класс для всех UI виджетов
 */
export class Widget {
    constructor(container) {
        this.container = container;
        this.element = null;
        this.templatePath = '';
        this.stylesPath = '';
    }
    /**
     * Загрузка HTML шаблона
     */
    async loadTemplate() {
        if (!this.templatePath)
            return;
        try {
            const response = await fetch(this.templatePath);
            const html = await response.text();
            this.container.innerHTML = html;
            this.element = this.container.firstElementChild;
            this.afterTemplateLoad();
        }
        catch (error) {
            console.error(`[Widget] Failed to load template: ${this.templatePath}`, error);
        }
    }
    /**
     * Вызывается после загрузки шаблона
     */
    afterTemplateLoad() { }
    /**
     * Инициализация виджета
     */
    async init() {
        await this.loadTemplate();
        this.initElements();
        this.bindEvents();
        this.afterInit();
    }
    /**
     * Инициализация DOM элементов
     */
    initElements() { }
    /**
     * Привязка событий
     */
    bindEvents() { }
    /**
     * Вызывается после полной инициализации
     */
    afterInit() { }
    /**
     * Получить элемент по селектору
     */
    getElement(selector) {
        return this.element?.querySelector(selector) || null;
    }
    /**
     * Получить все элементы по селектору
     */
    getElements(selector) {
        return this.element?.querySelectorAll(selector) || document.querySelectorAll(selector);
    }
    /**
     * Очистка ресурсов
     */
    destroy() {
        if (this.element) {
            this.element.innerHTML = '';
            this.element.remove();
        }
        this.element = null;
    }
}
//# sourceMappingURL=widget.js.map