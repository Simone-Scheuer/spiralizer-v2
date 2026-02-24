/**
 * Uzumaki — Input validation helpers (Phase 9 security hardening)
 */

/** Clamp a number to [min, max]. Returns fallback for NaN/Infinity. */
export function clampNum(val: unknown, min: number, max: number, fallback: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback
  return Math.min(max, Math.max(min, val))
}

/** Validate a value is one of the allowed enum strings. */
export function validateEnum<T extends string>(val: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof val !== 'string') return fallback
  return (allowed as readonly string[]).includes(val) ? (val as T) : fallback
}

/** Validate a boolean value. */
export function validateBool(val: unknown, fallback: boolean): boolean {
  return typeof val === 'boolean' ? val : fallback
}

/** Validate a hex color string (#rrggbb or #rgb). */
export function validateHex(val: unknown, fallback: string): string {
  if (typeof val !== 'string') return fallback
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val) ? val : fallback
}

/** Strip control characters and truncate to max length. */
export function sanitizeString(val: string, maxLength: number): string {
  // eslint-disable-next-line no-control-regex
  return val.replace(/[\x00-\x1F\x7F]/g, '').slice(0, maxLength)
}

/** Check if WebGL is available. */
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/** Check if localStorage is available. */
export function isLocalStorageAvailable(): boolean {
  try {
    const key = '__uzumaki_test__'
    localStorage.setItem(key, '1')
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

/** Get approximate localStorage usage in bytes. */
export function getStorageUsage(): number {
  let total = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        total += key.length + (localStorage.getItem(key)?.length ?? 0)
      }
    }
  } catch {
    // ignore
  }
  return total * 2 // UTF-16 = 2 bytes per char
}
