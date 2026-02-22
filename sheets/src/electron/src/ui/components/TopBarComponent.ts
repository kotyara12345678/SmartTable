/**
 * TopBar Component - верхняя панель приложения
 */
import { BaseComponent } from '../core/component.js';

export class TopBarComponent extends BaseComponent {
  private fileName: HTMLElement | null = null;
  private fileStatus: HTMLElement | null = null;
  private menuItems: NodeListOf<HTMLElement> | null = null;
  private btnAI: HTMLElement | null = null;
  private btnSettings: HTMLElement | null = null;
  
  constructor() {
    super('top-bar-container');
  }
  
  init(): void {
    // HTML уже есть в index.html, просто инициализируем элементы
    this.initElements();
    this.bindEvents();
  }
  
  /**
   * Инициализация элементов
   */
  private initElements(): void {
    this.fileName = this.querySelector('#fileName');
    this.fileStatus = this.querySelector('#fileStatus');
    this.menuItems = this.querySelectorAll('.menu-item');
    this.btnAI = this.querySelector('#btnAI');
    this.btnSettings = this.querySelector('#btnSettings');
  }
  
  /**
   * Привязка событий
   */
  private bindEvents(): void {
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
  private handleMenuClick(clickedItem: HTMLElement): void {
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
  private handleAIClick(event: Event): void {
    event.stopPropagation();
    // Эмитим событие для открытия AI панели
    document.dispatchEvent(new CustomEvent('ai-panel-open'));
  }

  /**
   * Обработчик клика по кнопке настроек
   */
  private handleSettingsClick(event: Event): void {
    event.stopPropagation();
    // Эмитим событие для открытия панели настроек
    document.dispatchEvent(new CustomEvent('settings-panel-open'));
  }
  
  /**
   * Событие смены вкладки
   */
  protected onTabChange(tab: string): void {
    console.log('[TopBar] Tab changed:', tab);
  }
  
  setFileName(name: string): void {
    if (this.fileName) {
      this.fileName.textContent = name;
    }
  }
  
  setFileStatus(status: string): void {
    if (this.fileStatus) {
      this.fileStatus.textContent = status;
    }
  }
}
