import '@testing-library/jest-dom'

// Deterministic in-memory Web Storage, independent of the Node/jsdom version
// (Node >= 22 ships an experimental global `localStorage` that shadows jsdom's).
class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  Object.defineProperty(window, name, { value: new MemoryStorage(), configurable: true, writable: true })
  Object.defineProperty(globalThis, name, { value: window[name], configurable: true, writable: true })
}
