import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import https from 'https';

let mainWindow: BrowserWindow | null = null;

// AI API Keys
const OPENROUTER_KEYS = [
  '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',
  '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',
];

let currentKeyIndex = 0;

// Регистрация IPC обработчиков
function registerIPCHandlers(): void {
  ipcMain.handle('ai-chat', async (event, { message, tableContext, mode, history = [] }) => {
    const AI_SYSTEM_PROMPT = `You are SmartTable AI Assistant with TWO MODES.

## CRITICAL RULE - GREETINGS AND SIMPLE QUESTIONS:
- If user says "Привет", "Здравствуйте", "Hello", "Hi" - just respond with greeting, NO commands!
- If user asks a simple question - just answer, NO commands!
- ONLY return JSON commands when user explicitly asks to MODIFY the table!

## MODES:
- ASSISTANT: Quick simple responses (default)
- AGENT: Multi-step plans with executionPlan

## 🚨 CRITICAL: WHEN TO SUGGEST AGENT MODE (suggestModeSwitch: "agent"):
You MUST suggest AGENT mode when user request has 3+ distinct tasks:
- "сделай 1, 2, 3" → suggest agent!
- "проанализируй, найди, создай" → suggest agent!
- "посчитай, окрась, отсортируй" → suggest agent!
- Any request with commas separating multiple tasks → suggest agent!
- "выполни по плану" → suggest agent!

## WHEN TO USE ASSISTANT MODE (NO plan, NO suggest):
- Single task: "покрась A1", "заполни таблицу", "посчитай сумму"
- 1-2 simple operations
- Greetings and questions

## RESPONSE FORMAT:
For GREETINGS - just text, NO JSON!
Example: "Привет! Я ИИ-помощник SmartTable. Чем могу помочь?"

For SIMPLE tasks (1-2 operations) - ASSISTANT MODE:
\`\`\`json
{"commands": [{"action": "fill_table", "params": {"data": [["Имя", "Компания"], ["Иван", "ABC"]]}, "description": "Заполнить таблицу"}]}
\`\`\`

For COMPLEX tasks (3+ operations) - AGENT MODE:
YOU MUST:
1. Return executionPlan with steps
2. Set suggestModeSwitch: "agent"
3. Include REAL commands in EACH step's "commands" array
4. Commands will be executed immediately!

\`\`\`json
{
  "executionPlan": [
    {
      "step": 1, 
      "action": "Анализ данных", 
      "description": "Изучу таблицу и найду закономерности", 
      "commands": []
    },
    {
      "step": 2, 
      "action": "Вычисления", 
      "description": "Посчитаю среднюю выручку по отделам", 
      "commands": [
        {"action": "set_formula", "params": {"column": "D", "row": 2, "formula": "=AVERAGE(B2:C2)"}, "description": "Среднее"}
      ]
    },
    {
      "step": 3, 
      "action": "Форматирование", 
      "description": "Покрашу топ-5 в зелёный, аутсайдеров в красный", 
      "commands": [
        {"action": "set_cell_color", "params": {"column": "A", "row": 1, "bg_color": "#E8F5E9"}, "description": "Цвет"}
      ]
    }
  ],
  "suggestModeSwitch": "agent"
}
\`\`\`

⚠️ IMPORTANT: Each step MUST have "commands" array with real actions!

## COLORING RULES:
1. Use set_cell_color for single cells, color_column for columns, color_row for rows
2. Use light hex colors: #FFEBEE (red), #E8F5E9 (green), #E3F2FD (blue), #FFF3E0 (orange)

AVAILABLE ACTIONS:
- set_cell, set_cell_color, color_column, color_row
- set_formula (MUST start with "=")
- fill_table, clear_cell, clear_column, clear_all

## ⚠️ IMPORTANT EXAMPLES:

User: "Покрась A1 в красный"
→ Just: {"commands": [{"action": "set_cell_color", ...}]}
→ NO suggestModeSwitch!

User: "1. окрась имена 2. посчитай среднее 3. окрась статусы"
→ MUST: {"executionPlan": [...], "suggestModeSwitch": "agent"}

User: "Проанализируй, найди топ-5, создай отчёт"
→ MUST: {"executionPlan": [...], "suggestModeSwitch": "agent"}

Always respond in Russian. ALWAYS suggest agent for 3+ tasks!`;

    const modeInstruction = mode === 'agent' 
      ? '\n\n[MODE: AGENT] You are in AGENT mode. Use executionPlan for multi-step tasks.'
      : '\n\n[MODE: ASSISTANT] If user request has 3+ tasks, YOU MUST suggest AGENT mode with executionPlan!';
    
    // Build conversation history
    let conversationHistory = '';
    if (history && history.length > 0) {
      conversationHistory = 'Previous conversation:\n' + 
        history.map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n') + 
        '\n\n';
    }
    
    const prompt = conversationHistory + (tableContext 
      ? `Table:\n${tableContext}\n\nRequest: ${message}${modeInstruction}` 
      : `${message}${modeInstruction}`);

    const requestBody = JSON.stringify({
      model: 'deepseek/deepseek-chat',
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      max_tokens: 3500,
      temperature: 0.8
    });

    for (let i = 0; i < OPENROUTER_KEYS.length; i++) {
      const keyIndex = (currentKeyIndex + i) % OPENROUTER_KEYS.length;
      const apiKey = OPENROUTER_KEYS[keyIndex];

      try {
        const response = await new Promise<any>((resolve, reject) => {
          const req = https.request('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'http://localhost:3000',
              'X-Title': 'SmartTable',
              'Content-Length': Buffer.byteLength(requestBody)
            }
          }, (res: any) => {
            let data = '';
            res.on('data', (chunk: any) => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
          });

          req.on('error', reject);
          req.write(requestBody);
          req.end();
        });

        if (response.statusCode === 401) {
          currentKeyIndex = (keyIndex + 1) % OPENROUTER_KEYS.length;
          continue;
        }

        if (response.statusCode !== 200) {
          throw new Error(`HTTP ${response.statusCode}`);
        }

        const jsonData = JSON.parse(response.body);
        const content = jsonData.choices?.[0]?.message?.content || '';
        console.log(`[AI] Response: ${content?.substring(0, 300)}...`);

        // Parse execution plan and mode switch from response
        let executionPlan: any[] = [];
        let suggestModeSwitch: string | undefined;
        
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            if (parsed.executionPlan && Array.isArray(parsed.executionPlan)) {
              executionPlan = parsed.executionPlan;
            }
            if (parsed.suggestModeSwitch) {
              suggestModeSwitch = parsed.suggestModeSwitch;
            }
          } catch (e) {
            console.log('[AI] Failed to parse JSON:', e);
          }
        }

        return { 
          success: true, 
          content,
          executionPlan,
          suggestModeSwitch
        };

      } catch (error: any) {
        console.error(`[AI] Error:`, error.message);
        continue;
      }
    }

    return { success: false, error: 'Все API ключи не работают' };
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#f8f9fa',
    titleBarStyle: 'default',
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Создаем кастомное меню
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Файл',
      submenu: [
        { label: 'Новый', accelerator: 'CmdOrCtrl+N', click: () => console.log('Новый файл') },
        { label: 'Открыть', accelerator: 'CmdOrCtrl+O', click: () => console.log('Открыть файл') },
        { label: 'Сохранить', accelerator: 'CmdOrCtrl+S', click: () => console.log('Сохранить') },
        { type: 'separator' },
        { label: 'Экспорт', submenu: [
          {
            label: 'Excel (.xlsx)',
            click: () => mainWindow?.webContents.send('export', 'xlsx')
          },
          {
            label: 'CSV (.csv)',
            click: () => mainWindow?.webContents.send('export', 'csv')
          },
          {
            label: 'JSON (.json)',
            click: () => mainWindow?.webContents.send('export', 'json')
          },
          {
            label: 'HTML (.html)',
            click: () => mainWindow?.webContents.send('export', 'html')
          },
          {
            label: 'PNG (.png)',
            click: () => mainWindow?.webContents.send('export', 'png')
          },
        ]},
        { type: 'separator' },
        { label: 'Выход', accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4', click: () => app.quit() },
      ],
    },
    {
      label: 'Правка',
      submenu: [
        { label: 'Отменить', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Повторить', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: 'Вырезать', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Копировать', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Вставить', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Удалить', accelerator: 'Delete', click: () => console.log('Удалить') },
        { type: 'separator' },
        { label: 'Выделить всё', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
      ],
    },
    {
      label: 'Вид',
      submenu: [
        { label: 'Масштаб', submenu: [
          { label: 'Увеличить', accelerator: 'CmdOrCtrl+Plus', click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              const zoom = win.webContents.getZoomLevel();
              win.webContents.setZoomLevel(zoom + 0.5);
            }
          }},
          { label: 'Уменьшить', accelerator: 'CmdOrCtrl+-', click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              const zoom = win.webContents.getZoomLevel();
              win.webContents.setZoomLevel(zoom - 0.5);
            }
          }},
          { label: 'Сбросить (100%)', accelerator: 'CmdOrCtrl+0', click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.setZoomLevel(0);
            }
          }},
        ]},
        { type: 'separator' },
        { label: 'На весь экран', accelerator: 'F11', role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Вставка',
      submenu: [
        { label: 'Ячейки', click: () => console.log('Вставить ячейки') },
        { label: 'Строки', click: () => console.log('Вставить строки') },
        { label: 'Столбцы', click: () => console.log('Вставить столбцы') },
        { type: 'separator' },
        { label: 'Функцию', click: () => console.log('Вставить функцию') },
        { label: 'Изображение', click: () => console.log('Вставить изображение') },
      ],
    },
    {
      label: 'Формат',
      submenu: [
        { label: 'Числа', submenu: [
          { label: 'Числовой', click: () => console.log('Числовой формат') },
          { label: 'Текстовый', click: () => console.log('Текстовый формат') },
          { label: 'Дата', click: () => console.log('Формат даты') },
          { label: 'Валюта', click: () => console.log('Валюта') },
          { label: 'Процент', click: () => console.log('Процент') },
        ]},
        { type: 'separator' },
        { label: 'Жирный', accelerator: 'CmdOrCtrl+B', click: () => console.log('Жирный') },
        { label: 'Курсив', accelerator: 'CmdOrCtrl+I', click: () => console.log('Курсив') },
        { label: 'Подчеркнутый', accelerator: 'CmdOrCtrl+U', click: () => console.log('Подчеркнутый') },
      ],
    },
    {
      label: 'Данные',
      submenu: [
        { label: 'Сортировать', click: () => console.log('Сортировать') },
        { label: 'Фильтр', accelerator: 'CmdOrCtrl+Shift+L', click: () => console.log('Фильтр') },
      ],
    },
    {
      label: 'ИИ Помощник',
      submenu: [
        { label: 'Анализ данных', accelerator: 'CmdOrCtrl+K', click: () => console.log('ИИ Анализ') },
        { label: 'Генерация формул', click: () => console.log('ИИ Формулы') },
        { label: 'Очистка данных', click: () => console.log('ИИ Очистка') },
      ],
    },
    {
      label: 'Справка',
      submenu: [
        { label: 'О программе', click: () => console.log('О программе') },
        { label: 'Документация', click: () => console.log('Документация') },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerIPCHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
