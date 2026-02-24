/**
 * UserProfile Component - личный кабинет с загрузкой аватара
 * Поддерживаемые форматы: PNG, JPG, JPEG, GIF, WebP (макс. 5MB)
 */
export class UserProfileComponent {
  private isOpen = false;
  private container: HTMLElement | null = null;
  private userAvatar: HTMLElement | null = null;
  private currentAvatar: string | null = null;
  private fileInput: HTMLInputElement | null = null;

  constructor() {
    this.init();
  }

  init(): void {
    this.loadAvatar();
    this.createUserAvatar();
    this.createModal();
    this.bindEvents();
  }

  private loadAvatar(): void {
    const savedAvatar = localStorage.getItem('user-avatar');
    if (savedAvatar) {
      this.currentAvatar = savedAvatar;
    }
  }

  private saveAvatar(avatarData: string): void {
    try {
      this.currentAvatar = avatarData;
      localStorage.setItem('user-avatar', avatarData);
      console.log('[UserProfile] Avatar saved');
    } catch (e) {
      console.error('[UserProfile] Failed to save avatar:', e);
      alert('Не удалось сохранить аватар. Возможно, файл слишком большой.');
    }
  }

  private createUserAvatar(): void {
    this.userAvatar = document.querySelector('#userAvatar') as HTMLElement;
    if (this.userAvatar) {
      this.userAvatar.style.cursor = 'pointer';

      // Применяем сохранённый аватар если есть
      if (this.currentAvatar) {
        this.userAvatar.classList.add('has-image');
        this.userAvatar.style.setProperty('--avatar-image', `url(${this.currentAvatar})`);
      }

      this.userAvatar.addEventListener('click', () => {
        const dashboard = (window as any).dashboard;
        if (dashboard) {
          dashboard.open();
        }
      });
    }
  }

  private createModal(): void {
    if (document.getElementById('user-profile-modal')) return;

    this.container = document.createElement('div');
    this.container.id = 'user-profile-modal';

    const avatarInitial = this.currentAvatar ? '' : 'П';
    const hasAvatarClass = this.currentAvatar ? 'has-image' : '';

    this.container.innerHTML = `
      <div class="profile-overlay" id="profileOverlay"></div>
      <div class="profile-modal">
        <div class="profile-header">
          <h3>Личный кабинет</h3>
          <button class="close-btn" id="profileClose">×</button>
        </div>
        <div class="profile-content">
          <div class="avatar-section">
            <div class="avatar-large ${hasAvatarClass}" id="avatarLarge">${avatarInitial}</div>
            <input type="file" id="avatarInput" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp" style="display: none;">
            <button class="change-avatar-btn" id="changeAvatarBtn">
              ${this.currentAvatar ? 'Изменить фото' : 'Загрузить фото'}
            </button>
            ${this.currentAvatar ? `<button class="remove-avatar-btn" id="removeAvatar">Удалить фото</button>` : ''}
            <p class="avatar-hint">PNG, JPG, GIF, WebP (макс. 5MB)</p>
          </div>
          <div class="form-section">
            <div class="form-group">
              <label>Имя пользователя</label>
              <input type="text" id="userName" value="Пользователь">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="userEmail" value="user@example.com">
            </div>
            <div class="form-actions">
              <button class="save-btn" id="saveProfile">Сохранить</button>
              <button class="cancel-btn" id="cancelProfile">Отмена</button>
            </div>
          </div>
          <div class="support-section">
            <h4>Поддержка</h4>
            <div class="support-links">
              <a href="https://t.me/SmarTable_chat" target="_blank" rel="noopener noreferrer" class="support-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;">
                  <path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-8.609 3.33c-2.068.8-4.133 1.598-5.724 2.21a405.15 405.15 0 0 1-2.849 1.09c-.42.147-.99.332-1.473.901-.728.968.835 1.798 1.56 2.155.526.26 1.082.573 1.626.877.568.318 1.153.63 1.704.856.606.25 1.315.425 1.936.068.486-.28 1.015-.634 1.513-.968l5.853-3.93c.176-.118.404-.133.526.023.121.155.075.39-.068.535L9.52 16.44c-.356.355-.74.68-1.146.968-.406.288-.856.54-1.33.698-.474.158-.99.21-1.473.095-.483-.115-.93-.36-1.305-.695-.375-.335-.68-.75-.89-1.215-.21-.465-.315-.97-.315-1.48V9.625"/>
                  <path d="M21.198 2.433l-2.433 18.735c-.168 1.293-1.293 2.15-2.586 1.982a2.29 2.29 0 0 1-1.724-1.293l-2.15-5.165 4.3 4.3c.43.43 1.075.573 1.648.358.573-.215.932-.788.86-1.433l-.716-7.165c-.072-.645.287-1.218.86-1.433.573-.215 1.218-.072 1.648.358l4.3 4.3V2.433z"/>
                </svg>
                <span>Telegram-чат сообщества</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
  }

  private bindEvents(): void {
    // Сохраняем ссылку на input для последующего использования
    this.fileInput = document.getElementById('avatarInput') as HTMLInputElement;

    const overlay = document.getElementById('profileOverlay');
    const closeBtn = document.getElementById('profileClose');
    const saveBtn = document.getElementById('saveProfile');
    const cancelBtn = document.getElementById('cancelProfile');
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const removeAvatarBtn = document.getElementById('removeAvatar');

    overlay?.addEventListener('click', () => this.close());
    closeBtn?.addEventListener('click', () => this.close());
    cancelBtn?.addEventListener('click', () => this.close());
    saveBtn?.addEventListener('click', () => this.save());

    // Обработка кнопки смены аватара - используем mousedown для надёжности
    changeAvatarBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.fileInput) {
        this.fileInput.click();
      }
    });

    // Обработка выбора файла
    this.fileInput?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      console.log('[UserProfile] File selected:', file?.name, file?.type, file?.size);

      if (file) {
        this.loadImageFile(file);
      }

      // Сбрасываем value чтобы можно было выбрать тот же файл снова
      target.value = '';
    });

    // Обработка удаления аватара
    removeAvatarBtn?.addEventListener('click', () => {
      this.removeAvatar();
    });

    // Предотвращаем закрытие при клике на модальное окно
    const modal = this.container?.querySelector('.profile-modal');
    modal?.addEventListener('click', (e) => e.stopPropagation());
  }

  private loadImageFile(file: File): void {
    console.log('[UserProfile] Loading file:', file.name, file.type, file.size);

    // Проверка типа файла
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      alert('Неподдерживаемый формат файла.\n\nРазрешённые форматы:\n• PNG\n• JPG/JPEG\n• GIF\n• WebP');
      return;
    }

    // Проверка размера (макс 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`Файл слишком большой.\n\nМаксимальный размер: 5MB\nВаш файл: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result as string;
      console.log('[UserProfile] File loaded successfully');
      this.saveAvatar(result);
      this.updateAvatarUI(result);
      this.refreshAvatarButtons();
    };

    reader.onerror = () => {
      console.error('[UserProfile] File read error');
      alert('Ошибка загрузки файла. Попробуйте другой файл.');
    };

    reader.readAsDataURL(file);
  }

  private updateAvatarUI(avatarData: string): void {
    console.log('[UserProfile] Updating avatar UI');

    // Обновляем аватар в модальном окне
    const avatarLarge = document.getElementById('avatarLarge');
    if (avatarLarge) {
      avatarLarge.classList.add('has-image');
      avatarLarge.style.setProperty('--avatar-image', `url(${avatarData})`);
      avatarLarge.textContent = '';
    }

    // Обновляем аватар в шапке
    if (this.userAvatar) {
      this.userAvatar.classList.add('has-image');
      this.userAvatar.style.setProperty('--avatar-image', `url(${avatarData})`);
    }

    // Обновляем текст кнопки
    const changeBtn = document.getElementById('changeAvatarBtn');
    if (changeBtn) {
      changeBtn.textContent = 'Изменить фото';
    }
  }

  private removeAvatar(): void {
    console.log('[UserProfile] Removing avatar');

    this.currentAvatar = null;
    localStorage.removeItem('user-avatar');

    // Сбрасываем аватар в модальном окне
    const avatarLarge = document.getElementById('avatarLarge');
    if (avatarLarge) {
      avatarLarge.classList.remove('has-image');
      avatarLarge.style.removeProperty('--avatar-image');
      avatarLarge.textContent = 'П';
    }

    // Сбрасываем аватар в шапке
    if (this.userAvatar) {
      this.userAvatar.classList.remove('has-image');
      this.userAvatar.style.removeProperty('--avatar-image');
    }

    this.refreshAvatarButtons();
  }

  private refreshAvatarButtons(): void {
    const avatarSection = document.querySelector('.avatar-section');
    if (!avatarSection) return;

    let removeBtn = document.getElementById('removeAvatar');
    const changeBtn = document.getElementById('changeAvatarBtn') as HTMLButtonElement;

    if (changeBtn) {
      changeBtn.textContent = this.currentAvatar ? 'Изменить фото' : 'Загрузить фото';
    }

    if (this.currentAvatar && !removeBtn) {
      // Создаём кнопку удаления
      const newRemoveBtn = document.createElement('button');
      newRemoveBtn.id = 'removeAvatar';
      newRemoveBtn.className = 'remove-avatar-btn';
      newRemoveBtn.textContent = 'Удалить фото';
      newRemoveBtn.addEventListener('click', () => this.removeAvatar());

      if (changeBtn) {
        changeBtn.parentNode?.insertBefore(newRemoveBtn, changeBtn.nextSibling);
      }
    } else if (!this.currentAvatar && removeBtn) {
      removeBtn.remove();
    }
  }

  open(): void {
    if (this.isOpen || !this.container) return;

    this.isOpen = true;
    this.container.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Обновляем UI при открытии
    this.refreshAvatarButtons();
  }

  close(): void {
    if (!this.isOpen || !this.container) return;

    this.isOpen = false;
    this.container.style.display = 'none';
    document.body.style.overflow = '';
  }

  private save(): void {
    const nameInput = document.getElementById('userName') as HTMLInputElement;
    const emailInput = document.getElementById('userEmail') as HTMLInputElement;

    if (nameInput && emailInput) {
      const name = nameInput.value || 'Пользователь';
      console.log('Profile saved:', name, emailInput.value);
    }

    this.close();
  }

  destroy(): void {
    this.close();
    this.container?.remove();
    this.fileInput = null;
  }
}
