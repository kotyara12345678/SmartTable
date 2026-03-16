<template>
  <section class="hero">
    <div class="container">
      <div class="hero-content">
        <div class="hero-text slide-up">
          <h1 class="hero-title">
            Умные таблицы<br />
            <span class="gradient-text">для ваших данных</span>
          </h1>
          <p class="hero-subtitle">
            Современное десктопное приложение с мощными возможностями 
            и элегантным дизайном в стиле Emerald Day
          </p>
          <div class="hero-buttons">
            <a href="/SmartTable.exe" download class="btn btn-primary btn-lg">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
              Скачать бесплатно
            </a>
            <a href="#features" class="btn btn-outline btn-lg">
              Узнать больше
            </a>
          </div>
          <div class="hero-stats">
            <div class="stat-item">
              <span class="stat-value">10K+</span>
              <span class="stat-label">Пользователей</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-value">4.9</span>
              <span class="stat-label">Рейтинг</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-value">100%</span>
              <span class="stat-label">Бесплатно</span>
            </div>
          </div>
        </div>
        
        <div class="hero-image fade-in">
          <div class="image-wrapper">
            <img src="/screenshot.png" alt="SmartTable Interface" class="hero-screenshot" />
            <div class="floating-card card-1">
              <svg class="card-icon" viewBox="0 0 40 40" fill="none">
                <rect x="6" y="10" width="28" height="22" rx="3" fill="#F3E8FF" stroke="#A855F7" stroke-width="2"/>
                <rect x="10" y="20" width="5" height="8" rx="1" fill="#A855F7"/>
                <rect x="17" y="16" width="5" height="12" rx="1" fill="#A855F7" opacity="0.7"/>
                <rect x="24" y="13" width="5" height="15" rx="1" fill="#A855F7" opacity="0.5"/>
              </svg>
              <div class="card-text">
                <span class="card-label">Аналитика</span>
                <span class="card-value">+127%</span>
              </div>
            </div>
            <div class="floating-card card-2">
              <svg class="card-icon" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="16" fill="#FEF3C7" stroke="#F59E0B" stroke-width="2"/>
                <path d="M14 20l5 5 7-10" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div class="card-text">
                <span class="card-label">Скорость</span>
                <span class="card-value">0.5s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
</script>

<style scoped>
.hero {
  padding: 80px 0;
  background: linear-gradient(180deg, var(--surface-color) 0%, var(--bg-color) 100%);
}

.hero-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.hero-title {
  font-size: 56px;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 24px;
  color: var(--text-primary);
}

.gradient-text {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 32px;
  line-height: 1.6;
}

.hero-buttons {
  display: flex;
  gap: 16px;
  margin-bottom: 40px;
}

.btn-lg {
  padding: 14px 28px;
  font-size: 15px;
}

.hero-stats {
  display: flex;
  align-items: center;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
}

.stat-label {
  font-size: 13px;
  color: var(--text-muted);
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--border-color);
}

.image-wrapper {
  position: relative;
}

.hero-screenshot {
  width: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--border-color);
}

.floating-card {
  position: absolute;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow-lg);
}

.card-1 {
  top: -20px;
  right: -20px;
  animation: float 3s ease-in-out infinite;
}

.card-2 {
  bottom: -20px;
  left: -20px;
  animation: float 3s ease-in-out infinite 1s;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.card-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.card-text {
  display: flex;
  flex-direction: column;
}

.card-label {
  font-size: 12px;
  color: var(--text-muted);
}

.card-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary-color);
}

@media (max-width: 968px) {
  .hero-content {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  
  .hero-title {
    font-size: 40px;
  }
  
  .hero-buttons {
    flex-wrap: wrap;
  }
  
  .floating-card {
    display: none;
  }
}
</style>
