<script setup lang="ts">
import { ref } from 'vue';

const isLoading = ref(false);

const handleGoogleLogin = () => {
  isLoading.value = true;
  window.location.href = '/api/auth/google?prompt=select_account';
};
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-card card">
        <!-- Logo -->
        <div class="text-center mb-xl">
          <h1 class="text-4xl font-bold gradient-text mb-md">Blueming AI</h1>
          <p class="text-lg text-secondary">Sign in to continue</p>
        </div>

        <!-- Login Options -->
        <div class="login-options">
          <button class="btn-google" @click="handleGoogleLogin" :disabled="isLoading">
            <span v-if="isLoading">Logging in...</span>
            <template v-else>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </template>
          </button>
        </div>

        <!-- Terms -->
        <div class="text-center mt-xl">
          <p class="text-xs text-muted">
            By signing in, you agree to our
            <a href="/terms" class="text-secondary">Terms of Service</a>
            and
            <a href="/privacy" class="text-secondary">Privacy Policy</a>
          </p>
        </div>
      </div>

      <!-- Features -->
      <div class="features grid grid-cols-3 gap-lg mt-xl">
        <div class="feature-card card-sm text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-md">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          <h3 class="font-semibold mb-xs">Create Models</h3>
          <p class="text-sm text-secondary">Train your own LoRA models</p>
        </div>

        <div class="feature-card card-sm text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-md">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <h3 class="font-semibold mb-xs">Generate Images</h3>
          <p class="text-sm text-secondary">Create amazing artwork</p>
        </div>

        <div class="feature-card card-sm text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-md">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <h3 class="font-semibold mb-xs">Join Community</h3>
          <p class="text-sm text-secondary">Share with creators</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: var(--bg-dark);
}

.login-container {
  width: 100%;
  max-width: 480px;
}

.login-card {
  padding: var(--space-2xl);
}

.btn-google {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  width: 100%;
  padding: 16px 24px;
  background: white;
  color: #1f1f1f;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-google:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.features {
  margin-top: var(--space-2xl);
}

@media (max-width: 768px) {
  .login-card {
    padding: var(--space-xl);
  }

  .features {
    grid-template-columns: 1fr;
  }
}
</style>
