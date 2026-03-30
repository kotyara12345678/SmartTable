/**
 * Search & Filter Module - Поиск и фильтрация
 */

export interface SearchFilterContext {
  state: any;
  elements: any;
  getCellKey: (row: number, col: number) => string;
  getCellElement: (row: number, col: number) => HTMLElement | null;
  getCurrentData: () => Map<string, any>;
  renderCells: () => void;
}

/**
 * Выполнить поиск
 */
export function performSearch(
  query: string,
  caseSensitive: boolean,
  exactMatch: boolean,
  resultsContainer: HTMLElement,
  context: SearchFilterContext
): void {
  const { state, getCellKey, getCellElement } = context;
  const data = context.getCurrentData();
  
  state.searchResults.clear();
  resultsContainer.innerHTML = '';

  data.forEach((cellData, key) => {
    if (!cellData.value) return;

    const searchText = caseSensitive ? cellData.value : cellData.value.toLowerCase();
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    let found = false;
    if (exactMatch) {
      found = searchText === searchQuery;
    } else {
      found = searchText.includes(searchQuery);
    }

    if (found) {
      state.searchResults.add(key);
      const [row, col] = key.split('-').map(Number);
      
      const resultItem = document.createElement('div');
      resultItem.className = 'search-result-item';
      resultItem.textContent = `${String.fromCharCode(65 + col)}${row + 1}: ${cellData.value}`;
      resultItem.addEventListener('click', () => {
        (context as any).selectCell?.(row, col);
      });
      resultsContainer.appendChild(resultItem);
    }
  });

  if (state.searchResults.size > 0) {
    state.searchHighlight = true;
    context.renderCells();
  }
}

/**
 * Очистить подсветку поиска
 */
export function clearSearchHighlight(context: SearchFilterContext): void {
  context.state.searchHighlight = false;
  context.state.searchResults.clear();
  context.renderCells();
}

/**
 * Показать фильтр по значению
 */
export function showFilterByValueModal(
  columnIndex: number,
  context: SearchFilterContext
): void {
  const { state, getCellKey, getCurrentData } = context;
  const data = getCurrentData();
  
  // Собрать уникальные значения для колонки
  const values = new Set<string>();
  data.forEach((cellData, key) => {
    const [row, col] = key.split('-').map(Number);
    if (col === columnIndex && cellData.value) {
      values.add(cellData.value);
    }
  });

  // Показать модальное окно с фильтрами
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width: 400px;">
      <div class="modal-header">
        <h3>Фильтр по столбцу ${String.fromCharCode(65 + columnIndex)}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <div id="filterValues" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; margin-bottom: 15px;">
          ${Array.from(values).map(v => `
            <label style="display: block; margin: 5px 0;">
              <input type="checkbox" value="${v}" checked /> ${v}
            </label>
          `).join('')}
        </div>
        <div style="text-align: right;">
          <button id="btnApplyFilter">Применить</button>
          <button id="btnClearFilter" style="margin-left: 10px;">Очистить</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#btnApplyFilter')?.addEventListener('click', () => {
    const checkedValues: string[] = [];
    modal.querySelectorAll('#filterValues input[type="checkbox"]:checked').forEach(cb => {
      checkedValues.push((cb as HTMLInputElement).value);
    });

    state.activeFilters.set(columnIndex, {
      values: checkedValues,
      type: 'include'
    });

    context.renderCells();
    modal.remove();
  });

  modal.querySelector('#btnClearFilter')?.addEventListener('click', () => {
    state.activeFilters.delete(columnIndex);
    context.renderCells();
    modal.remove();
  });
}

/**
 * Применить фильтры
 */
export function applyFilters(context: SearchFilterContext): void {
  context.renderCells();
}

/**
 * Сортировать по колонке
 */
export function sortByColumn(
  columnIndex: number,
  direction: 'asc' | 'desc',
  context: SearchFilterContext
): void {
  const { state, getCellKey, getCurrentData } = context;
  const data = getCurrentData();

  // Собрать данные для сортировки
  const rowData: Array<{ row: number; value: any }> = [];
  
  for (let row = 0; row < 100; row++) {
    const key = getCellKey(row, columnIndex);
    const cellData = data.get(key);
    rowData.push({ row, value: cellData?.value || '' });
  }

  // Сортировать
  rowData.sort((a, b) => {
    const valA = getCellValueForSort(a.value);
    const valB = getCellValueForSort(b.value);

    if (typeof valA === 'number' && typeof valB === 'number') {
      return direction === 'asc' ? valA - valB : valB - valA;
    }

    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();
    if (direction === 'asc') {
      return strA.localeCompare(strB);
    } else {
      return strB.localeCompare(strA);
    }
  });

  // Переместить данные
  const newData = new Map();
  rowData.forEach((item, newIndex) => {
    const oldKey = getCellKey(item.row, columnIndex);
    const cellData = data.get(oldKey);
    if (cellData) {
      newData.set(getCellKey(newIndex, columnIndex), cellData);
    }
  });

  // Обновить данные
  newData.forEach((value, key) => {
    data.set(key, value);
  });

  state.activeSort = { column: columnIndex, direction };
  context.renderCells();
}

/**
 * Получить значение ячейки для сортировки
 */
export function getCellValueForSort(cellData: any): number | string {
  if (!cellData || !cellData.value) return '';
  
  const num = parseFloat(cellData.value);
  if (!isNaN(num)) return num;
  
  return cellData.value;
}
