/**
 * Базовый класс для всех UI компонентов
 */
export class BaseComponent {
    constructor(containerId) {
        this.elements = new Map();
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container "${containerId}" not found`);
        }
        this.container = container;
    }
    /**
     * Получить элемент по ID
     */
    getElement(id) {
        const element = this.elements.get(id);
        return element || null;
    }
    /**
     * Получить элемент по селектору внутри контейнера
     */
    querySelector(selector) {
        return this.container.querySelector(selector);
    }
    /**
     * Получить все элементы по селектору
     */
    querySelectorAll(selector) {
        return this.container.querySelectorAll(selector);
    }
    /**
     * Привязать событие к элементу
     */
    bindEvent(element, event, handler) {
        if (element) {
            element.addEventListener(event, handler);
        }
    }
    /**
     * Очистка ресурсов
     */
    destroy() {
        this.elements.clear();
    }
}
//# sourceMappingURL=component.js.map