// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  
  app: {
    head: {
      title: 'SmartTable',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'SmartTable - современное десктопное приложение для работы с таблицами. Изумрудная свежесть и производительность.' }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' }
      ]
    }
  },
  
  css: ['~/assets/css/main.css'],
  
  vite: {
    css: {
      preprocessorOptions: {
        scss: {}
      }
    }
  }
})
