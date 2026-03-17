<template>
  <header class="header">
    <div class="container">
      <div class="header-inner">
        <a href="/" class="logo">
          <img src="/logo.png" alt="SmartTable" class="logo-icon" />
          <span class="logo-text">SmartTable</span>
        </a>

        <nav class="nav-desktop">
          <div class="nav-item" @mouseenter="activeMenu = 'features'" @mouseleave="activeMenu = null">
            <button class="nav-link">
              Возможности
              <svg class="chevron" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
            </button>
            <div v-show="activeMenu === 'features'" class="submenu">
              <div class="submenu-grid">
                <a href="#features" class="submenu-item">
                  <span class="submenu-title">Умные таблицы</span>
                  <span class="submenu-desc">Работа с данными нового уровня</span>
                </a>
                <a href="#features" class="submenu-item">
                  <span class="submenu-title">Формулы</span>
                  <span class="submenu-desc">Мощные вычисления как в Excel</span>
                </a>
                <a href="#features" class="submenu-item">
                  <span class="submenu-title">Диаграммы</span>
                  <span class="submenu-desc">Визуализация данных</span>
                </a>
              </div>
            </div>
          </div>
          
          <div class="nav-item" @mouseenter="activeMenu = 'solutions'" @mouseleave="activeMenu = null">
            <button class="nav-link">
              Решения
              <svg class="chevron" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
            </button>
            <div v-show="activeMenu === 'solutions'" class="submenu">
              <div class="submenu-grid">
                <a href="#about" class="submenu-item">
                  <span class="submenu-title">Для бизнеса</span>
                  <span class="submenu-desc">Корпоративные решения</span>
                </a>
                <a href="#about" class="submenu-item">
                  <span class="submenu-title">Для команд</span>
                  <span class="submenu-desc">Совместная работа</span>
                </a>
                <a href="#about" class="submenu-item">
                  <span class="submenu-title">Для личных задач</span>
                  <span class="submenu-desc">Персональное использование</span>
                </a>
              </div>
            </div>
          </div>
          
          <a href="#about" class="nav-link">О приложении</a>
          <a href="#download" class="nav-link">Скачать</a>
        </nav>

        <div class="header-actions">
          <a href="/SmartTable.exe" download class="btn btn-primary btn-sm">Скачать бесплатно</a>
          <button class="mobile-menu-btn" @click="mobileMenuOpen = !mobileMenuOpen">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div v-show="mobileMenuOpen" class="mobile-menu">
      <nav class="mobile-nav">
        <a href="#features" class="mobile-nav-item">Возможности</a>
        <a href="#solutions" class="mobile-nav-item">Решения</a>
        <a href="#about" class="mobile-nav-item">О приложении</a>
        <a href="#download" class="mobile-nav-item">Скачать</a>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeMenu = ref<string | null>(null)
const mobileMenuOpen = ref(false)
</script>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  backdrop-filter: blur(8px);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  gap: 24px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.logo-icon {
  width: 40px;
  height: 40px;
}

.nav-desktop {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 600px;
}

.nav-item {
  position: relative;
}

.nav-link {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link:hover {
  color: var(--text-primary);
  background: var(--hover-bg);
}

.chevron {
  width: 16px;
  height: 16px;
  transition: transform 0.2s;
}

.nav-item:hover .chevron {
  transform: rotate(180deg);
}

.submenu {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 280px;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  padding: 12px;
  margin-top: 8px;
}

.submenu-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.submenu-item {
  display: block;
  padding: 12px 16px;
  border-radius: 8px;
  transition: all 0.2s;
}

.submenu-item:hover {
  background: var(--hover-bg);
}

.submenu-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.submenu-desc {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-sm {
  padding: 10px 20px;
  font-size: 13px;
}

.mobile-menu-btn {
  display: none;
  padding: 8px;
  color: var(--text-primary);
}

.mobile-menu {
  border-top: 1px solid var(--border-color);
  background: var(--surface-color);
}

.mobile-nav {
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 8px;
}

.mobile-nav-item {
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  border-radius: 8px;
  transition: all 0.2s;
}

.mobile-nav-item:hover {
  background: var(--hover-bg);
}

@media (max-width: 768px) {
  .nav-desktop {
    display: none;
  }
  
  .mobile-menu-btn {
    display: flex;
  }
  
  .btn-sm {
    display: none;
  }
}
</style>
