/**
 * Docker Registry HTTP API v2 client.
 *
 * All requests are proxied through the local server (`/v2/...`) which
 * attaches registry credentials and forwards to the configured registry.
 * @see https://distribution.github.io/distribution/spec/api/
 */

import { LATEST_TAG, MANIFEST_ACCEPT } from '@/constants/registry.const'
import { newestVersion } from '@/utils/repository'

interface Platform {
  os: string
  architecture: string
  variant?: string
}

interface Descriptor {
  mediaType: string
  digest: string
  size: number
  platform?: Platform
}

/** Single-image manifest or multi-platform index — distinguished by `manifests`. */
interface Manifest {
  config?: Descriptor
  layers?: Descriptor[]
  manifests?: Descriptor[]
}

interface ImageConfig extends Partial<Platform> {
  created?: string
}

export interface CatalogPage {
  repositories: string[]
  /** Cursor to pass as `last` for the next page, or `null` if this is the last page. */
  nextCursor: string | null
}

export interface ImageDetails {
  digest: string
  /** Compressed size: config + layers. For multi-platform images, of the first platform. */
  size: number
  /** Build time from the image config; `null` if the config blob couldn't be read. */
  createdAt: Date | null
  platforms: string[]
}

export interface RepositorySummary {
  tagCount: number
  newestVersion: string | null
  updatedAt: Date | null
}

function describeError(res: Response): string {
  if (res.status === 401) return 'Unauthorized — check registry credentials in env vars'
  if (res.status === 405) return 'Registry has deletions disabled — add `delete: enabled: true` to registry config'
  return `Registry error: ${res.status} ${res.statusText}`
}

async function registryRequest(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`/v2${path}`, init)
  if (!res.ok) throw new Error(describeError(res))
  return res
}

async function registryJson<T>(path: string, init?: RequestInit): Promise<T> {
  return (await registryRequest(path, init)).json() as Promise<T>
}

function formatPlatform(p: Partial<Platform>): string {
  return [p.os, p.architecture, p.variant].filter(Boolean).join('/')
}

/**
 * The registry signals more pages via a `Link: <...?last=X>; rel="next"` header.
 * Some implementations omit it, so a full page without the header also means "more".
 */
function nextCatalogCursor(res: Response, repositories: string[], pageSize: number): string | null {
  const link = res.headers.get('Link')
  if (link) {
    const match = link.match(/[?&]last=([^&>]+)/)
    return match?.[1] ? decodeURIComponent(match[1]) : null
  }
  return repositories.length === pageSize ? (repositories.at(-1) ?? null) : null
}

export async function fetchCatalogPage(pageSize: number, last?: string): Promise<CatalogPage> {
  const params = new URLSearchParams({ n: String(pageSize) })
  if (last) params.set('last', last)

  const res = await registryRequest(`/_catalog?${params}`)
  const { repositories = [] } = (await res.json()) as { repositories?: string[] }
  return { repositories, nextCursor: nextCatalogCursor(res, repositories, pageSize) }
}

export async function fetchTags(repository: string): Promise<string[]> {
  const data = await registryJson<{ tags?: string[] | null }>(`/${repository}/tags/list`)
  return data.tags ?? []
}

async function fetchManifest(repository: string, reference: string): Promise<{ digest: string; manifest: Manifest }> {
  const res = await registryRequest(`/${repository}/manifests/${reference}`, { headers: { Accept: MANIFEST_ACCEPT } })
  return { digest: res.headers.get('Docker-Content-Digest') ?? '', manifest: (await res.json()) as Manifest }
}

async function fetchConfig(repository: string, digest: string): Promise<ImageConfig | null> {
  try {
    return await registryJson<ImageConfig>(`/${repository}/blobs/${digest}`)
  } catch {
    return null
  }
}

async function describeImage(repository: string, manifest: Manifest): Promise<Omit<ImageDetails, 'digest'>> {
  const config = manifest.config ? await fetchConfig(repository, manifest.config.digest) : null
  const size = (manifest.config?.size ?? 0) + (manifest.layers ?? []).reduce((sum, l) => sum + l.size, 0)
  return {
    size,
    createdAt: config?.created ? new Date(config.created) : null,
    platforms: config?.os ? [formatPlatform(config)] : [],
  }
}

export async function fetchImageDetails(repository: string, tag: string): Promise<ImageDetails> {
  const { digest, manifest } = await fetchManifest(repository, tag)
  if (!manifest.manifests) return { digest, ...(await describeImage(repository, manifest)) }

  // Buildx attestation manifests are listed with platform `unknown/unknown`.
  const images = manifest.manifests.filter((m) => m.platform && m.platform.os !== 'unknown')
  const first = images[0]
  const details = first
    ? await describeImage(repository, (await fetchManifest(repository, first.digest)).manifest)
    : { size: 0, createdAt: null }
  return { ...details, digest, platforms: images.map((m) => formatPlatform(m.platform!)) }
}

/** One tags request plus details of the tag that best represents the current deploy. */
export async function fetchRepositorySummary(repository: string): Promise<RepositorySummary> {
  const tags = await fetchTags(repository)
  const newest = newestVersion(tags)
  const deployed = tags.includes(LATEST_TAG) ? LATEST_TAG : newest
  const details = deployed ? await fetchImageDetails(repository, deployed) : null
  return { tagCount: tags.length, newestVersion: newest, updatedAt: details?.createdAt ?? null }
}

/**
 * The Registry API deletes manifests, not tags: resolve the tag's digest, then
 * delete by digest. Every other tag pointing at the same digest goes with it.
 */
export async function deleteTag(repository: string, tag: string): Promise<void> {
  const head = await registryRequest(`/${repository}/manifests/${tag}`, {
    method: 'HEAD',
    headers: { Accept: MANIFEST_ACCEPT },
  })
  const digest = head.headers.get('Docker-Content-Digest')
  if (!digest) throw new Error('Registry did not return Docker-Content-Digest header')

  await registryRequest(`/${repository}/manifests/${digest}`, { method: 'DELETE' })
}
