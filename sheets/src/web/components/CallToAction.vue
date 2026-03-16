<template>
  <section id="download" class="cta">
    <div class="container">
      <div class="cta-card">
        <div class="cta-content">
          <h2 class="cta-title">Готовы начать?</h2>
          <p class="cta-text">
            Скачайте SmartTable бесплатно и попробуйте все возможности 
            уже сегодня
          </p>
          <div class="cta-buttons">
            <a href="/SmartTable.exe" download class="btn btn-primary btn-lg">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
              Скачать для Windows
            </a>
            <a href="https://github.com/your-repo/smarttable/releases" target="_blank" class="btn btn-outline-light btn-lg">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
              Другие платформы
            </a>
          </div>
          <p class="cta-note">
            Бесплатно • Без регистрации • Открытый исходный код
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
</script>

<style scoped>
.cta {
  padding: 100px 0;
  background: var(--bg-color);
}

.cta-card {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
  border-radius: 24px;
  padding: 80px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.cta-card::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -10%;
  width: 400px;
  height: 400px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
}

.cta-content {
  position: relative;
  z-index: 1;
}

.cta-title {
  font-size: 40px;
  font-weight: 700;
  color: white;
  margin-bottom: 16px;
}

.cta-text {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 40px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.cta-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
}

.btn-lg {
  padding: 16px 32px;
  font-size: 15px;
  font-weight: 600;
}

.btn-outline-light {
  border: 2px solid rgba(255, 255, 255, 0.5);
  color: white;
  background: transparent;
  transition: all 0.2s;
}

.btn-outline-light:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: white;
}

.cta-note {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

@media (max-width: 640px) {
  .cta-card {
    padding: 40px 24px;
  }
  
  .cta-title {
    font-size: 32px;
  }
  
  .cta-buttons {
    flex-direction: column;
  }
}
</style>
