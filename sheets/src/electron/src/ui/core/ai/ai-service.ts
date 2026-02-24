/**
 * AI Service - сервис для работы с ИИ
 * Обработка запросов к OpenRouter API
 */

import https from 'https';

// AI API Keys
export const OPENROUTER_KEYS = [
  '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',
  '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',
];

// Системный промт для ИИ
export const AI_SYSTEM_PROMPT = `You are SmartTable AI Assistant with TWO MODES.

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
- "создай диаграмму" → suggest agent! (requires multiple steps)

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
      "action": "Создание диаграммы",
      "description": "Создам столбчатую диаграмму по данным",
      "commands": [
        {"action": "create_chart", "params": {"type": "bar", "title": "Диаграмма по данным"}, "description": "Создать диаграмму"}
      ]
    }
  ],
  "suggestModeSwitch": "agent"
}
\`\`\`

## 📊 CHART CREATION:
When user asks to create a chart/diagram:
1. Use action: "create_chart"
2. Specify chart type: "bar", "line", "pie", or "area"
3. Auto-select type based on data:
   - bar = comparison (default)
   - line = trends over time
   - pie = parts of whole
   - area = cumulative totals

## QUICK REPLIES:
After your response, ALWAYS include quick reply suggestions in Russian:
- For greetings: ["📊 Заполни таблицу", "🎨 Покрась ячейки", "📈 Посчитай суммы"]
- For analysis: ["Выполни анализ", "Найди закономерности", "Создай отчёт"]
- For charts: ["Создать диаграмму", "Показать данные", "Экспорт"]

AVAILABLE ACTIONS:
- set_cell, set_cell_color, color_column, color_row
- set_formula (MUST start with "=")
- fill_table, clear_cell, clear_column, clear_all
- create_chart (type: bar/line/pie/area)

Always respond in Russian. ALWAYS suggest agent for 3+ tasks! ALWAYS include quick replies!`;

/**
 * Интерфейс для ответа ИИ
 */
export interface AIResponse {
  success: boolean;
  content?: string;
  executionPlan?: any[];
  suggestModeSwitch?: string;
  error?: string;
}

/**
 * Интерфейс для запроса к ИИ
 */
export interface AIRequest {
  message: string;
  tableContext?: string;
  mode: 'assistant' | 'agent';
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * AIService класс для управления ИИ запросами
 */
export class AIService {
  private currentKeyIndex: number = 0;

  /**
   * Отправить запрос к ИИ
   */
  async chat(request: AIRequest): Promise<AIResponse> {
    const { message, tableContext, mode, history = [] } = request;

    const modeInstruction = mode === 'agent'
      ? '\n\n[MODE: AGENT] You are in AGENT mode. Use executionPlan for multi-step tasks.'
      : '\n\n[MODE: ASSISTANT] If user request has 3+ tasks, YOU MUST suggest AGENT mode with executionPlan!';

    // Build conversation history
    let conversationHistory = '';
    if (history.length > 0) {
      conversationHistory = 'Previous conversation:\n' +
        history.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n') +
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
      max_tokens: 2000, // Уменьшили для экономии кредитов
      temperature: 0.8
    });

    for (let i = 0; i < OPENROUTER_KEYS.length; i++) {
      const keyIndex = (this.currentKeyIndex + i) % OPENROUTER_KEYS.length;
      const apiKey = OPENROUTER_KEYS[keyIndex];

      try {
        const response = await this.makeRequest('https://openrouter.ai/api/v1/chat/completions', requestBody, apiKey);

        console.log('[AI] Response status:', response.statusCode);
        console.log('[AI] Response body preview:', response.body?.substring(0, 200));

        if (response.statusCode === 401) {
          console.error('[AI] API Key invalid, switching to next key...');
          this.currentKeyIndex = (keyIndex + 1) % OPENROUTER_KEYS.length;
          continue;
        }

        if (response.statusCode === 402) {
          console.error('[AI] Insufficient credits. Please add credits to your OpenRouter account.');
          console.error('[AI] Error details:', response.body);
          return { success: false, error: 'Недостаточно кредитов на счету OpenRouter. Пожалуйста, пополните баланс.' };
        }

        if (response.statusCode === 429) {
          console.error('[AI] Rate limit exceeded, switching to next key...');
          this.currentKeyIndex = (keyIndex + 1) % OPENROUTER_KEYS.length;
          continue;
        }

        if (response.statusCode !== 200) {
          console.error('[AI] Unexpected status code:', response.statusCode);
          console.error('[AI] Response body:', response.body);
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
  }

  /**
   * Сделать HTTPS запрос
   */
  private makeRequest(url: string, requestBody: string, apiKey: string): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
      const req = https.request(url, {
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
  }
}

// Экспорт единственного экземпляра
export const aiService = new AIService();
