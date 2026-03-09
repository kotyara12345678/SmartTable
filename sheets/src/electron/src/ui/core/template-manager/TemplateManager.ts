/**
 * TemplateManager - Менеджер шаблонов для SmartTable
 * 
 * Функциональность:
 * - Создание шаблонов (с логикой и без)
 * - Сохранение шаблонов
 * - Загрузка шаблонов
 * - Экспорт/импорт шаблонов
 * - Предпросмотр шаблонов
 * - Категории шаблонов
 */

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
  // Данные таблицы
  sheetsData?: Array<{
    id: number;
    name: string;
    cells: Map<string, { value: string; style?: any }>;
  }>;
  // Логика шаблона (JavaScript код)
  logic?: {
    enabled: boolean;
    code: string;
    events: string[]; // ['onLoad', 'onCellChange', 'onSelectionChange']
  };
  // Конфигурация
  config?: {
    rows: number;
    cols: number;
    frozenRows: number;
    frozenCols: number;
  };
  // Методы экспорта/импорта
  exports?: Array<{
    name: string;
    type: 'function' | 'data';
    code?: string;
  }>;
}

export interface TemplateCategory {
  id: string;
  name: string;
  icon: string;
  templates: Template[];
}

export class TemplateManager {
  private static instance: TemplateManager;
  private templates: Map<string, Template> = new Map();
  private categories: Map<string, TemplateCategory> = new Map();
  private storageKey = 'smarttable-templates';
  private onLoadCallbacks: Set<(template: Template) => void> = new Set();
  private onCellChangeCallbacks: Set<(cell: string, value: any) => void> = new Set();
  private onSelectionChangeCallbacks: Set<(cell: string) => void> = new Set();

  private constructor() {
    this.initCategories();
    this.loadFromStorage();
  }

  static getInstance(): TemplateManager {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager();
    }
    return TemplateManager.instance;
  }

  // ==========================================
  // === ИНИЦИАЛИЗАЦИЯ ===
  // ==========================================

  private initCategories(): void {
    const defaultCategories: TemplateCategory[] = [
      { id: 'finance', name: 'Финансы', icon: '💰', templates: [] },
      { id: 'inventory', name: 'Склад', icon: '📦', templates: [] },
      { id: 'hr', name: 'HR и кадры', icon: '👥', templates: [] },
      { id: 'sales', name: 'Продажи', icon: '📊', templates: [] },
      { id: 'education', name: 'Образование', icon: '📚', templates: [] },
      { id: 'personal', name: 'Личные', icon: '🏠', templates: [] },
      { id: 'custom', name: 'Пользовательские', icon: '⚙️', templates: [] }
    ];

    defaultCategories.forEach(cat => this.categories.set(cat.id, cat));
  }

  // ==========================================
  // === СОЗДАНИЕ ШАБЛОНОВ ===
  // ==========================================

  /**
   * Создать новый шаблон из текущих данных таблицы
   */
  createTemplate(options: {
    name: string;
    description: string;
    category: string;
    includeData: boolean;
    includeLogic: boolean;
    includeStyles: boolean;
  }): Template {
    const template: Template = {
      id: this.generateId(),
      name: options.name,
      description: options.description,
      category: options.category,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sheetsData: options.includeData ? this.captureCurrentState() : [],
      logic: options.includeLogic ? this.captureLogic() : undefined,
      config: {
        rows: 100,
        cols: 100,
        frozenRows: 0,
        frozenCols: 0
      }
    };

    this.templates.set(template.id, template);
    this.saveToStorage();
    this.addToCategory(template);

    console.log('[TemplateManager] Шаблон создан:', template.name);
    return template;
  }

  /**
   * Захватить текущее состояние таблицы
   */
  private captureCurrentState(): Template['sheetsData'] {
    const sheetsData: Template['sheetsData'] = [];
    
    // Получаем данные из глобального состояния (через window)
    const state = (window as any).getTableState?.();
    if (state?.sheetsData) {
      state.sheetsData.forEach((data: Map<string, any>, sheetId: number) => {
        const sheet = state.sheets?.find((s: any) => s.id === sheetId);
        const cells = new Map<string, { value: string; style?: any }>();
        
        data.forEach((cellData, key) => {
          cells.set(key, {
            value: cellData.value,
            style: cellData.style
          });
        });

        sheetsData.push({
          id: sheetId,
          name: sheet?.name || `Лист ${sheetId}`,
          cells
        });
      });
    }

    return sheetsData;
  }

  /**
   * Захватить логику (обработчики событий)
   */
  private captureLogic(): Template['logic'] {
    const logicCode = (window as any).getTemplateLogic?.();
    if (logicCode) {
      return {
        enabled: true,
        code: logicCode,
        events: ['onLoad', 'onCellChange', 'onSelectionChange']
      };
    }
    return undefined;
  }

  // ==========================================
  // === ЗАГРУЗКА ШАБЛОНОВ ===
  // ==========================================

  /**
   * Загрузить шаблон
   */
  async loadTemplate(templateId: string, options: {
    mergeWithCurrent: boolean;
    applyStyles: boolean;
    runLogic: boolean;
  } = { mergeWithCurrent: false, applyStyles: true, runLogic: true }): Promise<boolean> {
    const template = this.templates.get(templateId);
    if (!template) {
      console.error('[TemplateManager] Шаблон не найден:', templateId);
      return false;
    }

    try {
      if (!options.mergeWithCurrent) {
        // Очистить текущие данные
        this.clearCurrentState();
      }

      // Загрузить данные
      if (template.sheetsData) {
        this.restoreState(template.sheetsData);
      }

      // Применить конфигурацию
      if (template.config) {
        this.applyConfig(template.config);
      }

      // Запустить логику
      if (options.runLogic && template.logic?.enabled) {
        await this.executeLogic(template.logic);
      }

      // Уведомить о загрузке
      this.onLoadCallbacks.forEach(cb => cb(template));

      console.log('[TemplateManager] Шаблон загружен:', template.name);
      return true;
    } catch (error) {
      console.error('[TemplateManager] Ошибка загрузки шаблона:', error);
      return false;
    }
  }

  /**
   * Восстановить состояние из шаблона
   */
  private restoreState(sheetsData: Template['sheetsData']): void {
    const setState = (window as any).setTableState;
    if (setState && sheetsData) {
      setState(sheetsData);
    } else {
      // Fallback через localStorage
      const dataToSave: any = {};
      sheetsData?.forEach(sheet => {
        const sheetData: any = {};
        sheet.cells?.forEach((cell, key) => {
          sheetData[key] = cell;
        });
        dataToSave[sheet.id] = sheetData;
      });

      localStorage.setItem('smarttable-autosave', JSON.stringify({
        sheetsData: dataToSave,
        timestamp: Date.now()
      }));
    }
  }

  /**
   * Применить конфигурацию
   */
  private applyConfig(config: Template['config']): void {
    if (config && (config.rows || config.cols)) {
      const setConfig = (window as any).setTableConfig;
      if (setConfig) {
        setConfig(config);
      }
    }
  }

  /**
   * Выполнить логику шаблона
   */
  private async executeLogic(logic: Template['logic']): Promise<void> {
    if (!logic?.code) return;

    try {
      // Создаём безопасный контекст для выполнения
      const context = {
        onCellChange: (cb: (cell: string, value: any) => void) => {
          this.onCellChangeCallbacks.add(cb);
        },
        onSelectionChange: (cb: (cell: string) => void) => {
          this.onSelectionChangeCallbacks.add(cb);
        },
        onLoad: (cb: () => void) => {
          cb();
        },
        getData: (cell: string) => {
          const state = (window as any).getTableState?.();
          return state?.cells?.get(cell);
        },
        setData: (cell: string, value: any) => {
          const setCell = (window as any).setCellData;
          if (setCell) setCell(cell, value);
        }
      };

      // Выполняем код в контексте
      const func = new Function('context', `
        with (context) {
          ${logic.code}
        }
      `);
      
      func(context);
      
      console.log('[TemplateManager] Логика выполнена');
    } catch (error) {
      console.error('[TemplateManager] Ошибка выполнения логики:', error);
    }
  }

  // ==========================================
  // === ЭКСПОРТ/ИМПОРТ ===
  // ==========================================

  /**
   * Экспортировать шаблон в файл
   */
  exportTemplate(templateId: string, format: 'json' | 'js' = 'json'): void {
    const template = this.templates.get(templateId);
    if (!template) {
      console.error('[TemplateManager] Шаблон не найден:', templateId);
      return;
    }

    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'json') {
      content = JSON.stringify(this.serializeTemplate(template), null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else {
      content = this.generateJSModule(template);
      mimeType = 'text/javascript';
      extension = 'js';
    }

    this.downloadFile(`${template.name}.${extension}`, content, mimeType);
    console.log('[TemplateManager] Шаблон экспортирован:', template.name);
  }

  /**
   * Импортировать шаблон из файла
   */
  async importTemplate(file: File): Promise<Template | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          let template: Template;

          if (file.name.endsWith('.json')) {
            template = this.parseTemplate(content);
          } else if (file.name.endsWith('.js')) {
            template = this.parseJSModule(content);
          } else {
            console.error('[TemplateManager] Неизвестный формат файла');
            resolve(null);
            return;
          }

          this.templates.set(template.id, template);
          this.saveToStorage();
          this.addToCategory(template);

          console.log('[TemplateManager] Шаблон импортирован:', template.name);
          resolve(template);
        } catch (error) {
          console.error('[TemplateManager] Ошибка импорта:', error);
          resolve(null);
        }
      };

      reader.readAsText(file);
    });
  }

  /**
   * Экспортировать все шаблоны
   */
  exportAllTemplates(): void {
    const allTemplates = Array.from(this.templates.values());
    const content = JSON.stringify(allTemplates.map(t => this.serializeTemplate(t)), null, 2);
    this.downloadFile('smarttable-templates.json', content, 'application/json');
  }

  // ==========================================
  // === УПРАВЛЕНИЕ ===
  // ==========================================

  /**
   * Получить все шаблоны
   */
  getAllTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  /**
   * Получить шаблоны по категории
   */
  getTemplatesByCategory(categoryId: string): Template[] {
    const category = this.categories.get(categoryId);
    return category?.templates || [];
  }

  /**
   * Получить категории
   */
  getCategories(): TemplateCategory[] {
    return Array.from(this.categories.values());
  }

  /**
   * Удалить шаблон
   */
  deleteTemplate(templateId: string): boolean {
    const template = this.templates.get(templateId);
    if (!template) return false;

    // Удалить из категории
    const category = this.categories.get(template.category);
    if (category) {
      category.templates = category.templates.filter(t => t.id !== templateId);
    }

    this.templates.delete(templateId);
    this.saveToStorage();

    console.log('[TemplateManager] Шаблон удалён:', template.name);
    return true;
  }

  /**
   * Поделиться шаблоном - генерирует ссылку для расшаривания
   */
  async shareTemplate(templateId: string): Promise<string | null> {
    const template = this.templates.get(templateId);
    if (!template) {
      console.error('[TemplateManager] Шаблон не найден:', templateId);
      return null;
    }

    try {
      // Сериализуем шаблон
      const serialized = this.serializeTemplate(template);
      const jsonStr = JSON.stringify(serialized);
      
      // Кодируем в base64 для URL
      const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
      
      // Создаём ссылку с шаблоном как параметром
      const shareUrl = `${window.location.origin}${window.location.pathname}?template=${encoded}`;
      
      // Копируем в буфер обмена
      await navigator.clipboard.writeText(shareUrl);
      
      console.log('[TemplateManager] Ссылка скопирована в буфер обмена');
      return shareUrl;
    } catch (error) {
      console.error('[TemplateManager] Ошибка при создании ссылки для расшаривания:', error);
      return null;
    }
  }

  /**
   * Загрузить шаблон из URL параметра
   */
  async loadFromUrl(): Promise<Template | null> {
    try {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get('template');
      
      if (!encoded) return null;
      
      const jsonStr = decodeURIComponent(escape(atob(encoded)));
      const template = this.parseTemplate(jsonStr);
      
      // Сохраняем в хранилище
      this.templates.set(template.id, template);
      this.saveToStorage();
      this.addToCategory(template);
      
      console.log('[TemplateManager] Шаблон загружен из URL');
      return template;
    } catch (error) {
      console.error('[TemplateManager] Ошибка загрузки из URL:', error);
      return null;
    }
  }

  /**
   * Обновить шаблон
   */
  updateTemplate(templateId: string, updates: Partial<Template>): boolean {
    const template = this.templates.get(templateId);
    if (!template) return false;

    Object.assign(template, updates, { updatedAt: Date.now() });
    this.saveToStorage();

    console.log('[TemplateManager] Шаблон обновлён:', template.name);
    return true;
  }

  // ==========================================
  // === КОЛЛБЕКИ ===
  // ==========================================

  onTemplateLoad(callback: (template: Template) => void): void {
    this.onLoadCallbacks.add(callback);
  }

  onCellChange(callback: (cell: string, value: any) => void): void {
    this.onCellChangeCallbacks.add(callback);
  }

  onSelectionChange(callback: (cell: string) => void): void {
    this.onSelectionChangeCallbacks.add(callback);
  }

  // ==========================================
  // === УТИЛИТЫ ===
  // ==========================================

  private generateId(): string {
    return 'tpl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private addToCategory(template: Template): void {
    const category = this.categories.get(template.category);
    if (category) {
      category.templates.push(template);
    } else {
      // Если категория не найдена, добавить в custom
      const custom = this.categories.get('custom');
      if (custom) {
        custom.templates.push(template);
      }
    }
  }

  private saveToStorage(): void {
    try {
      const data = Array.from(this.templates.values()).map(t => this.serializeTemplate(t));
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('[TemplateManager] Ошибка сохранения:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const templates = JSON.parse(data);
        templates.forEach((t: any) => {
          const template = this.parseTemplate(JSON.stringify(t));
          this.templates.set(template.id, template);
          this.addToCategory(template);
        });
        console.log('[TemplateManager] Загружено шаблонов:', this.templates.size);
      }
    } catch (error) {
      console.error('[TemplateManager] Ошибка загрузки:', error);
    }
  }

  private clearCurrentState(): void {
    const clear = (window as any).clearTableState;
    if (clear) {
      clear();
    }
  }

  private serializeTemplate(template: Template): any {
    // Сериализация Map в объект для JSON
    return {
      ...template,
      sheetsData: template.sheetsData?.map(sheet => ({
        ...sheet,
        cells: Array.from(sheet.cells?.entries() || [])
      }))
    };
  }

  private parseTemplate(data: string): Template {
    const parsed = JSON.parse(data);
    // Десериализация из объекта обратно в Map
    return {
      ...parsed,
      sheetsData: parsed.sheetsData?.map((sheet: any) => ({
        ...sheet,
        cells: new Map(sheet.cells || [])
      }))
    };
  }

  private generateJSModule(template: Template): string {
    return `// SmartTable Template: ${template.name}
// Exported: ${new Date().toISOString()}

export const template = ${JSON.stringify(this.serializeTemplate(template), null, 2)};

export function onLoad(context) {
  // Код при загрузке шаблона
}

export function onCellChange(cell, value, context) {
  // Код при изменении ячейки
}

export function onSelectionChange(cell, context) {
  // Код при изменении выделения
}
`;
  }

  private parseJSModule(content: string): Template {
    // Парсинг JS модуля (упрощённый)
    const templateMatch = content.match(/export\s+const\s+template\s*=\s*({[\s\S]*?});?/);
    if (templateMatch) {
      return this.parseTemplate(templateMatch[1]);
    }
    throw new Error('Неверный формат JS модуля');
  }

  private downloadFile(filename: string, content: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Экспорт синглтона
export default TemplateManager.getInstance();
