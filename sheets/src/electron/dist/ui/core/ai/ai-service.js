/**
 * AI Service - сервис для работы с ИИ
 * Optimized for minimal token usage
 */
import https from 'https';
export const OPENROUTER_KEYS = [
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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'
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
 * AIService класс для управления ИИ запросами
 */
export class AIService {
    constructor() {
        this.currentKeyIndex = 0;
    }
    /**
     * Отправить запрос к ИИ
     */
    async chat(request) {
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
                let executionPlan = [];
                let suggestModeSwitch;
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
                    }
                    catch (e) {
                        console.log('[AI] Failed to parse JSON:', e);
                    }
                }
                return {
                    success: true,
                    content,
                    executionPlan,
                    suggestModeSwitch
                };
            }
            catch (error) {
                console.error(`[AI] Error:`, error.message);
                continue;
            }
        }
        return { success: false, error: 'Все API ключи не работают' };
    }
    /**
     * Сделать HTTPS запрос
     */
    makeRequest(url, requestBody, apiKey) {
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
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
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
//# sourceMappingURL=ai-service.js.map