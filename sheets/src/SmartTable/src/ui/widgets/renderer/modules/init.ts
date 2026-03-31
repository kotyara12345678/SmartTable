/**
 * Init Module - Инициализация приложения
 */

export interface InitContext {
  elements: any;
  state: any;
  CONFIG: any;
  FocusManager: any;
  initElements: () => void;
  renderCells: () => void;
  renderColumnHeaders: () => void;
  renderRowHeaders: () => void;
  renderFixedColumnHeaders: () => void;
  renderFixedRowHeaders: () => void;
  autoLoad: () => void;
  updateCellReference: () => void;
  setupEventListeners: () => void;
  setupScrollHandler: () => void;
  setupKeyboardController: () => void;
  updateModeUI: () => void;
}

/**
 * Инициализировать приложение
 */
export async function init(context: InitContext): Promise<void> {
  console.log('[Renderer] init() called');

  // Рендерим формула бар
  const formulaBarContainer = document.getElementById('formula-bar-container');
  if (formulaBarContainer) {
    formulaBarContainer.innerHTML = `
      <div class="formula-bar" id="formulaBar">
        <div class="cell-reference" id="cellReference">A1</div>
        <div class="formula-divider"></div>
        <button class="btn-formula" id="btnFormula">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        <div class="formula-input-wrapper">
          <span class="formula-icon">fx</span>
          <input type="text" class="formula-input" id="formulaInput" placeholder="">
        </div>
      </div>
    `;
    formulaBarContainer.classList.add('visible');
    console.log('[Renderer] Formula bar HTML rendered');
  }

  // Загружаем AI панель
  const aiPanelContainer = document.getElementById('ai-panel-container');
  if (aiPanelContainer) {
    try {
      const basePath = window.location.href.includes('index.html')
        ? window.location.href.substring(0, window.location.href.lastIndexOf('/')) + '/'
        : './';

      const response = await fetch(basePath + 'ui/templates/ai-panel.html');
      if (response.ok) {
        aiPanelContainer.innerHTML = await response.text();
        console.log('[Renderer] AI panel template loaded');
      }
    } catch (e) {
      console.log('[Renderer] Error loading AI panel template');
    }
  }

  // Инициализируем DOM элементы
  context.initElements();
  console.log('[Renderer] initElements() done');

  // Инициализируем Focus Manager
  context.FocusManager.init({
    getCellByCoords: (row: number, col: number) => {
      return (context as any).getCellElement?.(row, col);
    },
    containerSelector: '#cellGridWrapper'
  });
  console.log('[Renderer] FocusManager initialized');

  // Рендерим таблицу
  context.renderColumnHeaders();
  context.renderRowHeaders();
  context.renderFixedColumnHeaders();
  context.renderFixedRowHeaders();
  context.renderCells();

  // Автозагрузка
  context.autoLoad();

  console.log('[Renderer] Starting setupEventListeners');
  context.setupEventListeners();
  context.setupScrollHandler();
  console.log('[Renderer] Starting setupKeyboardController');
  context.setupKeyboardController();
  console.log('[Renderer] Starting updateCellReference');
  context.updateCellReference();

  // Инициализируем UI режима ИИ
  context.updateModeUI();

  console.log('[Renderer] init() completed');
}
