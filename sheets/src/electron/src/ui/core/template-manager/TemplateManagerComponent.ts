/**
 * TemplateManagerComponent - UI компонент менеджера шаблонов
 */

import TemplateManager from './TemplateManager.js';
import { Template } from './TemplateManager.js';

export class TemplateManagerComponent extends HTMLElement {
  private modal: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private currentPreviewTemplate: Template | null = null;
  private selectedCategory: string = 'all';

  constructor() {
    super();
  }

  async connectedCallback() {
    await this.loadTemplate();
    this.initElements();
    this.bindEvents();
    this.renderCategories();
    this.renderTemplates();
  }

  private async loadTemplate(): Promise<void> {
    const response = await fetch('ui/templates/template-manager.html');
    if (response.ok) {
      this.innerHTML = await response.text();
    }
  }

  private initElements(): void {
    this.modal = this.querySelector('#templateManagerModal');
    this.overlay = this.querySelector('#templateManagerOverlay');
  }

  private bindEvents(): void {
    // Закрытие
    this.querySelector('#btnCloseTemplateManager')?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', () => this.close());

    // Вкладки
    this.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e));
    });

    // Создание шаблона
    this.querySelector('#btnCreateTemplate')?.addEventListener('click', () => this.createTemplate());
    this.querySelector('#btnCancelCreate')?.addEventListener('click', () => this.switchToTab('browse'));

    // Импорт
    this.setupImport();

    // Экспорт
    this.querySelector('#btnExportTemplates')?.addEventListener('click', () => this.exportTemplates());
    this.querySelector('#btnExportAll')?.addEventListener('click', () => this.exportAll());

    // Предпросмотр
    this.querySelector('#btnClosePreview')?.addEventListener('click', () => this.closePreview());
    this.querySelector('#btnLoadTemplate')?.addEventListener('click', () => this.loadTemplatePreview());
    this.querySelector('#btnDeleteTemplate')?.addEventListener('click', () => this.deleteTemplatePreview());
    this.querySelector('#btnCancelPreview')?.addEventListener('click', () => this.closePreview());

    // Загрузка
    this.querySelector('#btnConfirmLoad')?.addEventListener('click', () => this.confirmLoad());
    this.querySelector('#btnCancelLoad')?.addEventListener('click', () => this.closeLoadOptions());

    // Поиск и сортировка
    this.querySelector('#templateSearch')?.addEventListener('input', () => this.renderTemplates());
    this.querySelector('#templateSort')?.addEventListener('change', () => this.renderTemplates());
  }

  private switchTab(e: Event): void {
    const target = e.target as HTMLElement;
    const tabName = target.dataset.tab;

    // Переключение кнопок
    this.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    target.classList.add('active');

    // Переключение контента
    this.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const content = this.querySelector(`#tab-${tabName}`);
    if (content) {
      content.classList.add('active');
    }

    // Обновление контента вкладок
    if (tabName === 'browse') {
      this.renderCategories();
      this.renderTemplates();
    } else if (tabName === 'export') {
      this.renderExportList();
    }
  }

  private switchToTab(tabName: string): void {
    const btn = this.querySelector(`.tab-btn[data-tab="${tabName}"]`) as HTMLElement;
    if (btn) {
      btn.click();
    }
  }

  // ==========================================
  // === КАТЕГОРИИ ===
  // ==========================================

  private renderCategories(): void {
    const container = this.querySelector('#templateCategoryList');
    if (!container) return;

    const categories = TemplateManager.getCategories();
    const templates = TemplateManager.getAllTemplates();

    container.innerHTML = `
      <div class="category-item ${this.selectedCategory === 'all' ? 'active' : ''}" data-category="all">
        <span class="category-icon">📂</span>
        <span class="category-name">Все шаблоны</span>
        <span class="category-count">${templates.length}</span>
      </div>
    `;

    categories.forEach((cat) => {
      const count = cat.templates.length;
      const div = document.createElement('div');
      div.className = `category-item ${this.selectedCategory === cat.id ? 'active' : ''}`;
      div.dataset.category = cat.id;
      div.innerHTML = `
        <span class="category-icon">${cat.icon}</span>
        <span class="category-name">${cat.name}</span>
        <span class="category-count">${count}</span>
      `;
      div.addEventListener('click', () => {
        this.selectedCategory = cat.id;
        this.renderCategories();
        this.renderTemplates();
      });
      container.appendChild(div);
    });
  }

  // ==========================================
  // === ШАБЛОНЫ ===
  // ==========================================

  private renderTemplates(): void {
    const container = this.querySelector('#templateGrid');
    if (!container) return;

    let templates = TemplateManager.getAllTemplates();

    // Фильтр по категории
    if (this.selectedCategory !== 'all') {
      templates = templates.filter(t => t.category === this.selectedCategory);
    }

    // Поиск
    const search = (this.querySelector('#templateSearch') as HTMLInputElement)?.value.toLowerCase();
    if (search) {
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(search) || 
        t.description.toLowerCase().includes(search)
      );
    }

    // Сортировка
    const sortBy = (this.querySelector('#templateSort') as HTMLSelectElement)?.value || 'name';
    templates.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'date') return b.createdAt - a.createdAt;
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      return 0;
    });

    // Обновление счётчика
    const countEl = this.querySelector('#templatesCount');
    if (countEl) {
      countEl.textContent = `${templates.length} шаблон${this.pluralize(templates.length, 'а', 'ов')}`;
    }

    if (templates.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-text">Нет шаблонов</div>
          <button class="btn-primary" onclick="document.querySelector('[data-tab=create]').click()">
            Создать первый шаблон
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    templates.forEach((template) => {
      const card = this.createTemplateCard(template);
      container.appendChild(card);
    });
  }

  private createTemplateCard(template: Template): HTMLElement {
    const card = document.createElement('div');
    card.className = 'template-card';

    const category = TemplateManager.getCategories().find((c) => c.id === template.category);
    const date = new Date(template.createdAt).toLocaleDateString('ru-RU');
    const cellsCount = template.sheetsData?.reduce((sum, sheet) => sum + (sheet.cells?.size || 0), 0) || 0;

    card.innerHTML = `
      <div class="template-card-actions">
        <button class="template-card-action" data-action="share" title="Поделиться">📤</button>
        <button class="template-card-action" data-action="export">💾</button>
        <button class="template-card-action" data-action="delete">🗑️</button>
      </div>
      <div class="template-card-header">
        <div class="template-card-icon">${category?.icon || '📄'}</div>
        <div class="template-card-info">
          <h4 class="template-card-title">${template.name}</h4>
          <div class="template-card-category">${category?.name || template.category}</div>
        </div>
      </div>
      <div class="template-card-description">${template.description || 'Без описания'}</div>
      <div class="template-card-footer">
        <span>📅 ${date}</span>
        <span>📊 ${cellsCount} яч.</span>
      </div>
    `;

    card.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.closest('button')?.dataset.action || target.dataset.action;
      
      if (action === 'share') {
        TemplateManager.shareTemplate(template.id).then(url => {
          if (url) {
            alert('Ссылка на шаблон скопирована в буфер обмена!');
          } else {
            alert('Не удалось создать ссылку');
          }
        });
      } else if (action === 'export') {
        TemplateManager.exportTemplate(template.id, 'json');
      } else if (action === 'delete') {
        if (confirm(`Удалить шаблон "${template.name}"?`)) {
          TemplateManager.deleteTemplate(template.id);
          this.renderTemplates();
          this.renderCategories();
        }
      } else if (!action) {
        this.showPreview(template);
      }
    });

    return card;
  }

  // ==========================================
  // === ПРЕДПРОСМОТР ===
  // ==========================================

  private showPreview(template: Template): void {
    this.currentPreviewTemplate = template;
    
    const previewModal = this.querySelector('#templatePreviewModal') as HTMLElement;
    if (!previewModal) return;

    (previewModal.querySelector('#previewTemplateName') as HTMLElement).textContent = template.name;
    (previewModal.querySelector('#previewDescription') as HTMLElement).textContent = template.description || '—';
    
    const category = TemplateManager.getCategories().find(c => c.id === template.category);
    (previewModal.querySelector('#previewCategory') as HTMLElement).textContent = category?.name || template.category;
    
    (previewModal.querySelector('#previewCreated') as HTMLElement).textContent = 
      new Date(template.createdAt).toLocaleString('ru-RU');
    
    (previewModal.querySelector('#previewSheets') as HTMLElement).textContent = 
      (template.sheetsData?.length || 0).toString();
    
    const cellsCount = template.sheetsData?.reduce((sum, sheet) => sum + (sheet.cells?.size || 0), 0) || 0;
    (previewModal.querySelector('#previewCells') as HTMLElement).textContent = cellsCount.toString();
    
    (previewModal.querySelector('#previewLogic') as HTMLElement).textContent = 
      template.logic?.enabled ? '✅ Есть' : '❌ Нет';

    previewModal.classList.add('active');
  }

  private closePreview(): void {
    const previewModal = this.querySelector('#templatePreviewModal') as HTMLElement;
    previewModal?.classList.remove('active');
    this.currentPreviewTemplate = null;
  }

  private loadTemplatePreview(): void {
    if (!this.currentPreviewTemplate) return;
    
    this.closePreview();
    const loadOptions = this.querySelector('#templateLoadOptions') as HTMLElement;
    loadOptions?.classList.add('active');
  }

  private confirmLoad(): Promise<void> {
    const mergeData = (this.querySelector('#loadMergeData') as HTMLInputElement)?.checked || false;
    const applyStyles = (this.querySelector('#loadApplyStyles') as HTMLInputElement)?.checked || true;
    const runLogic = (this.querySelector('#loadRunLogic') as HTMLInputElement)?.checked || true;

    this.closeLoadOptions();

    return new Promise((resolve) => {
      TemplateManager.loadTemplate(this.currentPreviewTemplate!.id, {
        mergeWithCurrent: mergeData,
        applyStyles,
        runLogic
      }).then(success => {
        if (success) {
          this.close();
          // Событие загрузки шаблона
          window.dispatchEvent(new CustomEvent('template-loaded', { detail: this.currentPreviewTemplate }));
        }
        resolve();
      });
    });
  }

  private closeLoadOptions(): void {
    const loadOptions = this.querySelector('#templateLoadOptions') as HTMLElement;
    loadOptions?.classList.remove('active');
  }

  private deleteTemplatePreview(): void {
    if (!this.currentPreviewTemplate) return;
    
    if (confirm(`Удалить шаблон "${this.currentPreviewTemplate.name}"?`)) {
      TemplateManager.deleteTemplate(this.currentPreviewTemplate.id);
      this.closePreview();
      this.renderTemplates();
      this.renderCategories();
    }
  }

  // ==========================================
  // === СОЗДАНИЕ ===
  // ==========================================

  private createTemplate(): void {
    const name = (this.querySelector('#templateName') as HTMLInputElement)?.value.trim();
    const description = (this.querySelector('#templateDescription') as HTMLTextAreaElement)?.value.trim();
    const category = (this.querySelector('#templateCategory') as HTMLSelectElement)?.value;
    const includeData = (this.querySelector('#includeData') as HTMLInputElement)?.checked || false;
    const includeLogic = (this.querySelector('#includeLogic') as HTMLInputElement)?.checked || false;
    const includeStyles = (this.querySelector('#includeStyles') as HTMLInputElement)?.checked || true;
    const logicCode = (this.querySelector('#templateLogicCode') as HTMLTextAreaElement)?.value.trim();

    if (!name || !category) {
      alert('Заполните название и категорию');
      return;
    }

    // Сохраняем логику в window для захвата
    if (logicCode) {
      (window as any).getTemplateLogic = () => logicCode;
    }

    const template = TemplateManager.createTemplate({
      name,
      description,
      category,
      includeData,
      includeLogic,
      includeStyles
    });

    // Очистка формы
    this.querySelector('#templateName')?.setAttribute('value', '');
    this.querySelector('#templateDescription')?.setAttribute('value', '');
    this.querySelector('#templateLogicCode')?.setAttribute('value', '');

    this.switchToTab('browse');
    this.renderTemplates();
    
    alert(`Шаблон "${name}" создан!`);
  }

  // ==========================================
  // === ИМПОРТ ===
  // ==========================================

  private setupImport(): void {
    const importArea = this.querySelector('#importArea');
    const fileInput = this.querySelector('#templateFileInput') as HTMLInputElement;
    const btnSelectFiles = this.querySelector('#btnSelectFiles');

    btnSelectFiles?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        this.handleImportFiles(Array.from(files));
      }
    });

    // Drag & Drop
    importArea?.addEventListener('dragover', (e) => {
      e.preventDefault();
      importArea.classList.add('dragover');
    });

    importArea?.addEventListener('dragleave', () => {
      importArea.classList.remove('dragover');
    });

    importArea?.addEventListener('drop', (e: Event) => {
      e.preventDefault();
      importArea.classList.remove('dragover');
      const dragEvent = e as DragEvent;
      const files = Array.from(dragEvent.dataTransfer?.files ?? []) as File[];
      this.handleImportFiles(files);
    });
  }

  private async handleImportFiles(files: File[]): Promise<void> {
    const importedList = this.querySelector('#importedList');
    if (!importedList) return;

    for (const file of files) {
      if (!file.name.endsWith('.json') && !file.name.endsWith('.js')) {
        continue;
      }

      const template = await TemplateManager.importTemplate(file);
      
      if (template) {
        const div = document.createElement('div');
        div.className = 'imported-item';
        div.innerHTML = `
          <span class="imported-item-icon">📄</span>
          <div class="imported-item-info">
            <div class="imported-item-name">${template.name}</div>
            <div class="imported-item-size">${(file.size / 1024).toFixed(1)} KB</div>
          </div>
        `;
        importedList.appendChild(div);
      }
    }

    this.renderTemplates();
  }

  // ==========================================
  // === ЭКСПОРТ ===
  // ==========================================

  private renderExportList(): void {
    const container = this.querySelector('#templateExportList');
    if (!container) return;

    const templates = TemplateManager.getAllTemplates();

    if (templates.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>Нет шаблонов для экспорта</p></div>';
      return;
    }

    container.innerHTML = '';
    templates.forEach(template => {
      const label = document.createElement('label');
      label.className = 'export-item-checkbox';
      label.innerHTML = `
        <input type="checkbox" value="${template.id}" />
        <span>${template.name}</span>
      `;
      container.appendChild(label);
    });
  }

  private exportTemplates(): void {
    const format = (this.querySelector('#exportFormat') as HTMLSelectElement)?.value as 'json' | 'js' || 'json';
    const exportAll = (this.querySelector('#exportAllCheckbox') as HTMLInputElement)?.checked;

    if (exportAll) {
      this.exportAll();
      return;
    }

    const checkboxes = this.querySelectorAll('#templateExportList input[type="checkbox"]:checked');
    checkboxes.forEach(cb => {
      TemplateManager.exportTemplate(cb.getAttribute('value')!, format);
    });
  }

  private exportAll(): void {
    const format = (this.querySelector('#exportFormat') as HTMLSelectElement)?.value as 'json' | 'js' || 'json';
    TemplateManager.exportAllTemplates();
  }

  // ==========================================
  // === ПУБЛИЧНЫЕ МЕТОДЫ ===
  // ==========================================

  open(): void {
    this.modal?.classList.add('active');
    this.renderCategories();
    this.renderTemplates();
  }

  close(): void {
    this.modal?.classList.remove('active');
  }

  // ==========================================
  // === УТИЛИТЫ ===
  // ==========================================

  private pluralize(count: number, one: string, many: string): string {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
      return many;
    }
    
    if (lastDigit === 1) {
      return one;
    }
    
    return many;
  }
}

customElements.define('template-manager-component', TemplateManagerComponent);
