/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full URL of the Docker registry, e.g. https://registry.example.com */
  readonly VITE_REGISTRY_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
