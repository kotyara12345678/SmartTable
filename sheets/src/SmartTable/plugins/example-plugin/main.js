/**
 * Example Plugin for SmartTable
 * 
 * Этот плагин демонстрирует базовую структуру и использование API.
 * Для активации: включите плагин в панели "Расширения"
 */

/**
 * Точка входа плагина
 * @param {import('../core/plugins/PluginTypes').SmartTablePluginAPI} api
 */
export function activate(api) {
  console.log('[ExamplePlugin] Plugin activated!');
  console.log('[ExamplePlugin] API version:', api.version);
  
  // Пример: добавление кнопки в ленту
  api.ui.addRibbonButton({
    id: 'example-plugin-btn',
    groupId: 'insert',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 16v-4M12 8h.01"/>
    </svg>`,
    label: 'Пример',
    tooltip: 'Демонстрационная кнопка плагина',
    size: 'sm',
    onClick: () => {
      // При клике показываем уведомление
      api.ui.showNotification(
        'Привет! Это пример плагина для SmartTable.',
        'info'
      );
      
      // Получаем выделенный диапазон
      const range = api.sheets.getSelectedRange();
      if (range) {
        console.log('[ExamplePlugin] Selected range:', range);
        api.ui.showNotification(
          `Выделено: ${range.start} - ${range.end}`,
          'success'
        );
      } else {
        api.ui.showNotification(
          'Выделите ячейки для работы с ними',
          'warning'
        );
      }
    }
  });
  
  // Пример: подписка на события
  const onCellChange = (sheetId, cellId, value) => {
    console.log('[ExamplePlugin] Cell changed:', { sheetId, cellId, value });
  };
  
  api.events.onCellChange(onCellChange);
  
  // Пример: сохранение данных в хранилище
  const pluginData = api.storage.get('exampleData') || { launchCount: 0 };
  pluginData.launchCount++;
  api.storage.set('exampleData', pluginData);
  console.log('[ExamplePlugin] Launch count:', pluginData.launchCount);
  
  // Возвращаем объект для деактивации
  return {
    /**
     * Вызывается при деактивации плагина
     */
    deactivate: () => {
      console.log('[ExamplePlugin] Plugin deactivated');
      console.log('[ExamplePlugin] Final launch count:', pluginData.launchCount);
      
      // Отписываемся от событий
      api.events.off('cellChange', onCellChange);
    },
    
    /**
     * Дополнительные методы плагина
     */
    getLaunchCount: () => pluginData.launchCount,
    
    resetCount: () => {
      pluginData.launchCount = 0;
      api.storage.set('exampleData', pluginData);
      console.log('[ExamplePlugin] Launch count reset');
    }
  };
}
