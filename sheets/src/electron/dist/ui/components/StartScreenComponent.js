/**
 * Start Screen Component - начальный экран создания проекта
 */
import { saveLastOpenedFile } from '../core/file-utils.js';
import { createLogger } from '../core/logger.js';
const log = createLogger('StartScreen');
export class StartScreenComponent {
    constructor() {
        this.container = null;
        this.onProjectCreate = null;
        this.onProjectOpen = null;
        this.container = document.getElementById('start-screen-container');
    }
    async init(onCreate, onOpen) {
        this.onProjectCreate = onCreate;
        this.onProjectOpen = onOpen;
        this.render();
        this.bindEvents();
        // Проверяем есть ли последний открытый файл
        await this.restoreLastOpenedFile(onOpen);
    }
    /**
     * Восстановление последнего открытого файла
     */
    async restoreLastOpenedFile(onOpen) {
        try {
            const lastFileData = localStorage.getItem('smarttable-last-opened-file');
            if (!lastFileData) {
                log.debug('No last opened file found');
                return;
            }
            const lastFile = JSON.parse(lastFileData);
            const filePath = lastFile.path;
            if (!filePath) {
                log.warn('Invalid last file data');
                return;
            }
            // Проверяем существует ли файл
            const fs = await import('fs');
            if (!fs.existsSync(filePath)) {
                log.warn('Last file no longer exists:', filePath);
                localStorage.removeItem('smarttable-last-opened-file');
                return;
            }
            // Показываем уведомление
            const shouldRestore = confirm(`Восстановить последний открытый файл?\n\n${lastFile.name || filePath}`);
            if (!shouldRestore) {
                log.debug('User declined to restore last file');
                return;
            }
            // Открываем файл
            const electronAPI = window.electronAPI;
            if (!electronAPI) {
                log.error('Electron API not available');
                return;
            }
            const ext = filePath.split('.').pop()?.toLowerCase();
            let sheets = [];
            if (ext === 'csv') {
                const csvResult = await electronAPI.ipcRenderer.invoke('read-csv-file', { filePath });
                if (csvResult.success) {
                    sheets = [{ name: lastFile.name || 'CSV', data: csvResult.data }];
                }
                else {
                    throw new Error(csvResult.error || 'Ошибка чтения CSV');
                }
            }
            else {
                const xlsxResult = await electronAPI.ipcRenderer.invoke('read-xlsx-file', { filePath });
                if (xlsxResult.success) {
                    sheets = xlsxResult.sheets;
                }
                else {
                    throw new Error(xlsxResult.error || 'Ошибка чтения XLSX');
                }
            }
            if (sheets.length === 0) {
                log.error('Failed to read last file - empty sheets');
                localStorage.removeItem('smarttable-last-opened-file');
                return;
            }
            log.info('Restoring last opened file:', lastFile.name);
            // Проверяем что importSheets доступен
            const importFunc = window.importSheets;
            if (typeof importFunc !== 'function') {
                log.error('importSheets function not available!');
                alert('Ошибка: функция импорта недоступна. Попробуйте открыть файл через меню.');
                return;
            }
            if (this.onProjectOpen) {
                this.onProjectOpen(sheets);
            }
            this.hide();
        }
        catch (error) {
            log.errorWithContext('Error restoring last file', error);
            localStorage.removeItem('smarttable-last-opened-file');
            alert('Ошибка восстановления файла: ' + error.message);
        }
    }
    render() {
        if (!this.container)
            return;
        this.container.innerHTML = `
      <div class="start-screen-overlay"></div>
      <div class="start-screen">
        <div class="start-screen-header">
          <div class="app-logo">
            <img src="SmartTable.png" alt="SmartTable" style="width:48px;height:48px;object-fit:contain;">
          </div>
          <h1 class="app-title">SmartTable</h1>
          <p class="app-subtitle">Умная таблица с ИИ помощником</p>
        </div>

        <div class="start-screen-body">
          <div class="new-project-section">
            <h2 class="section-title">Новый проект</h2>
            <div class="project-name-input-wrapper">
              <label class="input-label" for="projectName">Название проекта</label>
              <input
                type="text"
                id="projectName"
                class="project-name-input"
                placeholder="Например: Финансовый отчёт 2026"
                maxlength="50"
              >
            </div>
            <button class="btn-create-project" id="btnCreateProject">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Создать проект
            </button>
          </div>

          <div class="import-section">
            <h2 class="section-title">Импорт таблиц</h2>
            <button class="btn-import-single" id="btnImport">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                <line x1="12" y1="11" x2="12" y2="17"/>
                <line x1="9" y1="14" x2="15" y2="14"/>
              </svg>
              Открыть файл или папку
            </button>
            <p class="import-hint">Поддерживаются форматы: XLSX, XLS, CSV</p>
          </div>

          <div class="recent-projects-section">
            <h2 class="section-title">Недавние проекты</h2>
            <div class="recent-projects-list" id="recentProjectsList">
              <div class="no-recent-projects">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                </svg>
                <span>Нет недавних проектов</span>
              </div>
            </div>
          </div>
        </div>

        <div class="start-screen-footer">
          <p class="copyright">© 2026 SmartTable. Pavel x Sava</p>
        </div>
      </div>
    `;
    }
    bindEvents() {
        // Создание нового проекта
        const btnCreate = document.getElementById('btnCreateProject');
        const projectNameInput = document.getElementById('projectName');
        btnCreate?.addEventListener('click', () => {
            const name = projectNameInput?.value?.trim() || 'Без названия';
            this.createProject(name);
        });
        projectNameInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const name = projectNameInput.value.trim() || 'Без названия';
                this.createProject(name);
            }
        });
        // Открыть файл/папку - показываем диалог выбора
        const btnImport = document.getElementById('btnImport');
        btnImport?.addEventListener('click', () => this.showImportDialog());
        // Загрузка недавних проектов
        this.loadRecentProjects();
    }
    showImportDialog() {
        const oldDialog = document.querySelector('.open-file-dialog');
        if (oldDialog)
            oldDialog.remove();
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
        dialog.querySelector('#openFileOption')?.addEventListener('click', async () => {
            dialog.remove();
            await this.openFile();
        });
        dialog.querySelector('#openFolderOption')?.addEventListener('click', async () => {
            dialog.remove();
            await this.openFolder();
        });
        dialog.querySelector('.open-file-close')?.addEventListener('click', () => {
            dialog.remove();
        });
        dialog.querySelector('.open-file-overlay')?.addEventListener('click', (e) => {
            if (e.target === dialog.querySelector('.open-file-overlay')) {
                dialog.remove();
            }
        });
    }
    async openFile() {
        try {
            const electronAPI = window.electronAPI;
            if (!electronAPI) {
                alert('Electron API недоступен. Проверьте консоль для подробностей.');
                log.error('Electron API not available');
                return;
            }
            const result = await electronAPI.ipcRenderer.invoke('open-file-dialog');
            if (result.canceled || !result.success)
                return;
            const filePath = result.filePath;
            const sheets = await this.loadFileFromPath(filePath);
            if (!sheets || sheets.length === 0) {
                alert('Не удалось прочитать файл или он пуст');
                return;
            }
            const fileName = filePath.split(/[/\\]/).pop() || 'Импортированный файл';
            // Сохраняем путь к последнему файлу
            saveLastOpenedFile(filePath, fileName);
            if (this.onProjectOpen) {
                this.onProjectOpen(sheets);
            }
            this.addRecentProject(fileName);
            this.hide();
            log.info('File opened successfully:', fileName);
        }
        catch (error) {
            log.errorWithContext('openFile error', error);
            alert('Ошибка при открытии файла: ' + (error.message || 'Неизвестная ошибка'));
        }
    }
    /**
     * Загрузить файл из пути (общая логика)
     */
    async loadFileFromPath(filePath) {
        const electronAPI = window.electronAPI;
        const ext = filePath.split('.').pop()?.toLowerCase();
        if (ext === 'csv') {
            const csvResult = await electronAPI.ipcRenderer.invoke('read-csv-file', { filePath });
            if (!csvResult.success) {
                throw new Error(csvResult.error || 'Ошибка чтения CSV');
            }
            return [{ name: filePath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '') || 'CSV', data: csvResult.data }];
        }
        if (ext === 'xlsx' || ext === 'xls') {
            const xlsxResult = await electronAPI.ipcRenderer.invoke('read-xlsx-file', { filePath });
            if (!xlsxResult.success) {
                throw new Error(xlsxResult.error || 'Ошибка чтения XLSX');
            }
            return xlsxResult.sheets;
        }
        throw new Error('Неподдерживаемый формат файла: ' + ext);
    }
    async openFolder() {
        try {
            const electronAPI = window.electronAPI;
            if (!electronAPI) {
                alert('Electron API недоступен');
                return;
            }
            // Сначала получаем путь к папке
            const folderResult = await electronAPI.ipcRenderer.invoke('open-folder-dialog');
            if (folderResult.canceled || !folderResult.success)
                return;
            // Затем импортируем файлы из папки
            const importResult = await electronAPI.ipcRenderer.invoke('import-folder', {
                folderPath: folderResult.folderPath
            });
            if (!importResult.success) {
                alert(importResult.error || 'Ошибка при импорте папки');
                return;
            }
            const sheets = importResult.sheets;
            const folderName = folderResult.folderPath.split(/[/\\]/).pop() || 'Импортированная папка';
            if (sheets.length === 0) {
                alert('Не удалось прочитать файлы из папки');
                return;
            }
            if (this.onProjectOpen) {
                this.onProjectOpen(sheets);
            }
            this.addRecentProject(folderName);
            this.hide();
        }
        catch (error) {
            console.error('[StartScreen] openFolder error:', error);
            alert('Ошибка при открытии папки: ' + error.message);
        }
    }
    createProject(name) {
        localStorage.setItem('smarttable-current-project', name);
        this.addRecentProject(name);
        if (this.onProjectCreate) {
            this.onProjectCreate(name);
        }
        this.hide();
    }
    addRecentProject(name) {
        const recent = this.getRecentProjects();
        const filtered = recent.filter(p => p.name !== name && p.name !== 'Без названия');
        filtered.unshift({ name, date: new Date().toISOString() });
        localStorage.setItem('smarttable-recent-projects', JSON.stringify(filtered.slice(0, 10)));
    }
    getRecentProjects() {
        try {
            const data = localStorage.getItem('smarttable-recent-projects');
            return data ? JSON.parse(data) : [];
        }
        catch {
            return [];
        }
    }
    loadRecentProjects() {
        const list = document.getElementById('recentProjectsList');
        if (!list)
            return;
        const recent = this.getRecentProjects();
        if (recent.length === 0) {
            list.innerHTML = `
        <div class="no-recent-projects">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
          <span>Нет недавних проектов</span>
        </div>
      `;
            return;
        }
        list.innerHTML = recent.map(project => `
      <div class="recent-project-item" data-name="${this.escapeHtml(project.name)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <div class="recent-project-info">
          <span class="recent-project-name">${this.escapeHtml(project.name)}</span>
          <span class="recent-project-date">${this.formatDate(project.date)}</span>
        </div>
      </div>
    `).join('');
        list.querySelectorAll('.recent-project-item').forEach(item => {
            item.addEventListener('click', () => {
                const name = item.dataset.name || 'Без названия';
                this.createProject(name);
            });
        });
    }
    formatDate(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0)
            return 'Сегодня';
        if (days === 1)
            return 'Вчера';
        if (days < 7)
            return `${days} дн. назад`;
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    show() {
        if (this.container) {
            this.container.classList.add('visible');
        }
    }
    hide() {
        if (this.container) {
            this.container.classList.remove('visible');
        }
    }
    isVisible() {
        return this.container?.classList.contains('visible') || false;
    }
}
//# sourceMappingURL=StartScreenComponent.js.map