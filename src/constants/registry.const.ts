export const REGISTRY_HOST = new URL(import.meta.env.VITE_REGISTRY_URL).host

export const LATEST_TAG = 'latest'

export const CATALOG_PAGE_SIZE = 50

/** Parallel registry requests when loading per-repository / per-tag details. */
export const DETAILS_CONCURRENCY = 6

export const MEDIA_TYPES = {
  ociIndex: 'application/vnd.oci.image.index.v1+json',
  ociManifest: 'application/vnd.oci.image.manifest.v1+json',
  dockerManifestList: 'application/vnd.docker.distribution.manifest.list.v2+json',
  dockerManifest: 'application/vnd.docker.distribution.manifest.v2+json',
} as const

/**
 * Without the index/list types the registry converts multi-arch images to a
 * single-platform manifest, and the returned digest no longer matches the tag —
 * deleting by it fails or removes the wrong manifest.
 */
export const MANIFEST_ACCEPT = Object.values(MEDIA_TYPES).join(', ')

export const COPY_FEEDBACK_MS = 2000
export const DELETE_ERROR_TIMEOUT_MS = 8000
