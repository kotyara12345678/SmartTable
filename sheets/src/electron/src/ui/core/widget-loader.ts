/**
 * WidgetLoader - загрузчик и менеджер виджетов
 */
export class WidgetLoader {
  private widgets: Map<string, any> = new Map();
  private container: HTMLElement;
  
  constructor(containerId: string = 'app') {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;
  }
  
  /**
   * Зарегистрировать виджет
   */
  register(name: string, widget: any): void {
    this.widgets.set(name, widget);
  }
  
  /**
   * Получить виджет по имени
   */
  get<T>(name: string): T | undefined {
    return this.widgets.get(name) as T | undefined;
  }
  
  /**
   * Создать контейнер для виджета
   */
  createContainer(id: string, className: string = ''): HTMLElement {
    const container = document.createElement('div');
    container.id = id;
    if (className) container.className = className;
    this.container.appendChild(container);
    return container;
  }
  
  /**
   * Инициализировать все виджеты
   */
  async initAll(): Promise<void> {
    const initPromises: Promise<void>[] = [];
    
    this.widgets.forEach((widget, name) => {
      if (typeof widget.init === 'function') {
        initPromises.push(
          widget.init().catch((error: unknown) => {
            console.error(`[WidgetLoader] Failed to init widget "${name}":`, error);
          })
        );
      }
    });
    
    await Promise.all(initPromises);
    console.log('[WidgetLoader] All widgets initialized');
  }
  
  /**
   * Очистить все виджеты
   */
  destroyAll(): void {
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
