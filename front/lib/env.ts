/** Trim Vercel/Windows env values (CLI sometimes adds \\r\\n). */
export function readEnv(name: string, fallback = ''): string {
  const value = process.env[name]
  if (value == null || value === '') {
    return fallback
  }
  return value.trim().replace(/\r/g, '')
}

export function readEnvFlag(name: string, fallback = false): boolean {
  const value = readEnv(name)
  if (!value) {
    return fallback
  }
  return value.toLowerCase() === 'true' || value === '1'
}
