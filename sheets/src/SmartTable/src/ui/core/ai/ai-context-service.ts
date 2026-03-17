/**
 * AI Context Service - максимально упрощён
 */

import { databaseManager } from '../../../database/simple-database.js';
import { chatWithAI } from './ai-agent.js';

export interface AIRequest {
  message: string;
  sessionId: string;
}

export interface AIResponse {
  response: string;
  context: any;
  suggestions?: string[];
}

export class AIContextService {
  private static instance: AIContextService;
  private chatHistory: Array<{role: 'user' | 'assistant', content: string}> = [];

  private constructor() {}

  static getInstance(): AIContextService {
    if (!AIContextService.instance) {
      AIContextService.instance = new AIContextService();
    }
    return AIContextService.instance;
  }

  async init(): Promise<void> {
    await databaseManager.init();
  }

  async sendMessage(request: AIRequest): Promise<AIResponse> {
    await databaseManager.saveMessage({
      session_id: request.sessionId,
      role: 'user',
      content: request.message,
      timestamp: new Date()
    });

    this.chatHistory.push({ role: 'user', content: request.message });

    // Отправляем AI
    const result = await chatWithAI(request.message);

    // Если есть tableData - заполняем таблицу
    if (result.tableData && result.tableData.length > 0) {
      console.log('[AI] Filling table:', result.tableData.length, 'rows');
      (window as any).fillTable?.(result.tableData);
    }

    await databaseManager.saveMessage({
      session_id: request.sessionId,
      role: 'assistant',
      content: result.content,
      timestamp: new Date()
    });

    this.chatHistory.push({ role: 'assistant', content: result.content });

    return {
      response: result.content,
      context: { sessionId: request.sessionId },
      suggestions: ['Заполнить ещё', 'Очистить таблицу', 'Экспорт']
    };
  }

  async getMessages(sessionId: string, limit: number = 20) {
    return await databaseManager.getMessages(sessionId, limit);
  }

  async createNewSession(sessionId?: string): Promise<string> {
    const id = sessionId || `session_${Date.now()}`;
    this.chatHistory = [];
    return id;
  }

  async deleteSession(sessionId: string): Promise<void> {}

  getChatHistory() {
    return this.chatHistory;
  }

  clearHistory() {
    this.chatHistory = [];
  }
}

export const aiContextService = AIContextService.getInstance();
