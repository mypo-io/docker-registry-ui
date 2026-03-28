async function registryFetch(path: string) {
  const res = await fetch(`/v2${path}`)
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized: check registry credentials in env vars')
    throw new Error(`Registry error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function fetchCatalog(): Promise<string[]> {
  const data = await registryFetch('/_catalog?n=1000')
  return data.repositories ?? []
}

export async function fetchTags(repository: string): Promise<string[]> {
  const data = await registryFetch(`/${repository}/tags/list`)
  return data.tags ?? []
}

export async function deleteTag(repository: string, tag: string): Promise<void> {
  // Step 1: get the digest via HEAD request
  const headRes = await fetch(`/v2/${repository}/manifests/${tag}`, {
    method: 'HEAD',
    headers: {
      Accept: 'application/vnd.docker.distribution.manifest.v2+json',
    },
  })
  if (!headRes.ok) throw new Error(`Failed to get manifest digest: ${headRes.status}`)

  const digest = headRes.headers.get('Docker-Content-Digest')
  if (!digest) throw new Error('Registry did not return Docker-Content-Digest header')

  // Step 2: delete by digest
  const delRes = await fetch(`/v2/${repository}/manifests/${digest}`, {
    method: 'DELETE',
  })
  if (!delRes.ok) {
    if (delRes.status === 405) {
      throw new Error('Registry has deletions disabled. Add `delete: enabled: true` to registry config.')
    }
    throw new Error(`Delete failed: ${delRes.status} ${delRes.statusText}`)
  }
}
