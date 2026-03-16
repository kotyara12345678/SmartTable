<template>
  <div class="app">
    <Header />
    <main>
      <Hero />
      <Features />
      <About />
      <CallToAction />
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import Header from '~/components/Header.vue'
import Hero from '~/components/Hero.vue'
import Features from '~/components/Features.vue'
import About from '~/components/About.vue'
import CallToAction from '~/components/CallToAction.vue'
import Footer from '~/components/Footer.vue'
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
}
</style>
