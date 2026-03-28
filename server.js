import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const {
  VITE_REGISTRY_URL,
  REGISTRY_USERNAME,
  REGISTRY_PASSWORD,
  SITE_USERNAME,
  SITE_PASSWORD,
  PORT = '3000',
} = process.env

for (const [key, val] of Object.entries({ VITE_REGISTRY_URL, REGISTRY_USERNAME, REGISTRY_PASSWORD, SITE_USERNAME, SITE_PASSWORD })) {
  if (!val) { console.error(`Missing required env var: ${key}`); process.exit(1) }
}

const registryAuth = 'Basic ' + Buffer.from(`${REGISTRY_USERNAME}:${REGISTRY_PASSWORD}`).toString('base64')

const app = express()

// Site-level Basic Auth
app.use((req, res, next) => {
  const auth = req.headers['authorization']
  if (auth?.startsWith('Basic ')) {
    const [user, pass] = Buffer.from(auth.slice(6), 'base64').toString().split(':')
    if (user === SITE_USERNAME && pass === SITE_PASSWORD) return next()
  }
  res.set('WWW-Authenticate', 'Basic realm="Docker Registry UI"')
  res.status(401).send('Unauthorized')
})

// Proxy /v2/ → registry with credentials
app.use('/v2', createProxyMiddleware({
  target: VITE_REGISTRY_URL,
  changeOrigin: true,
  secure: false,
  headers: { Authorization: registryAuth },
  on: {
    proxyRes: (proxyRes) => {
      delete proxyRes.headers['www-authenticate']
    },
  },
}))

// Static Vue app
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, 'dist')
app.use(express.static(dist))
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))

app.listen(PORT, () => console.log(`Running on port ${PORT}`))
