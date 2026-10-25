export const ROOT_NAMESPACE = '(root)'

export const SORT_LABELS = { name: 'Name', updated: 'Recently updated' } as const

export type SortMode = keyof typeof SORT_LABELS

export const DEFAULT_SORT: SortMode = 'updated'

/** localStorage key remembering the chosen sort between visits. */
export const SORT_STORAGE_KEY = 'registry-ui:catalog-sort'

/** An image pushed within this window is highlighted as new. */
export const RECENT_UPDATE_MS = 24 * 60 * 60 * 1000
