/**
 * KeyboardController - модуль для управления навигацией клавиатурой в таблице
 * 
 * Управляет:
 * - Стрелками (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
 * - Enter (начало редактирования)
 * - Tab (переместиться на следующую ячейку)
 * - Escape (отмена редактирования)
 * - Символы (начало редактирования с вводом символа)
 * - Специальные клавиши (Delete, Backspace, F2)
 */

export interface KeyboardControllerConfig {
  // Навигация
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  
  // Редактирование
  onEnter?: () => void;
  onTab?: (shiftKey: boolean) => void;
  onEscape?: () => void;
  
  // Удаление
  onDelete?: () => void;
  onBackspace?: () => void;
  
  // Специальные
  onF2?: () => void;
  onChar?: (char: string) => void;
  
  // Проверка состояния
  isEditing?: () => boolean;
  isSelecting?: () => boolean;
}

class KeyboardController {
  private config: KeyboardControllerConfig;
  private isEnabled: boolean = true;
  private boundHandleKeyDown: (e: KeyboardEvent) => void;

  constructor(config: KeyboardControllerConfig) {
    this.config = config;
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Инициализировать контроллер
   * Вешает обработчик на document
   */
  init(): void {
    document.addEventListener('keydown', this.boundHandleKeyDown);
    console.log('[KeyboardController] Initialized');
  }

  /**
   * Обработчик нажатия клавиши
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isEnabled) return;

    // Если редактируем - не обрабатываем навигацию
    if (this.config.isEditing?.()) {
      // В режиме редактирования обрабатываем только специальные клавиши
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          this.config.onEscape?.();
          break;
      }
      return;
    }

    // Обрабатываем навигационные клавиши только если НЕ редактируем
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        this.config.onArrowUp?.();
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        this.config.onArrowDown?.();
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        this.config.onArrowLeft?.();
        break;
        
      case 'ArrowRight':
        e.preventDefault();
        this.config.onArrowRight?.();
        break;
        
      case 'Enter':
        e.preventDefault();
        this.config.onEnter?.();
        break;
        
      case 'Tab':
        e.preventDefault();
        this.config.onTab?.(e.shiftKey);
        break;
        
      case 'Delete':
        e.preventDefault();
        this.config.onDelete?.();
        break;
        
      case 'Backspace':
        e.preventDefault();
        this.config.onBackspace?.();
        break;
        
      case 'F2':
        e.preventDefault();
        this.config.onF2?.();
        break;
        
      default:
        // Начало редактирования с вводом символа
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          this.config.onChar?.(e.key);
        }
        break;
    }
  }

  /**
   * Включить контроллер
   */
  enable(): void {
    this.isEnabled = true;
  }

  /**
   * Отключить контроллер
   */
  disable(): void {
    this.isEnabled = false;
  }

  /**
   * Проверить, включен ли контроллер
   */
  isActive(): boolean {
    return this.isEnabled;
  }

  /**
   * Удалить контроллер и освободить ресурсы
   */
  destroy(): void {
    document.removeEventListener('keydown', this.boundHandleKeyDown);
    console.log('[KeyboardController] Destroyed');
  }
}

export default KeyboardController;
