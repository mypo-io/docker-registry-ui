import { LATEST_TAG } from '@/constants/registry.const'

export interface RepositoryName {
  /** Full repository path, e.g. `mypo-io/mypo-landing` */
  full: string
  /** Part before the first `/`, empty for root repositories */
  namespace: string
  /** Repository name without the namespace prefix */
  name: string
}

export function splitRepository(full: string): RepositoryName {
  const i = full.indexOf('/')
  return i === -1
    ? { full, namespace: '', name: full }
    : { full, namespace: full.slice(0, i), name: full.slice(i + 1) }
}

/**
 * `latest` first, then numerically descending so `1.10.0` > `1.2.0`
 * and CI tags like `2026-10-20-45` > `2026-10-20-9`.
 */
export function sortTags(tags: string[]): string[] {
  return [...tags].sort((a, b) => {
    if (a === LATEST_TAG) return -1
    if (b === LATEST_TAG) return 1
    return b.localeCompare(a, undefined, { numeric: true })
  })
}

/** Newest non-`latest` tag, falling back to `latest` when it is the only one. */
export function newestVersion(tags: string[]): string | null {
  const sorted = sortTags(tags)
  return sorted.find((t) => t !== LATEST_TAG) ?? sorted[0] ?? null
}

export async function forEachConcurrent<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items]
  const worker = async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await fn(item)
  }
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, worker))
}
