import type { ThemeMode } from './storage'

export type Palette = {
  bg: string
  text: string
  muted: string
  board: string
  cell: string
  primary: string
  onPrimary: string
  border: string
  dialog: string
  backdrop: string
}

export const palette: Record<ThemeMode, Palette> = {
  light: {
    bg: '#faf8ef',
    text: '#776e65',
    muted: '#8f857b',
    board: '#bbada0',
    cell: '#cdc1b4',
    primary: '#8f7a66',
    onPrimary: '#f9f6f2',
    border: '#bbada0',
    dialog: '#ffffff',
    backdrop: 'rgba(0,0,0,0.4)',
  },
  dark: {
    bg: '#1c1c1e',
    text: '#f2f2f7',
    muted: '#a1a1a6',
    board: '#3a3a3c',
    cell: '#4a4a4e',
    primary: '#edc22e',
    onPrimary: '#1c1c1e',
    border: '#5a5a5e',
    dialog: '#2c2c2e',
    backdrop: 'rgba(0,0,0,0.6)',
  },
}

export const TILE_COLORS: Record<number, { bg: string; fg: string }> = {
  2: { bg: '#eee4da', fg: '#776e65' },
  4: { bg: '#ede0c8', fg: '#776e65' },
  8: { bg: '#f2b179', fg: '#f9f6f2' },
  16: { bg: '#f59563', fg: '#f9f6f2' },
  32: { bg: '#f67c5f', fg: '#f9f6f2' },
  64: { bg: '#f65e3b', fg: '#f9f6f2' },
  128: { bg: '#edcf72', fg: '#f9f6f2' },
  256: { bg: '#edcc61', fg: '#f9f6f2' },
  512: { bg: '#edc850', fg: '#f9f6f2' },
  1024: { bg: '#edc53f', fg: '#f9f6f2' },
  2048: { bg: '#edc22e', fg: '#f9f6f2' },
}
export const SUPER_COLOR = { bg: '#3c3a32', fg: '#f9f6f2' }
