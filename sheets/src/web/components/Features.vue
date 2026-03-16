<template>
  <section id="features" class="features">
    <div class="container">
      <div class="section-header text-center">
        <h2 class="section-title">Возможности приложения</h2>
        <p class="section-subtitle">
          Всё необходимое для эффективной работы с таблицами и данными
        </p>
      </div>

      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">
            <svg viewBox="0 0 36 36" fill="none">
              <rect x="6" y="4" width="24" height="28" rx="3" fill="#FEF3C7" stroke="#F59E0B" stroke-width="2"/>
              <line x1="11" y1="10" x2="25" y2="10" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
              <line x1="11" y1="15" x2="25" y2="15" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
              <line x1="11" y1="20" x2="20" y2="20" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <h3 class="feature-title">Умные таблицы</h3>
          <p class="feature-desc">
            Интуитивный интерфейс с поддержкой больших объёмов данных 
            и быстрой навигацией
          </p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">
            <svg viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="14" fill="#DBEAFE" stroke="#3B82F6" stroke-width="2"/>
              <path d="M12 18l5 5 7-9" stroke="#3B82F6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3 class="feature-title">Мощные формулы</h3>
          <p class="feature-desc">
            Поддержка математических, статистических и логических функций 
            для любых вычислений
          </p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">
            <svg viewBox="0 0 36 36" fill="none">
              <rect x="4" y="8" width="28" height="20" rx="3" fill="#F3E8FF" stroke="#A855F7" stroke-width="2"/>
              <rect x="8" y="18" width="6" height="6" rx="1" fill="#A855F7"/>
              <rect x="15" y="14" width="6" height="10" rx="1" fill="#A855F7" opacity="0.7"/>
              <rect x="22" y="11" width="6" height="13" rx="1" fill="#A855F7" opacity="0.5"/>
            </svg>
          </div>
          <h3 class="feature-title">Диаграммы</h3>
          <p class="feature-desc">
            Визуализация данных с помощью различных типов графиков 
            и диаграмм
          </p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">
            <svg viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="14" fill="#D1FAE5" stroke="#10B981" stroke-width="2"/>
              <circle cx="18" cy="18" r="5" fill="#10B981"/>
              <circle cx="18" cy="18" r="9" stroke="#10B981" stroke-width="1.5" stroke-dasharray="2 2"/>
            </svg>
          </div>
          <h3 class="feature-title">Темы оформления</h3>
          <p class="feature-desc">
            Изумрудная тема и другие варианты оформления на ваш вкус
          </p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">
            <svg viewBox="0 0 36 36" fill="none">
              <rect x="8" y="10" width="20" height="16" rx="3" fill="#FCE7F3" stroke="#EC4899" stroke-width="2"/>
              <circle cx="14" cy="18" r="3" fill="#EC4899"/>
              <path d="M18 15v6M18 18h3" stroke="#EC4899" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <h3 class="feature-title">Плагины</h3>
          <p class="feature-desc">
            Расширяемый функционал с поддержкой пользовательских плагинов
          </p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">
            <svg viewBox="0 0 36 36" fill="none">
              <rect x="6" y="6" width="24" height="24" rx="4" fill="#DCFCE7" stroke="#22C55E" stroke-width="2"/>
              <path d="M12 18l4 4 8-8" stroke="#22C55E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3 class="feature-title">Автосохранение</h3>
          <p class="feature-desc">
            Надёжное сохранение данных с настраиваемым интервалом
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
</script>

<style scoped>
.features {
  padding: 100px 0;
  background: var(--bg-color);
}

.section-header {
  margin-bottom: 60px;
}

.section-title {
  font-size: 40px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.section-subtitle {
  font-size: 18px;
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.feature-card {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 32px;
  transition: all 0.3s;
}

.feature-card:hover {
  transform: translateY(-8px);
  border-color: var(--primary-color);
  box-shadow: var(--shadow-lg);
}

.feature-icon {
  width: 56px;
  height: 56px;
  margin-bottom: 20px;
}

.feature-icon svg {
  width: 100%;
  height: 100%;
}

.feature-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.feature-desc {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.6;
}

@media (max-width: 968px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .section-title {
    font-size: 32px;
  }
}
</style>
