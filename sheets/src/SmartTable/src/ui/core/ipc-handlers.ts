/**
 * IPC Handlers - обработчики IPC событий
 * Регистрация всех IPC обработчиков для main процесса
 */

import * as electron from 'electron';
const { ipcMain, app, dialog, net } = electron;
import { aiService, AIRequest, AIResponse } from './ai/ai-service.js';
import { createLogger } from './logger.js';
import * as path from 'path';
import * as fs from 'fs';

const log = createLogger('IPC');

/**
 * Получить путь к папке с плагинами (в папке проекта)
 */
function getPluginsDir(): string {
  // Путь к папке приложения
  let appPath = app.getAppPath();

  // Если приложение упаковано в .asar, app.getAppPath() возвращает путь к .asar файлу
  // Нужно получить путь к родительской директории
  if (appPath.endsWith('.asar') || appPath.includes('app.asar')) {
    // Для упакованного приложения используем userData
    const userDataPlugins = path.join(app.getPath('userData'), 'plugins');
    log.info('App is packaged, using userData plugins dir:', userDataPlugins);
    return userDataPlugins;
  }

  // Для разработки: appPath = .../sheets/src/electron
  let projectRoot = path.resolve(appPath);

  // Поднимаемся до корня проекта (ищем папку sheets и README.md)
  let maxDepth = 10;
  while (maxDepth > 0) {
    const hasSheets = fs.existsSync(path.join(projectRoot, 'sheets'));
    const hasReadme = fs.existsSync(path.join(projectRoot, 'README.md'));

    if (hasSheets && hasReadme) {
      break;
    }

    const parent = path.dirname(projectRoot);
    if (parent === projectRoot) break;
    projectRoot = parent;
    maxDepth--;
  }

  const pluginsDir = path.join(projectRoot, 'plugins');
  log.info('getPluginsDir (dev mode): projectRoot=', projectRoot, '=> pluginsDir=', pluginsDir);

  return pluginsDir;
}

/**
 * Получить путь к файлу состояния плагинов
 */
function getPluginStatePath(): string {
  return path.join(app.getPath('userData'), 'plugins-state.json');
}

/**
 * Загрузить состояние плагинов из файла
 */
function loadPluginState(): Record<string, { enabled: boolean }> {
  const statePath = getPluginStatePath();
  try {
    if (fs.existsSync(statePath)) {
      const content = fs.readFileSync(statePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error: any) {
    log.warn('Failed to load plugin state:', error.message);
  }
  return {};
}

/**
 * Сохранить состояние плагинов в файл
 */
function savePluginState(state: Record<string, { enabled: boolean }>): void {
  const statePath = getPluginStatePath();
  try {
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
    log.info('Plugin state saved to:', statePath);
  } catch (error: any) {
    log.error('Failed to save plugin state:', error.message);
  }
}

/**
 * Найти все manifest.json в директории (рекурсивно)
 */
function findManifestFiles(dir: string): string[] {
  const results: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        results.push(...findManifestFiles(fullPath));
      } else if (entry.isFile() && entry.name === 'manifest.json') {
        results.push(fullPath);
      }
    }
  } catch {
    // Игнорируем ошибки доступа
  }

  return results;
}

/**
 * Скачать файл через net модуль (обходит CORS ограничения)
 */
async function downloadFileViaNet(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    log.info('Downloading file from:', url);
    
    const request = net.request({
      url,
      method: 'GET',
      headers: {
        'User-Agent': 'SmartTable-Plugin-Installer'
      }
    });
    
    const chunks: Buffer[] = [];

    request.on('response', (response) => {
      log.info('Download response status:', response.statusCode);
      
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Обработка редиректа
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          const url = Array.isArray(redirectUrl) ? redirectUrl[0] : redirectUrl;
          log.info('Redirecting to:', url);
          downloadFileViaNet(url).then(resolve).catch(reject);
          return;
        }
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      response.on('data', (chunk) => {
        chunks.push(Buffer.from(chunk));
      });

      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        log.info('Download completed, size:', buffer.length, 'bytes');
        resolve(buffer);
      });
    });

    request.on('error', (error) => {
      log.error('Download network error:', error.message);
      reject(new Error(`Network error: ${error.message}`));
    });

    request.end();
  });
}

/**
 * Зарегистрировать все IPC обработчики
 */
export function registerIPCHandlers(): void {
  // AI Chat обработчик
  ipcMain.handle('ai-chat', async (event, data: AIRequest): Promise<AIResponse> => {
    try {
      return await aiService.chat(data);
    } catch (error: any) {
      console.error('[IPC] ai-chat error:', error);
      return {
        success: false,
        error: error.message || 'Неизвестная ошибка ИИ'
      };
    }
  });

  // Сканирование файлов на компьютере
  ipcMain.handle('scan-files', async (event, options?: { extensions?: string[]; directories?: string[] }) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { app } = await import('electron');

      const extensions = options?.extensions || ['.xlsx', '.xls', '.csv'];
      const directories = options?.directories || [
        app.getPath('documents'),
        app.getPath('desktop'),
        app.getPath('downloads')
      ];

      const files: Array<{
        name: string;
        path: string;
        size: number;
        date: string;
        extension: string;
      }> = [];

      const scanDirectory = (dir: string, depth = 0) => {
        if (depth > 3) return;

        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            try {
              if (entry.isDirectory() && !entry.name.startsWith('.')) {
                scanDirectory(fullPath, depth + 1);
              } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (extensions.includes(ext)) {
                  const stats = fs.statSync(fullPath);
                  files.push({
                    name: entry.name,
                    path: fullPath,
                    size: stats.size,
                    date: stats.mtime.toISOString(),
                    extension: ext
                  });
                }
              }
            } catch {
              // Пропускаем файлы к которым нет доступа
            }
          }
        } catch {
          // Пропускаем директории к которым нет доступа
        }
      };

      for (const dir of directories) {
        if (fs.existsSync(dir)) {
          scanDirectory(dir);
        }
      }

      files.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      log.info(`Scanned ${files.length} files`);
      return { success: true, files };
    } catch (error: any) {
      log.errorWithContext('scan-files error', error);
      return {
        success: false,
        error: error.message || 'Ошибка сканирования файлов',
        files: []
      };
    }
  });

  // Открытие файла
  ipcMain.handle('open-file', async (event, filePath: string) => {
    try {
      const fs = await import('fs');

      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Файл не найден' };
      }

      const buffer = fs.readFileSync(filePath);
      
      // Для текстовых файлов (CSV) возвращаем как строку
      const ext = filePath.toLowerCase().split('.').pop();
      if (ext === 'csv') {
        return { 
          success: true, 
          content: buffer.toString('utf8'),
          path: filePath 
        };
      }
      
      // Для бинарных файлов (XLSX) возвращаем как Uint8Array
      return { 
        success: true, 
        content: new Uint8Array(buffer),
        path: filePath 
      };
    } catch (error: any) {
      console.error('[IPC] open-file error:', error);
      return {
        success: false,
        error: error.message || 'Ошибка открытия файла'
      };
    }
  });

  // Автосохранение файла
  ipcMain.handle('autosave-file', async (event, { content, filePath }) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { app } = await import('electron');

      // Если путь не указан, сохраняем в папке автосохранений
      let savePath = filePath;
      if (!savePath) {
        const autoSaveDir = path.join(app.getPath('userData'), 'autosaves');
        if (!fs.existsSync(autoSaveDir)) {
          fs.mkdirSync(autoSaveDir, { recursive: true });
        }
        savePath = path.join(autoSaveDir, `autosave-${Date.now()}.json`);
      }

      fs.writeFileSync(savePath, content, 'utf8');
      console.log('[IPC] File autosaved:', savePath);
      return { success: true, filePath: savePath };
    } catch (error: any) {
      console.error('[IPC] autosave-file error:', error);
      return {
        success: false,
        error: error.message || 'Ошибка автосохранения'
      };
    }
  });

  // Загрузка автосохранения
  ipcMain.handle('load-autosave', async (event, { filePath }) => {
    try {
      const fs = await import('fs');

      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Файл автосохранения не найден' };
      }

      const content = fs.readFileSync(filePath, 'utf8');
      return { success: true, content };
    } catch (error: any) {
      console.error('[IPC] load-autosave error:', error);
      return {
        success: false,
        error: error.message || 'Ошибка загрузки автосохранения'
      };
    }
  });

  // Экспорт в Excel (XLSX)
  ipcMain.handle('export-to-excel', async (event, { data, filePath, sheets }) => {
    try {
      const pathModule = await import('path');
      const { app, dialog } = await import('electron');
      const XLSX = await import('xlsx');

      // Если путь не указан, открываем диалог сохранения
      let savePath = filePath;
      if (!savePath) {
        const result = await dialog.showSaveDialog({
          title: 'Сохранить как Excel',
          defaultPath: pathModule.join(app.getPath('documents'), 'SmartTable-Export.xlsx'),
          filters: [
            { name: 'Excel Files', extensions: ['xlsx'] }
          ]
        });

        if (result.canceled || !result.filePath) {
          return { success: false, canceled: true };
        }
        savePath = result.filePath;
      }

      // Создаём workbook из данных
      const workbook = XLSX.utils.book_new();
      
      // Если переданы листы - используем их
      if (sheets && sheets.length > 0) {
        sheets.forEach((sheet: { name: string; data: string[][] }) => {
          const worksheet = XLSX.utils.aoa_to_sheet(sheet.data);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
        });
      } else if (data) {
        // Для совместимости со старым форматом
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      }

      // Сохраняем файл
      const fs = await import('fs');
      XLSX.writeFile(workbook, savePath);

      console.log('[IPC] Exported to Excel:', savePath);
      return { success: true, filePath: savePath };
    } catch (error: any) {
      console.error('[IPC] export-to-excel error:', error);
      return {
        success: false,
        error: error.message || 'Ошибка экспорта'
      };
    }
  });

  // Сохранение файла через диалог
  ipcMain.handle('save-file', async (event, { content, mimeType, extension, defaultName }) => {
    try {
      const pathModule = await import('path');
      const { app, dialog } = await import('electron');

      const result = await dialog.showSaveDialog({
        title: 'Сохранить файл',
        defaultPath: pathModule.join(app.getPath('documents'), `${defaultName}.${extension}`),
        filters: [
          { name: `${extension.toUpperCase()} Files`, extensions: [extension] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      const fs = await import('fs');
      fs.writeFileSync(result.filePath, content, 'utf8');

      console.log('[IPC] File saved:', result.filePath);
      return { success: true, filePath: result.filePath };
    } catch (error: any) {
      console.error('[IPC] save-file error:', error);
      return {
        success: false,
        error: error.message || 'Ошибка сохранения файла'
      };
    }
  });

  // Диалог открытия файла
  ipcMain.handle('open-file-dialog', async () => {
    try {
      const { dialog } = await import('electron');

      const result = await dialog.showOpenDialog({
        title: 'Открыть файл',
        filters: [
          { name: 'Spreadsheet Files', extensions: ['xlsx', 'xls', 'csv'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      return { success: true, filePath: result.filePaths[0] };
    } catch (error: any) {
      console.error('[IPC] open-file-dialog error:', error);
      return {
        success: false,
        error: error.message || 'Ошибка открытия диалога файла'
      };
    }
  });

  // Чтение CSV файла
  ipcMain.handle('read-csv-file', async (event, { filePath }) => {
    try {
      const fs = await import('fs');

      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Файл не найден' };
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').map(line => line.trim()).filter(line => line);
      const data = lines.map(line => {
        const row: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            row.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        row.push(current.trim().replace(/^"|"$/g, ''));
        return row;
      });

      return { success: true, data };
    } catch (error: any) {
      console.error('[IPC] read-csv-file error:', error);
      return {
        success: false,
        error: error.message || 'Ошибка чтения CSV'
      };
    }
  });

  // Чтение XLSX файла с полным извлечением данных и стилей
  ipcMain.handle('read-xlsx-file', async (event, { filePath }) => {
    console.log('====== [DEBUG IPC] read-xlsx-file START ======');
    console.log('[DEBUG] filePath:', filePath);
    
    try {
      const fs = await import('fs');
      const XLSX = await import('xlsx');

      if (!fs.existsSync(filePath)) {
        console.error('[DEBUG] File does not exist:', filePath);
        return { success: false, error: 'Файл не найден' };
      }

      // Читаем файл с полным извлечением
      const buffer = fs.readFileSync(filePath);
      console.log('[DEBUG] File size:', buffer.length, 'bytes');
      
      const workbook = XLSX.read(buffer, { 
        type: 'buffer',
        cellStyles: true,      // Извлекать стили ячеек
        cellNF: true,          // Извлекать форматы чисел
        cellFormula: true,     // Извлекать формулы
        sheetStubs: true       // Извлекать пустые ячейки
      });
      
      console.log('[DEBUG] Workbook loaded, sheets:', workbook.SheetNames.length);
      
      const sheets: Array<{ 
        name: string; 
        data: string[][];
        styles?: any[][];
        formulas?: string[][];
      }> = [];
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        console.log('[DEBUG] Processing sheet:', sheetName);
        
        // Конвертируем в JSON с полным извлечением
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: ''  // Пустые ячейки = пустая строка
        });
        
        console.log('[DEBUG] Sheet rows:', jsonData.length);
        
        // Извлекаем стили и формулы
        const styles: any[][] = [];
        const formulas: string[][] = [];
        const data: string[][] = [];
        
        // Получаем диапазон ячеек
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        console.log('[DEBUG] Sheet range:', range);
        
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const rowData: string[] = [];
          const rowStyles: any[] = [];
          const rowFormulas: string[] = [];
          
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = worksheet[cellAddress];
            
            if (cell) {
              // Значение
              rowData.push(cell.v != null ? String(cell.v) : '');
              
              // Формула
              if (cell.f) {
                rowFormulas.push('=' + cell.f);
              } else {
                rowFormulas.push('');
              }
              
              // Стиль
              if (cell.s) {
                rowStyles.push({
                  fill: cell.s.fill,
                  font: cell.s.font,
                  alignment: cell.s.alignment,
                  border: cell.s.border,
                  numFmt: cell.s.numFmt
                });
              } else {
                rowStyles.push(null);
              }
            } else {
              rowData.push('');
              rowFormulas.push('');
              rowStyles.push(null);
            }
          }
          
          data.push(rowData);
          styles.push(rowStyles);
          formulas.push(rowFormulas);
        }
        
        sheets.push({
          name: sheetName,
          data,
          styles,
          formulas
        });
        
        console.log('[DEBUG] Sheet processed:', sheetName, 'rows:', data.length, 'cols:', data[0]?.length);
      });

      console.log('[DEBUG] Total sheets:', sheets.length);
      console.log('[DEBUG] read-xlsx-file SUCCESS');
      console.log('====== [DEBUG IPC] read-xlsx-file END ======');
      
      return { success: true, sheets };
    } catch (error: any) {
      console.error('====== [DEBUG IPC] read-xlsx-file ERROR ======');
      console.error('[DEBUG] Error:', error.message);
      console.error('[DEBUG] Stack:', error.stack);
      return {
        success: false,
        error: error.message || 'Ошибка чтения XLSX'
      };
    }
  });

  // Диалог открытия папки
  ipcMain.handle('open-folder-dialog', async () => {
    try {
      const { dialog } = await import('electron');

      const result = await dialog.showOpenDialog({
        title: 'Открыть папку',
        properties: ['openDirectory']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      return { success: true, folderPath: result.filePaths[0] };
    } catch (error: any) {
      console.error('[IPC] open-folder-dialog error:', error);
      return {
        success: false,
        error: error.message || 'Ошибка открытия диалога папки'
      };
    }
  });

  // Импорт файлов из папки
  ipcMain.handle('import-folder', async (event, { folderPath }) => {
    try {
      const fs = await import('fs');
      const path = await import('path');

      if (!fs.existsSync(folderPath)) {
        return { success: false, error: 'Папка не найдена' };
      }

      const files = fs.readdirSync(folderPath)
        .filter(f => /\.(xlsx|xls|csv)$/i.test(f))
        .map(f => ({
          name: f,
          path: path.join(folderPath, f)
        }));

      const sheets: Array<{ name: string; data: string[][] }> = [];

      for (const file of files) {
        const ext = path.extname(file.name).toLowerCase();

        if (ext === '.csv') {
          const content = fs.readFileSync(file.path, 'utf8');
          const lines = content.split('\n').map(line => line.trim()).filter(line => line);
          const data = lines.map(line => line.split(',').map(cell => cell.trim()));
          sheets.push({ name: file.name.replace(/\.[^.]+$/, ''), data });
        } else {
          // Для XLSX - заглушка
          sheets.push({ name: file.name.replace(/\.[^.]+$/, ''), data: [] });
        }
      }

      return { success: true, sheets };
    } catch (error: any) {
      console.error('[IPC] import-folder error:', error);
      return {
        success: false,
        error: error.message || 'Ошибка импорта папки'
      };
    }
  });

  // ============================================================================
  // Plugin Installer - установка плагинов из GitHub Releases
  // ============================================================================
  ipcMain.handle('install-plugin', async (event, data: {
    zipData: ArrayBuffer;
    pluginId: string;
    releaseUrl?: string;
  }) => {
    try {
      log.info('Installing plugin:', data.pluginId);

      const pluginsDir = getPluginsDir();

      // Создаём папку plugins если нет
      if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir, { recursive: true });
        log.info('Created plugins directory:', pluginsDir);
      }

      // Динамически импортируем AdmZip (чтобы не нагружать сборку если не используется)
      let AdmZip;
      try {
        AdmZip = (await import('adm-zip')).default;
      } catch {
        return { 
          success: false, 
          error: 'Модуль adm-zip не установлен. Выполните: npm install adm-zip' 
        };
      }

      // Распаковываем ZIP
      const zip = new AdmZip(Buffer.from(data.zipData));
      const extractPath = path.join(pluginsDir, data.pluginId);
      
      // Удаляем старую версию если есть
      if (fs.existsSync(extractPath)) {
        log.info('Removing old plugin version:', extractPath);
        fs.rmSync(extractPath, { recursive: true, force: true });
      }
      
      // Распаковываем в временную папку сначала
      const tempExtractPath = path.join(pluginsDir, '.temp-' + data.pluginId);
      zip.extractAllTo(tempExtractPath, true);
      log.info('Extracted to:', tempExtractPath);

      // Удаляем .git папку если есть (не должна быть в плагине)
      const gitPath = path.join(tempExtractPath, '.git');
      if (fs.existsSync(gitPath)) {
        fs.rmSync(gitPath, { recursive: true, force: true });
        log.info('Removed .git folder from plugin');
      }

      // Валидируем manifest.json
      const manifestPath = path.join(tempExtractPath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        // Возможно manifest.json в подпапке - ищем его
        const manifestFiles = findManifestFiles(tempExtractPath);
        if (manifestFiles.length > 0) {
          // Копируем содержимое подпапки в основную
          const pluginRoot = path.dirname(manifestFiles[0]);
          if (pluginRoot !== tempExtractPath) {
            fs.rmSync(extractPath, { recursive: true, force: true });
            fs.renameSync(pluginRoot, extractPath);
            fs.rmSync(tempExtractPath, { recursive: true, force: true });
          } else {
            fs.renameSync(tempExtractPath, extractPath);
          }
        } else {
          fs.rmSync(tempExtractPath, { recursive: true, force: true });
          return { success: false, error: 'manifest.json не найден в архиве' };
        }
      } else {
        // Просто переименовываем временную папку
        fs.renameSync(tempExtractPath, extractPath);
      }

      // Читаем и валидируем manifest.json
      const manifestContent = fs.readFileSync(path.join(extractPath, 'manifest.json'), 'utf-8');
      const manifest = JSON.parse(manifestContent);
      
      if (!manifest.id || !manifest.main) {
        fs.rmSync(extractPath, { recursive: true, force: true });
        return { 
          success: false, 
          error: 'Неверный manifest.json: отсутствуют поля id или main' 
        };
      }

      // Проверяем наличие main.js
      const mainPath = path.join(extractPath, manifest.main);
      if (!fs.existsSync(mainPath)) {
        fs.rmSync(extractPath, { recursive: true, force: true });
        return { 
          success: false, 
          error: `Файл ${manifest.main} не найден` 
        };
      }

      log.info('Plugin installed successfully:', manifest.id, 'at', extractPath);

      return { 
        success: true, 
        pluginId: manifest.id,
        path: extractPath,
        manifest: manifest
      };

    } catch (error: any) {
      log.error('Plugin installation failed:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ============================================================================
  // Download & Install Plugin - скачивание и установка плагина через main процесс
  // ============================================================================
  ipcMain.handle('download-and-install-plugin', async (event, data: {
    downloadUrl: string;
    pluginId: string;
    releaseUrl?: string;
  }) => {
    try {
      log.info('Downloading and installing plugin from:', data.downloadUrl);
      log.info('Plugin ID:', data.pluginId);
      log.info('Plugins directory:', getPluginsDir());

      const pluginsDir = getPluginsDir();

      // Создаём папку plugins если нет
      if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir, { recursive: true });
        log.info('Created plugins directory:', pluginsDir);
      }

      // Скачиваем ZIP через net модуль (обходит CORS)
      log.info('Starting download...');
      const zipBuffer = await downloadFileViaNet(data.downloadUrl);
      log.info('Downloaded ZIP, size:', zipBuffer.length, 'bytes');

      // Динамически импортируем AdmZip
      let AdmZip;
      try {
        AdmZip = (await import('adm-zip')).default;
      } catch {
        return {
          success: false,
          error: 'Модуль adm-zip не установлен. Выполните: npm install adm-zip'
        };
      }

      // Распаковываем ZIP
      const zip = new AdmZip(zipBuffer);
      const extractPath = path.join(pluginsDir, data.pluginId);

      // Удаляем старую версию если есть
      if (fs.existsSync(extractPath)) {
        log.info('Removing old plugin version:', extractPath);
        fs.rmSync(extractPath, { recursive: true, force: true });
      }

      // Распаковываем в временную папку сначала
      const tempExtractPath = path.join(pluginsDir, '.temp-' + data.pluginId);
      zip.extractAllTo(tempExtractPath, true);
      log.info('Extracted to:', tempExtractPath);

      // Удаляем .git папку если есть (не должна быть в плагине)
      const gitPath = path.join(tempExtractPath, '.git');
      if (fs.existsSync(gitPath)) {
        fs.rmSync(gitPath, { recursive: true, force: true });
        log.info('Removed .git folder from plugin');
      }

      // Валидируем manifest.json
      const manifestPath = path.join(tempExtractPath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        // Возможно manifest.json в подпапке - ищем его
        const manifestFiles = findManifestFiles(tempExtractPath);
        if (manifestFiles.length > 0) {
          // Копируем содержимое подпапки в основную
          const pluginRoot = path.dirname(manifestFiles[0]);
          if (pluginRoot !== tempExtractPath) {
            fs.rmSync(extractPath, { recursive: true, force: true });
            fs.renameSync(pluginRoot, extractPath);
            fs.rmSync(tempExtractPath, { recursive: true, force: true });
          } else {
            fs.renameSync(tempExtractPath, extractPath);
          }
        } else {
          fs.rmSync(tempExtractPath, { recursive: true, force: true });
          return { success: false, error: 'manifest.json не найден в архиве' };
        }
      } else {
        // Просто переименовываем временную папку
        fs.renameSync(tempExtractPath, extractPath);
      }

      // Читаем и валидируем manifest.json
      const manifestContent = fs.readFileSync(path.join(extractPath, 'manifest.json'), 'utf-8');
      const manifest = JSON.parse(manifestContent);

      if (!manifest.id || !manifest.main) {
        fs.rmSync(extractPath, { recursive: true, force: true });
        return {
          success: false,
          error: 'Неверный manifest.json: отсутствуют поля id или main'
        };
      }

      // Проверяем наличие main.js
      const mainPath = path.join(extractPath, manifest.main);
      if (!fs.existsSync(mainPath)) {
        fs.rmSync(extractPath, { recursive: true, force: true });
        return {
          success: false,
          error: `Файл ${manifest.main} не найден`
        };
      }

      // Переименовываем папку в соответствии с manifest.id если отличается
      const correctExtractPath = path.join(pluginsDir, manifest.id);
      if (extractPath !== correctExtractPath) {
        log.info(`Renaming plugin folder from ${extractPath} to ${correctExtractPath}`);
        if (fs.existsSync(correctExtractPath)) {
          fs.rmSync(correctExtractPath, { recursive: true, force: true });
        }
        fs.renameSync(extractPath, correctExtractPath);
      }

      log.info('Plugin installed successfully:', manifest.id, 'at', correctExtractPath);

      return {
        success: true,
        pluginId: manifest.id,
        path: correctExtractPath,
        manifest: manifest
      };

    } catch (error: any) {
      log.error('Download and install failed:', error.message);
      return { success: false, error: error.message };
    }
  });

  // Обработчик для открытия диалога выбора ZIP файла плагина
  ipcMain.handle('open-plugin-zip-dialog', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Выберите ZIP файл плагина',
        filters: [
          { name: 'Plugin Package', extensions: ['zip'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      return {
        success: true,
        filePath: result.filePaths[0]
      };
    } catch (error: any) {
      log.error('open-plugin-zip-dialog error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // Обработчик для получения списка установленных плагинов
  ipcMain.handle('get-installed-plugins', async () => {
    try {
      const pluginsDir = getPluginsDir();

      if (!fs.existsSync(pluginsDir)) {
        return { success: true, plugins: [] };
      }

      const plugins: Array<{ id: string; manifest: any; path: string; enabled: boolean }> = [];
      const savedState = loadPluginState();

      const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const manifestPath = path.join(pluginsDir, entry.name, 'manifest.json');

          if (fs.existsSync(manifestPath)) {
            try {
              const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
              const manifest = JSON.parse(manifestContent);

              if (manifest.id) {
                // Загружаем состояние из файла или используем false по умолчанию
                const pluginState = savedState[manifest.id];
                const enabled = pluginState ? pluginState.enabled : false;

                plugins.push({
                  id: manifest.id,
                  manifest: manifest,
                  path: path.join(pluginsDir, entry.name),
                  enabled: enabled
                });
              }
            } catch (e) {
              log.warn('Failed to read manifest:', entry.name);
            }
          }
        }
      }

      return { success: true, plugins };
    } catch (error: any) {
      log.error('get-installed-plugins error:', error.message);
      return { success: false, error: error.message, plugins: [] };
    }
  });

  // ============================================================================
  // Load Plugin File - чтение файла плагина (для загрузки main.js)
  // ============================================================================
  ipcMain.handle('load-plugin-file', async (event, data: {
    pluginPath: string;
    fileName: string;
  }) => {
    try {
      const filePath = path.join(data.pluginPath, data.fileName);

      // Проверяем, что файл находится внутри директории плагинов (безопасность)
      const pluginsDir = getPluginsDir();
      const resolvedPath = path.resolve(filePath);
      const normalizedPluginsDir = path.resolve(pluginsDir);

      if (!resolvedPath.startsWith(normalizedPluginsDir)) {
        return {
          success: false,
          error: 'Access denied: file outside plugins directory'
        };
      }

      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `File not found: ${data.fileName}`
        };
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      
      return {
        success: true,
        content,
        fileName: data.fileName
      };
    } catch (error: any) {
      log.error('load-plugin-file error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ============================================================================
  // Uninstall Plugin - удаление плагина
  // ============================================================================
  ipcMain.handle('uninstall-plugin', async (event, data: {
    pluginId: string;
  }) => {
    try {
      const pluginsDir = getPluginsDir();
      const pluginPath = path.join(pluginsDir, data.pluginId);

      // Проверяем, что папка находится внутри директории плагинов (безопасность)
      const resolvedPath = path.resolve(pluginPath);
      const normalizedPluginsDir = path.resolve(pluginsDir);

      if (!resolvedPath.startsWith(normalizedPluginsDir)) {
        return {
          success: false,
          error: 'Access denied: plugin path outside plugins directory'
        };
      }

      if (!fs.existsSync(pluginPath)) {
        return {
          success: false,
          error: `Plugin not found: ${data.pluginId}`
        };
      }

      // Удаляем папку плагина
      fs.rmSync(pluginPath, { recursive: true, force: true });

      // Удаляем из состояния
      const state = loadPluginState();
      delete state[data.pluginId];
      savePluginState(state);

      log.info(`Plugin uninstalled: ${data.pluginId}, path: ${pluginPath}`);

      return {
        success: true,
        pluginId: data.pluginId
      };
    } catch (error: any) {
      log.error('uninstall-plugin error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ============================================================================
  // Save Plugin State - сохранение состояния плагина (enabled/disabled)
  // ============================================================================
  ipcMain.handle('save-plugin-state', async (event, data: {
    pluginId: string;
    enabled: boolean;
  }) => {
    try {
      const state = loadPluginState();
      state[data.pluginId] = { enabled: data.enabled };
      savePluginState(state);

      log.info(`Plugin state saved: ${data.pluginId} = ${data.enabled}`);

      return { success: true };
    } catch (error: any) {
      log.error('save-plugin-state error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ============================================================================
  // Load Plugin Styles - загрузка CSS файлов плагина
  // ============================================================================
  ipcMain.handle('load-plugin-styles', async (event, data: {
    pluginPath: string;
    styles: string[];
  }) => {
    try {
      log.info('load-plugin-styles called:', data);
      
      const stylesContent: string[] = [];

      for (const styleFile of data.styles) {
        const filePath = path.join(data.pluginPath, styleFile);
        log.info(`Checking style file: ${filePath}`);

        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          log.info(`Style file loaded: ${filePath}, size: ${content.length} bytes`);
          stylesContent.push(content);
        } else {
          log.warn(`Style file not found: ${filePath}`);
        }
      }

      log.info(`load-plugin-styles returning ${stylesContent.length} styles`);
      
      return {
        success: true,
        styles: stylesContent
      };
    } catch (error: any) {
      log.error('load-plugin-styles error:', error.message);
      return { success: false, error: error.message, styles: [] };
    }
  });

  // Дополнительные обработчики можно добавить здесь
  console.log('[IPC] All handlers registered');
}

/**
 * Очистить IPC обработчики (при закрытии приложения)
 */
export function cleanupIPCHandlers(): void {
  ipcMain.removeHandler('ai-chat');
  ipcMain.removeHandler('scan-files');
  ipcMain.removeHandler('open-file');
  ipcMain.removeHandler('autosave-file');
  ipcMain.removeHandler('load-autosave');
  ipcMain.removeHandler('export-to-excel');
  ipcMain.removeHandler('save-file');
  ipcMain.removeHandler('open-file-dialog');
  ipcMain.removeHandler('read-csv-file');
  ipcMain.removeHandler('read-xlsx-file');
  ipcMain.removeHandler('open-folder-dialog');
  ipcMain.removeHandler('import-folder');
  ipcMain.removeHandler('install-plugin');
  ipcMain.removeHandler('download-and-install-plugin');
  ipcMain.removeHandler('open-plugin-zip-dialog');
  ipcMain.removeHandler('get-installed-plugins');
  ipcMain.removeHandler('load-plugin-file');
  ipcMain.removeHandler('uninstall-plugin');
  ipcMain.removeHandler('save-plugin-state');
  ipcMain.removeHandler('load-plugin-styles');
}
