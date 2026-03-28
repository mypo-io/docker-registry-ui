#!/bin/sh
set -e

# Validate required env vars
: "${VITE_REGISTRY_URL:?VITE_REGISTRY_URL env var is required}"
: "${REGISTRY_USERNAME:?REGISTRY_USERNAME env var is required}"
: "${REGISTRY_PASSWORD:?REGISTRY_PASSWORD env var is required}"
: "${SITE_USERNAME:?SITE_USERNAME env var is required}"
: "${SITE_PASSWORD:?SITE_PASSWORD env var is required}"

# Build base64 credentials for registry proxy
export REGISTRY_AUTH_BASE64
REGISTRY_AUTH_BASE64=$(printf '%s:%s' "$REGISTRY_USERNAME" "$REGISTRY_PASSWORD" | base64 | tr -d '\n')

# Generate nginx config from template
envsubst '${REGISTRY_AUTH_BASE64} ${VITE_REGISTRY_URL}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

# Generate htpasswd for site protection
printf '%s:%s\n' "$SITE_USERNAME" "$(openssl passwd -apr1 "$SITE_PASSWORD")" \
  > /etc/nginx/.htpasswd

exec nginx -g 'daemon off;'
