/**
 * AI Agent - ФИНАЛЬНАЯ ВЕРСИЯ
 * Жёстко контролируем формат ответа
 */

const OPENROUTER_KEYS = [
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
];

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = `Ты функция для заполнения таблиц. Возвращай ТОЛЬКО JSON в формате:

{"tableData": [["Заголовок1","Заголовок2"],["Данные1","Данные2"]]}

ЗАПРЕЩЕНО:
- commands
- action  
- params
- description

ПРИМЕРЫ:

Пользователь: Заполни таблицу финансовыми данными
Ты: {"tableData": [["Месяц","Доход","Расход"],["Январь","50000","30000"],["Февраль","55000","32000"]]}

Пользователь: Создай таблицу сотрудников
Ты: {"tableData": [["Имя","Должность","Оклад"],["Иван","Менеджер","50000"],["Анна","Бухгалтер","60000"]]}

ВСЁ. Больше ничего не пиши.`;

let currentKeyIndex = 0;

export async function chatWithAI(message: string, tableContext?: string): Promise<{success: boolean, content: string, tableData?: string[][]}> {
  // Первая попытка
  let result = await makeRequest(message);
  
  // Если вернул commands вместо tableData - делаем retry с жёстким указанием
  if (!result.tableData && (result.content.includes('commands') || result.content.includes('action'))) {
    console.log('[AI] Wrong format, retrying...');
    const retryMessage = `Верни ТОЛЬКО {"tableData": [[...]]}. Никаких commands! Запрос: ${message}`;
    result = await makeRequest(retryMessage);
  }
  
  // Если всё ещё commands - извлекаем data
  if (!result.tableData) {
    const tableData = extractFromCommands(result.content);
    if (tableData) {
      return {
        success: true,
        content: '✅ Таблица заполнена!',
        tableData
      };
    }
  }
  
  return result;
}

async function makeRequest(message: string): Promise<{success: boolean, content: string, tableData?: string[][]}> {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: message }
  ];

  const apiKey = OPENROUTER_KEYS[0];

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'SmartTable'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages,
        max_tokens: 1500,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Ищем tableData
    const tableData = extractTableData(content);
    
    if (tableData) {
      return {
        success: true,
        content: '✅ Таблица заполнена!',
        tableData
      };
    }

    return {
      success: true,
      content: cleanContent(content)
    };

  } catch (error) {
    return { success: false, content: 'Ошибка: ' + error };
  }
}

function extractTableData(content: string): string[][] | null {
  // Пробуем найти {"tableData": ...}
  const directMatch = content.match(/\{[\s\n]*"tableData"[\s\S]*?\}/);
  if (directMatch) {
    try {
      const parsed = JSON.parse(directMatch[0]);
      if (parsed.tableData && Array.isArray(parsed.tableData)) {
        console.log('[AI] Found direct tableData:', parsed.tableData.length, 'rows');
        return parsed.tableData;
      }
    } catch (e) {}
  }

  return null;
}

function extractFromCommands(content: string): string[][] | null {
  // Ищем commands[0].params.data
  const commandsMatch = content.match(/\{[\s\S]*"commands"[\s\S]*\}/);
  if (commandsMatch) {
    try {
      const parsed = JSON.parse(commandsMatch[0]);
      if (parsed.commands?.[0]?.params?.data && Array.isArray(parsed.commands[0].params.data)) {
        console.log('[AI] Extracted from commands:', parsed.commands[0].params.data.length, 'rows');
        return parsed.commands[0].params.data;
      }
    } catch (e) {
      console.error('[AI] Failed to parse commands:', e);
    }
  }
  
  return null;
}

function cleanContent(content: string): string {
  return content
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .replace(/\{[\s\S]*\}/g, '')
    .trim();
}

export function getTableContext(data: Map<string, any>, rows: number, cols: number): string {
  return `Таблица: ${data.size} ячеек`;
}
