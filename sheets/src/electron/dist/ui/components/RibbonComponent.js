/**
 * Ribbon Component - панель инструментов
 */
import { BaseComponent } from '../core/component.js';
export class RibbonComponent extends BaseComponent {
    constructor() {
        super('ribbon-container');
        this.zoomLabel = null;
        this.btnZoomIn = null;
        this.btnZoomOut = null;
        this.btnBold = null;
        this.btnItalic = null;
        this.btnUnderline = null;
        // Новые кнопки
        this.btnMerge = null;
        this.btnInsertRow = null;
        this.btnDeleteRow = null;
        this.btnInsertCol = null;
        this.btnDeleteCol = null;
        this.btnCharts = null;
        this.btnSort = null;
        this.btnFilter = null;
    }
    init() {
        this.render();
        this.initElements();
        this.bindEvents();
    }
    render() {
        this.container.innerHTML = `
      <div class="ribbon" id="ribbon">
        <!-- Группа: Буфер обмена -->
        <div class="ribbon-group">
          <button class="ribbon-btn-lg" title="Вставить" id="btnPaste">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1"/>
            </svg>
            <span>Вставить</span>
          </button>
          <div class="ribbon-btn-col">
            <button class="ribbon-btn-sm" title="Вырезать" id="btnCut">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="6" cy="6" r="3"/>
                <circle cx="6" cy="18" r="3"/>
                <line x1="20" y1="4" x2="8.12" y2="15.88"/>
              </svg>
            </button>
            <button class="ribbon-btn-sm" title="Копировать" id="btnCopy">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="ribbon-divider"></div>

        <!-- Группа: Шрифт -->
        <div class="ribbon-group ribbon-group-lg">
          <div class="font-row">
            <select class="ribbon-select" id="fontFamily">
              <option value="Arial">Arial</option>
              <option value="Calibri">Calibri</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Verdana">Verdana</option>
            </select>
            <select class="ribbon-select ribbon-size" id="fontSize">
              <option value="8">8</option>
              <option value="9">9</option>
              <option value="10">10</option>
              <option value="11" selected>11</option>
              <option value="12">12</option>
              <option value="14">14</option>
              <option value="16">16</option>
            </select>
          </div>
          <div class="format-row">
            <button class="ribbon-btn-icon" id="btnBold" title="Жирный">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.6 11.8c1-.7 1.6-1.8 1.6-2.8a4 4 0 00-4-4H7v14h7c2.1 0 3.8-1.7 3.8-3.8 0-1.5-.9-2.8-2.2-3.4zM9 6.5h4c1.1 0 2 .9 2 2s-.9 2-2 2H9v-4zm6 8.5c0 1.1-.9 2-2 2H9v-4h4c1.1 0 2 .9 2 2z"/>
              </svg>
            </button>
            <button class="ribbon-btn-icon" id="btnItalic" title="Курсив">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/>
              </svg>
            </button>
            <button class="ribbon-btn-icon" id="btnUnderline" title="Подчеркнутый">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/>
              </svg>
            </button>
            <button class="ribbon-btn-icon" id="btnStrike" title="Зачеркнутый">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/>
              </svg>
            </button>
            <div class="color-btn-wrapper">
              <button class="ribbon-btn-icon" id="btnTextColor" title="Цвет текста">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="17" width="18" height="3" rx="1"/>
                  <path d="M11 3L6.5 15h2.25l1.12-3h6.25l1.12 3h2.25L13 3h-2z"/>
                </svg>
              </button>
              <input type="color" class="color-input" id="textColor" value="#000000">
            </div>
            <div class="color-btn-wrapper">
              <button class="ribbon-btn-icon" id="btnFillColor" title="Цвет заливки">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15c-.59.59-.59 1.54 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12z"/>
                  <rect x="3" y="17" width="18" height="3" rx="1"/>
                </svg>
              </button>
              <input type="color" class="color-input" id="fillColor" value="#ffffff">
            </div>
          </div>
        </div>

        <div class="ribbon-divider"></div>

        <!-- Группа: Выравнивание -->
        <div class="ribbon-group">
          <button class="ribbon-btn-icon" title="По левому краю" id="btnAlignLeft">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/>
            </svg>
          </button>
          <button class="ribbon-btn-icon" title="По центру" id="btnAlignCenter">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z"/>
            </svg>
          </button>
          <button class="ribbon-btn-icon" title="По правому краю" id="btnAlignRight">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z"/>
            </svg>
          </button>
          <button class="ribbon-btn-icon" title="Перенос текста" id="btnWrapText">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 6h16M4 12h16M4 18h10"/>
            </svg>
          </button>
        </div>

        <div class="ribbon-divider"></div>

        <!-- Группа: Число -->
        <div class="ribbon-group">
          <select class="ribbon-select" id="numberFormat">
            <option value="general">Общий</option>
            <option value="number">Числовой</option>
            <option value="currency">Денежный</option>
            <option value="percent">Процентный</option>
            <option value="date">Дата</option>
          </select>
          <button class="ribbon-btn-icon" title="Увеличить разрядность" id="btnIncreaseDecimal">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.5 5.6L10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5zm-8.8 3.8L11.9 19h2.3l1.3-13.2h-2.3z"/>
            </svg>
          </button>
          <button class="ribbon-btn-icon" title="Уменьшить разрядность" id="btnDecreaseDecimal">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.5 5.6L10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5zm-9.6 5.4h2.8V19h-2.8z"/>
            </svg>
          </button>
        </div>

        <div class="ribbon-divider"></div>

        <!-- Группа: Ячейки -->
        <div class="ribbon-group">
          <button class="ribbon-btn-icon" title="Границы" id="btnBorders">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </button>
          <button class="ribbon-btn-icon" title="Объединить" id="btnMerge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18"/>
              <path d="M12 3v18M3 12h18"/>
            </svg>
          </button>
          <div class="ribbon-btn-col">
            <button class="ribbon-btn-sm" title="Вставить строку" id="btnInsertRow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </button>
            <button class="ribbon-btn-sm" title="Удалить строку" id="btnDeleteRow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
          <div class="ribbon-btn-col">
            <button class="ribbon-btn-sm" title="Вставить столбец" id="btnInsertCol">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </button>
            <button class="ribbon-btn-sm" title="Удалить столбец" id="btnDeleteCol">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="ribbon-divider"></div>

        <!-- Группа: Диаграммы -->
        <div class="ribbon-group">
          <button class="ribbon-btn-lg" id="btnCharts">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M18 20V10M12 20V4M6 20v-6"/>
            </svg>
            <span>Диаграммы</span>
          </button>
        </div>

        <div class="ribbon-divider"></div>

        <!-- Группа: Формулы -->
        <div class="ribbon-group">
          <button class="ribbon-btn-lg" id="btnAutoSum">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <text x="5" y="19" font-size="18" font-weight="bold">Σ</text>
            </svg>
            <span>Автосумма</span>
          </button>
          <button class="ribbon-btn-icon" title="Вставить функцию" id="btnInsertFunction">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <button class="ribbon-btn-icon" title="Показать строку формул" id="btnToggleFormulaBar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
            </svg>
          </button>
        </div>

        <div class="ribbon-divider"></div>

        <!-- Группа: Сортировка -->
        <div class="ribbon-group">
          <button class="ribbon-btn-icon" title="Сортировка" id="btnSort">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 6h16v2H4zm0 5h12v2H4zm0 5h8v2H4z"/>
            </svg>
          </button>
          <button class="ribbon-btn-icon" title="Фильтр" id="btnFilter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/>
            </svg>
          </button>
        </div>

        <div class="ribbon-spacer"></div>

        <!-- Масштаб -->
        <div class="ribbon-group">
          <span class="zoom-label" id="zoomLabel">100%</span>
          <button class="ribbon-btn-icon" id="btnZoomOut" title="Уменьшить">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <button class="ribbon-btn-icon" id="btnZoomIn" title="Увеличить">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    }
    initElements() {
        this.zoomLabel = this.querySelector('#zoomLabel');
        this.btnZoomIn = this.querySelector('#btnZoomIn');
        this.btnZoomOut = this.querySelector('#btnZoomOut');
        this.btnBold = this.querySelector('#btnBold');
        this.btnItalic = this.querySelector('#btnItalic');
        this.btnUnderline = this.querySelector('#btnUnderline');
        // Новые кнопки
        this.btnMerge = this.querySelector('#btnMerge');
        this.btnInsertRow = this.querySelector('#btnInsertRow');
        this.btnDeleteRow = this.querySelector('#btnDeleteRow');
        this.btnInsertCol = this.querySelector('#btnInsertCol');
        this.btnDeleteCol = this.querySelector('#btnDeleteCol');
        this.btnCharts = this.querySelector('#btnCharts');
        this.btnSort = this.querySelector('#btnSort');
        this.btnFilter = this.querySelector('#btnFilter');
    }
    bindEvents() {
        this.bindEvent(this.btnZoomIn, 'click', () => this.handleZoom(10));
        this.bindEvent(this.btnZoomOut, 'click', () => this.handleZoom(-10));
        this.bindEvent(this.btnBold, 'click', () => this.handleFormat('bold'));
        this.bindEvent(this.btnItalic, 'click', () => this.handleFormat('italic'));
        this.bindEvent(this.btnUnderline, 'click', () => this.handleFormat('underline'));
        // Новые обработчики
        this.bindEvent(this.btnMerge, 'click', () => this.handleAction('merge'));
        this.bindEvent(this.btnInsertRow, 'click', () => this.handleAction('insertRow'));
        this.bindEvent(this.btnDeleteRow, 'click', () => this.handleAction('deleteRow'));
        this.bindEvent(this.btnInsertCol, 'click', () => this.handleAction('insertCol'));
        this.bindEvent(this.btnDeleteCol, 'click', () => this.handleAction('deleteCol'));
        this.bindEvent(this.btnCharts, 'click', () => this.handleAction('charts'));
        this.bindEvent(this.btnSort, 'click', () => this.handleAction('sort'));
        this.bindEvent(this.btnFilter, 'click', () => this.handleAction('filter'));
    }
    handleZoom(delta) {
        document.dispatchEvent(new CustomEvent('zoom-change', { detail: { delta } }));
    }
    handleFormat(format) {
        document.dispatchEvent(new CustomEvent('format-change', { detail: { format } }));
    }
    setZoomLevel(level) {
        if (this.zoomLabel) {
            this.zoomLabel.textContent = `${level}%`;
        }
    }
    handleAction(action) {
        document.dispatchEvent(new CustomEvent('ribbon-action', { detail: { action } }));
    }
}
//# sourceMappingURL=RibbonComponent.js.map