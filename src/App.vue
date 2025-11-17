<script setup lang="ts">
import Navigation from './components/Navigation.vue';
import { useTheme } from './composables/useTheme';

useTheme();
</script>

<template>
  <div class="app">
    <Navigation />

    <main class="main-content">
      <RouterView />
    </main>

    <footer class="footer">
      <p>Made with Vue 3 + TypeScript</p>
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
}

.footer {
  text-align: center;
  padding: var(--space-xl);
  color: var(--text-muted);
  font-size: 14px;
  border-top: 1px solid var(--border);
  background: var(--bg-card);
}
</style>
