import AsyncStorage from '@react-native-async-storage/async-storage'

export type ThemeMode = 'light' | 'dark'
export type BestScores = Record<number, number>

const BEST_KEY = '2048.best'
const THEME_KEY = '2048.theme'

// Storage can fail or hold garbage; never let that break the game.
async function read(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key)
  } catch {
    return null
  }
}

async function write(key: string, value: string) {
  try {
    await AsyncStorage.setItem(key, value)
  } catch {
    // ignore: preferences just won't persist
  }
}

export async function loadBest(): Promise<BestScores> {
  try {
    const parsed: unknown = JSON.parse((await read(BEST_KEY)) ?? '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => typeof v === 'number' && Number.isFinite(v) && v >= 0),
    )
  } catch {
    return {}
  }
}

export const saveBest = (best: BestScores) => write(BEST_KEY, JSON.stringify(best))

export async function loadTheme(): Promise<ThemeMode | null> {
  const v = await read(THEME_KEY)
  return v === 'light' || v === 'dark' ? v : null
}

export const saveTheme = (mode: ThemeMode) => write(THEME_KEY, mode)
