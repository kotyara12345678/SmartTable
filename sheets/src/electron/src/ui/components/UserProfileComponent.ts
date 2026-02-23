/**
 * UserProfile Component - простой личный кабинет
 */
export class UserProfileComponent {
  private isOpen = false;
  private container: HTMLElement | null = null;
  private userAvatar: HTMLElement | null = null;

  constructor() {
    this.init();
  }

  init(): void {
    this.createUserAvatar();
    this.createModal();
    this.bindEvents();
  }

  private createUserAvatar(): void {
    this.userAvatar = document.querySelector('#userAvatar');
    if (this.userAvatar) {
      this.userAvatar.style.cursor = 'pointer';
      this.userAvatar.addEventListener('click', () => {
        // Открываем Dashboard вместо простого модального окна
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
    this.container.innerHTML = `
      <div class="profile-overlay" id="profileOverlay"></div>
      <div class="profile-modal">
        <div class="profile-header">
          <h3>Личный кабинет</h3>
          <button class="close-btn" id="profileClose">×</button>
        </div>
        <div class="profile-content">
          <div class="avatar-section">
            <div class="avatar-large" id="avatarLarge">П</div>
            <button class="change-avatar-btn">Изменить фото</button>
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
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
  }

  private bindEvents(): void {
    const overlay = document.getElementById('profileOverlay');
    const closeBtn = document.getElementById('profileClose');
    const saveBtn = document.getElementById('saveProfile');
    const cancelBtn = document.getElementById('cancelProfile');

    overlay?.addEventListener('click', () => this.close());
    closeBtn?.addEventListener('click', () => this.close());
    cancelBtn?.addEventListener('click', () => this.close());
    saveBtn?.addEventListener('click', () => this.save());

    // Предотвращаем закрытие при клике на модальное окно
    const modal = this.container?.querySelector('.profile-modal');
    modal?.addEventListener('click', (e) => e.stopPropagation());
  }

  open(): void {
    if (this.isOpen || !this.container) return;
    
    this.isOpen = true;
    this.container.style.display = 'block';
    document.body.style.overflow = 'hidden';
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
      
      // Обновляем аватар в шапке
      if (this.userAvatar) {
        this.userAvatar.textContent = name.charAt(0).toUpperCase();
      }
      
      // Обновляем аватар в модальном окне
      const avatarLarge = document.getElementById('avatarLarge');
      if (avatarLarge) {
        avatarLarge.textContent = name.charAt(0).toUpperCase();
      }
      
      console.log('Profile saved:', name, emailInput.value);
    }
    
    this.close();
  }

  destroy(): void {
    this.close();
    this.container?.remove();
  }
}
