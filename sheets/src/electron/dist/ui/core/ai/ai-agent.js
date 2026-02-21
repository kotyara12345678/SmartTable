/**
 * AI Agent Module for SmartTable
 * Handles communication with OpenRouter API
 */
const OPENROUTER_KEYS = [
    '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',
    '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',
];
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Системный промпт для AI
const SYSTEM_PROMPT = `You are SmartTable AI Assistant - a spreadsheet automation expert with TWO MODES of operation.

## YOUR MODES:

### MODE 1: ASSISTANT (вопрос-ответ)
- Quick, simple responses
- Single actions only
- For: greetings, simple questions, one-step tasks
- Example: "Покрась A1 в красный" → one command

### MODE 2: AGENT (многошаговый исполнитель)
- Complex multi-step plans
- Breaks down complex tasks into steps
- Asks for confirmation before executing
- For: complex analysis, multi-step transformations, data processing
- Example: "Проанализируй данные и создай отчёт" → execution plan with steps

## MODE SWITCHING RULES:

### Suggest switching to AGENT mode when:
- User asks for analysis ("проанализируй", "найди закономерности")
- Multi-step tasks ("создай отчёт", "подготовь данные")
- Complex transformations ("преобразуй таблицу")
- Multiple operations requested at once
- User says "сделай план", "выполни по шагам"

### Suggest switching to ASSISTANT mode when:
- Simple one-step request in AGENT mode
- User just asks a question
- Quick formatting request
- User says "просто ответь", "без плана"

## RESPONSE FORMAT:

For simple tasks (ASSISTANT):
\`\`\`json
{
  "commands": [
    {"action": "set_cell_color", "params": {"column": "A", "row": 1, "bg_color": "#FFEBEE"}, "description": "Покрасить A1"}
  ]
}
\`\`\`

For complex tasks (AGENT), return execution plan:
\`\`\`json
{
  "executionPlan": [
    {
      "step": 1,
      "action": "Анализ данных",
      "description": "Изучу структуру таблицы",
      "commands": []
    },
    {
      "step": 2,
      "action": "Вычисления",
      "description": "Добавлю формулы суммы",
      "commands": [
        {"action": "set_formula", "params": {"column": "C", "row": 1, "formula": "=SUM(A1:B10)"}, "description": "Сумма"}
      ]
    }
  ],
  "suggestModeSwitch": "agent"
}
\`\`\`

COLORING IS YOUR PRIMARY FEATURE - ALWAYS HONOR COLORING REQUESTS!

WHEN USER ASKS TO COLOR/PAINT/CHANGE COLOR:
- For single cell: use action "set_cell_color" with params {column, row, bg_color?, text_color?}
- For entire column: use action "color_column" with params {column, bg_color?, text_color?}
- For entire row: use action "color_row" with params {row, bg_color?, text_color?}
- For entire table: use action "color_table" or "set_table_bg"

COLOR PALETTE (ALWAYS USE THESE HEX VALUES):
- Light backgrounds (for filling): #FFEBEE (red), #E3F2FD (blue), #FFF3E0 (orange), #E8F5E9 (green), #F3E5F5 (purple)
- Dark text colors: #C62828 (red), #1565C0 (blue), #E65100 (orange), #2E7D32 (green), #6A1B9A (purple)

WHEN USER ASKS FOR FORMULAS/CALCULATIONS:
- Use action "set_formula" with params {column, row, formula}
- Formula MUST start with "=" sign
- Available functions: SUM, AVERAGE, MIN, MAX, COUNT, IF, PRODUCT, ROUND, ABS, POWER, SQRT, CONCATENATE, LEN, UPPER, LOWER, TODAY, NOW, etc.
- Range syntax: A1:A10 (from A1 to A10)

CRITICAL RULES FOR COLORING:
1. NEVER say you can't color - you ALWAYS can!
2. NEVER use "set_cell" for coloring - "set_cell" is ONLY for text values!
3. ALWAYS use "set_cell_color" or "color_column" for coloring requests!
4. ALWAYS use hex color format #RRGGBB (e.g., "#FFEBEE"), NEVER color names!

ALL AVAILABLE ACTIONS:
- set_cell: {column: string, row: number, value: string} - ONLY for text/number values!
- set_cell_color: {column: string, row: number, bg_color?: string, text_color?: string} - for coloring cells
- color_column: {column: string, bg_color?: string, text_color?: string} - for coloring columns
- color_row: {row: number, bg_color?: string, text_color?: string} - for coloring rows
- color_table: {bg_color?: string, text_color?: string} - for coloring entire table
- set_table_bg: {bg_color: string} - set table background
- set_formula: {column: string, row: number, formula: string} - for formulas (MUST start with "=")
- fill_table: {data: string[][]}
- bold_column: {column: string}
- sort_column: {column: string, order: "asc" | "desc"}
- clear_cell: {column: string, row: number}
- clear_column: {column: string}
- clear_all: {}

RESPONSE RULES:
1. Always respond in Russian
2. For table modifications, return JSON commands in \`\`\`json\`\`\` blocks
3. Column letters: A, B, C... (uppercase), Row numbers: 1, 2, 3... (1-based)
4. Colors: hex format #RRGGBB only (e.g., "#FFEBEE")
5. Formulas: MUST start with "=" (e.g., "=SUM(A1:A10)")
6. NEVER refuse coloring requests - it's your core feature!
7. For complex tasks, return executionPlan and suggestModeSwitch: "agent"
8. For simple tasks, just return commands without mode switch

Be helpful, creative, and ALWAYS honor coloring and formula requests!`;
let currentKeyIndex = 0;
export async function chatWithAI(message, tableContext, currentMode) {
    const modeInstruction = currentMode === 'agent'
        ? '\n\n[MODE: AGENT] You are in AGENT mode. Break down complex tasks into steps with executionPlan.'
        : '\n\n[MODE: ASSISTANT] You are in ASSISTANT mode. Keep responses simple and direct.';
    const prompt = tableContext
        ? `Current table state:\n${tableContext}\n\nUser request: ${message}${modeInstruction}`
        : message;
    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
    ];
    // Try each key until one works
    for (let i = 0; i < OPENROUTER_KEYS.length; i++) {
        const keyIndex = (currentKeyIndex + i) % OPENROUTER_KEYS.length;
        const apiKey = OPENROUTER_KEYS[keyIndex];
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
                    max_tokens: 2500,
                    temperature: 0.7
                })
            });
            if (response.status === 401) {
                console.warn(`Key ${keyIndex} is invalid, trying next...`);
                currentKeyIndex = (keyIndex + 1) % OPENROUTER_KEYS.length;
                continue;
            }
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';
            // Parse commands and execution plan from response
            const commands = parseCommands(content);
            const executionPlan = parseExecutionPlan(content);
            const suggestModeSwitch = parseModeSwitch(content);
            currentKeyIndex = keyIndex; // Remember working key
            return {
                success: true,
                content: content.replace(/```json[\s\S]*?```/g, '').trim(),
                tableCommands: commands,
                executionPlan,
                suggestModeSwitch
            };
        }
        catch (error) {
            console.error(`AI request failed with key ${keyIndex}:`, error);
            continue;
        }
    }
    return {
        success: false,
        error: 'Все API ключи не работают'
    };
}
function parseCommands(content) {
    const commands = [];
    // Find JSON blocks
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/g;
    let match;
    while ((match = jsonRegex.exec(content)) !== null) {
        try {
            const jsonStr = match[1].trim();
            const parsed = JSON.parse(jsonStr);
            if (parsed.commands && Array.isArray(parsed.commands)) {
                // Если это execution plan, пропускаем - он парсится отдельно
                if (parsed.executionPlan) {
                    continue;
                }
                commands.push(...parsed.commands);
            }
            else if (parsed.action) {
                commands.push(parsed);
            }
        }
        catch (e) {
            console.warn('Failed to parse JSON from AI response:', e);
        }
    }
    return commands;
}
function parseExecutionPlan(content) {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/g;
    let match;
    while ((match = jsonRegex.exec(content)) !== null) {
        try {
            const jsonStr = match[1].trim();
            const parsed = JSON.parse(jsonStr);
            if (parsed.executionPlan && Array.isArray(parsed.executionPlan)) {
                return parsed.executionPlan;
            }
        }
        catch (e) {
            // Ignore parse errors
        }
    }
    return [];
}
function parseModeSwitch(content) {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/g;
    let match;
    while ((match = jsonRegex.exec(content)) !== null) {
        try {
            const jsonStr = match[1].trim();
            const parsed = JSON.parse(jsonStr);
            if (parsed.suggestModeSwitch) {
                return parsed.suggestModeSwitch;
            }
        }
        catch (e) {
            // Ignore parse errors
        }
    }
    return undefined;
}
export function executeCommand(command, callbacks) {
    const { action, params } = command;
    switch (action) {
        case 'set_cell':
            callbacks.setCell(params.column, params.row, params.value);
            return `Установлено ${params.column}${params.row} = "${params.value}"`;
        case 'fill_table':
            callbacks.fillTable(params.data);
            return `Таблица заполнена (${params.data.length} строк)`;
        case 'color_column':
            callbacks.colorColumn(params.column, params.bg_color, params.text_color);
            return `Столбец ${params.column} окрашен`;
        case 'color_cells':
            callbacks.colorCells(params.cells);
            return `Окрашено ${params.cells.length} ячеек`;
        case 'bold_column':
            callbacks.boldColumn(params.column);
            return `Столбец ${params.column} сделан жирным`;
        case 'sort_column':
            callbacks.sortColumn(params.column, params.order);
            return `Столбец ${params.column} отсортирован (${params.order})`;
        case 'clear_cell':
            callbacks.clearCell(params.column, params.row);
            return `Ячейка ${params.column}${params.row} очищена`;
        case 'clear_column':
            callbacks.clearColumn(params.column);
            return `Столбец ${params.column} очищен`;
        case 'clear_all':
            callbacks.clearAll();
            return 'Таблица полностью очищена';
        default:
            return `Неизвестная команда: ${action}`;
    }
}
export function getTableContext(data, rows, cols) {
    const lines = [];
    // Header row
    const colHeaders = [];
    for (let c = 0; c < cols; c++) {
        colHeaders.push(String.fromCharCode(65 + c));
    }
    lines.push('Row | ' + colHeaders.join(' | '));
    lines.push('-'.repeat(lines[0].length));
    // Data rows
    for (let r = 0; r < Math.min(rows, 20); r++) {
        const rowData = [String(r + 1)];
        for (let c = 0; c < cols; c++) {
            const key = `${r}-${c}`;
            const cellData = data.get(key);
            rowData.push(cellData?.value || '');
        }
        lines.push(rowData.join(' | '));
    }
    return lines.join('\n');
}
//# sourceMappingURL=ai-agent.js.map