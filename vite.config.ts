import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Load .env.local into process.env so proxy can read credentials
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/v2': {
          target: env.VITE_REGISTRY_URL,
          changeOrigin: true,
          secure: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const user = env.REGISTRY_USERNAME
              const pass = env.REGISTRY_PASSWORD
              if (user && pass) {
                const token = Buffer.from(`${user}:${pass}`).toString('base64')
                proxyReq.setHeader('Authorization', `Basic ${token}`)
              }
            })
            // Strip WWW-Authenticate so the browser doesn't show its own auth dialog
            proxy.on('proxyRes', (proxyRes) => {
              delete proxyRes.headers['www-authenticate']
            })
          },
        },
      },
    },
  }
})
