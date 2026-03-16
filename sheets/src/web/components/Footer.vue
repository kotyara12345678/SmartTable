<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="/" class="footer-logo">
            <img src="/logo.png" alt="SmartTable" class="logo-icon" />
            <span class="logo-text">SmartTable</span>
          </a>
          <p class="footer-desc">
            Умные таблицы для ваших данных.
            Современное десктопное приложение с элегантным дизайном.
          </p>
        </div>

        <div class="footer-links">
          <h4 class="footer-heading">Продукт</h4>
          <ul class="footer-list">
            <li><a href="#features">Возможности</a></li>
            <li><a href="#download">Скачать</a></li>
            <li><a href="#">Документация</a></li>
            <li><a href="#">Обновления</a></li>
          </ul>
        </div>

        <div class="footer-links">
          <h4 class="footer-heading">Ресурсы</h4>
          <ul class="footer-list">
            <li><a href="#">Блог</a></li>
            <li><a href="#">Сообщество</a></li>
            <li><a href="#">Поддержка</a></li>
            <li><a href="#">GitHub</a></li>
          </ul>
        </div>

        <div class="footer-links">
          <h4 class="footer-heading">Компания</h4>
          <ul class="footer-list">
            <li><a href="#about">О нас</a></li>
            <li><a href="#">Контакты</a></li>
            <li><a href="#">Лицензия</a></li>
            <li><a href="#">Приватность</a></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <p class="copyright">
          © 2026 SmartTable. Все права защищены.
        </p>
        <div class="footer-social">
          <a href="#" class="social-link" aria-label="GitHub">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" fill="currentColor"/>
            </svg>
          </a>
          <a href="#" class="social-link" aria-label="Telegram">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" fill="currentColor"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
</script>

<style scoped>
.footer {
  background: var(--surface-color);
  border-top: 1px solid var(--border-color);
  padding: 60px 0 30px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 40px;
  margin-bottom: 60px;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.logo-icon {
  width: 40px;
  height: 40px;
}

.footer-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 300px;
}

.footer-heading {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.footer-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.footer-list a {
  font-size: 14px;
  color: var(--text-secondary);
  transition: color 0.2s;
}

.footer-list a:hover {
  color: var(--primary-color);
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 30px;
  border-top: 1px solid var(--border-color);
}

.copyright {
  font-size: 13px;
  color: var(--text-muted);
}

.footer-social {
  display: flex;
  gap: 16px;
}

.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.social-link:hover {
  background: var(--hover-bg);
  color: var(--primary-color);
}

@media (max-width: 768px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
    gap: 30px;
  }
  
  .footer-brand {
    grid-column: 1 / -1;
  }
  
  .footer-bottom {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .footer-grid {
    grid-template-columns: 1fr;
  }
}
</style>
