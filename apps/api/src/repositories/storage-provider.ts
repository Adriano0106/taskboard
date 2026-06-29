import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, normalize } from 'node:path'

export interface StorageProvider {
  delete(storageKey: string): Promise<void>
  read(storageKey: string): Promise<Buffer>
  write(storageKey: string, content: Buffer): Promise<void>
}

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly rootDirectory: string) {}

  async delete(storageKey: string) {
    await rm(this.resolveStoragePath(storageKey), {
      force: true,
    })
  }

  async read(storageKey: string) {
    return readFile(this.resolveStoragePath(storageKey))
  }

  async write(storageKey: string, content: Buffer) {
    const storagePath = this.resolveStoragePath(storageKey)

    await mkdir(dirname(storagePath), {
      recursive: true,
    })
    await writeFile(storagePath, content)
  }

  private resolveStoragePath(storageKey: string) {
    const storageRoot = normalize(this.rootDirectory)
    const storagePath = normalize(join(storageRoot, storageKey))

    if (!storagePath.startsWith(storageRoot)) {
      throw new Error('Invalid storage key')
    }

    return storagePath
  }
}
