export const ROOT_NAMESPACE = '(root)'

export const SORT_LABELS = { name: 'Name', updated: 'Recently updated' } as const

export type SortMode = keyof typeof SORT_LABELS
