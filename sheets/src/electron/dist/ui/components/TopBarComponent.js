/**
 * TopBar Component - верхняя панель приложения
 */
import { BaseComponent } from '../core/component.js';
export class TopBarComponent extends BaseComponent {
    constructor() {
        super('top-bar-container');
        this.fileName = null;
        this.fileStatus = null;
        this.menuItems = null;
        this.btnAI = null;
        this.btnSettings = null;
    }
    init() {
        // HTML уже есть в index.html, просто инициализируем элементы
        this.initElements();
        this.bindEvents();
    }
    /**
     * Инициализация элементов
     */
    initElements() {
        this.fileName = this.querySelector('#fileName');
        this.fileStatus = this.querySelector('#fileStatus');
        this.menuItems = this.querySelectorAll('.menu-item');
        this.btnAI = this.querySelector('#btnAI');
        this.btnSettings = this.querySelector('#btnSettings');
    }
    /**
     * Привязка событий
     */
    bindEvents() {
        // Переключение вкладок меню
        this.menuItems?.forEach(item => {
            item.addEventListener('click', () => this.handleMenuClick(item));
        });
        // Кнопка ИИ
        this.bindEvent(this.btnAI, 'click', (e) => this.handleAIClick(e));
        // Кнопка настроек
        this.bindEvent(this.btnSettings, 'click', (e) => this.handleSettingsClick(e));
    }
    /**
     * Обработчик клика по меню
     */
    handleMenuClick(clickedItem) {
        this.menuItems?.forEach(item => {
            item.classList.remove('active');
            if (item === clickedItem) {
                item.classList.add('active');
            }
        });
        const tab = clickedItem.dataset.tab;
        this.onTabChange(tab || 'home');
    }
    /**
     * Обработчик клика по кнопке ИИ
     */
    handleAIClick(event) {
        event.stopPropagation();
        // Эмитим событие для открытия AI панели
        document.dispatchEvent(new CustomEvent('ai-panel-open'));
    }
    /**
     * Обработчик клика по кнопке настроек
     */
    handleSettingsClick(event) {
        event.stopPropagation();
        // Эмитим событие для открытия панели настроек
        document.dispatchEvent(new CustomEvent('settings-panel-open'));
    }
    /**
     * Событие смены вкладки
     */
    onTabChange(tab) {
        console.log('[TopBar] Tab changed:', tab);
    }
    setFileName(name) {
        if (this.fileName) {
            this.fileName.textContent = name;
        }
    }
    setFileStatus(status) {
        if (this.fileStatus) {
            this.fileStatus.textContent = status;
        }
    }
}
//# sourceMappingURL=TopBarComponent.js.map