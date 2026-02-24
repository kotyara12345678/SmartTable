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
      // Добавляем анимацию загрузки
      const aiPanel = document.querySelector('.ai-panel');
      aiPanel?.classList.add('loading');

      // Отправляем запрос AI
      const request: AIRequest = {
        message,
        sessionId: this.currentSession
      };

      const response: AIResponse = await aiContextService.sendMessage(request);

      // Убираем анимацию загрузки
      aiPanel?.classList.remove('loading');

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
      
      // Убираем анимацию загрузки
      const aiPanel = document.querySelector('.ai-panel');
      aiPanel?.classList.remove('loading');

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
    
    // Для отладки - выводим исходное сообщение
    console.log('[AI Chat] Raw content:', message.content);
    
    // Преобразуем markdown в HTML (простая версия)
    const html = this.markdownToHTML(message.content);
    console.log('[AI Chat] Processed HTML:', html);
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
    console.log('[AI Chat] Raw message:', text);

    // Сохраняем блоки кода в массиве
    const codeBlocks: string[] = [];
    let html = text;

    // Заменяем блоки кода на плейсхолдеры
    html = html.replace(/```(\w*)\s*\n?([\s\S]*?)\s*```/g, (match, lang, code) => {
      console.log('[AI Chat] Found code block:', lang);
      const language = lang || 'text';
      const highlighted = this.highlightSyntax(code.trim(), language);
      const placeholder = `%%CODEBLOCK_${codeBlocks.length}%%`;
      codeBlocks.push(`<pre data-language="${language}"><code class="language-${language}">${highlighted}</code></pre>`);
      return placeholder;
    });

    // Заменяем inline код на плейсхолдеры
    const inlineCodes: string[] = [];
    html = html.replace(/`([^`]+)`/g, (match, code) => {
      const placeholder = `%%INLINECODE_${inlineCodes.length}%%`;
      inlineCodes.push(`<code>${code}</code>`);
      return placeholder;
    });

    // Теперь заменяем переносы строк
    html = html.replace(/\n/g, '<br>');

    // Жирный текст
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Курсив
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Списки
    html = html.replace(/^\d+\.\s/gm, '<span class="list-number">$&</span>');
    html = html.replace(/^-\s/gm, '<span class="list-bullet">• </span>');

    // Восстанавливаем блоки кода (убираем <br> вокруг)
    codeBlocks.forEach((block, index) => {
      html = html.replace(`<p>%%CODEBLOCK_${index}%%</p>`, block);
      html = html.replace(`%%CODEBLOCK_${index}%%`, block);
      // Удаляем лишние <br> вокруг блока
      html = html.replace(`<br>${block}`, block);
      html = html.replace(`${block}<br>`, block);
    });

    // Восстанавливаем inline код
    inlineCodes.forEach((code, index) => {
      html = html.replace(`%%INLINECODE_${index}%%`, code);
    });

    console.log('[AI Chat] HTML output:', html);
    return html;
  }

  private highlightSyntax(code: string, language: string): string {
    console.log('[AI Chat] Highlighting:', language, code);
    
    // Простая подсветка синтаксиса
    let highlighted = code
      // HTML entities
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    if (language === 'javascript' || language === 'js' || language === 'typescript' || language === 'ts') {
      highlighted = highlighted
        // Ключевые слова
        .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|typeof|instanceof)\b/g, '<span class="token keyword">$1</span>')
        // Строки
        .replace(/(['"`])(.*?)\1/g, '<span class="token string">$1$2$1</span>')
        // Числа
        .replace(/\b\d+(\.\d+)?\b/g, '<span class="token number">$&</span>')
        // Комментарии
        .replace(/(\/\/.*$)/gm, '<span class="token comment">$1</span>')
        // Функции
        .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\()/g, '<span class="token function">$1</span>');
    } else if (language === 'python') {
      highlighted = highlighted
        // Комментарии
        .replace(/(#.*$)/gm, '<span class="token comment">$1</span>')
        // Строки - более точное сопоставление
        .replace(/("[^"]*")/g, '<span class="token string">$1</span>')
        .replace(/('[^']*')/g, '<span class="token string">$1</span>')
        // Числа
        .replace(/\b(\d+\.?\d*)\b/g, '<span class="token number">$1</span>')
        // Ключевые слова Python
        .replace(/\b(def|class|import|from|return|if|elif|else|for|while|try|except|with|as|in|not|and|or|lambda|yield|global|nonlocal|pass|break|continue|True|False|None|is|raise|assert|finally|async|await)\b/g, '<span class="token keyword">$1</span>')
        // Функции
        .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span class="token function">$1</span>');
    } else if (language === 'html') {
      highlighted = highlighted
        // Теги
        .replace(/(&lt;\/?)(\w+)(.*?)(&gt;)/g, '$1<span class="token keyword">$2</span>$3$4')
        // Атрибуты
        .replace(/\s(\w+)=/g, ' <span class="token operator">$1</span>=');
    } else if (language === 'css') {
      highlighted = highlighted
        // Селекторы
        .replace(/^([.#]?[\w-]+)(?=\s*\{)/gm, '<span class="token selector">$1</span>')
        // Свойства
        .replace(/([\w-]+)(?=:)/g, '<span class="token property">$1</span>')
        // Значения
        .replace(/:\s*([^;]+);/g, ': <span class="token value">$1</span>;');
    } else if (language === 'go' || language === 'golang') {
      highlighted = highlighted
        // Ключевые слова Go
        .replace(/\b(func|package|import|return|if|else|for|range|break|continue|switch|case|default|fallthrough|select|go|defer|chan|map|struct|interface|type|const|var|true|false|nil|string|int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|float32|float64|byte|rune|error|make|new|close|len|cap|append|copy|delete|print|println|panic|recover)\b/g, '<span class="token keyword">$1</span>')
        // Строки
        .replace(/(["`])(.*?)\1/g, '<span class="token string">$1$2$1</span>')
        // Числа
        .replace(/\b\d+(\.\d+)?\b/g, '<span class="token number">$&</span>')
        // Комментарии
        .replace(/(\/\/.*$)/gm, '<span class="token comment">$1</span>')
        // Функции
        .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\()/g, '<span class="token function">$1</span>');
    } else if (language === 'java') {
      highlighted = highlighted
        // Ключевые слова Java
        .replace(/\b(public|private|protected|static|final|void|int|long|double|float|boolean|char|byte|short|class|interface|extends|implements|new|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|throws|import|package|this|super|null|true|false)\b/g, '<span class="token keyword">$1</span>')
        // Строки
        .replace(/(")(.*?)\1/g, '<span class="token string">$1$2$1</span>')
        // Числа
        .replace(/\b\d+(\.\d+)?\b/g, '<span class="token number">$&</span>')
        // Комментарии
        .replace(/(\/\/.*$)/gm, '<span class="token comment">$1</span>')
        // Аннотации
        .replace(/(@\w+)/g, '<span class="token operator">$1</span>');
    } else if (language === 'cpp' || language === 'c++' || language === 'c') {
      highlighted = highlighted
        // Ключевые слова C/C++
        .replace(/\b(int|float|double|char|void|bool|auto|const|static|extern|register|volatile|signed|unsigned|short|long|if|else|for|while|do|switch|case|break|continue|return|goto|default|sizeof|typedef|struct|union|enum|class|public|private|protected|virtual|inline|explicit|friend|namespace|using|template|typename|try|catch|throw|new|delete|this|true|false|nullptr)\b/g, '<span class="token keyword">$1</span>')
        // Строки
        .replace(/(")(.*?)\1/g, '<span class="token string">$1$2$1</span>')
        // Числа
        .replace(/\b\d+(\.\d+)?\b/g, '<span class="token number">$&</span>')
        // Комментарии
        .replace(/(\/\/.*$)/gm, '<span class="token comment">$1</span>');
    }
    
    return highlighted;
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
