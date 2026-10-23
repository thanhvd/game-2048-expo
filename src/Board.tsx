import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import Animated, { Keyframe, LinearTransition, ZoomIn } from 'react-native-reanimated'
import type { Direction, Tile } from './game/engine'
import { type Palette, SUPER_COLOR, TILE_COLORS } from './theme'

const GAP = 0.03 // fraction of board width, same as the web app's 3cqw
const SLIDE_MS = 100
const POP_MS = 150
const MIN_SWIPE_PX = 30

const slide = LinearTransition.duration(SLIDE_MS)
// Pop after the slide, like the web app.
const spawnPop = ZoomIn.delay(SLIDE_MS).duration(POP_MS)
const mergePop = new Keyframe({
  0: { transform: [{ scale: 1 }] },
  50: { transform: [{ scale: 1.2 }] },
  100: { transform: [{ scale: 1 }] },
})
  .delay(SLIDE_MS)
  .duration(POP_MS)

const fontFactor = (digits: number) => (digits <= 2 ? 0.5 : digits === 3 ? 0.4 : digits === 4 ? 0.32 : 0.26)

type Props = {
  size: number
  tiles: Tile[]
  spawnFrom: number // tiles with id >= spawnFrom appeared this move
  animate: boolean
  colors: Palette
  onSwipe: (dir: Direction) => void
}

export default function Board({ size, tiles, spawnFrom, animate, colors, onSwipe }: Props) {
  const { width } = useWindowDimensions()
  const board = Math.min(width - 32, 480)
  const gap = board * GAP
  const cell = (board - gap * (size + 1)) / size
  const at = (row: number, col: number) => ({ left: gap + col * (cell + gap), top: gap + row * (cell + gap) })
  const square = { position: 'absolute', width: cell, height: cell, borderRadius: 6 } as const

  const pan = usePanGesture({
    runOnJS: true,
    onDeactivate: (e) => {
      const dx = e.translationX
      const dy = e.translationY
      if (e.canceled || Math.max(Math.abs(dx), Math.abs(dy)) < MIN_SWIPE_PX) return
      if (Math.abs(dx) > Math.abs(dy)) onSwipe(dx > 0 ? 'right' : 'left')
      else onSwipe(dy > 0 ? 'down' : 'up')
    },
  })

  return (
    <GestureDetector gesture={pan}>
      <View
        accessibilityLabel={`${size} by ${size} game board`}
        style={{ width: board, height: board, borderRadius: 10, backgroundColor: colors.board }}
      >
        {Array.from({ length: size * size }, (_, i) => (
          <View
            key={`cell-${i}`}
            style={[square, at(Math.floor(i / size), i % size), { backgroundColor: colors.cell }]}
          />
        ))}
        {tiles.map((t) => {
          const color = TILE_COLORS[t.value] ?? SUPER_COLOR
          const spawned = t.id >= spawnFrom
          return (
            <Animated.View
              key={t.id}
              layout={animate ? slide : undefined}
              entering={animate && spawned ? spawnPop : undefined}
              style={[square, at(t.row, t.col), { zIndex: t.consumed ? 1 : 2 }]}
            >
              {/* Remounts when the value changes, so a merged tile pops. */}
              <Animated.View
                key={`${t.id}-${t.value}`}
                entering={animate && !spawned && !t.consumed ? mergePop : undefined}
                style={[styles.face, { backgroundColor: color.bg }]}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[styles.value, { color: color.fg, fontSize: cell * fontFactor(String(t.value).length) }]}
                >
                  {t.value}
                </Text>
              </Animated.View>
            </Animated.View>
          )
        })}
      </View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  face: { flex: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  value: { fontWeight: '700', paddingHorizontal: 4 },
})
