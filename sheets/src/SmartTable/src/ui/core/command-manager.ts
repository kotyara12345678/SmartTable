/**
 * CommandManager - управляет историей команд Undo/Redo
 */

import { ICommand } from './commands.js';

export class CommandManager {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private maxHistory: number = 100;
  
  constructor(maxHistory: number = 100) {
    this.maxHistory = maxHistory;
  }
  
  /**
   * Выполнить команду и сохранить в историю
   */
  execute(command: ICommand): void {
    try {
      // Выполняем команду
      command.execute();
      
      // Сохраняем в undo стек
      this.undoStack.push(command);
      
      // Очищаем redo стек при новом действии
      this.redoStack = [];
      
      // Обрезаем историю если превышает лимит
      if (this.undoStack.length > this.maxHistory) {
        this.undoStack.shift();
      }
      
      console.log(`[CommandManager] Executed: ${command.name}, undo stack: ${this.undoStack.length}`);
    } catch (e) {
      console.error('[CommandManager] Execute error:', e);
    }
  }
  
  /**
   * Отменить последнее действие
   */
  undo(): boolean {
    if (this.undoStack.length === 0) {
      console.log('[CommandManager] Nothing to undo');
      return false;
    }
    
    try {
      const command = this.undoStack.pop()!;
      command.undo();
      
      // Перемещаем в redo стек
      this.redoStack.push(command);
      
      console.log(`[CommandManager] Undone: ${command.name}`);
      return true;
    } catch (e) {
      console.error('[CommandManager] Undo error:', e);
      return false;
    }
  }
  
  /**
   * Повторить отмененное действие
   */
  redo(): boolean {
    if (this.redoStack.length === 0) {
      console.log('[CommandManager] Nothing to redo');
      return false;
    }
    
    try {
      const command = this.redoStack.pop()!;
      command.redo();
      
      // Возвращаем в undo стек
      this.undoStack.push(command);
      
      console.log(`[CommandManager] Redone: ${command.name}`);
      return true;
    } catch (e) {
      console.error('[CommandManager] Redo error:', e);
      return false;
    }
  }
  
  /**
   * Проверить, есть ли действия для отмены
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  
  /**
   * Проверить, есть ли действия для повтора
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  
  /**
   * Получить количество действий для отмены
   */
  getUndoCount(): number {
    return this.undoStack.length;
  }
  
  /**
   * Получить количество действий для повтора
   */
  getRedoCount(): number {
    return this.redoStack.length;
  }
  
  /**
   * Очистить историю
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    console.log('[CommandManager] History cleared');
  }
}

// Глобальный экземпляр
export const commandManager = new CommandManager(100);

// Делаем доступным глобально
if (typeof window !== 'undefined') {
  (window as any).commandManager = commandManager;
}
