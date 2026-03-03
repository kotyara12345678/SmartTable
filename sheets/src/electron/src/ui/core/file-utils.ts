/**
 * File Utils - общие функции для работы с файлами
 * Убирает дублирование между StartScreen и TopBar
 */

export interface FileSheet {
  name: string;
  data: string[][];
}

export interface LastOpenedFile {
  path: string;
  name: string;
  timestamp: number;
  isFolder?: boolean;
}

const STORAGE_KEY = 'smarttable-last-opened-file';

/**
 * Сохранить информацию о последнем открытом файле
 */
export function saveLastOpenedFile(filePath: string, name: string, isFolder = false): void {
  const fileData: LastOpenedFile = {
    path: filePath,
    name,
    timestamp: Date.now(),
    isFolder
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fileData));
}

/**
 * Получить информацию о последнем открытом файле
 */
export function getLastOpenedFile(): LastOpenedFile | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Очистить информацию о последнем файле
 */
export function clearLastOpenedFile(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Проверить существует ли файл
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const fs = await import('fs');
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Прочитать CSV файл
 */
export async function readCSVFile(filePath: string): Promise<FileSheet[]> {
  const fs = await import('fs');
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

  const fileName = filePath.split(/[/\\]/).pop() || 'CSV';
  return [{ name: fileName.replace(/\.[^.]+$/, ''), data }];
}

/**
 * Прочитать XLSX файл
 */
export async function readXLSXFile(filePath: string): Promise<FileSheet[]> {
  const fs = await import('fs');
  const XLSX = await import('xlsx');
  
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  
  const sheets: FileSheet[] = [];
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: string[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    sheets.push({ name: sheetName, data: jsonData });
  });

  return sheets;
}

/**
 * Универсальная функция для чтения файла
 */
export async function readFile(filePath: string): Promise<FileSheet[]> {
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  if (ext === 'csv') {
    return await readCSVFile(filePath);
  } else if (ext === 'xlsx' || ext === 'xls') {
    return await readXLSXFile(filePath);
  } else {
    throw new Error(`Неподдерживаемый формат файла: ${ext}`);
  }
}

/**
 * Экспортировать данные в XLSX
 */
export async function exportToXLSX(
  sheets: FileSheet[], 
  filePath?: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const pathModule = await import('path');
    const { app, dialog } = await import('electron');
    const XLSX = await import('xlsx');

    let savePath = filePath;
    if (!savePath) {
      const result = await dialog.showSaveDialog({
        title: 'Сохранить как Excel',
        defaultPath: pathModule.join(app.getPath('documents'), 'SmartTable-Export.xlsx'),
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Отменено пользователем' };
      }
      savePath = result.filePath;
    }

    const workbook = XLSX.utils.book_new();
    sheets.forEach(sheet => {
      const worksheet = XLSX.utils.aoa_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });

    XLSX.writeFile(workbook, savePath);
    return { success: true, filePath: savePath };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Ошибка экспорта' 
    };
  }
}
