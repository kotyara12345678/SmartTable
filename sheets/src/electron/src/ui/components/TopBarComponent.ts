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
  private appIcon: HTMLElement | null = null;
  private onReturnToStart: (() => void) | null = null;

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
    this.appIcon = this.querySelector('.app-icon');
  }

  /**
   * Привязка событий
   */
  private bindEvents(): void {
    // Клик по иконке приложения
    this.appIcon?.addEventListener('click', () => this.showAppMenu());
    
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
    const tabName = tab || 'home';
    
    // Отправляем событие для переключения ribbon
    document.dispatchEvent(new CustomEvent('ribbon-tab-change', { detail: { tab: tabName } }));
    
    this.onTabChange(tabName);
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

  setProjectName(name: string): void {
    this.setFileName(name);
  }

  setFileStatus(status: string): void {
    if (this.fileStatus) {
      this.fileStatus.textContent = status;
    }
  }

  /**
   * Показать меню приложения
   */
  private showAppMenu(): void {
    // Удаляем старое меню если есть
    const oldMenu = document.querySelector('.app-context-menu');
    if (oldMenu) oldMenu.remove();
    const oldExportMenu = document.querySelector('.app-export-menu');
    if (oldExportMenu) oldExportMenu.remove();

    // Создаём новое меню
    const menu = document.createElement('div');
    menu.className = 'app-context-menu';

    menu.innerHTML = `
      <button class="app-menu-item" id="menuReturnToStart">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Вернуться на начальный экран</span>
      </button>
      <div class="app-menu-divider"></div>
      <button class="app-menu-item" id="menuOpen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          <line x1="12" y1="11" x2="12" y2="17"/>
          <line x1="9" y1="14" x2="15" y2="14"/>
        </svg>
        <span>Открыть файл/папку</span>
      </button>
      <div class="app-menu-divider"></div>
      <div class="app-menu-item has-submenu" id="menuExport">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7,10 12,15 17,10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span>Экспорт таблицы</span>
        <svg class="submenu-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
      </div>
      <div class="app-menu-divider"></div>
      <button class="app-menu-item" id="menuClose">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span>Закрыть</span>
      </button>
    `;

    document.body.appendChild(menu);

    // Позиционируем меню
    const appIcon = document.querySelector('.app-icon');
    if (appIcon) {
      const rect = (appIcon as HTMLElement).getBoundingClientRect();
      menu.style.left = `${rect.left}px`;
      menu.style.top = `${rect.bottom + 5}px`;
    }

    // Обработчики
    menu.querySelector('#menuReturnToStart')?.addEventListener('click', () => {
      this.returnToStartScreen();
      menu.remove();
      document.querySelector('.app-export-menu')?.remove();
    });

    // Открыть файл/папку
    menu.querySelector('#menuOpen')?.addEventListener('click', () => {
      this.showOpenDialog();
      menu.remove();
      document.querySelector('.app-export-menu')?.remove();
    });

    // Показываем подменю экспорта при наведении
    const exportItem = menu.querySelector('#menuExport');
    exportItem?.addEventListener('mouseenter', () => {
      this.showExportSubmenu(menu);
    });

    menu.querySelector('#menuClose')?.addEventListener('click', () => {
      menu.remove();
      document.querySelector('.app-export-menu')?.remove();
    });

    // Закрыть при клике вне меню
    const closeOnOutsideClick = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && !document.querySelector('.app-export-menu')?.contains(e.target as Node)) {
        menu.remove();
        document.querySelector('.app-export-menu')?.remove();
        document.removeEventListener('click', closeOnOutsideClick);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeOnOutsideClick);
    }, 100);
  }

  /**
   * Показать подменю экспорта
   */
  private showExportSubmenu(parentMenu: HTMLElement): void {
    // Удаляем старое подменю
    const oldMenu = document.querySelector('.app-export-menu');
    if (oldMenu) oldMenu.remove();

    const exportMenu = document.createElement('div');
    exportMenu.className = 'app-export-menu';

    exportMenu.innerHTML = `
      <button class="app-menu-item" data-format="xlsx">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <text x="8" y="18" font-size="8" font-weight="bold">XLSX</text>
        </svg>
        <span>Excel (.xlsx)</span>
      </button>
      <button class="app-menu-item" data-format="ods">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
          <line x1="15" y1="3" x2="15" y2="21"/>
        </svg>
        <span>OpenDocument (.ods)</span>
      </button>
      <div class="app-menu-divider"></div>
      <button class="app-menu-item" data-format="csv">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <line x1="10" y1="9" x2="8" y2="9"/>
        </svg>
        <span>CSV (.csv)</span>
      </button>
      <button class="app-menu-item" data-format="tsv">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="10" y1="13" x2="14" y2="13"/>
          <line x1="10" y1="17" x2="14" y2="17"/>
        </svg>
        <span>TSV (.tsv)</span>
      </button>
      <div class="app-menu-divider"></div>
      <button class="app-menu-item" data-format="json">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <text x="8" y="16" font-size="7" font-weight="bold">{}</text>
        </svg>
        <span>JSON (.json)</span>
      </button>
      <button class="app-menu-item" data-format="xml">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <text x="7" y="16" font-size="6" font-weight="bold">&lt;/&gt;</text>
        </svg>
        <span>XML (.xml)</span>
      </button>
      <div class="app-menu-divider"></div>
      <button class="app-menu-item" data-format="html">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
        </svg>
        <span>HTML (.html)</span>
      </button>
      <button class="app-menu-item" data-format="markdown">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
          <text x="8" y="14" font-size="6" font-weight="bold">MD</text>
        </svg>
        <span>Markdown (.md)</span>
      </button>
    `;

    document.body.appendChild(exportMenu);

    // Позиционируем справа от основного меню
    const rect = parentMenu.getBoundingClientRect();
    exportMenu.style.left = `${rect.right + 5}px`;
    exportMenu.style.top = `${rect.top}px`;

    // Обработчики кликов по форматам
    exportMenu.querySelectorAll('[data-format]').forEach(btn => {
      btn.addEventListener('click', () => {
        const format = (btn as HTMLElement).dataset.format as string;
        // Показываем диалог выбора листов перед экспортом
        this.showSheetSelectionDialog(format, parentMenu, exportMenu);
      });
    });
  }

  /**
   * Диалог выбора листов для экспорта
   */
  private showSheetSelectionDialog(format: string, parentMenu: HTMLElement, exportMenu: HTMLElement): void {
    const sheets = (window as any).getSheets?.() || [];
    
    // Если один лист - сразу экспортируем без диалога
    if (sheets.length <= 1) {
      const sheetIds = sheets.map((s: any) => s.id);
      const exportDataFunc = (window as any).exportDataWithSheets;
      if (typeof exportDataFunc === 'function') {
        exportDataFunc(format, sheetIds);
      }
      exportMenu.remove();
      parentMenu.remove();
      return;
    }

    // Закрываем меню экспорта перед открытием диалога
    exportMenu.remove();
    parentMenu.remove();

    // Удаляем старое модальное окно если есть
    const oldDialog = document.querySelector('.sheet-export-modal');
    if (oldDialog) oldDialog.remove();

    const dialog = document.createElement('div');
    dialog.className = 'sheet-export-modal';
    dialog.innerHTML = `
      <div class="sheet-export-overlay">
        <div class="sheet-export-modal">
          <div class="sheet-export-header">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
              Экспорт листов
            </h3>
            <button class="sheet-export-close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="sheet-export-content">
            <p>Выберите листы для экспорта в формате ${format.toUpperCase()}</p>
            <div class="sheet-list">
              ${sheets.map((sheet: any, index: number) => `
                <label class="sheet-item ${index === 0 ? 'selected' : ''}">
                  <input type="checkbox" data-sheet-id="${sheet.id}" ${index === 0 ? 'checked' : ''}>
                  <div class="sheet-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                    </svg>
                  </div>
                  <span>${sheet.name}</span>
                </label>
              `).join('')}
            </div>
          </div>
          <div class="sheet-export-actions">
            <button class="btn-cancel">
              Отмена
            </button>
            <button class="btn-export">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Экспортировать
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Переключение выделения при клике на item
    dialog.querySelectorAll('.sheet-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).tagName !== 'INPUT') {
          const checkbox = item.querySelector('input[type="checkbox"]') as HTMLInputElement;
          checkbox.checked = !checkbox.checked;
          item.classList.toggle('selected', checkbox.checked);
        }
      });
    });

    // Синхронизация выделения с чекбоксом
    dialog.querySelectorAll('.sheet-item input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const item = (e.target as HTMLElement).closest('.sheet-item') as HTMLElement;
        if (item) {
          item.classList.toggle('selected', (e.target as HTMLInputElement).checked);
        }
      });
    });

    // Закрыть при клике на отмену
    dialog.querySelector('.btn-cancel')?.addEventListener('click', () => {
      dialog.remove();
    });

    // Закрыть при клике на кнопку закрытия
    dialog.querySelector('.sheet-export-close')?.addEventListener('click', () => {
      dialog.remove();
    });

    // Закрыть при клике на оверлей
    dialog.querySelector('.sheet-export-overlay')?.addEventListener('click', (e) => {
      if (e.target === dialog.querySelector('.sheet-export-overlay')) {
        dialog.remove();
      }
    });

    // Экспортировать выбранные листы
    dialog.querySelector('.btn-export')?.addEventListener('click', () => {
      const selectedSheetIds = Array.from(dialog.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => (cb as HTMLInputElement).dataset.sheetId)
        .filter(Boolean)
        .map(id => parseInt(id!));

      if (selectedSheetIds.length === 0) {
        alert('Выберите хотя бы один лист для экспорта');
        return;
      }

      const exportDataFunc = (window as any).exportDataWithSheets;
      if (typeof exportDataFunc === 'function') {
        exportDataFunc(format, selectedSheetIds);
      }

      dialog.remove();
    });
  }

  /**
   * Вернуться на начальный экран
   */
  private returnToStartScreen(): void {
    // Сохраняем данные перед уходом
    localStorage.removeItem('smarttable-current-project');

    // Показываем начальный экран
    const startScreen = (window as any).startScreen;
    if (startScreen) {
      startScreen.show();
    }

    // Сбрасываем название
    this.setProjectName('Без названия');
  }

  /**
   * Показать диалог открытия файла/папки
   */
  private showOpenDialog(): void {
    const oldDialog = document.querySelector('.open-file-dialog');
    if (oldDialog) oldDialog.remove();

    const dialog = document.createElement('div');
    dialog.className = 'open-file-dialog';
    dialog.innerHTML = `
      <div class="open-file-overlay">
        <div class="open-file-modal">
          <div class="open-file-header">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                <line x1="12" y1="11" x2="12" y2="17"/>
                <line x1="9" y1="14" x2="15" y2="14"/>
              </svg>
              Открыть файл
            </h3>
            <button class="open-file-close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="open-file-content">
            <p>Выберите способ открытия</p>
            <div class="open-file-options">
              <button class="open-file-option" id="openFileOption">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                </svg>
                <span>Открыть файл</span>
                <small>XLSX, XLS, CSV</small>
              </button>
              <button class="open-file-option" id="openFolderOption">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                </svg>
                <span>Открыть папку</span>
                <small>Все файлы в папке</small>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Открыть файл
    dialog.querySelector('#openFileOption')?.addEventListener('click', async () => {
      dialog.remove();
      await this.openFile();
    });

    // Открыть папку
    dialog.querySelector('#openFolderOption')?.addEventListener('click', async () => {
      dialog.remove();
      await this.openFolder();
    });

    // Закрыть
    dialog.querySelector('.open-file-close')?.addEventListener('click', () => {
      dialog.remove();
    });

    dialog.querySelector('.open-file-overlay')?.addEventListener('click', (e) => {
      if (e.target === dialog.querySelector('.open-file-overlay')) {
        dialog.remove();
      }
    });
  }

  private async openFile(): Promise<void> {
    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI) {
        alert('Electron API недоступен');
        return;
      }

      const result = await electronAPI.ipcRenderer.invoke('open-file-dialog');
      if (result.canceled || !result.success) return;

      const filePath = result.filePath;
      const fileName = filePath.split(/[/\\]/).pop() || 'Импортированный файл';
      const ext = filePath.split('.').pop()?.toLowerCase();

      let sheets: Array<{ name: string; data: string[][] }> = [];

      if (ext === 'csv') {
        const csvResult = await electronAPI.ipcRenderer.invoke('read-csv-file', { filePath });
        if (csvResult.success) {
          sheets = [{ name: fileName.replace(/\.[^.]+$/, ''), data: csvResult.data }];
        }
      } else {
        const xlsxResult = await electronAPI.ipcRenderer.invoke('read-xlsx-file', { filePath });
        if (xlsxResult.success) {
          sheets = xlsxResult.sheets;
        }
      }

      if (sheets.length === 0) {
        alert('Не удалось прочитать файл или он пуст');
        return;
      }

      const importFunc = (window as any).importSheets;
      if (typeof importFunc === 'function') {
        importFunc(sheets);
      }

      // Скрываем начальный экран если открыт
      const startScreen = (window as any).startScreen;
      if (startScreen) {
        startScreen.hide();
      }
    } catch (error: any) {
      console.error('[TopBar] openFile error:', error);
      alert('Ошибка при открытии файла: ' + error.message);
    }
  }

  private async openFolder(): Promise<void> {
    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI) {
        alert('Electron API недоступен');
        return;
      }

      // Сначала получаем путь к папке
      const folderResult = await electronAPI.ipcRenderer.invoke('open-folder-dialog');
      if (folderResult.canceled || !folderResult.success) return;

      // Затем импортируем файлы из папки
      const importResult = await electronAPI.ipcRenderer.invoke('import-folder', {
        folderPath: folderResult.folderPath
      });

      if (!importResult.success) {
        alert(importResult.error || 'Ошибка при импорте папки');
        return;
      }

      const sheets = importResult.sheets;

      if (sheets.length === 0) {
        alert('Не удалось прочитать файлы из папки');
        return;
      }

      const importFunc = (window as any).importSheets;
      if (typeof importFunc === 'function') {
        importFunc(sheets);
      }

      // Скрываем начальный экран если открыт
      const startScreen = (window as any).startScreen;
      if (startScreen) {
        startScreen.hide();
      }
    } catch (error: any) {
      console.error('[TopBar] openFolder error:', error);
      alert('Ошибка при открытии папки: ' + error.message);
    }
  }
}
