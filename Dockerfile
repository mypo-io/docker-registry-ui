FROM node:24.14-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_REGISTRY_URL
RUN npm run build

FROM node:24.14-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY server.js .
EXPOSE 3000
CMD ["node", "server.js"]
