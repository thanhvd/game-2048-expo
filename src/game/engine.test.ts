import { describe, expect, it } from 'vitest'
import { type GameState, keepPlaying, move, newGame, SIZES, status, undo } from './engine'

const fromGrid = (grid: number[][], extra: Partial<GameState> = {}): GameState => {
  const tiles = grid.flatMap((row, r) =>
    row.flatMap((value, c) => (value ? [{ id: r * 10 + c + 1, value, row: r, col: c }] : [])),
  )
  return { tiles, score: 0, nextId: 100, size: grid.length, history: [], keepPlaying: false, ...extra }
}

const toGrid = (s: GameState): number[][] => {
  const grid = Array.from({ length: s.size }, () => Array(s.size).fill(0))
  for (const t of s.tiles) if (!t.consumed) grid[t.row][t.col] = t.value
  return grid
}

// rand sequence; the last value repeats
const seq = (...vals: number[]) => () => (vals.length > 1 ? vals.shift()! : vals[0])

// Removes the tile spawned by a move so slide/merge results can be compared exactly.
const withoutSpawn = (before: GameState, after: GameState) => {
  const grid = toGrid({ ...after, tiles: after.tiles.filter((t) => t.id < before.nextId) })
  return grid
}

const row = (r: number[]) => fromGrid([r, [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]])

describe('newGame', () => {
  it('starts with 2 tiles, score 0, empty history', () => {
    const s = newGame(4)
    expect(s.size).toBe(4)
    expect(s.tiles).toHaveLength(2)
    expect(s.score).toBe(0)
    expect(s.history).toEqual([])
    expect(status(s)).toBe('playing')
  })
})

describe('slide and merge', () => {
  it.each([
    [[0, 2, 0, 4], 'left', [2, 4, 0, 0]],
    [[2, 2, 4, 0], 'left', [4, 4, 0, 0]],
    [[2, 2, 2, 2], 'left', [4, 4, 0, 0]],
    [[2, 2, 2, 0], 'right', [0, 0, 2, 4]],
    [[4, 4, 8, 8], 'right', [0, 0, 8, 16]],
  ] as const)('%j %s -> %j', (input, dir, expected) => {
    const s = row([...input])
    expect(withoutSpawn(s, move(s, dir))[0]).toEqual(expected)
  })

  it('slides a column down', () => {
    const s = fromGrid([
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [4, 0, 0, 0],
    ])
    expect(withoutSpawn(s, move(s, 'down')).map((r) => r[0])).toEqual([0, 0, 2, 4])
  })

  it('keeps the edge tile id on merge and marks the other consumed', () => {
    const s = row([2, 2, 0, 0])
    const next = move(s, 'left')
    expect(next.tiles.find((t) => t.id === 1)).toMatchObject({ value: 4, col: 0 })
    expect(next.tiles.find((t) => t.id === 2)).toMatchObject({ consumed: true, col: 0 })
  })

  it('drops consumed tiles on the next move', () => {
    const s = move(move(row([2, 2, 0, 0]), 'left', seq(0.99, 0)), 'right', seq(0))
    expect(s.tiles.filter((t) => t.consumed && t.id === 2)).toHaveLength(0)
  })
})

describe('scoring, spawning, no-change', () => {
  it('adds merged values to the score', () => {
    const s = row([2, 2, 4, 4])
    expect(move(s, 'left').score).toBe(12)
  })

  it('spawns exactly one 2 or 4 in an empty cell after a changing move', () => {
    const s = row([0, 0, 0, 2])
    const next = move(s, 'left')
    const spawned = next.tiles.filter((t) => t.id >= s.nextId)
    expect(spawned).toHaveLength(1)
    expect([2, 4]).toContain(spawned[0].value)
    expect(spawned[0]).not.toMatchObject({ row: 0, col: 0 })
  })

  it('spawns a 2 below 0.9 and a 4 at or above it', () => {
    const s = row([0, 0, 0, 2])
    expect(move(s, 'left', seq(0, 0.89)).tiles.at(-1)!.value).toBe(2)
    expect(move(s, 'left', seq(0, 0.9)).tiles.at(-1)!.value).toBe(4)
  })

  it('returns the same state for a blocked move', () => {
    const s = fromGrid([
      [2, 4, 0, 0],
      [8, 16, 0, 0],
      [2, 4, 0, 0],
      [8, 16, 0, 0],
    ])
    expect(move(s, 'left')).toBe(s)
  })
})

describe('status', () => {
  it('is won when a 2048 tile exists', () => {
    const s = row([1024, 1024, 0, 0])
    expect(status(move(s, 'left'))).toBe('won')
  })

  it('is not won again after keep playing, and accepts moves', () => {
    const s = keepPlaying(move(row([1024, 1024, 0, 0]), 'left'))
    expect(status(s)).toBe('playing')
    expect(move(s, 'right')).not.toBe(s)
  })

  it('is over on a full board with no equal neighbors and rejects moves', () => {
    const s = fromGrid([
      [2, 4, 2],
      [4, 2, 4],
      [2, 4, 2],
    ])
    expect(status(s)).toBe('over')
    for (const dir of ['up', 'down', 'left', 'right'] as const) expect(move(s, dir)).toBe(s)
  })

  it('is playing on a full board with an equal neighbor', () => {
    const s = fromGrid([
      [2, 2, 4],
      [4, 8, 2],
      [2, 4, 8],
    ])
    expect(status(s)).toBe('playing')
  })
})

describe('undo', () => {
  it('restores tiles and score exactly', () => {
    const s = row([2, 2, 4, 4])
    const back = undo(move(s, 'left'))
    expect(back.tiles).toEqual(s.tiles)
    expect(back.score).toBe(0)
    expect(back.history).toEqual([])
  })

  it('undoes multiple moves in order', () => {
    const s0 = row([2, 0, 0, 0])
    const s1 = move(s0, 'right')
    const s2 = move(s1, 'down')
    expect(undo(undo(s2)).tiles).toEqual(s0.tiles)
  })

  it('returns to playing from game over', () => {
    const s = fromGrid([
      [2, 4, 2],
      [4, 2, 4],
      [4, 4, 2],
    ])
    const over = move(s, 'right', seq(0, 0.5)) // [4,4,2] -> [0,8,2], spawn 2 in (2,0)
    expect(status(over)).toBe('over')
    const back = undo(over)
    expect(status(back)).toBe('playing')
    expect(toGrid(back)).toEqual(toGrid(s))
  })

  it('is a no-op with empty history', () => {
    const s = newGame(4)
    expect(undo(s)).toBe(s)
  })

  it('drops consumed tiles', () => {
    const s = move(move(row([2, 2, 0, 0]), 'left'), 'right')
    expect(undo(s).tiles.some((t) => t.consumed)).toBe(false)
  })
})

describe('board sizes', () => {
  it.each(SIZES)('works on %ix%i', (size) => {
    const s = newGame(size)
    expect(s.tiles).toHaveLength(2)
    const moved = (['left', 'right', 'up', 'down'] as const).map((d) => move(s, d)).find((n) => n !== s)!
    expect(moved.tiles).toHaveLength(3) // 2 start tiles + 1 spawn (a merged-away tile is still listed as consumed)
    expect(moved.tiles.every((t) => t.row < size && t.col < size)).toBe(true)
  })
})
