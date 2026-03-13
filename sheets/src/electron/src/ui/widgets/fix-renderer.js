const fs = require('fs');

const filePath = 'renderer.ts';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Lines to keep (0-indexed): Keep 0-1901 (lines 1-1902), then add new content, then keep from 1937 onward
const beforeLines = lines.slice(0, 1902);  // Lines 1-1902
const afterLines = lines.slice(1937);       // From line 1938 onward

const newContent = `  
  // Обработка начала редактирования по клавише
  elements.cellGrid.addEventListener('keypress', (e: KeyboardEvent) => {
    if (state.isEditing) return;
    
    const cell = (e.target as HTMLElement).closest('.cell') as HTMLElement;
    if (!cell) return;

    const row = parseInt(cell.dataset.row || '0');
    const col = parseInt(cell.dataset.col || '0');

    // Начинаем редактирование если нажата printable клавиша
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      editCellWithChar(row, col, e.key);
      e.preventDefault();
    }
  });

  // === ОБРАБОТЧИКИ ДЛЯ ГЛОБАЛЬНОГО INPUT ===
  const globalInput = getGlobalCellInput();
  
  // Keydown для глобального input
  globalInput.addEventListener('keydown', (e: KeyboardEvent) => {
    handleGlobalInputKeyDown(e);
  });
  
  // Input event для обновления formula bar
  globalInput.addEventListener('input', (e: Event) => {
    handleGlobalInputChange(e);
  });
  
  // Blur - завершить редактирование
  globalInput.addEventListener('blur', () => {
    if (state.isEditing) {
      finishEditing(true);
    }
  });
}`;

const newLines = newContent.split('\n');
const combined = beforeLines.concat(newLines).concat(afterLines);
const result = combined.join('\n');

fs.writeFileSync(filePath, result, 'utf8');
console.log('File successfully replaced');
