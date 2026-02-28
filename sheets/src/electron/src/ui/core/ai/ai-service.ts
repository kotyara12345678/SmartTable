/**
 * AI Service - сервис для работы с ИИ
 * Optimized for minimal token usage
 */

import https from 'https';

export const OPENROUTER_KEYS = [
  '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',
  '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',
];

// Оптимизированный промпт (~250 токенов вместо ~800)
export const AI_SYSTEM_PROMPT = `SmartTable AI Assistant.

MODES:
- ASSISTANT: 1-2 simple tasks
- AGENT: 3+ tasks, use executionPlan + suggestModeSwitch:"agent"

GREETINGS: Just greet, NO commands!

ACTIONS:
- set_cell: {column, row, value}
- set_cell_color: {column, row, bg_color?, text_color?} (hex #RRGGBB)
- color_column: {column, bg_color?, text_color?}
- set_formula: {column, row, formula} (start with =)
- fill_table: {data: string[][]}
- create_chart: {type: "bar"|"line"|"pie"|"area"}
- clear_cell/column/all

COLORS: #FFEBEE(red), #E3F2FD(blue), #FFF3E0(orange), #E8F5E9(green)

FORMAT:
- Simple: {"commands": [{action, params, description}]}
- Complex (3+ tasks): {"executionPlan": [{step, action, description, commands}], "suggestModeSwitch": "agent"}

RULES:
- 3+ tasks → use AGENT mode
- Formulas start with =
- Reply in Russian
- Add quick reply suggestions`;

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
      max_tokens: 1500,
      temperature: 0.5
    });

    for (let i = 0; i < OPENROUTER_KEYS.length; i++) {
      const keyIndex = (this.currentKeyIndex + i) % OPENROUTER_KEYS.length;
      const apiKey = OPENROUTER_KEYS[keyIndex];

      try {
        const response = await this.makeRequest('https://openrouter.ai/api/v1/chat/completions', requestBody, apiKey);

        console.log('[AI] Response status:', response.statusCode);

        if (response.statusCode === 401 || response.statusCode === 403) {
          console.error(`[AI] Key ${keyIndex} invalid/expired:`, response.body?.substring(0, 200));
          this.currentKeyIndex = (keyIndex + 1) % OPENROUTER_KEYS.length;
          continue;
        }

        if (response.statusCode === 402) {
          console.error('[AI] Insufficient credits.');
          return { success: false, error: 'Недостаточно кредитов на OpenRouter' };
        }

        if (response.statusCode === 429) {
          console.error('[AI] Rate limit exceeded, switching key...');
          this.currentKeyIndex = (keyIndex + 1) % OPENROUTER_KEYS.length;
          continue;
        }

        if (response.statusCode !== 200) {
          console.error('[AI] HTTP error:', response.statusCode, response.body);
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
