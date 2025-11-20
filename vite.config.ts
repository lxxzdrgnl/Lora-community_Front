import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'camilo-unirradiative-indissolubly.ngrok-free.dev',
      '*.ngrok-free.dev',
      '*.ngrok.io',
    ],
    host: '0.0.0.0', // 이 설정도 추가해 주세요.
    proxy: {
      '/api': {
        target: 'http://bluemingai.ap-northeast-2.elasticbeanstalk.com',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})
