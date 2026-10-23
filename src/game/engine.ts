export type Direction = 'up' | 'down' | 'left' | 'right'
export type Status = 'playing' | 'won' | 'over'
export type Rand = () => number

// consumed: merged into another tile this move; rendered once so it can slide into the merge, then dropped.
export type Tile = { id: number; value: number; row: number; col: number; consumed?: boolean }
export type Snapshot = { tiles: Tile[]; score: number; nextId: number }
export type GameState = Snapshot & { size: number; history: Snapshot[]; keepPlaying: boolean }

export const SIZES = [3, 4, 5, 6] as const
export const WIN_VALUE = 2048

const live = (tiles: Tile[]): Tile[] => tiles.filter((t) => !t.consumed)

function spawn(snap: Snapshot, size: number, rand: Rand): Snapshot {
  const occupied = new Set(live(snap.tiles).map((t) => t.row * size + t.col))
  const empty: number[] = []
  for (let i = 0; i < size * size; i++) if (!occupied.has(i)) empty.push(i)
  if (empty.length === 0) return snap
  const cell = empty[Math.floor(rand() * empty.length)]
  const value = rand() < 0.9 ? 2 : 4
  const tile = { id: snap.nextId, value, row: Math.floor(cell / size), col: cell % size }
  return { ...snap, tiles: [...snap.tiles, tile], nextId: snap.nextId + 1 }
}

export function newGame(size: number, rand: Rand = Math.random): GameState {
  let snap: Snapshot = { tiles: [], score: 0, nextId: 1 }
  snap = spawn(spawn(snap, size, rand), size, rand)
  return { ...snap, size, history: [], keepPlaying: false }
}

function canMove(state: GameState): boolean {
  const tiles = live(state.tiles)
  const { size } = state
  if (tiles.length < size * size) return true
  const grid = new Map(tiles.map((t) => [t.row * size + t.col, t.value]))
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = grid.get(r * size + c)
      if (c + 1 < size && grid.get(r * size + c + 1) === v) return true
      if (r + 1 < size && grid.get((r + 1) * size + c) === v) return true
    }
  }
  return false
}

// Won is checked before over so a winning final move still shows the win.
export function status(state: GameState): Status {
  if (!state.keepPlaying && live(state.tiles).some((t) => t.value >= WIN_VALUE)) return 'won'
  return canMove(state) ? 'playing' : 'over'
}

export function move(state: GameState, dir: Direction, rand: Rand = Math.random): GameState {
  if (status(state) !== 'playing') return state
  const { size } = state
  const tiles = live(state.tiles)
  const vertical = dir === 'up' || dir === 'down'
  const towardStart = dir === 'up' || dir === 'left'
  const posOf = (t: Tile) => (vertical ? t.row : t.col)
  const place = (t: Tile, idx: number): Tile => {
    const p = towardStart ? idx : size - 1 - idx
    return vertical ? { ...t, row: p } : { ...t, col: p }
  }

  const out: Tile[] = []
  let gained = 0
  let changed = false
  for (let line = 0; line < size; line++) {
    const lineTiles = tiles
      .filter((t) => (vertical ? t.col : t.row) === line)
      .sort((a, b) => (towardStart ? posOf(a) - posOf(b) : posOf(b) - posOf(a)))
    let last: Tile | undefined
    let lastMerged = false
    let idx = 0
    for (const t of lineTiles) {
      if (last && !lastMerged && last.value === t.value) {
        last.value *= 2
        gained += last.value
        lastMerged = true
        out.push(place({ ...t, consumed: true }, idx - 1))
        changed = true
      } else {
        last = place(t, idx++)
        lastMerged = false
        if (posOf(last) !== posOf(t)) changed = true
        out.push(last)
      }
    }
  }
  if (!changed) return state

  const prev: Snapshot = { tiles, score: state.score, nextId: state.nextId }
  const next = spawn({ tiles: out, score: state.score + gained, nextId: state.nextId }, size, rand)
  return { ...state, ...next, history: [...state.history, prev] }
}

export function undo(state: GameState): GameState {
  const prev = state.history.at(-1)
  if (!prev) return state
  return { ...state, ...prev, history: state.history.slice(0, -1) }
}

export const keepPlaying = (state: GameState): GameState => ({ ...state, keepPlaying: true })
