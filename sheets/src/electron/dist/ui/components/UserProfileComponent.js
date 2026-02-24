/**
 * UserProfile Component - простой личный кабинет
 */
export class UserProfileComponent {
    constructor() {
        this.isOpen = false;
        this.container = null;
        this.userAvatar = null;
        this.init();
    }
    init() {
        this.createUserAvatar();
        this.createModal();
        this.bindEvents();
    }
    createUserAvatar() {
        this.userAvatar = document.querySelector('#userAvatar');
        if (this.userAvatar) {
            this.userAvatar.style.cursor = 'pointer';
            this.userAvatar.addEventListener('click', () => {
                // Открываем Dashboard вместо простого модального окна
                const dashboard = window.dashboard;
                if (dashboard) {
                    dashboard.open();
                }
            });
        }
    }
    createModal() {
        if (document.getElementById('user-profile-modal'))
            return;
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
    bindEvents() {
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
    open() {
        if (this.isOpen || !this.container)
            return;
        this.isOpen = true;
        this.container.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    close() {
        if (!this.isOpen || !this.container)
            return;
        this.isOpen = false;
        this.container.style.display = 'none';
        document.body.style.overflow = '';
    }
    save() {
        const nameInput = document.getElementById('userName');
        const emailInput = document.getElementById('userEmail');
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
    destroy() {
        this.close();
        this.container?.remove();
    }
}
//# sourceMappingURL=UserProfileComponent.js.map