/**
 * Production server for Docker Registry UI.
 *
 * Responsibilities:
 * - Site-level Basic Auth (protects the UI from public access)
 * - Rate limiting on failed auth attempts (brute-force protection)
 * - Proxying /v2/* to the configured Docker Registry with injected credentials
 * - Serving the static Vue SPA with SPA fallback routing
 *
 * All sensitive configuration is read from environment variables at startup.
 */

import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { rateLimit, ipKeyGenerator } from 'express-rate-limit'
import { fileURLToPath } from 'node:url'
import { timingSafeEqual } from 'node:crypto'
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

/** Pre-computed Basic Auth header sent to the registry on every proxied request. */
const registryAuth = 'Basic ' + Buffer.from(`${REGISTRY_USERNAME}:${REGISTRY_PASSWORD}`).toString('base64')

const app = express()

// Trust the reverse proxy (Traefik / Nginx) so rate limiting uses the real client IP
// from the X-Forwarded-For header instead of the proxy's IP.
app.set('trust proxy', 1)

const AUTH_MAX_FAILURES = 5
const AUTH_LOCKOUT_MESSAGE = 'Too many failed attempts, please try again later.'

const authFailureKey = (req) => ipKeyGenerator(req.ip)

// Counts only failed logins. Running it on every request would also count
// in-flight successful ones (hits are added before the response), so a page
// firing >5 parallel registry calls would 429 itself.
const authFailureLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: AUTH_MAX_FAILURES,
  keyGenerator: authFailureKey,
  message: AUTH_LOCKOUT_MESSAGE,
})

/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns false if lengths differ, rather than short-circuiting early.
 */
function safeEqual(a, b) {
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

function hasSiteCredentials(auth) {
  if (!auth?.startsWith('Basic ')) return false
  const decoded = Buffer.from(auth.slice(6), 'base64').toString()
  const colon = decoded.indexOf(':')
  if (colon === -1) return false
  // slice from colon+1 preserves colons inside the password itself
  return safeEqual(decoded.slice(0, colon), SITE_USERNAME) && safeEqual(decoded.slice(colon + 1), SITE_PASSWORD)
}

// Site-level HTTP Basic Auth, validated on every request before any content is served.
// A locked-out IP is rejected even with correct credentials, otherwise 429 vs 200
// would still tell a brute-forcer which guess was right.
app.use(async (req, res, next) => {
  const failures = (await authFailureLimiter.getKey(authFailureKey(req)))?.totalHits ?? 0
  if (failures >= AUTH_MAX_FAILURES) return res.status(429).send(AUTH_LOCKOUT_MESSAGE)
  if (hasSiteCredentials(req.headers.authorization)) return next()
  authFailureLimiter(req, res, () => {
    res.set('WWW-Authenticate', 'Basic realm="Docker Registry UI"')
    res.status(401).send('Unauthorized')
  })
})

// Proxy all /v2/* requests to the registry.
// pathFilter (not app.use('/v2')) preserves the prefix so the registry receives
// the correct path, e.g. /v2/_catalog instead of /_catalog.
app.use(createProxyMiddleware({
  pathFilter: '/v2',
  target: VITE_REGISTRY_URL,
  changeOrigin: true,
  secure: false,
  headers: { Authorization: registryAuth },
  on: {
    proxyRes(proxyRes) {
      // Strip the registry's own WWW-Authenticate header so the browser
      // does not open a second auth dialog for the registry itself.
      delete proxyRes.headers['www-authenticate']
    },
  },
}))

// Serve the built Vue SPA from /app/dist.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, 'dist')
app.use(express.static(dist))

// SPA fallback: unknown paths return index.html so Vue Router handles them client-side.
app.get('*path', (_req, res) => res.sendFile(path.join(dist, 'index.html')))

app.listen(PORT, () => console.log(`Docker Registry UI running on port ${PORT}`))
