# Docker Registry UI

A lightweight self-hosted web UI for private Docker registries.

Browse repositories, inspect tags, copy `docker pull` commands, and delete images — all from a clean dark interface, protected by HTTP Basic Auth.

## Features

- **Browse repositories** grouped by namespace (e.g. `mypo-io/mypo-landing` → group `mypo-io`)
- **List tags** sorted with `latest` first, then numerically descending
- **Copy `docker pull`** command to clipboard with one click
- **Delete tags** with a two-step confirmation (requires `delete: enabled: true` in registry config)
- **Site protection** via HTTP Basic Auth with rate limiting (5 attempts / 15 min per IP)
- **No credentials in the browser** — registry auth is handled server-side by the Node.js proxy

## How it works

```
Browser → docker.example.com (Node.js server)
              ├── Basic Auth (SITE_USERNAME / SITE_PASSWORD)
              ├── GET /v2/* → proxy → registry.example.com/v2/* (REGISTRY_USERNAME / REGISTRY_PASSWORD)
              └── Everything else → Vue SPA (index.html)
```

Registry credentials never reach the browser. The server injects the `Authorization` header on every proxied request.

## Quick start

### 1. Clone

```bash
git clone https://github.com/your-org/docker-registry-ui
cd docker-registry-ui
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Full URL of your Docker registry (no trailing slash)
VITE_REGISTRY_URL=https://registry.example.com

# Registry credentials
REGISTRY_USERNAME=your_registry_username
REGISTRY_PASSWORD=your_registry_password

# Site access credentials (shown in the browser Basic Auth dialog)
SITE_USERNAME=admin
SITE_PASSWORD=a-strong-password
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/v2/*` to the registry using credentials from `.env.local`.

## Deployment (Docker)

### Build

```bash
docker build \
  --build-arg VITE_REGISTRY_URL=https://registry.example.com \
  -t docker-registry-ui .
```

> `VITE_REGISTRY_URL` must be passed as a **build argument** so Vite can embed it in the JS bundle at build time.

### Run

```bash
docker run -p 3000:3000 \
  -e VITE_REGISTRY_URL=https://registry.example.com \
  -e REGISTRY_USERNAME=your_registry_username \
  -e REGISTRY_PASSWORD=your_registry_password \
  -e SITE_USERNAME=admin \
  -e SITE_PASSWORD=a-strong-password \
  docker-registry-ui
```

### Docker Compose

```yaml
services:
  docker-registry-ui:
    build:
      context: .
      args:
        VITE_REGISTRY_URL: https://registry.example.com
    ports:
      - "3000:3000"
    environment:
      VITE_REGISTRY_URL: https://registry.example.com
      REGISTRY_USERNAME: your_registry_username
      REGISTRY_PASSWORD: your_registry_password
      SITE_USERNAME: admin
      SITE_PASSWORD: a-strong-password
    restart: unless-stopped
```

## Deployment (Dokploy / other platforms)

1. Connect your repository and select **Dockerfile** as the build type.
2. Add `VITE_REGISTRY_URL` as both a **Build Argument** and an **Environment Variable**.
3. Add the remaining four variables as **Environment Variables**.
4. Set the exposed port to **3000**.
5. Deploy.

## Enabling tag deletion

Tag deletion is disabled in Docker Registry by default. To enable it, add the following to your registry configuration:

```yaml
storage:
  delete:
    enabled: true
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_REGISTRY_URL` | ✅ | Registry URL, e.g. `https://registry.example.com`. Must also be set as a build argument. |
| `REGISTRY_USERNAME` | ✅ | Username for authenticating with the registry. |
| `REGISTRY_PASSWORD` | ✅ | Password for authenticating with the registry. |
| `SITE_USERNAME` | ✅ | Username shown in the browser Basic Auth dialog. |
| `SITE_PASSWORD` | ✅ | Password shown in the browser Basic Auth dialog. |
| `PORT` | — | Port the server listens on. Defaults to `3000`. |

## Tech stack

- [Vue 3](https://vuejs.org) + [Vue Router](https://router.vuejs.org) — frontend
- [Tailwind CSS v4](https://tailwindcss.com) — styling
- [Express](https://expressjs.com) — production server and registry proxy
- [Vite](https://vite.dev) — build tool and dev server

## License

MIT
