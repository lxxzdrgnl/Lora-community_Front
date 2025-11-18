<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { authStore, api, type UserResponse } from '../services/api';
import ThemeToggle from './ThemeToggle.vue';

const isLoggedIn = ref(false);
const user = ref<UserResponse | null>(null);
const showUserMenu = ref(false);
const showMobileMenu = ref(false);

onMounted(async () => {
  await checkAuthStatus();
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('profile-updated', handleProfileUpdate);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('profile-updated', handleProfileUpdate);
});

const checkAuthStatus = async () => {
  console.log('Navigation - checkAuthStatus called');
  console.log('Navigation - isAuthenticated:', authStore.isAuthenticated());
  console.log('Navigation - accessToken:', authStore.getAccessToken() ? 'exists' : 'missing');

  if (!authStore.isAuthenticated()) {
    console.log('Navigation - not authenticated');
    isLoggedIn.value = false;
    return;
  }

  try {
    console.log('Navigation - fetching user profile');
    const response = await api.user.getMyProfile();
    user.value = response.data;
    isLoggedIn.value = true;
    console.log('Navigation - user profile loaded:', user.value.nickname);
  } catch (error) {
    console.error('Navigation - failed to get user profile:', error);
    // Token might be expired, clear it
    authStore.clearTokens();
    isLoggedIn.value = false;
  }
};

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.user-menu')) {
    showUserMenu.value = false;
  }
  if (!target.closest('.mobile-menu') && !target.closest('.mobile-menu-btn')) {
    showMobileMenu.value = false;
  }
};

const handleProfileUpdate = (event: Event) => {
  const customEvent = event as CustomEvent;
  if (customEvent.detail) {
    user.value = customEvent.detail;
    console.log('Navigation - profile updated:', user.value.nickname);
  }
};

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value;
};

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value;
};

const handleLogin = () => {
  api.auth.googleLogin();
};

const handleLogout = async () => {
  const refreshToken = authStore.getRefreshToken();
  if (refreshToken) {
    try {
      await api.auth.logout(refreshToken);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  authStore.clearTokens();
  isLoggedIn.value = false;
  user.value = null;
  showUserMenu.value = false;
  window.location.href = '/';
};
</script>

<template>
  <nav class="navbar">
    <div class="container">
      <div class="nav-content flex items-center justify-between">
        <!-- Logo -->
        <div class="nav-brand">
          <a href="/" class="logo gradient-text text-2xl font-bold">
            LoRA Platform
          </a>
        </div>

        <!-- Navigation Links (Desktop) -->
        <div class="nav-links flex items-center gap-lg">
          <router-link to="/" class="nav-link">Explore</router-link>
          <router-link to="/training" class="nav-link">Training</router-link>
        </div>

        <!-- User Section -->
        <div class="nav-user flex items-center gap-xs">
          <ThemeToggle />

          <!-- Desktop User Menu -->
          <template v-if="isLoggedIn && user">
            <div class="user-menu">
              <div class="flex items-center gap-sm cursor-pointer" @click="toggleUserMenu">
                <img
                  :src="user.profileImageUrl || 'https://via.placeholder.com/40'"
                  alt="Profile"
                  class="avatar"
                />
                <span class="text-primary font-semibold">{{ user.nickname }}</span>
              </div>

              <!-- Dropdown Menu -->
              <div v-if="showUserMenu" class="dropdown-menu card">
                <router-link to="/profile" class="dropdown-item">
                  <span>Profile</span>
                </router-link>
                <router-link to="/my-models" class="dropdown-item">
                  <span>My Models</span>
                </router-link>
                <router-link to="/favorites" class="dropdown-item">
                  <span>Favorites</span>
                </router-link>
                <div class="divider"></div>
                <button @click="handleLogout" class="dropdown-item">
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </template>

          <template v-else>
            <button @click="handleLogin" class="btn btn-primary btn-sm desktop-login">Login with Google</button>
          </template>

          <!-- Mobile Menu Button -->
          <button class="mobile-menu-btn" @click="toggleMobileMenu">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div v-if="showMobileMenu" class="mobile-menu card">
      <div class="mobile-menu-content">
        <!-- Mobile Navigation Links -->
        <router-link to="/" class="mobile-menu-item" @click="showMobileMenu = false">
          Explore
        </router-link>
        <router-link to="/training" class="mobile-menu-item" @click="showMobileMenu = false">
          Training
        </router-link>

        <div class="divider"></div>

        <!-- Mobile User Section -->
        <template v-if="isLoggedIn && user">
          <!-- Logout button removed as per user request -->
        </template>
        <template v-else>
          <button @click="handleLogin" class="btn btn-primary w-full">
            Login with Google
          </button>
        </template>

        <div class="divider"></div>

        <div class="mobile-menu-bottom flex items-center justify-between">
          <span class="text-sm text-muted">Switch Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  background: rgba(var(--bg-card-rgb), 0.8); /* Use theme-aware background with transparency */
  border-bottom: 1px solid var(--border);
  padding: var(--space-md) 0;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.nav-content {
  height: 60px;
}

.logo {
  text-decoration: none;
  transition: opacity 0.3s ease;
}

.logo:hover {
  opacity: 0.8;
}

.nav-links {
  flex: 1;
  justify-content: center;
}

.nav-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  font-size: 16px;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  transition: all 0.3s ease;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.user-menu {
  position: relative;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  min-width: 200px;
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
}

.dropdown-item {
  padding: var(--space-sm) var(--space-md);
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  width: 100%;
}

.dropdown-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.divider {
  height: 1px;
  background: var(--border);
  margin: var(--space-xs) 0;
}

.mobile-menu-btn {
  display: none;
  padding: var(--space-sm);
  background: transparent;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
}

.mobile-menu {
  position: fixed;
  top: 76px;
  left: 0;
  right: 0;
  margin: var(--space-md);
  padding: var(--space-md);
  z-index: 999;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}

.mobile-menu-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.mobile-menu-item {
  padding: var(--space-md);
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 16px;
  width: 100%;
  font-weight: 500;
}

.mobile-menu-item:hover,
.mobile-menu-item.router-link-active {
  background: var(--bg-hover);
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }

  .nav-brand .logo {
    font-size: 18px;
  }

  .mobile-menu-btn {
    display: block;
  }

  .desktop-login {
    display: none;
  }

  .user-menu .flex span {
    display: none;
  }

  .nav-user .btn-icon,
  .nav-user .mobile-menu-btn {
    padding: var(--space-sm);
  }
}
</style>
