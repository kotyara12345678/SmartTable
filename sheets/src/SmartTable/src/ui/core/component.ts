/**
 * Базовый класс для всех UI компонентов
 */
export abstract class BaseComponent {
  protected container: HTMLElement;
  protected elements: Map<string, HTMLElement> = new Map();
  
  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container "${containerId}" not found`);
    }
    this.container = container;
  }
  
  /**
   * Инициализация компонента
   */
  abstract init(): void;
  
  /**
   * Получить элемент по ID
   */
  protected getElement<T extends HTMLElement>(id: string): T | null {
    const element = this.elements.get(id);
    return (element as T) || null;
  }
  
  /**
   * Получить элемент по селектору внутри контейнера
   */
  protected querySelector<T extends HTMLElement>(selector: string): T | null {
    return this.container.querySelector<T>(selector);
  }
  
  /**
   * Получить все элементы по селектору
   */
  protected querySelectorAll(selector: string): NodeListOf<HTMLElement> {
    return this.container.querySelectorAll(selector);
  }
  
  /**
   * Привязать событие к элементу
   */
  protected bindEvent(
    element: HTMLElement | null,
    event: string,
    handler: EventListener
  ): void {
    if (element) {
      element.addEventListener(event, handler);
    }
  }
  
  /**
   * Очистка ресурсов
   */
  destroy(): void {
    this.elements.clear();
  }
}
