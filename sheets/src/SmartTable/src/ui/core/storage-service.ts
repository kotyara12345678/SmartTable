/**
 * StorageService - сохранение и загрузка данных таблицы в localStorage
 * Обеспечивает персистентность данных между сессиями
 */

export interface SaveData {
  version: string;
  timestamp: number;
  sheets: Array<{
    id: number;
    name: string;
    data: Array<[string, any]>; // Сериализованная Map
  }>;
  currentSheet: number;
  settings?: {
    zoom?: number;
    theme?: string;
  };
}

const STORAGE_KEY = 'smarttable-data';
const AUTOSAVE_KEY = 'smarttable-autosave';
const VERSION = '2.0';

export class StorageService {
  /**
   * Сохранить данные таблицы в localStorage
   */
  save(sheetsData: Map<number, Map<string, any>>, currentSheet: number, sheets: Array<{id: number, name: string}>): boolean {
    try {
      const saveData: SaveData = {
        version: VERSION,
        timestamp: Date.now(),
        sheets: [],
        currentSheet,
        settings: {
          zoom: parseInt(localStorage.getItem('smarttable-zoom') || '100'),
          theme: localStorage.getItem('smarttable-theme') || 'default'
        }
      };
      
      // Сериализуем каждый лист
      sheets.forEach(sheet => {
        const data = sheetsData.get(sheet.id);
        if (data) {
          saveData.sheets.push({
            id: sheet.id,
            name: sheet.name,
            data: Array.from(data.entries())
          });
        } else {
          saveData.sheets.push({
            id: sheet.id,
            name: sheet.name,
            data: []
          });
        }
      });
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
      console.log('[Storage] Data saved:', saveData.sheets.length, 'sheets');
      return true;
    } catch (e) {
      console.error('[Storage] Save error:', e);
      return false;
    }
  }
  
  /**
   * Загрузить данные из localStorage
   */
  load(): { 
    sheetsData: Map<number, Map<string, any>>; 
    currentSheet: number;
    sheets: Array<{id: number, name: string}>;
    settings?: any;
  } | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        console.log('[Storage] No saved data found');
        return null;
      }
      
      const saveData: SaveData = JSON.parse(saved);
      console.log('[Storage] Loading data from version:', saveData.version);
      
      // Десериализуем листы
      const sheetsData = new Map<number, Map<string, any>>();
      const sheets: Array<{id: number, name: string}> = [];
      
      saveData.sheets.forEach(sheetData => {
        sheets.push({
          id: sheetData.id,
          name: sheetData.name
        });
        
        const data = new Map<string, any>(sheetData.data);
        sheetsData.set(sheetData.id, data);
      });
      
      return {
        sheetsData,
        currentSheet: saveData.currentSheet,
        sheets,
        settings: saveData.settings
      };
    } catch (e) {
      console.error('[Storage] Load error:', e);
      return null;
    }
  }
  
  /**
   * Автосохранение (быстрое, без настроек)
   */
  autoSave(sheetsData: Map<number, Map<string, any>>, currentSheet: number): boolean {
    try {
      const saveData: SaveData = {
        version: VERSION,
        timestamp: Date.now(),
        sheets: [],
        currentSheet
      };
      
      sheetsData.forEach((data, sheetId) => {
        saveData.sheets.push({
          id: sheetId,
          name: `Лист ${sheetId}`,
          data: Array.from(data.entries())
        });
      });
      
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(saveData));
      return true;
    } catch (e) {
      console.error('[Storage] AutoSave error:', e);
      return false;
    }
  }
  
  /**
   * Загрузить автосохранение
   */
  loadAutoSave(): SaveData | null {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (!saved) return null;
      
      return JSON.parse(saved);
    } catch (e) {
      console.error('[Storage] LoadAutoSave error:', e);
      return null;
    }
  }
  
  /**
   * Очистить сохраненные данные
   */
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(AUTOSAVE_KEY);
    console.log('[Storage] Data cleared');
  }
  
  /**
   * Получить информацию о сохранении
   */
  getSaveInfo(): { hasData: boolean; timestamp?: number; version?: string } {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return { hasData: false };
    }
    
    try {
      const saveData: SaveData = JSON.parse(saved);
      return {
        hasData: true,
        timestamp: saveData.timestamp,
        version: saveData.version
      };
    } catch {
      return { hasData: false };
    }
  }
  
  /**
   * Экспорт данных в файл
   */
  exportToFile(filename: string = 'smarttable-export.json'): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      alert('Нет данных для экспорта');
      return;
    }
    
    const blob = new Blob([saved], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    console.log('[Storage] Data exported to', filename);
  }
  
  /**
   * Импорт данных из файла
   */
  importFromFile(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const saveData: SaveData = JSON.parse(content);
          
          localStorage.setItem(STORAGE_KEY, content);
          console.log('[Storage] Data imported successfully');
          resolve(true);
        } catch (err) {
          console.error('[Storage] Import error:', err);
          resolve(false);
        }
      };
      reader.onerror = () => resolve(false);
      reader.readAsText(file);
    });
  }
}

// Глобальный экземпляр
export const storageService = new StorageService();

if (typeof window !== 'undefined') {
  (window as any).storageService = storageService;
}
