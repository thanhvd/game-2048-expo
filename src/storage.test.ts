import { beforeEach, describe, expect, it, vi } from 'vitest'

const data = new Map<string, string>()
const store = {
  getItem: vi.fn(async (k: string) => data.get(k) ?? null),
  setItem: vi.fn(async (k: string, v: string) => void data.set(k, v)),
}
vi.mock('@react-native-async-storage/async-storage', () => ({ default: store }))

const { loadBest, loadTheme, saveBest, saveTheme } = await import('./storage')

beforeEach(() => {
  data.clear()
  vi.clearAllMocks()
})

describe('storage', () => {
  it('round-trips best scores and theme', async () => {
    await saveBest({ 4: 1200, 5: 500 })
    await saveTheme('dark')
    expect(await loadBest()).toEqual({ 4: 1200, 5: 500 })
    expect(await loadTheme()).toBe('dark')
  })

  it('returns defaults when nothing is saved', async () => {
    expect(await loadBest()).toEqual({})
    expect(await loadTheme()).toBeNull()
  })

  it('returns defaults for invalid data', async () => {
    data.set('2048.best', '{not json')
    data.set('2048.theme', 'purple')
    expect(await loadBest()).toEqual({})
    expect(await loadTheme()).toBeNull()
  })

  it('drops invalid best entries', async () => {
    data.set('2048.best', '{"4": 100, "5": "x", "6": -1}')
    expect(await loadBest()).toEqual({ 4: 100 })
  })

  it('returns defaults and does not throw when storage throws', async () => {
    const boom = async () => {
      throw new Error('blocked')
    }
    store.getItem.mockImplementation(boom)
    store.setItem.mockImplementation(boom)
    expect(await loadBest()).toEqual({})
    expect(await loadTheme()).toBeNull()
    await expect(saveBest({ 4: 1 })).resolves.toBeUndefined()
    await expect(saveTheme('light')).resolves.toBeUndefined()
  })
})
