<template>
  <section id="about" class="about">
    <div class="container">
      <div class="about-grid">
        <div class="about-image">
          <img src="/screenshot.png" alt="SmartTable Interface" class="about-screenshot" />
        </div>
        
        <div class="about-content">
          <h2 class="about-title">О приложении SmartTable</h2>
          <p class="about-text">
            SmartTable — это современное десктопное приложение для работы 
            с таблицами, созданное с любовью к деталям и вниманием к потребностям пользователей.
          </p>
          <p class="about-text">
            Наша миссия — предоставить вам удобный и мощный инструмент 
            для работы с данными, который сочетает в себе простоту использования 
            и широкие возможности.
          </p>
          
          <div class="about-features">
            <div class="about-feature-item">
              <svg class="check-icon" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5" stroke="var(--primary-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
              <span>Кроссплатформенность</span>
            </div>
            <div class="about-feature-item">
              <svg class="check-icon" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5" stroke="var(--primary-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
              <span>Открытый исходный код</span>
            </div>
            <div class="about-feature-item">
              <svg class="check-icon" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5" stroke="var(--primary-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
              <span>Регулярные обновления</span>
            </div>
            <div class="about-feature-item">
              <svg class="check-icon" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5" stroke="var(--primary-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
              <span>Поддержка сообщества</span>
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
.about {
  padding: 100px 0;
  background: var(--surface-color);
}

.about-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.about-image {
  background: var(--bg-color);
  border-radius: 16px;
  overflow: hidden;
}

.about-screenshot {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 16px;
  box-shadow: var(--shadow-md);
}

.about-title {
  font-size: 36px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 24px;
}

.about-text {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: 16px;
}

.about-features {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 32px;
}

.about-feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.check-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

@media (max-width: 968px) {
  .about-grid {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  
  .about-image {
    order: -1;
  }
}
</style>
