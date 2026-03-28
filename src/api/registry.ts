/**
 * Docker Registry HTTP API v2 client.
 *
 * All requests are proxied through the local server (`/v2/...`) which
 * attaches registry credentials and forwards to the configured registry.
 * @see https://distribution.github.io/distribution/spec/api/
 */

/**
 * Fetches a JSON endpoint from the registry API.
 * @throws {Error} on non-2xx responses, with a human-readable message.
 */
async function registryFetch(path: string): Promise<unknown> {
  const res = await fetch(`/v2${path}`)
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized — check registry credentials in env vars')
    throw new Error(`Registry error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

/** Result of a single catalog page request. */
export interface CatalogPage {
  repositories: string[]
  /** Cursor to pass as `last` for the next page, or `null` if this is the last page. */
  nextCursor: string | null
}

/**
 * Fetches one page of repository names from the registry catalog.
 *
 * The registry uses cursor-based pagination: pass the `nextCursor` from the
 * previous response as `last` to get the following page.
 *
 * @param pageSize - Maximum number of repositories to return (default 50).
 * @param last - Cursor from the previous page; omit for the first page.
 */
export async function fetchCatalogPage(pageSize = 50, last?: string): Promise<CatalogPage> {
  const params = new URLSearchParams({ n: String(pageSize) })
  if (last) params.set('last', last)

  const res = await fetch(`/v2/_catalog?${params}`)
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized — check registry credentials in env vars')
    throw new Error(`Registry error: ${res.status} ${res.statusText}`)
  }

  const data = (await res.json()) as { repositories?: string[] }
  const repositories = data.repositories ?? []

  // The registry signals more pages via a Link: <...?last=X>; rel="next" header.
  // Fall back to using the last item as cursor if a full page was returned but
  // no Link header is present (some registry implementations omit it).
  let nextCursor: string | null = null
  const link = res.headers.get('Link')
  if (link) {
    const match = link.match(/[?&]last=([^&>]+)/)
    if (match?.[1]) nextCursor = decodeURIComponent(match[1])
  } else if (repositories.length === pageSize) {
    nextCursor = repositories[repositories.length - 1] ?? null
  }

  return { repositories, nextCursor }
}

/**
 * Returns all tags for the given repository.
 * @param repository - Full repository name, e.g. `mypo-io/mypo-landing`
 */
export async function fetchTags(repository: string): Promise<string[]> {
  const data = (await registryFetch(`/${repository}/tags/list`)) as { tags?: string[] }
  return data.tags ?? []
}

/**
 * Deletes a tag from the registry.
 *
 * Deletion is a two-step process required by the Registry API:
 * 1. Resolve the tag to its content-addressable digest via a HEAD request.
 * 2. Delete the manifest by digest.
 *
 * @param repository - Full repository name, e.g. `mypo-io/mypo-landing`
 * @param tag - Tag to delete, e.g. `1.0.0`
 * @throws {Error} if the registry has deletions disabled (HTTP 405).
 */
export async function deleteTag(repository: string, tag: string): Promise<void> {
  const headRes = await fetch(`/v2/${repository}/manifests/${tag}`, {
    method: 'HEAD',
    headers: { Accept: 'application/vnd.docker.distribution.manifest.v2+json' },
  })
  if (!headRes.ok) throw new Error(`Failed to resolve manifest digest: ${headRes.status}`)

  const digest = headRes.headers.get('Docker-Content-Digest')
  if (!digest) throw new Error('Registry did not return Docker-Content-Digest header')

  const delRes = await fetch(`/v2/${repository}/manifests/${digest}`, { method: 'DELETE' })
  if (!delRes.ok) {
    if (delRes.status === 405) {
      throw new Error('Registry has deletions disabled — add `delete: enabled: true` to registry config')
    }
    throw new Error(`Delete failed: ${delRes.status} ${delRes.statusText}`)
  }
}
