/**
 * AI Chat Component - улучшенный чат с контекстом
 */

import { aiContextService, AIRequest, AIResponse } from '../core/ai/ai-context-service.js';
import { timeTracker } from '../core/time-tracker.js';

export class AIChatComponent {
  private isOpen = false;
  private container: HTMLElement | null = null;
  private currentSession: string = 'default';
  private messages: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private sendButton: HTMLButtonElement | null = null;

  constructor() {
    this.init();
  }

  async init(): Promise<void> {
    this.createChat();
    this.bindEvents();
    await this.loadChatHistory();
  }

  private createChat(): void {
    if (document.getElementById('ai-chat-container')) return;

    this.container = document.createElement('div');
    this.container.id = 'ai-chat-container';
    this.container.innerHTML = `
      <div class="ai-chat-overlay" id="aiChatOverlay"></div>
      <div class="ai-chat-wrapper">
        <div class="ai-chat-header">
          <div class="ai-chat-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>AI Ассистент</span>
          </div>
          <div class="ai-chat-controls">
            <button class="ai-chat-btn" id="newChatBtn" title="Новый чат">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <button class="ai-chat-btn" id="clearChatBtn" title="Очистить чат">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
              </svg>
            </button>
            <button class="ai-chat-btn close-btn" id="aiChatClose" title="Закрыть">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="ai-chat-messages" id="aiChatMessages">
          <div class="ai-message system">
            <div class="message-content">
              <p>👋 Здравствуйте! Я ваш AI-ассистент для SmartTable. Я запоминаю наш разговор и могу помочь с:</p>
              <ul>
                <li>📊 Созданием формул и вычислений</li>
                <li>📈 Построением диаграмм и графиков</li>
                <li>🔍 Анализом данных</li>
                <li>🎨 Форматированием таблиц</li>
              </ul>
              <p>Чем могу помочь сегодня?</p>
            </div>
          </div>
        </div>
        
        <div class="ai-chat-input-container">
          <div class="ai-chat-input-wrapper">
            <input type="text" id="aiChatInput" placeholder="Введите сообщение..." autocomplete="off">
            <button class="ai-send-btn" id="aiSendBtn" disabled>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22,2 15,22 11,13 2,9 22,2"/>
              </svg>
            </button>
          </div>
          <div class="ai-chat-suggestions" id="aiChatSuggestions">
            <span class="suggestion-text">Попробуйте спросить:</span>
            <div class="suggestion-chips" id="suggestionChips"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
  }

  private bindEvents(): void {
    // Закрытие чата
    const overlay = document.getElementById('aiChatOverlay');
    const closeBtn = document.getElementById('aiChatClose');
    
    overlay?.addEventListener('click', () => this.close());
    closeBtn?.addEventListener('click', () => this.close());

    // Новый чат
    const newChatBtn = document.getElementById('newChatBtn');
    newChatBtn?.addEventListener('click', () => this.createNewChat());

    // Очистка чата
    const clearChatBtn = document.getElementById('clearChatBtn');
    clearChatBtn?.addEventListener('click', () => this.clearChat());

    // Отправка сообщения
    this.input = document.getElementById('aiChatInput') as HTMLInputElement;
    this.sendButton = document.getElementById('aiSendBtn') as HTMLButtonElement;
    this.messages = document.getElementById('aiChatMessages');

    // Включение/выключение кнопки отправки
    this.input?.addEventListener('input', () => {
      if (this.sendButton) {
        this.sendButton.disabled = !this.input?.value.trim();
      }
    });

    // Отправка по Enter
    this.input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Отправка по клику на кнопку
    this.sendButton?.addEventListener('click', () => this.sendMessage());

    // Предотвращение закрытия при клике на чат
    const wrapper = this.container?.querySelector('.ai-chat-wrapper');
    wrapper?.addEventListener('click', (e) => e.stopPropagation());
  }

  private async loadChatHistory(): Promise<void> {
    try {
      const history = await aiContextService.getMessages(this.currentSession);
      
      // Очищаем приветственное сообщение если есть история
      if (history.length > 0) {
        const welcomeMessage = this.messages?.querySelector('.system');
        welcomeMessage?.remove();
      }

      // Отображаем историю сообщений
      for (const message of history) {
        if (message.role !== 'system') {
          this.displayMessage(message);
        }
      }

      // Прокручиваем к последнему сообщению
      this.scrollToBottom();
    } catch (error) {
      console.error('[AI Chat] Failed to load chat history:', error);
    }
  }

  private async sendMessage(): Promise<void> {
    if (!this.input?.value.trim() || !this.sendButton) return;

    const message = this.input.value.trim();
    this.input.value = '';
    this.sendButton.disabled = true;

    // Отображаем сообщение пользователя
    this.displayMessage({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    try {
      // Отправляем запрос AI
      const request: AIRequest = {
        message,
        sessionId: this.currentSession
      };

      const response: AIResponse = await aiContextService.sendMessage(request);

      // Отображаем ответ AI
      this.displayMessage({
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      });

      // Отображаем предложения
      if (response.suggestions && response.suggestions.length > 0) {
        this.displaySuggestions(response.suggestions);
      }

      this.scrollToBottom();
    } catch (error) {
      console.error('[AI Chat] Failed to send message:', error);
      
      // Отображаем сообщение об ошибке
      this.displayMessage({
        role: 'assistant',
        content: 'Извините, произошла ошибка. Попробуйте еще раз.',
        timestamp: new Date()
      });
    }

    this.input.focus();
  }

  private displayMessage(message: any): void {
    if (!this.messages) return;

    const messageEl = document.createElement('div');
    messageEl.className = `ai-message ${message.role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    
    if (message.role === 'user') {
      avatar.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      `;
    } else {
      avatar.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      `;
    }

    const content = document.createElement('div');
    content.className = 'message-content';
    
    // Преобразуем markdown в HTML (простая версия)
    const html = this.markdownToHTML(message.content);
    content.innerHTML = html;

    const timestamp = document.createElement('div');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = this.formatTime(message.timestamp);

    messageEl.appendChild(avatar);
    messageEl.appendChild(content);
    messageEl.appendChild(timestamp);

    this.messages.appendChild(messageEl);
  }

  private displaySuggestions(suggestions: string[]): void {
    const suggestionsContainer = document.getElementById('suggestionChips');
    if (!suggestionsContainer) return;

    suggestionsContainer.innerHTML = '';
    
    suggestions.forEach(suggestion => {
      const chip = document.createElement('button');
      chip.className = 'suggestion-chip';
      chip.textContent = suggestion;
      chip.addEventListener('click', () => {
        if (this.input) {
          this.input.value = suggestion;
          this.sendButton && (this.sendButton.disabled = false);
          this.input.focus();
        }
      });
      suggestionsContainer.appendChild(chip);
    });
  }

  private markdownToHTML(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>')
      .replace(/^\d+\.\s/gm, (match) => `<span class="list-number">${match}</span>`)
      .replace(/^-\s/gm, '<span class="list-bullet">• </span>');
  }

  private formatTime(date: Date): string {
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  private scrollToBottom(): void {
    if (this.messages) {
      this.messages.scrollTop = this.messages.scrollHeight;
    }
  }

  private async createNewChat(): Promise<void> {
    try {
      this.currentSession = await aiContextService.createNewSession();
      
      // Очищаем сообщения
      if (this.messages) {
        this.messages.innerHTML = `
          <div class="ai-message system">
            <div class="message-content">
              <p>👋 Новый чат создан! Чем могу помочь?</p>
            </div>
          </div>
        `;
      }

      // Очищаем предложения
      const suggestionsContainer = document.getElementById('suggestionChips');
      if (suggestionsContainer) {
        suggestionsContainer.innerHTML = '';
      }

      this.input?.focus();
    } catch (error) {
      console.error('[AI Chat] Failed to create new chat:', error);
    }
  }

  private async clearChat(): Promise<void> {
    try {
      await aiContextService.deleteSession(this.currentSession);
      await this.createNewChat();
    } catch (error) {
      console.error('[AI Chat] Failed to clear chat:', error);
    }
  }

  open(): void {
    if (this.isOpen || !this.container) return;
    
    this.isOpen = true;
    this.container.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Начинаем отслеживание времени в AI чате
    timeTracker.startSession('ai_chat');
    
    // Фокус на поле ввода
    setTimeout(() => this.input?.focus(), 100);
  }

  close(): void {
    if (!this.isOpen || !this.container) return;
    
    this.isOpen = false;
    this.container.style.display = 'none';
    document.body.style.overflow = '';
    
    // Завершаем сессию AI чата
    timeTracker.endCurrentSession();
    
    // Начинаем отслеживание времени в таблицах
    timeTracker.startSession('spreadsheet');
  }

  destroy(): void {
    this.close();
    this.container?.remove();
  }
}
