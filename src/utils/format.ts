const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

const relativeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function formatBytes(bytes: number): string {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${BYTE_UNITS[unit]}`
}

export function formatRelative(date: Date): string {
  const seconds = (date.getTime() - Date.now()) / 1000
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(seconds) >= size) return relativeFormat.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

export function formatDateTime(date: Date): string {
  return dateTimeFormat.format(date)
}

/** `sha256:abcdef…` → `abcdef123456` */
export function shortDigest(digest: string): string {
  return digest.replace(/^sha256:/, '').slice(0, 12)
}

export function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
