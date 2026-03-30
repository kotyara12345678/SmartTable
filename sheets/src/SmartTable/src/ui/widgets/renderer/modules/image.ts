/**
 * Image Module - Работа с изображениями
 */

export interface ImageContext {
  state: any;
  elements: any;
  getCellElement: (row: number, col: number) => HTMLElement | null;
  getCellKey: (row: number, col: number) => string;
  getCurrentData: () => Map<string, any>;
  updateAIDataCache: () => void;
  autoSave: () => void;
}

/**
 * Вставить изображение
 */
export function insertImage(imageSrc: string, context: ImageContext): void {
  const { row, col } = context.state.selectedCell;
  const cell = context.getCellElement(row, col);
  if (!cell) return;

  const rect = cell.getBoundingClientRect();
  const container = context.elements.cellGridWrapper;
  if (!container) return;

  const imgContainer = document.createElement('div');
  imgContainer.className = 'floating-image';
  imgContainer.style.cssText = `
    position: absolute;
    left: ${rect.left + container.scrollLeft}px;
    top: ${rect.top + container.scrollTop}px;
    min-width: 150px;
    min-height: 150px;
    max-width: 400px;
    max-height: 400px;
    border: 2px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    background: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
  `;

  const header = document.createElement('div');
  header.className = 'floating-header';
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f5f5f5;
    border-bottom: 1px solid #ddd;
    cursor: move;
  `;
  header.innerHTML = `
    <span style="font-size: 12px; color: #666;">Изображение</span>
    <button class="close-btn" style="background: none; border: none; cursor: pointer; font-size: 18px;">&times;</button>
  `;

  const img = document.createElement('img');
  img.src = imageSrc;
  img.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';

  imgContainer.appendChild(header);
  imgContainer.appendChild(img);
  container.appendChild(imgContainer);

  // Закрыть
  header.querySelector('.close-btn')?.addEventListener('click', () => {
    imgContainer.remove();
  });

  // Перемещение
  makeDraggableByHeader(imgContainer, header);

  // Сохранить в данные ячейки
  const key = context.getCellKey(row, col);
  const data = context.getCurrentData();
  const cellData = data.get(key) || { value: cell.textContent || '' };
  const newStyle = { ...cellData.style, backgroundImage: imageSrc };
  data.set(key, { ...cellData, style: newStyle });

  context.updateAIDataCache();
  context.autoSave();
}

/**
 * Вставить изображение в ячейку
 */
export function insertImageInCell(imageSrc: string, context: ImageContext): void {
  const { row, col } = context.state.selectedCell;
  const cell = context.getCellElement(row, col);
  if (!cell) return;

  cell.textContent = '';
  cell.style.backgroundImage = `url(${imageSrc})`;
  cell.style.backgroundSize = 'cover';
  cell.style.backgroundPosition = 'center';

  const key = context.getCellKey(row, col);
  const data = context.getCurrentData();
  const cellData = data.get(key) || { value: '' };
  const newStyle = { ...cellData.style, backgroundImage: imageSrc };
  data.set(key, { ...cellData, style: newStyle });

  context.updateAIDataCache();
  context.autoSave();
}

/**
 * Сделать элемент перетаскиваемым за заголовок
 */
export function makeDraggableByHeader(element: HTMLElement, header: HTMLElement): void {
  let isDragging = false;
  let startX = 0, startY = 0;
  let startLeft = 0, startTop = 0;

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.pageX;
    startY = e.pageY;
    startLeft = element.offsetLeft;
    startTop = element.offsetTop;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.pageX - startX;
    const dy = e.pageY - startY;
    element.style.left = `${startLeft + dx}px`;
    element.style.top = `${startTop + dy}px`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

/**
 * Сделать элемент перетаскиваемым
 */
export function makeDraggable(element: HTMLElement): void {
  let isDragging = false;
  let startX = 0, startY = 0;
  let startLeft = 0, startTop = 0;

  element.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.pageX;
    startY = e.pageY;
    startLeft = element.offsetLeft;
    startTop = element.offsetTop;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.pageX - startX;
    const dy = e.pageY - startY;
    element.style.left = `${startLeft + dx}px`;
    element.style.top = `${startTop + dy}px`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

/**
 * Добавить ручки изменения размера
 */
export function addResizeHandles(element: HTMLElement): void {
  const directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  
  directions.forEach(dir => {
    const handle = document.createElement('div');
    handle.className = `resize-handle resize-${dir}`;
    handle.dataset.direction = dir;
    element.appendChild(handle);
  });
}
