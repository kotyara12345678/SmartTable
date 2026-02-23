/**
 * Start Screen Component - начальный экран создания проекта
 */

export class StartScreenComponent {
  private container: HTMLElement | null = null;
  private onProjectCreate: ((name: string) => void) | null = null;

  constructor() {
    this.container = document.getElementById('start-screen-container');
  }

  async init(onCreate: (name: string) => void): Promise<void> {
    this.onProjectCreate = onCreate;
    this.render();
    this.bindEvents();
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="start-screen-overlay"></div>
      <div class="start-screen">
        <div class="start-screen-header">
          <div class="app-logo">
            <img src="SmartTable.png" alt="SmartTable" style="width:48px;height:48px;object-fit:contain;">
          </div>
          <h1 class="app-title">SmartTable</h1>
          <p class="app-subtitle">Умная таблица с ИИ помощником</p>
        </div>

        <div class="start-screen-body">
          <div class="new-project-section">
            <h2 class="section-title">Новый проект</h2>
            <div class="project-name-input-wrapper">
              <label class="input-label" for="projectName">Название проекта</label>
              <input 
                type="text" 
                id="projectName" 
                class="project-name-input" 
                placeholder="Например: Финансовый отчёт 2026"
                maxlength="50"
              >
            </div>
            <button class="btn-create-project" id="btnCreateProject">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Создать проект
            </button>
          </div>

          <div class="recent-projects-section">
            <h2 class="section-title">Недавние проекты</h2>
            <div class="recent-projects-list" id="recentProjectsList">
              <div class="no-recent-projects">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <span>Нет недавних проектов</span>
              </div>
            </div>
          </div>
        </div>

        <div class="start-screen-footer">
          <p class="copyright">© 2026 SmartTable. Pavel x Sava</p>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    // Создание нового проекта
    const btnCreate = document.getElementById('btnCreateProject');
    const projectNameInput = document.getElementById('projectName') as HTMLInputElement;

    btnCreate?.addEventListener('click', () => {
      const name = projectNameInput?.value?.trim() || 'Без названия';
      this.createProject(name);
    });

    projectNameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const name = projectNameInput.value.trim() || 'Без названия';
        this.createProject(name);
      }
    });

    // Загрузка недавних проектов
    this.loadRecentProjects();
  }

  private createProject(name: string): void {
    // Сохраняем в localStorage
    localStorage.setItem('smarttable-current-project', name);
    
    // Добавляем в недавние
    this.addRecentProject(name);

    // Вызываем callback
    if (this.onProjectCreate) {
      this.onProjectCreate(name);
    }

    // Скрываем начальный экран
    this.hide();
  }

  private addRecentProject(name: string): void {
    const recent = this.getRecentProjects();
    
    // Удаляем если уже есть
    const filtered = recent.filter(p => p.name !== name && p.name !== 'Без названия');
    
    // Добавляем новый в начало
    filtered.unshift({
      name,
      date: new Date().toISOString()
    });

    // Сохраняем максимум 10
    localStorage.setItem('smarttable-recent-projects', JSON.stringify(filtered.slice(0, 10)));
  }

  private getRecentProjects(): Array<{ name: string; date: string }> {
    try {
      const data = localStorage.getItem('smarttable-recent-projects');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private loadRecentProjects(): void {
    const list = document.getElementById('recentProjectsList');
    if (!list) return;

    const recent = this.getRecentProjects();

    if (recent.length === 0) {
      list.innerHTML = `
        <div class="no-recent-projects">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span>Нет недавних проектов</span>
        </div>
      `;
      return;
    }

    list.innerHTML = recent.map(project => `
      <div class="recent-project-item" data-name="${this.escapeHtml(project.name)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <div class="recent-project-info">
          <span class="recent-project-name">${this.escapeHtml(project.name)}</span>
          <span class="recent-project-date">${this.formatDate(project.date)}</span>
        </div>
      </div>
    `).join('');

    // Обработчики кликов
    list.querySelectorAll('.recent-project-item').forEach(item => {
      item.addEventListener('click', () => {
        const name = (item as HTMLElement).dataset.name || 'Без названия';
        this.createProject(name);
      });
    });
  }

  private formatDate(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Вчера';
    if (days < 7) return `${days} дн. назад`;
    
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  show(): void {
    if (this.container) {
      this.container.style.display = 'flex';
    }
  }

  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  isVisible(): boolean {
    return this.container?.style.display !== 'none';
  }
}
