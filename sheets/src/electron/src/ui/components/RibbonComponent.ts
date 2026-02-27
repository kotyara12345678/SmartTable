/**
 * Ribbon Component - панель инструментов
 */
import { BaseComponent } from '../core/component.js';

export class RibbonComponent extends BaseComponent {
  // Элементы вкладки Главная
  private btnPaste: HTMLElement | null = null;
  private btnCut: HTMLElement | null = null;
  private btnCopy: HTMLElement | null = null;
  private btnBold: HTMLElement | null = null;
  private btnItalic: HTMLElement | null = null;
  private btnUnderline: HTMLElement | null = null;
  private btnStrike: HTMLElement | null = null;
  private btnTextColor: HTMLElement | null = null;
  private btnFillColor: HTMLElement | null = null;
  private textColorInput: HTMLInputElement | null = null;
  private fillColorInput: HTMLInputElement | null = null;
  private btnAlignLeft: HTMLElement | null = null;
  private btnAlignCenter: HTMLElement | null = null;
  private btnAlignRight: HTMLElement | null = null;
  private btnAutoFitColumn: HTMLElement | null = null;
  private btnWrapText: HTMLElement | null = null;
  private btnBorders: HTMLElement | null = null;
  private btnMerge: HTMLElement | null = null;
  private btnAutoSum: HTMLElement | null = null;
  private btnInsertFunction: HTMLElement | null = null;
  private btnToggleFormulaBar: HTMLElement | null = null;
  private btnSort: HTMLElement | null = null;
  private btnFilter: HTMLElement | null = null;
  private btnZoomIn: HTMLElement | null = null;
  private btnZoomOut: HTMLElement | null = null;
  private zoomLabel: HTMLElement | null = null;
  private fontFamily: HTMLSelectElement | null = null;
  private fontSize: HTMLSelectElement | null = null;
  private numberFormat: HTMLSelectElement | null = null;
  private btnIncreaseDecimal: HTMLElement | null = null;
  private btnDecreaseDecimal: HTMLElement | null = null;

  // Элементы вкладки Вставка
  private btnInsertTable: HTMLElement | null = null;
  private btnInsertRowAbove: HTMLElement | null = null;
  private btnInsertRowBelow: HTMLElement | null = null;
  private btnInsertColLeft: HTMLElement | null = null;
  private btnInsertColRight: HTMLElement | null = null;
  private btnInsertImage: HTMLElement | null = null;
  private btnInsertLink: HTMLElement | null = null;
  private btnInsertComment: HTMLElement | null = null;
  private btnInsertSymbol: HTMLElement | null = null;

  // Элементы вкладки Формулы
  private btnCalcNow: HTMLElement | null = null;
  private formulaCategory: HTMLSelectElement | null = null;
  
  // Быстрые формулы
  private btnQuickSum: HTMLElement | null = null;
  private btnQuickAverage: HTMLElement | null = null;
  private btnQuickMin: HTMLElement | null = null;
  private btnQuickMax: HTMLElement | null = null;
  private btnQuickCount: HTMLElement | null = null;
  private btnQuickCountCols: HTMLElement | null = null;
  private btnQuickSqrt: HTMLElement | null = null;
  private btnQuickSquare: HTMLElement | null = null;

  // Элементы вкладки Данные
  private btnSortAZ: HTMLElement | null = null;
  private btnFilterData: HTMLElement | null = null;
  private btnRemoveDuplicates: HTMLElement | null = null;

  // Элементы вкладки Вид
  private btnZoomToFit: HTMLElement | null = null;
  private btnFreezePanes: HTMLElement | null = null;
  private chkGridlines: HTMLInputElement | null = null;
  private chkHeaders: HTMLInputElement | null = null;

  // Элементы вкладки Справка
  private btnHelp: HTMLElement | null = null;
  private btnAbout: HTMLElement | null = null;

  constructor() {
    super('ribbon-container');
  }

  init(): void {
    this.initElements();
    this.bindEvents();
  }

  private initElements(): void {
    // Вкладка Главная
    this.btnPaste = this.querySelector('#btnPaste');
    this.btnCut = this.querySelector('#btnCut');
    this.btnCopy = this.querySelector('#btnCopy');
    this.btnBold = this.querySelector('#btnBold');
    this.btnItalic = this.querySelector('#btnItalic');
    this.btnUnderline = this.querySelector('#btnUnderline');
    this.btnStrike = this.querySelector('#btnStrike');
    this.btnTextColor = this.querySelector('#btnTextColor');
    this.btnFillColor = this.querySelector('#btnFillColor');
    this.textColorInput = this.querySelector('#textColor') as HTMLInputElement;
    this.fillColorInput = this.querySelector('#fillColor') as HTMLInputElement;
    this.btnAlignLeft = this.querySelector('#btnAlignLeft');
    this.btnAlignCenter = this.querySelector('#btnAlignCenter');
    this.btnAlignRight = this.querySelector('#btnAlignRight');
    this.btnAutoFitColumn = this.querySelector('#btnAutoFitColumn');
    this.btnWrapText = this.querySelector('#btnWrapText');
    this.btnBorders = this.querySelector('#btnBorders');
    this.btnMerge = this.querySelector('#btnMerge');
    this.btnAutoSum = this.querySelector('#btnAutoSum');
    this.btnInsertFunction = this.querySelector('#btnInsertFunction');
    this.btnToggleFormulaBar = this.querySelector('#btnToggleFormulaBar');
    this.btnSort = this.querySelector('#btnSort');
    this.btnFilter = this.querySelector('#btnFilter');
    this.btnZoomIn = this.querySelector('#btnZoomIn');
    this.btnZoomOut = this.querySelector('#btnZoomOut');
    this.zoomLabel = this.querySelector('#zoomLabel');
    this.fontFamily = this.querySelector('#fontFamily') as HTMLSelectElement;
    this.fontSize = this.querySelector('#fontSize') as HTMLSelectElement;
    this.numberFormat = this.querySelector('#numberFormat') as HTMLSelectElement;
    this.btnIncreaseDecimal = this.querySelector('#btnIncreaseDecimal');
    this.btnDecreaseDecimal = this.querySelector('#btnDecreaseDecimal');

    // Вкладка Вставка
    this.btnInsertTable = this.querySelector('#btnInsertTable');
    this.btnInsertRowAbove = this.querySelector('#btnInsertRowAbove');
    this.btnInsertRowBelow = this.querySelector('#btnInsertRowBelow');
    this.btnInsertColLeft = this.querySelector('#btnInsertColLeft');
    this.btnInsertColRight = this.querySelector('#btnInsertColRight');
    this.btnInsertImage = this.querySelector('#btnInsertImage');
    this.btnInsertLink = this.querySelector('#btnInsertLink');
    this.btnInsertComment = this.querySelector('#btnInsertComment');
    this.btnInsertSymbol = this.querySelector('#btnInsertSymbol');

    // Вкладка Формулы
    this.btnCalcNow = this.querySelector('#btnCalcNow');
    this.formulaCategory = this.querySelector('#formulaCategory') as HTMLSelectElement;
    
    // Быстрые формулы
    this.btnQuickSum = this.querySelector('#btnQuickSum');
    this.btnQuickAverage = this.querySelector('#btnQuickAverage');
    this.btnQuickMin = this.querySelector('#btnQuickMin');
    this.btnQuickMax = this.querySelector('#btnQuickMax');
    this.btnQuickCount = this.querySelector('#btnQuickCount');
    this.btnQuickCountCols = this.querySelector('#btnQuickCountCols');
    this.btnQuickSqrt = this.querySelector('#btnQuickSqrt');
    this.btnQuickSquare = this.querySelector('#btnQuickSquare');

    // Вкладка Данные
    this.btnSortAZ = this.querySelector('#btnSortAZ');
    this.btnFilterData = this.querySelector('#btnFilterData');
    this.btnRemoveDuplicates = this.querySelector('#btnRemoveDuplicates');

    // Вкладка Вид
    this.btnZoomToFit = this.querySelector('#btnZoomToFit');
    this.btnFreezePanes = this.querySelector('#btnFreezePanes');
    this.chkGridlines = this.querySelector('#chkGridlines') as HTMLInputElement;
    this.chkHeaders = this.querySelector('#chkHeaders') as HTMLInputElement;

    // Вкладка Справка
    this.btnHelp = this.querySelector('#btnHelp');
    this.btnAbout = this.querySelector('#btnAbout');
  }

  private bindEvents(): void {
    // ==================== ВКЛАДКА: ГЛАВНАЯ ====================
    // Буфер обмена
    this.bindEvent(this.btnPaste, 'click', () => this.handlePaste());
    this.bindEvent(this.btnCut, 'click', () => this.handleCut());
    this.bindEvent(this.btnCopy, 'click', () => this.handleCopy());

    // Шрифт
    this.bindEvent(this.btnBold, 'click', () => this.handleFormat('bold'));
    this.bindEvent(this.btnItalic, 'click', () => this.handleFormat('italic'));
    this.bindEvent(this.btnUnderline, 'click', () => this.handleFormat('underline'));
    this.bindEvent(this.btnStrike, 'click', () => this.handleFormat('strikeThrough'));
    
    if (this.textColorInput) {
      this.textColorInput.addEventListener('change', (e) => {
        const color = (e.target as HTMLInputElement).value;
        document.dispatchEvent(new CustomEvent('text-color-change', { detail: { color } }));
      });
    }
    
    if (this.fillColorInput) {
      this.fillColorInput.addEventListener('change', (e) => {
        const color = (e.target as HTMLInputElement).value;
        document.dispatchEvent(new CustomEvent('fill-color-change', { detail: { color } }));
      });
    }
    
    // Клик по кнопке заливки открывает color picker
    this.bindEvent(this.btnFillColor, 'click', () => {
      if (this.fillColorInput) {
        this.fillColorInput.click();
      }
    });

    // Выравнивание
    this.bindEvent(this.btnAlignLeft, 'click', () => this.handleAlign('left'));
    this.bindEvent(this.btnAlignCenter, 'click', () => this.handleAlign('center'));
    this.bindEvent(this.btnAlignRight, 'click', () => this.handleAlign('right'));
    this.bindEvent(this.btnAutoFitColumn, 'click', () => this.handleAutoFitColumn());
    this.bindEvent(this.btnWrapText, 'click', () => this.handleWrapText());

    // Ячейки
    this.bindEvent(this.btnBorders, 'click', () => this.handleBorders());
    this.bindEvent(this.btnMerge, 'click', () => this.handleMerge());

    // Формулы
    this.bindEvent(this.btnAutoSum, 'click', () => this.handleAutoSum());
    this.bindEvent(this.btnInsertFunction, 'click', () => this.handleInsertFunction());
    this.bindEvent(this.btnToggleFormulaBar, 'click', () => this.handleToggleFormulaBar());

    // Сортировка и фильтр
    this.bindEvent(this.btnSort, 'click', () => this.handleSort());
    this.bindEvent(this.btnFilter, 'click', () => this.handleFilter());

    // Зум
    this.bindEvent(this.btnZoomIn, 'click', () => this.handleZoom(10));
    this.bindEvent(this.btnZoomOut, 'click', () => this.handleZoom(-10));

    // Разрядность чисел
    this.bindEvent(this.btnIncreaseDecimal, 'click', () => this.handleIncreaseDecimal());
    this.bindEvent(this.btnDecreaseDecimal, 'click', () => this.handleDecreaseDecimal());

    // ==================== ВКЛАДКА: ВСТАВКА ====================
    this.bindEvent(this.btnInsertTable, 'click', () => this.handleInsertTable());
    this.bindEvent(this.btnInsertRowAbove, 'click', () => this.handleInsertRowAbove());
    this.bindEvent(this.btnInsertRowBelow, 'click', () => this.handleInsertRowBelow());
    this.bindEvent(this.btnInsertColLeft, 'click', () => this.handleInsertColLeft());
    this.bindEvent(this.btnInsertColRight, 'click', () => this.handleInsertColRight());
    this.bindEvent(this.btnInsertImage, 'click', () => this.handleInsertImage());
    this.bindEvent(this.btnInsertLink, 'click', () => this.handleInsertLink());
    this.bindEvent(this.btnInsertComment, 'click', () => this.handleInsertComment());
    this.bindEvent(this.btnInsertSymbol, 'click', () => this.handleInsertSymbol());

    // ==================== ВКЛАДКА: ФОРМУЛЫ ====================
    this.bindEvent(this.btnCalcNow, 'click', () => this.handleCalcNow());
    
    // Быстрые формулы
    this.bindEvent(this.btnQuickSum, 'click', () => this.handleQuickSum());
    this.bindEvent(this.btnQuickAverage, 'click', () => this.handleQuickAverage());
    this.bindEvent(this.btnQuickMin, 'click', () => this.handleQuickMin());
    this.bindEvent(this.btnQuickMax, 'click', () => this.handleQuickMax());
    this.bindEvent(this.btnQuickCount, 'click', () => this.handleQuickCount());
    this.bindEvent(this.btnQuickCountCols, 'click', () => this.handleQuickCountCols());
    this.bindEvent(this.btnQuickSqrt, 'click', () => this.handleQuickSqrt());
    this.bindEvent(this.btnQuickSquare, 'click', () => this.handleQuickSquare());

    // ==================== ВКЛАДКА: ДАННЫЕ ====================
    this.bindEvent(this.btnSortAZ, 'click', () => this.handleSortAZ());
    this.bindEvent(this.btnFilterData, 'click', () => this.handleFilterData());
    this.bindEvent(this.btnRemoveDuplicates, 'click', () => this.handleRemoveDuplicates());

    // ==================== ВКЛАДКА: ВИД ====================
    this.bindEvent(this.btnZoomToFit, 'click', () => this.handleZoomToFit());
    this.bindEvent(this.btnFreezePanes, 'click', () => this.handleFreezePanes());
    
    if (this.chkGridlines) {
      this.chkGridlines.addEventListener('change', (e) => {
        const show = (e.target as HTMLInputElement).checked;
        document.dispatchEvent(new CustomEvent('toggle-gridlines', { detail: { show } }));
      });
    }
    
    if (this.chkHeaders) {
      this.chkHeaders.addEventListener('change', (e) => {
        const show = (e.target as HTMLInputElement).checked;
        document.dispatchEvent(new CustomEvent('toggle-headers', { detail: { show } }));
      });
    }

    // ==================== ВКЛАДКА: СПРАВКА ====================
    this.bindEvent(this.btnHelp, 'click', () => this.handleHelp());
    this.bindEvent(this.btnAbout, 'click', () => this.handleAbout());

    // Переключение вкладок меню
    document.addEventListener('ribbon-tab-change', (e) => {
      const event = e as CustomEvent<{ tab: string }>;
      this.showRibbonGroup(event.detail.tab);
    });
  }

  private showRibbonGroup(groupName: string): void {
    const groups = this.querySelectorAll('.ribbon-group[data-group]');
    groups.forEach(group => {
      const groupData = (group as HTMLElement).dataset.group;
      if (groupData === groupName) {
        (group as HTMLElement).style.display = 'flex';
      } else {
        (group as HTMLElement).style.display = 'none';
      }
    });
    
    // Показываем/скрываем ribbon-spacer для соответствующей вкладки
    const spacers = this.querySelectorAll('.ribbon-spacer[data-group]');
    spacers.forEach(spacer => {
      const spacerGroup = (spacer as HTMLElement).dataset.group;
      if (spacerGroup === groupName) {
        (spacer as HTMLElement).style.display = 'flex';
      } else {
        (spacer as HTMLElement).style.display = 'none';
      }
    });
    
    // Показываем/скрываем ribbon-divider для соответствующей вкладки
    const dividers = this.querySelectorAll('.ribbon-divider[data-group]');
    dividers.forEach(divider => {
      const dividerGroup = (divider as HTMLElement).dataset.group;
      if (dividerGroup === groupName) {
        (divider as HTMLElement).style.display = 'block';
      } else {
        (divider as HTMLElement).style.display = 'none';
      }
    });
  }

  // ==================== ОБРАБОТЧИКИ: ГЛАВНАЯ ====================
  private handlePaste(): void {
    navigator.clipboard.readText().then(text => {
      document.dispatchEvent(new CustomEvent('paste-from-ribbon', { detail: { text } }));
    }).catch(() => {
      console.log('Clipboard access denied');
    });
  }

  private handleCut(): void {
    const cell = document.querySelector('.cell.selected') as HTMLElement;
    if (cell) {
      const text = cell.textContent || '';
      navigator.clipboard.writeText(text).then(() => {
        const row = parseInt(cell.dataset.row || '0');
        const col = parseInt(cell.dataset.col || '0');
        document.dispatchEvent(new CustomEvent('cell-cleared', { detail: { row, col } }));
      });
    }
  }

  private handleCopy(): void {
    const cell = document.querySelector('.cell.selected') as HTMLElement;
    if (cell) {
      const text = cell.textContent || '';
      navigator.clipboard.writeText(text);
    }
  }

  private handleFormat(format: string): void {
    document.dispatchEvent(new CustomEvent('format-change', { detail: { format } }));
  }

  private handleAlign(align: string): void {
    document.dispatchEvent(new CustomEvent('align-change', { detail: { align } }));
  }

  private handleAutoFitColumn(): void {
    document.dispatchEvent(new CustomEvent('auto-fit-column'));
  }

  private handleWrapText(): void {
    document.dispatchEvent(new CustomEvent('wrap-text'));
  }

  private handleBorders(): void {
    document.dispatchEvent(new CustomEvent('toggle-borders'));
  }

  private handleMerge(): void {
    document.dispatchEvent(new CustomEvent('merge-cells'));
  }

  private handleAutoSum(): void {
    document.dispatchEvent(new CustomEvent('auto-sum'));
  }

  private handleInsertFunction(): void {
    document.dispatchEvent(new CustomEvent('insert-function'));
  }

  private handleToggleFormulaBar(): void {
    document.dispatchEvent(new CustomEvent('toggle-formula-bar'));
  }

  private handleSort(): void {
    document.dispatchEvent(new CustomEvent('sort-data'));
  }

  private handleFilter(): void {
    document.dispatchEvent(new CustomEvent('filter-data'));
  }

  private handleZoom(delta: number): void {
    document.dispatchEvent(new CustomEvent('zoom-change', { detail: { delta } }));
  }

  private handleIncreaseDecimal(): void {
    document.dispatchEvent(new CustomEvent('increase-decimal'));
  }

  private handleDecreaseDecimal(): void {
    document.dispatchEvent(new CustomEvent('decrease-decimal'));
  }

  // ==================== ОБРАБОТЧИКИ: ВСТАВКА ====================
  private handleInsertTable(): void {
    document.dispatchEvent(new CustomEvent('insert-table'));
  }

  private handleInsertRowAbove(): void {
    document.dispatchEvent(new CustomEvent('insert-row-above'));
  }

  private handleInsertRowBelow(): void {
    document.dispatchEvent(new CustomEvent('insert-row-below'));
  }

  private handleInsertColLeft(): void {
    document.dispatchEvent(new CustomEvent('insert-col-left'));
  }

  private handleInsertColRight(): void {
    document.dispatchEvent(new CustomEvent('insert-col-right'));
  }

  private handleInsertImage(): void {
    document.dispatchEvent(new CustomEvent('insert-image'));
  }

  private handleInsertLink(): void {
    document.dispatchEvent(new CustomEvent('insert-link'));
  }

  private handleInsertComment(): void {
    document.dispatchEvent(new CustomEvent('insert-comment'));
  }

  private handleInsertSymbol(): void {
    document.dispatchEvent(new CustomEvent('insert-symbol'));
  }

  // ==================== ОБРАБОТЧИКИ: ФОРМУЛЫ ====================
  private handleCalcNow(): void {
    document.dispatchEvent(new CustomEvent('calc-now'));
  }

  // Быстрые формулы
  private handleQuickSum(): void {
    document.dispatchEvent(new CustomEvent('quick-formula', { detail: { formula: 'SUM' } }));
  }

  private handleQuickAverage(): void {
    document.dispatchEvent(new CustomEvent('quick-formula', { detail: { formula: 'AVERAGE' } }));
  }

  private handleQuickMin(): void {
    document.dispatchEvent(new CustomEvent('quick-formula', { detail: { formula: 'MIN' } }));
  }

  private handleQuickMax(): void {
    document.dispatchEvent(new CustomEvent('quick-formula', { detail: { formula: 'MAX' } }));
  }

  private handleQuickCount(): void {
    document.dispatchEvent(new CustomEvent('quick-formula', { detail: { formula: 'COUNT' } }));
  }

  private handleQuickCountCols(): void {
    document.dispatchEvent(new CustomEvent('quick-formula', { detail: { formula: 'COUNTCOLS' } }));
  }

  private handleQuickSqrt(): void {
    document.dispatchEvent(new CustomEvent('quick-formula', { detail: { formula: 'SQRT' } }));
  }

  private handleQuickSquare(): void {
    document.dispatchEvent(new CustomEvent('quick-formula', { detail: { formula: 'SQUARE' } }));
  }

  // ==================== ОБРАБОТЧИКИ: ДАННЫЕ ====================
  private handleSortAZ(): void {
    document.dispatchEvent(new CustomEvent('sort-a-z'));
  }

  private handleFilterData(): void {
    document.dispatchEvent(new CustomEvent('filter-data-full'));
  }

  private handleRemoveDuplicates(): void {
    document.dispatchEvent(new CustomEvent('remove-duplicates'));
  }

  // ==================== ОБРАБОТЧИКИ: ВИД ====================
  private handleZoomToFit(): void {
    document.dispatchEvent(new CustomEvent('zoom-to-fit'));
  }

  private handleFreezePanes(): void {
    document.dispatchEvent(new CustomEvent('freeze-panes'));
  }

  // ==================== ОБРАБОТЧИКИ: СПРАВКА ====================
  private handleHelp(): void {
    document.dispatchEvent(new CustomEvent('show-help'));
  }

  private handleAbout(): void {
    document.dispatchEvent(new CustomEvent('show-about'));
  }

  setZoomLevel(level: number): void {
    if (this.zoomLabel) {
      this.zoomLabel.textContent = `${level}%`;
    }
  }
}
