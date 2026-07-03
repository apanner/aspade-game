import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')

async function ensureDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
}

export const storage = {
  getStatus() {
    return { provider: 'local' as const }
  },

  async saveFile(key: string, data: unknown): Promise<boolean> {
    const filePath = path.join(DATA_DIR, key)
    await ensureDir(filePath)
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  },

  async loadFile(key: string): Promise<unknown> {
    const filePath = path.join(DATA_DIR, key)
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as unknown
  },

  async deleteFile(key: string): Promise<boolean> {
    const filePath = path.join(DATA_DIR, key)
    await fs.unlink(filePath)
    return true
  },

  async listFiles(prefix = ''): Promise<string[]> {
    const dir = path.join(DATA_DIR, prefix)
    try {
      const entries = await fs.readdir(dir, { recursive: true, withFileTypes: true })
      return entries
        .filter((e) => e.isFile())
        .map((e) => path.join(e.parentPath ?? dir, e.name).replace(DATA_DIR + path.sep, '').replace(/\\/g, '/'))
    } catch {
      return []
    }
  },
}
