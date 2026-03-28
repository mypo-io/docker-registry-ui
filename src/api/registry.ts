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

/**
 * Returns the list of all repository names in the registry.
 */
export async function fetchCatalog(): Promise<string[]> {
  const data = (await registryFetch('/_catalog?n=1000')) as { repositories?: string[] }
  return data.repositories ?? []
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
