/**
 * Modals Module - Модальные окна
 */

export interface ModalOptions {
  title?: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  callback?: (value: string | null) => void;
}

/**
 * Показать модальное окно с prompt
 */
export function showPromptModal(
  message: string,
  callback: (value: string | null) => void,
  defaultValue: string = ''
): void {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${message}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <input type="text" class="modal-input" value="${defaultValue}" 
          placeholder="" style="width: 100%; padding: 8px; margin: 10px 0;" />
        <div style="text-align: right; margin-top: 10px;">
          <button class="btn-cancel" style="margin-right: 10px;">Отмена</button>
          <button class="btn-confirm">OK</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const input = modal.querySelector('.modal-input') as HTMLInputElement;
  const btnCancel = modal.querySelector('.btn-cancel') as HTMLButtonElement;
  const btnConfirm = modal.querySelector('.btn-confirm') as HTMLButtonElement;

  input.focus();
  input.select();

  const close = (value: string | null) => {
    modal.remove();
    callback(value);
  };

  btnCancel.addEventListener('click', () => close(null));
  btnConfirm.addEventListener('click', () => close(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') close(input.value);
    if (e.key === 'Escape') close(null);
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) close(null);
  });
}

/**
 * Показать модальное окно поиска
 */
export function showFindInSelectionModal(): void {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width: 500px;">
      <div class="modal-header">
        <h3>🔍 Поиск в выделенном</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px;">Поисковый запрос:</label>
          <input type="text" id="searchInput" placeholder="Введите текст для поиска..." 
            style="width: 100%; padding: 8px;" />
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: flex; align-items: center; margin-bottom: 5px;">
            <input type="checkbox" id="searchCaseSensitive" style="margin-right: 8px;" />
            Учитывать регистр
          </label>
          <label style="display: flex; align-items: center;">
            <input type="checkbox" id="searchExactMatch" style="margin-right: 8px;" />
            Точное совпадение
          </label>
        </div>
        <div id="searchResults" style="max-height: 200px; overflow-y: auto; 
          border: 1px solid #ddd; padding: 10px; margin-bottom: 15px;"></div>
        <div style="text-align: right;">
          <button id="btnReplace" style="margin-right: 10px;">Заменить</button>
          <button id="btnReplaceAll">Заменить все</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

/**
 * Показать модальное окно фильтра
 */
export function showFilterByValueModal(columnIndex: number): void {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width: 400px;">
      <div class="modal-header">
        <h3>Фильтр по столбцу ${String.fromCharCode(65 + columnIndex)}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px;">Значения для фильтрации:</label>
          <div id="filterValues" style="max-height: 200px; overflow-y: auto; 
            border: 1px solid #ddd; padding: 10px;"></div>
        </div>
        <div style="text-align: right;">
          <button id="btnApplyFilter">Применить</button>
          <button id="btnClearFilter" style="margin-left: 10px;">Очистить</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

/**
 * Показать меню экспорта
 */
export function showExportMenu(): void {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width: 400px;">
      <div class="modal-header">
        <h3>📤 Экспорт данных</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <p style="margin-bottom: 15px;">Выберите формат экспорта:</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <button data-format="xlsx" style="padding: 15px;">📊 Excel (.xlsx)</button>
          <button data-format="csv" style="padding: 15px;">📄 CSV (.csv)</button>
          <button data-format="json" style="padding: 15px;">📋 JSON (.json)</button>
          <button data-format="html" style="padding: 15px;">🌐 HTML (.html)</button>
          <button data-format="xml" style="padding: 15px;">📑 XML (.xml)</button>
          <button data-format="markdown" style="padding: 15px;">📝 Markdown (.md)</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll('[data-format]').forEach(btn => {
    btn.addEventListener('click', () => {
      const format = (btn as HTMLElement).dataset.format as string;
      // Экспорт данных
      modal.remove();
    });
  });
}
