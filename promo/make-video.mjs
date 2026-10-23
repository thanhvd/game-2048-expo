// Renders promo/2048-intro.mp4: SVG frames from the real engine + theme, `say` narration, ffmpeg mux.
// Run: node promo/make-video.mjs   (needs rsvg-convert, ffmpeg, macOS say)
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { move, newGame } from '../src/game/engine.ts'
import { palette, SUPER_COLOR, TILE_COLORS } from '../src/theme.ts'

const W = 1080, H = 1920, FPS = 30
const OUT = path.resolve(import.meta.dirname, '2048-intro.mp4')
const TMP = fs.mkdtempSync(path.join(process.env.TMPDIR ?? '/tmp', '2048-video-'))
const FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif'
const L = palette.light, D = palette.dark

// ---------- helpers ----------
const lerp = (a, b, p) => a + (b - a) * p
const clamp = (x) => Math.max(0, Math.min(1, x))
const easeOut = (p) => 1 - (1 - p) ** 3
const backOut = (p) => 1 + 2.7 * (p - 1) ** 3 + 1.7 * (p - 1) ** 2
const live = (tiles) => tiles.filter((t) => !t.consumed)
const seeded = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const state = (size, tiles) => ({
  size, score: 0, history: [], keepPlaying: false, nextId: tiles.length + 1,
  tiles: tiles.map(([value, row, col], i) => ({ id: i + 1, value, row, col })),
})

function text(x, y, str, size, fill, { weight = 700, anchor = 'middle', opacity = 1 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" opacity="${opacity}">${str}</text>`
}

function tile(x, y, s, value, scale = 1) {
  const c = TILE_COLORS[value] ?? SUPER_COLOR
  const d = String(value).length
  const fs = s * (d <= 2 ? 0.5 : d === 3 ? 0.4 : d === 4 ? 0.32 : 0.26) * scale
  const w = s * scale, o = (s - w) / 2
  return `<rect x="${x + o}" y="${y + o}" width="${w}" height="${w}" rx="${s * 0.07}" fill="${c.bg}"/>` +
    text(x + s / 2, y + s / 2 + fs * 0.35, value, fs, c.fg)
}

function board(x, y, w, size, tiles, pal = L) {
  const gap = w * 0.03, cell = (w - gap * (size + 1)) / size
  const at = (r, c) => [x + gap + c * (cell + gap), y + gap + r * (cell + gap)]
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${w}" rx="${w * 0.02}" fill="${pal.board}"/>`
  for (let i = 0; i < size * size; i++) {
    const [cx, cy] = at(Math.floor(i / size), i % size)
    s += `<rect x="${cx}" y="${cy}" width="${cell}" height="${cell}" rx="${cell * 0.07}" fill="${pal.cell}"/>`
  }
  for (const t of [...tiles].sort((a, b) => (a.z ?? 1) - (b.z ?? 1))) {
    if ((t.scale ?? 1) <= 0) continue
    s += tile(...at(t.row, t.col), cell, t.value, t.scale ?? 1)
  }
  return s
}

// Tiles at time t, replaying engine states: slide (eased), then merge pop / spawn zoom — like Board.tsx.
const SLIDE = 0.15, POP = 0.2
function frameTiles(states, times, t) {
  const k = times.findLastIndex((T) => t >= T)
  if (k < 0) return live(states[0].tiles)
  const prev = new Map(live(states[k].tiles).map((x) => [x.id, x]))
  const next = states[k + 1], dt = t - times[k]
  if (dt < SLIDE) {
    const p = easeOut(dt / SLIDE)
    return next.tiles.filter((x) => prev.has(x.id)).map((x) => {
      const a = prev.get(x.id)
      return { row: lerp(a.row, x.row, p), col: lerp(a.col, x.col, p), value: a.value, z: x.consumed ? 0 : 1 }
    })
  }
  const q = clamp((dt - SLIDE) / POP)
  return live(next.tiles).map((x) => {
    const a = prev.get(x.id)
    const scale = !a ? backOut(q) : a.value !== x.value ? 1 + 0.2 * Math.sin(Math.PI * q) : 1
    return { ...x, scale }
  })
}

// Play a sequence of moves; skips moves that don't change the board.
function playMoves(start, dirs, rand, t0, every) {
  const states = [start], times = []
  for (const d of dirs) {
    const s = move(states.at(-1), d, rand)
    if (s === states.at(-1)) continue
    states.push(s)
    times.push(t0 + times.length * every)
  }
  return { states, times, dirs: dirs.filter((_, i) => i < states.length - 1) }
}
const scoreAt = (pl, t) => pl.states[pl.times.filter((T) => t >= T + SLIDE).length].score

const VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
function swipeHint(cx, cy, dir, p) {
  if (p <= 0 || p >= 1) return ''
  const [dx, dy] = VEC[dir], r = 200 * lerp(-1, 1, easeOut(p))
  return `<circle cx="${cx + dx * r}" cy="${cy + dy * r}" r="44" fill="#ffffff" opacity="${0.75 * Math.sin(Math.PI * p)}" stroke="${L.text}" stroke-width="4"/>`
}

function chip(x, y, label, filled, pal = L) {
  const w = label.length * 22 + 60
  return `<rect x="${x - w / 2}" y="${y - 40}" width="${w}" height="72" rx="36" fill="${filled ? pal.primary : 'none'}" stroke="${pal.border}" stroke-width="${filled ? 0 : 3}"/>` +
    text(x, y + 8, label, 34, filled ? pal.onPrimary : pal.text, { weight: 600 })
}

function caption(t, title, sub, pal = L) {
  const p = easeOut(clamp(t / 0.4))
  return `<g opacity="${p}" transform="translate(0 ${(1 - p) * 30})">` +
    text(W / 2, 300, title, 78, pal.text) + (sub ? text(W / 2, 380, sub, 42, pal.muted, { weight: 500 }) : '') + '</g>'
}

const BX = 100, BY = 620, BW = 880 // main board placement

// ---------- scenes ----------
const intro = (() => {
  const rand = seeded(7)
  const g = newGame(4, rand)
  const pl = playMoves(g, ['left', 'down', 'right', 'down', 'left', 'down', 'right', 'up'], rand, 1.6, 0.45)
  return (t) => {
    const p = backOut(clamp(t / 0.6))
    return text(W / 2, 360, '2048', 220 * p, L.text) +
      text(W / 2, 470, 'Slide. Merge. Reach 2048.', 46, L.muted, { weight: 500, opacity: clamp((t - 0.5) / 0.4) }) +
      `<g opacity="${clamp((t - 0.8) / 0.4)}">${board(BX, BY, BW, 4, frameTiles(pl.states, pl.times, t))}</g>`
  }
})()

const swipe = (() => {
  const rand = seeded(42)
  const pl = playMoves(newGame(4, rand), ['right', 'down', 'left', 'down', 'right', 'up', 'left', 'down', 'right', 'down', 'left', 'down', 'right', 'down'], rand, 1.4, 0.75)
  return (t) => {
    const k = pl.times.findIndex((T) => t < T)
    const hint = k >= 0 ? swipeHint(BX + BW / 2, BY + BW / 2, pl.dirs[k], clamp((t - (pl.times[k] - 0.5)) / 0.5)) : ''
    return caption(t, 'Swipe to move', 'Up, down, left or right') +
      chip(W / 2, 1600, `Score ${scoreAt(pl, t)}`, true) +
      board(BX, BY, BW, 4, frameTiles(pl.states, pl.times, t)) + hint +
      text(W / 2, 1720, 'A new tile appears after every move', 36, L.muted, { weight: 500 })
  }
})()

const mergeStart = state(4, [[2, 0, 0], [2, 0, 1], [4, 0, 2], [4, 0, 3], [8, 2, 0], [8, 2, 2]])
const mergePlay = playMoves(mergeStart, ['left'], () => 0.5, 1.6, 1)
const merge = (t) => {
  const lt = t > 5 ? t - 3.6 : t // replay once
  const dt = lt - 1.6
  const float = dt > 0.2 && dt < 1.4
    ? text(W / 2 + 150, 1560 - dt * 80, '+28', 48, L.primary, { opacity: 1 - dt / 1.4 }) : ''
  return caption(t, 'Same numbers merge', '2 + 2 = 4 · 4 + 4 = 8 · 8 + 8 = 16') +
    chip(W / 2, 1600, `Score ${scoreAt(mergePlay, lt)}`, true) + float +
    board(BX, BY, BW, 4, frameTiles(mergePlay.states, mergePlay.times, lt)) +
    swipeHint(BX + BW / 2, BY + BW / 2, 'left', clamp((lt - 1.1) / 0.5)) +
    text(W / 2, 1720, 'Merged values add to your score', 36, L.muted, { weight: 500 })
}

const goal = (t) => {
  const vals = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024]
  const s = 200, g = 24, x0 = (W - (4 * s + 3 * g)) / 2
  let body = caption(t, 'Reach 2048 to win', 'Then keep going for a high score')
  vals.forEach((v, i) => {
    const sc = backOut(clamp((t - 0.6 - i * 0.28) / 0.25))
    if (sc > 0) body += tile(x0 + (i % 4) * (s + g), 640 + Math.floor(i / 4) * (s + g), s, v, sc)
  })
  const w = clamp((t - 4) / 0.5)
  if (w > 0) {
    body += `<rect width="${W}" height="${H}" fill="#000" opacity="${0.4 * w}"/>` +
      `<rect x="140" y="760" width="800" height="560" rx="40" fill="${L.dialog}" opacity="${w}"/>` +
      tile(W / 2 - 150, 800, 300, 2048, backOut(w)) +
      `<g opacity="${w}">` + text(W / 2, 1200, 'You win!', 64, L.text) +
      chip(W / 2 - 170, 1270, 'New game', false) + chip(W / 2 + 170, 1270, 'Keep playing', true) + '</g>'
  }
  return body
}

const features = (() => {
  const rand = seeded(3)
  const sizes = [3, 4, 5, 6].map((n) => {
    let s = newGame(n, rand)
    for (let i = 0; i < n * 4; i++) s = move(s, ['left', 'down', 'right', 'down'][i % 4], rand)
    return s
  })
  const demo = sizes[1]
  return (t, Dur) => {
    const part = Dur / 4, i = Math.min(3, Math.floor(t / part)), lt = t - i * part
    if (i === 0) {
      const tiles = frameTiles(mergePlay.states, mergePlay.times.map(() => 0.5), lt)
      const undone = lt > part * 0.6
      const press = undone && lt < part * 0.6 + 0.2
      return caption(lt, 'Undo', 'Take back your last move') +
        board(BX, BY, BW, 4, undone ? live(mergeStart.tiles) : tiles) +
        `<g transform="translate(${W / 2} 1640) scale(${press ? 0.92 : 1})">` +
        `<rect x="-130" y="-50" width="260" height="96" rx="20" fill="none" stroke="${L.border}" stroke-width="4"/>` +
        text(0, 14, '↶ Undo', 42, L.text, { weight: 600 }) + '</g>'
    }
    if (i === 1) {
      const s = 420, g = 40, x0 = (W - 2 * s - g) / 2
      return caption(lt, '4 board sizes', '3×3 · 4×4 · 5×5 · 6×6') + sizes.map((st, j) => {
        const op = clamp((lt - j * 0.25) / 0.3)
        const x = x0 + (j % 2) * (s + g), y = 560 + Math.floor(j / 2) * (s + 110)
        return `<g opacity="${op}">${board(x, y, s, st.size, live(st.tiles))}${text(x + s / 2, y + s + 62, `${st.size}×${st.size}`, 40, L.text)}</g>`
      }).join('')
    }
    if (i === 2) {
      const d = clamp((lt - part * 0.35) / 0.4)
      const one = (pal) => `<rect width="${W}" height="${H}" fill="${pal.bg}"/>` + caption(lt, 'Light and dark mode', 'Tap the moon / sun icon', pal) +
        board(BX, BY, BW, 4, live(demo.tiles), pal) + chip(W / 2, 1640, pal === D ? '☀ Dark mode' : '☾ Light mode', true, pal)
      return one(L) + `<g opacity="${d}">${one(D)}</g>`
    }
    const score = Math.round(lerp(1180, 2460, easeOut(clamp(lt / (part * 0.7)))))
    return caption(lt, 'Best score saved', 'For every board size') +
      board(BX, BY, BW, 4, live(demo.tiles)) +
      chip(W / 2 - 170, 1640, `Score ${score}`, true) + chip(W / 2 + 170, 1640, `Best ${Math.max(2000, score)}`, false)
  }
})()

const overBoard = state(4, Array.from({ length: 16 }, (_, i) => [[2, 4, 8, 16][(i + Math.floor(i / 4)) % 4], Math.floor(i / 4), i % 4]))
const outro = (t, Dur) => {
  const cut = Dur * 0.45
  if (t < cut) {
    const w = clamp((t - 1) / 0.4)
    return caption(t, 'No moves left?', 'The game ends when the board is full') + board(BX, BY, BW, 4, live(overBoard.tiles)) +
      `<rect width="${W}" height="${H}" fill="#000" opacity="${0.4 * w}"/>` +
      `<g opacity="${w}"><rect x="160" y="860" width="760" height="380" rx="40" fill="${L.dialog}"/>` +
      text(W / 2, 980, 'Game over', 64, L.text) + text(W / 2, 1050, 'Final score: 512', 40, L.text, { weight: 600 }) +
      chip(W / 2 - 140, 1160, 'Undo', false) + chip(W / 2 + 140, 1160, 'New game', true) + '</g>'
  }
  const lt = t - cut, p = backOut(clamp(lt / 0.6))
  return ['2', '0', '4', '8'].map((d, i) => {
    const s = 210, x = (W - 4 * s - 3 * 24) / 2 + i * (s + 24), sc = backOut(clamp((lt - i * 0.12) / 0.35))
    const c = TILE_COLORS[[2, 4, 8, 16][i]], w = s * sc, o = (s - w) / 2
    return sc > 0 ? `<rect x="${x + o}" y="${700 + o}" width="${w}" height="${w}" rx="16" fill="${c.bg}"/>` + text(x + s / 2, 700 + s / 2 + 50 * sc, d, 140 * sc, c.fg) : ''
  }).join('') +
    `<g opacity="${clamp((lt - 0.6) / 0.4)}">` + text(W / 2, 1060, 'Ready to play?', 64, L.text) +
    `<g transform="translate(${W / 2} 1220) scale(${p})"><rect x="-200" y="-60" width="400" height="120" rx="24" fill="${L.primary}"/>` +
    text(0, 16, 'New game', 48, L.onPrimary) + '</g></g>'
}

const SCENES = [
  [intro, 'Welcome to 2048. A simple sliding puzzle that is easy to learn, and hard to master.'],
  [swipe, 'Swipe up, down, left, or right. Every tile slides as far as it can, and a new tile appears after each move.'],
  [merge, 'When two tiles with the same number touch, they merge into one. Their new value is added to your score.'],
  [goal, 'Keep merging. Two, four, eight, all the way up. Reach the 2048 tile to win, then keep playing for an even higher score.'],
  [features, 'Made a mistake? Tap undo. Pick a board from three by three, up to six by six. Switch between light and dark mode. And your best score is saved for every board size.'],
  [outro, 'The game ends when the board is full and no moves are left. Ready? Start a new game of 2048.'],
]

// ---------- narration ----------
const LEAD = 0.5
let start = 0
const timeline = SCENES.map(([fn, line], i) => {
  const aiff = path.join(TMP, `vo${i}.aiff`)
  execSync(`say -v Samantha -r 175 -o "${aiff}" ${JSON.stringify(line)}`)
  const len = Number(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${aiff}"`).toString())
  const dur = Math.max(5, LEAD + len + 0.9)
  const s = { fn, aiff, start, dur }
  start += dur
  return s
})
const total = start

// ---------- frames ----------
const frames = Math.ceil(total * FPS)
for (let f = 0; f < frames; f++) {
  const t = f / FPS
  const sc = timeline.findLast((s) => t >= s.start)
  const lt = t - sc.start
  const fade = Math.min(1, lt / 0.25, (sc.dur - lt) / 0.25)
  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<rect width="${W}" height="${H}" fill="${L.bg}"/><g opacity="${fade}">${sc.fn(lt, sc.dur)}</g></svg>`
  fs.writeFileSync(path.join(TMP, `f${String(f).padStart(5, '0')}.svg`), svg)
}
console.log(`${frames} frames, ${total.toFixed(1)}s → rasterizing`)
execSync(`cd "${TMP}" && ls f*.svg | xargs -P 8 -I{} sh -c 'rsvg-convert "$1" -o "\${1%.svg}.png"' _ {}`, { stdio: 'inherit' })

const inputs = timeline.map((s) => `-i "${s.aiff}"`).join(' ')
const delays = timeline.map((s, i) => `[${i + 1}:a]adelay=${Math.round((s.start + LEAD) * 1000)}:all=1[a${i}]`).join(';')
const mix = timeline.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${timeline.length}:normalize=0[a]`
execSync(
  `ffmpeg -y -v error -framerate ${FPS} -i "${TMP}/f%05d.png" ${inputs} -filter_complex "${delays};${mix}" ` +
    `-map 0:v -map "[a]" -c:v libx264 -pix_fmt yuv420p -crf 20 -c:a aac -b:a 160k -t ${total} "${OUT}"`,
  { stdio: 'inherit' },
)
fs.rmSync(TMP, { recursive: true })
console.log(`wrote ${OUT}`)
