/**
 * Базовый класс для всех UI виджетов
 */
export class Widget {
  protected element: HTMLElement | null = null;
  protected templatePath: string = '';
  protected stylesPath: string = '';
  
  constructor(protected container: HTMLElement) {}
  
  /**
   * Загрузка HTML шаблона
   */
  async loadTemplate(): Promise<void> {
    if (!this.templatePath) return;
    
    try {
      const response = await fetch(this.templatePath);
      const html = await response.text();
      this.container.innerHTML = html;
      this.element = this.container.firstElementChild as HTMLElement;
      this.afterTemplateLoad();
    } catch (error) {
      console.error(`[Widget] Failed to load template: ${this.templatePath}`, error);
    }
  }
  
  /**
   * Вызывается после загрузки шаблона
   */
  protected afterTemplateLoad(): void {}
  
  /**
   * Инициализация виджета
   */
  async init(): Promise<void> {
    await this.loadTemplate();
    this.initElements();
    this.bindEvents();
    this.afterInit();
  }
  
  /**
   * Инициализация DOM элементов
   */
  protected initElements(): void {}
  
  /**
   * Привязка событий
   */
  protected bindEvents(): void {}
  
  /**
   * Вызывается после полной инициализации
   */
  protected afterInit(): void {}
  
  /**
   * Получить элемент по селектору
   */
  protected getElement<T extends HTMLElement>(selector: string): T | null {
    return this.element?.querySelector<T>(selector) || null;
  }
  
  /**
   * Получить все элементы по селектору
   */
  protected getElements(selector: string): NodeListOf<HTMLElement> {
    return this.element?.querySelectorAll(selector) || document.querySelectorAll(selector);
  }
  
  /**
   * Очистка ресурсов
   */
  destroy(): void {
    if (this.element) {
      this.element.innerHTML = '';
      this.element.remove();
    }
    this.element = null;
  }
}
