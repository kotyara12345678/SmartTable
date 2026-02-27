/**
 * Ribbon Component - панель инструментов
 */
import { BaseComponent } from '../core/component.js';
export class RibbonComponent extends BaseComponent {
    constructor() {
        super('ribbon-container');
        // Элементы вкладки Главная
        this.btnPaste = null;
        this.btnCut = null;
        this.btnCopy = null;
        this.btnBold = null;
        this.btnItalic = null;
        this.btnUnderline = null;
        this.btnStrike = null;
        this.btnTextColor = null;
        this.btnFillColor = null;
        this.textColorInput = null;
        this.fillColorInput = null;
        this.btnAlignLeft = null;
        this.btnAlignCenter = null;
        this.btnAlignRight = null;
        this.btnAutoFitColumn = null;
        this.btnWrapText = null;
        this.btnBorders = null;
        this.btnMerge = null;
        this.btnAutoSum = null;
        this.btnInsertFunction = null;
        this.btnToggleFormulaBar = null;
        this.btnSort = null;
        this.btnFilter = null;
        this.btnZoomIn = null;
        this.btnZoomOut = null;
        this.zoomLabel = null;
        this.fontFamily = null;
        this.fontSize = null;
        this.numberFormat = null;
        this.btnIncreaseDecimal = null;
        this.btnDecreaseDecimal = null;
        // Элементы вкладки Вставка
        this.btnInsertTable = null;
        this.btnInsertRowAbove = null;
        this.btnInsertRowBelow = null;
        this.btnInsertColLeft = null;
        this.btnInsertColRight = null;
        this.btnInsertImage = null;
        this.btnInsertLink = null;
        this.btnInsertComment = null;
        this.btnInsertSymbol = null;
        // Элементы вкладки Формулы
        this.btnCalcNow = null;
        this.formulaCategory = null;
        // Быстрые формулы
        this.btnQuickSum = null;
        this.btnQuickAverage = null;
        this.btnQuickMin = null;
        this.btnQuickMax = null;
        this.btnQuickCount = null;
        this.btnQuickCountCols = null;
        this.btnQuickSqrt = null;
        this.btnQuickSquare = null;
        // Элементы вкладки Данные
        this.btnSortAZ = null;
        this.btnFilterData = null;
        this.btnRemoveDuplicates = null;
        // Элементы вкладки Вид
        this.btnZoomToFit = null;
        this.btnFreezePanes = null;
        this.chkGridlines = null;
        this.chkHeaders = null;
        // Элементы вкладки Справка
        this.btnHelp = null;
        this.btnAbout = null;
    }
    init() {
        this.initElements();
        this.bindEvents();
    }
    initElements() {
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
        this.textColorInput = this.querySelector('#textColor');
        this.fillColorInput = this.querySelector('#fillColor');
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
        this.fontFamily = this.querySelector('#fontFamily');
        this.fontSize = this.querySelector('#fontSize');
        this.numberFormat = this.querySelector('#numberFormat');
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
        this.formulaCategory = this.querySelector('#formulaCategory');
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
        this.chkGridlines = this.querySelector('#chkGridlines');
        this.chkHeaders = this.querySelector('#chkHeaders');
        // Вкладка Справка
        this.btnHelp = this.querySelector('#btnHelp');
        this.btnAbout = this.querySelector('#btnAbout');
    }
    bindEvents() {
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
                const color = e.target.value;
                document.dispatchEvent(new CustomEvent('text-color-change', { detail: { color } }));
            });
        }
        if (this.fillColorInput) {
            this.fillColorInput.addEventListener('change', (e) => {
                const color = e.target.value;
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
                const show = e.target.checked;
                document.dispatchEvent(new CustomEvent('toggle-gridlines', { detail: { show } }));
            });
        }
        if (this.chkHeaders) {
            this.chkHeaders.addEventListener('change', (e) => {
                const show = e.target.checked;
                document.dispatchEvent(new CustomEvent('toggle-headers', { detail: { show } }));
            });
        }
        // ==================== ВКЛАДКА: СПРАВКА ====================
        this.bindEvent(this.btnHelp, 'click', () => this.handleHelp());
        this.bindEvent(this.btnAbout, 'click', () => this.handleAbout());
        // Переключение вкладок меню
        document.addEventListener('ribbon-tab-change', (e) => {
            const event = e;
            this.showRibbonGroup(event.detail.tab);
        });
    }
    showRibbonGroup(groupName) {
        const groups = this.querySelectorAll('.ribbon-group[data-group]');
        groups.forEach(group => {
            const groupData = group.dataset.group;
            if (groupData === groupName) {
                group.style.display = 'flex';
            }
            else {
                group.style.display = 'none';
            }
        });
        // Показываем/скрываем ribbon-spacer для соответствующей вкладки
        const spacers = this.querySelectorAll('.ribbon-spacer[data-group]');
        spacers.forEach(spacer => {
            const spacerGroup = spacer.dataset.group;
            if (spacerGroup === groupName) {
                spacer.style.display = 'flex';
            }
            else {
                spacer.style.display = 'none';
            }
        });
        // Показываем/скрываем ribbon-divider для соответствующей вкладки
        const dividers = this.querySelectorAll('.ribbon-divider[data-group]');
        dividers.forEach(divider => {
            const dividerGroup = divider.dataset.group;
            if (dividerGroup === groupName) {
                divider.style.display = 'block';
            }
            else {
                divider.style.display = 'none';
            }
        });
    }
    // ==================== ОБРАБОТЧИКИ: ГЛАВНАЯ ====================
    handlePaste() {
        navigator.clipboard.readText().then(text => {
            document.dispatchEvent(new CustomEvent('paste-from-ribbon', { detail: { text } }));
        }).catch(() => {
            console.log('Clipboard access denied');
        });
    }
    handleCut() {
        const cell = document.querySelector('.cell.selected');
        if (cell) {
            const text = cell.textContent || '';
            navigator.clipboard.writeText(text).then(() => {
                const row = parseInt(cell.dataset.row || '0');
                const col = parseInt(cell.dataset.col || '0');
                document.dispatchEvent(new CustomEvent('cell-cleared', { detail: { row, col } }));
            });
        }
    }
    handleCopy() {
        const cell = document.querySelector('.cell.selected');
        if (cell) {
            const text = cell.textContent || '';
            navigator.clipboard.writeText(text);
        }
    }
    handleFormat(format) {
        document.dispatchEvent(new CustomEvent('format-change', { detail: { format } }));
    }
    handleAlign(align) {
        document.dispatchEvent(new CustomEvent('align-change', { detail: { align } }));
    }
    handleAutoFitColumn() {
        document.dispatchEvent(new CustomEvent('auto-fit-column'));
    }
    handleWrapText() {
        document.dispatchEvent(new CustomEvent('wrap-text'));
    }
    handleBorders() {
        document.dispatchEvent(new CustomEvent('toggle-borders'));
    }
    handleMerge() {
        document.dispatchEvent(new CustomEvent('merge-cells'));
    }
    handleAutoSum() {
        document.dispatchEvent(new CustomEvent('auto-sum'));
    }
    handleInsertFunction() {
        document.dispatchEvent(new CustomEvent('insert-function'));
    }
    handleToggleFormulaBar() {
        document.dispatchEvent(new CustomEvent('toggle-formula-bar'));
    }
    handleSort() {
        document.dispatchEvent(new CustomEvent('sort-data'));
    }
    handleFilter() {
        document.dispatchEvent(new CustomEvent('filter-data'));
    }
    handleZoom(delta) {
        document.dispatchEvent(new CustomEvent('zoom-change', { detail: { delta } }));
    }
    handleIncreaseDecimal() {
        document.dispatchEvent(new CustomEvent('increase-decimal'));
    }
    handleDecreaseDecimal() {
        document.dispatchEvent(new CustomEvent('decrease-decimal'));
    }
    // ==================== ОБРАБОТЧИКИ: ВСТАВКА ====================
    handleInsertTable() {
        document.dispatchEvent(new CustomEvent('insert-table'));
    }
    handleInsertRowAbove() {
        document.dispatchEvent(new CustomEvent('insert-row-above'));
    }
    handleInsertRowBelow() {
        document.dispatchEvent(new CustomEvent('insert-row-below'));
    }
    handleInsertColLeft() {
        document.dispatchEvent(new CustomEvent('insert-col-left'));
    }
    handleInsertColRight() {
        document.dispatchEvent(new CustomEvent('insert-col-right'));
    }
    handleInsertImage() {
        document.dispatchEvent(new CustomEvent('insert-image'));
    }
    handleInsertLink() {
        document.dispatchEvent(new CustomEvent('insert-link'));
    }
    handleInsertComment() {
        document.dispatchEvent(new CustomEvent('insert-comment'));
    }
    handleInsertSymbol() {
        document.dispatchEvent(new CustomEvent('insert-symbol'));
    }
    // ==================== ОБРАБОТЧИКИ: ФОРМУЛЫ ====================
    handleCalcNow() {
        document.dispatchEvent(new CustomEvent('calc-now'));
    }
    // Быстрые формулы
    handleQuickSum() {
        document.dispatchEvent(new CustomEvent('quick-formula', { detail: { formula: 'SUM' } }));
    }
    handleQuickAverage() {
        document.dispatchEvent(new CustomEvent('quick-formula', { detail: { formula: 'AVERAGE' } }));
    }
    handleQuickMin() {
        document.dispatchEvent(new CustomEvent('quick-formula', { detail: { formula: 'MIN' } }));
    }
    handleQuickMax() {
        document.dispatchEvent(new CustomEvent('quick-formula', { detail: { formula: 'MAX' } }));
    }
    handleQuickCount() {
        document.dispatchEvent(new CustomEvent('quick-formula', { detail: { formula: 'COUNT' } }));
    }
    handleQuickCountCols() {
        document.dispatchEvent(new CustomEvent('quick-formula', { detail: { formula: 'COUNTCOLS' } }));
    }
    handleQuickSqrt() {
        document.dispatchEvent(new CustomEvent('quick-formula', { detail: { formula: 'SQRT' } }));
    }
    handleQuickSquare() {
        document.dispatchEvent(new CustomEvent('quick-formula', { detail: { formula: 'SQUARE' } }));
    }
    // ==================== ОБРАБОТЧИКИ: ДАННЫЕ ====================
    handleSortAZ() {
        document.dispatchEvent(new CustomEvent('sort-a-z'));
    }
    handleFilterData() {
        document.dispatchEvent(new CustomEvent('filter-data-full'));
    }
    handleRemoveDuplicates() {
        document.dispatchEvent(new CustomEvent('remove-duplicates'));
    }
    // ==================== ОБРАБОТЧИКИ: ВИД ====================
    handleZoomToFit() {
        document.dispatchEvent(new CustomEvent('zoom-to-fit'));
    }
    handleFreezePanes() {
        document.dispatchEvent(new CustomEvent('freeze-panes'));
    }
    // ==================== ОБРАБОТЧИКИ: СПРАВКА ====================
    handleHelp() {
        document.dispatchEvent(new CustomEvent('show-help'));
    }
    handleAbout() {
        document.dispatchEvent(new CustomEvent('show-about'));
    }
    setZoomLevel(level) {
        if (this.zoomLabel) {
            this.zoomLabel.textContent = `${level}%`;
        }
    }
}
//# sourceMappingURL=RibbonComponent.js.map