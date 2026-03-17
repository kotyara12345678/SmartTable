/**
 * Типы и интерфейсы для системы плагинов SmartTable
 */

/**
 * Манифест плагина
 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  main: string;
  styles?: string[];
  apiVersion: string;
  permissions?: PluginPermission[];
  icon?: string;
  homepage?: string;
}

/**
 * Разрения для плагинов
 */
export type PluginPermission =
  | 'sheets.read'        // Чтение данных ячеек
  | 'sheets.write'       // Запись данных ячеек
  | 'sheets.create'      // Создание листов
  | 'sheets.delete'      // Удаление листов
  | 'ui.ribbon'          // Добавление кнопок в ленту
  | 'ui.menu'            // Добавление пунктов меню
  | 'ui.panel'           // Создание панелей
  | 'ui.modal'           // Показ модальных окон
  | 'events.subscribe'   // Подписка на события
  | 'storage.read'       // Чтение хранилища
  | 'storage.write';     // Запись в хранилище

/**
 * Состояние плагина
 */
export enum PluginState {
  LOADING = 'loading',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  DISABLED = 'disabled'
}

/**
 * Информация о плагине
 */
export interface PluginInfo {
  manifest: PluginManifest;
  state: PluginState;
  path: string;
  error?: string;
  enabled: boolean;
}

/**
 * API для доступа к данным таблиц
 */
export interface SheetsAPI {
  getCell(sheetId: number, cellId: string): any;
  setCell(sheetId: number, cellId: string, value: any): void;
  getSelectedRange(): { sheetId: number; start: string; end: string } | null;
  getSheet(sheetId: number): any;
  createSheet(name: string): number;
  deleteSheet(sheetId: number): void;
  getAllSheets(): any[];
}

/**
 * API для работы с UI
 */
export interface UIAPI {
  addRibbonButton(options: RibbonButtonOptions): void;
  addMenuItem(options: MenuItemOptions): void;
  addPanel(options: PanelOptions): void;
  showModal(content: HTMLElement | string, options?: { size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' }): void;
  closeModals(): void;
  showNotification(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
  getActiveTheme(): string;
}

/**
 * Опции кнопки в ленте
 */
export interface RibbonButtonOptions {
  id: string;
  groupId: string;
  icon: string;
  label: string;
  tooltip?: string;
  onClick: () => void;
  size?: 'sm' | 'lg';
}

/**
 * Опции пункта меню
 */
export interface MenuItemOptions {
  id: string;
  label: string;
  tab?: string;
  onClick: () => void;
}

/**
 * Опции панели
 */
export interface PanelOptions {
  id: string;
  title: string;
  content: HTMLElement | string;
  width?: number;
  position?: 'left' | 'right';
}

/**
 * API для подписки на события
 */
export interface EventsAPI {
  onCellChange(callback: (sheetId: number, cellId: string, value: any) => void): void;
  onSheetCreate(callback: (sheetId: number) => void): void;
  onSheetDelete(callback: (sheetId: number) => void): void;
  onSelectionChange(callback: (range: any) => void): void;
  onFileOpen(callback: (fileName: string) => void): void;
  onFileSave(callback: (fileName: string) => void): void;
  off(event: string, callback: Function): void;
}

/**
 * API для работы с хранилищем
 */
export interface StorageAPI {
  get(key: string): any;
  set(key: string, value: any): void;
  remove(key: string): void;
  clear(): void;
}

/**
 * Основное API для плагинов
 */
export interface SmartTablePluginAPI {
  sheets: SheetsAPI;
  ui: UIAPI;
  events: EventsAPI;
  storage: StorageAPI;
  version: string;
}

/**
 * Точка входа плагина
 */
export type PluginEntryPoint = (api: SmartTablePluginAPI) => {
  activate?: () => void;
  deactivate?: () => void;
  [key: string]: any;
};
