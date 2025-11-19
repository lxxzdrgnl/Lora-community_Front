import { createRouter, createWebHistory } from 'vue-router';
import ModelList from '../views/ModelList.vue';
import Login from '../views/Login.vue';
import AuthCallback from '../views/AuthCallback.vue';
import Profile from '../views/Profile.vue';
import Search from '../views/Search.vue';
import Training from '../views/Training.vue';
import GenerateDebug from '../views/GenerateDebug.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: ModelList,
    },
    {
      path: '/models',
      name: 'models',
      component: ModelList,
    },
    {
      path: '/search',
      name: 'search',
      component: Search,
    },
    {
      path: '/training',
      name: 'training',
      component: Training,
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: AuthCallback,
    },
    {
      path: '/profile',
      name: 'profile',
      component: Profile,
    },
    {
      path: '/my-models',
      name: 'my-models',
      component: Profile,
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: Profile,
    },
    {
      path: '/debug/generate',
      name: 'generate-debug',
      component: GenerateDebug,
    },
  ],
});

export default router;
