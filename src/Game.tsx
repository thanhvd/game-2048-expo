import { useEffect, useReducer, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { StatusBar } from 'expo-status-bar'
import { useReducedMotion } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import Board from './Board'
import { type Direction, type GameState, keepPlaying, move, newGame, SIZES, status, undo } from './game/engine'
import { type BestScores, saveBest, saveTheme, type ThemeMode } from './storage'
import { type Palette, palette } from './theme'

// gen changes on every new game so the board remounts: tile ids restart at 1 and must not slide from the old game.
type State = { game: GameState; animate: boolean; best: BestScores; gen: number }
// Random numbers are drawn before dispatch so the reducer stays pure (StrictMode runs it twice).
type Action =
  | { type: 'move'; dir: Direction; rolls: number[] }
  | { type: 'newGame'; size: number; rolls: number[] }
  | { type: 'undo' }
  | { type: 'keepPlaying' }

const rolls = () => Array.from({ length: 4 }, () => Math.random())
const fromRolls = (r: number[]) => {
  let i = 0
  return () => r[i++ % r.length]
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'move': {
      const game = move(state.game, action.dir, fromRolls(action.rolls))
      // Best only ever rises, so undo can't lower it.
      const best =
        game.score > (state.best[game.size] ?? 0) ? { ...state.best, [game.size]: game.score } : state.best
      return { ...state, game, animate: true, best }
    }
    case 'newGame':
      return { ...state, game: newGame(action.size, fromRolls(action.rolls)), animate: true, gen: state.gen + 1 }
    case 'undo':
      return { ...state, game: undo(state.game), animate: false }
    case 'keepPlaying':
      return { ...state, game: keepPlaying(state.game), animate: false }
  }
}

type Props = { initialBest: BestScores; initialTheme: ThemeMode | null }

export default function Game({ initialBest, initialTheme }: Props) {
  const [{ game, animate, best, gen }, dispatch] = useReducer(reducer, undefined, () => ({
    game: newGame(4),
    animate: true,
    best: initialBest,
    gen: 0,
  }))
  const [savedTheme, setSavedTheme] = useState(initialTheme)
  const scheme = useColorScheme()
  const reducedMotion = useReducedMotion()
  const mode: ThemeMode = savedTheme ?? (scheme === 'dark' ? 'dark' : 'light')
  const c = palette[mode]
  const s = makeStyles(c)

  const state = status(game)
  const canUndo = game.history.length > 0

  useEffect(() => {
    if (best !== initialBest) saveBest(best)
  }, [best, initialBest])

  const startNew = (size = game.size) => dispatch({ type: 'newGame', size, rolls: rolls() })
  const toggleTheme = () => {
    const next = mode === 'dark' ? 'light' : 'dark'
    setSavedTheme(next)
    saveTheme(next)
  }

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <View style={s.row}>
        <Text style={s.title}>2048</Text>
        <View style={s.group}>
          <View style={[s.chip, s.filled]}>
            <Text style={s.filledText} accessibilityLiveRegion="polite">
              Score {game.score}
            </Text>
          </View>
          <View style={[s.chip, s.outlined]}>
            <Text style={s.text}>Best {best[game.size] ?? 0}</Text>
          </View>
          <Pressable
            onPress={toggleTheme}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
          >
            <Ionicons name={mode === 'dark' ? 'sunny' : 'moon'} size={24} color={c.text} />
          </Pressable>
        </View>
      </View>

      <View style={s.row}>
        <View style={s.group}>
          <Pressable style={[s.button, s.filled]} onPress={() => startNew()} accessibilityRole="button">
            <Text style={s.filledText}>New game</Text>
          </Pressable>
          <Pressable
            style={[s.button, s.outlined, !canUndo && s.disabled]}
            disabled={!canUndo}
            onPress={() => dispatch({ type: 'undo' })}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canUndo }}
          >
            <Ionicons name="arrow-undo" size={16} color={c.text} />
            <Text style={s.text}>Undo</Text>
          </Pressable>
        </View>
        <View style={[s.group, s.sizes]} accessibilityLabel="Board size">
          {SIZES.map((n) => (
            <Pressable
              key={n}
              style={[s.size, n === game.size && s.filled]}
              onPress={() => n !== game.size && startNew(n)}
              accessibilityRole="button"
              accessibilityState={{ selected: n === game.size }}
            >
              <Text style={n === game.size ? s.filledText : s.text}>
                {n}×{n}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Board
        key={gen}
        size={game.size}
        tiles={game.tiles}
        spawnFrom={game.history.at(-1)?.nextId ?? 0}
        animate={animate && !reducedMotion}
        colors={c}
        onSwipe={(dir) => state === 'playing' && dispatch({ type: 'move', dir, rolls: rolls() })}
      />

      <Text style={s.hint}>Swipe on the board to move</Text>

      {/* onRequestClose is a no-op so the Android back button can't dismiss the dialogs. */}
      <Modal transparent animationType="fade" visible={state === 'won'} onRequestClose={() => {}}>
        <View style={s.backdrop}>
          <View style={s.dialog}>
            <Text style={s.dialogTitle}>You win!</Text>
            <Text style={s.text}>You reached 2048 with a score of {game.score}.</Text>
            <View style={s.actions}>
              <Pressable style={[s.button, s.outlined]} onPress={() => startNew()} accessibilityRole="button">
                <Text style={s.text}>New game</Text>
              </Pressable>
              <Pressable
                style={[s.button, s.filled]}
                onPress={() => dispatch({ type: 'keepPlaying' })}
                accessibilityRole="button"
              >
                <Text style={s.filledText}>Keep playing</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="fade" visible={state === 'over'} onRequestClose={() => {}}>
        <View style={s.backdrop}>
          <View style={s.dialog}>
            <Text style={s.dialogTitle}>Game over</Text>
            <Text style={s.text}>Final score: {game.score}</Text>
            <View style={s.actions}>
              <Pressable
                style={[s.button, s.outlined, !canUndo && s.disabled]}
                disabled={!canUndo}
                onPress={() => dispatch({ type: 'undo' })}
                accessibilityRole="button"
              >
                <Text style={s.text}>Undo</Text>
              </Pressable>
              <Pressable style={[s.button, s.filled]} onPress={() => startNew()} accessibilityRole="button">
                <Text style={s.filledText}>New game</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg, alignItems: 'center', paddingTop: 24, gap: 16 },
    row: {
      width: '100%',
      maxWidth: 480,
      paddingHorizontal: 16,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    group: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 44, fontWeight: '700', color: c.text },
    text: { color: c.text, fontWeight: '600' },
    filledText: { color: c.onPrimary, fontWeight: '600' },
    chip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
    filled: { backgroundColor: c.primary, borderColor: c.primary },
    outlined: { borderWidth: 1, borderColor: c.border },
    button: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
    disabled: { opacity: 0.4 },
    sizes: { gap: 0, borderWidth: 1, borderColor: c.border, borderRadius: 8, overflow: 'hidden' },
    size: { paddingHorizontal: 10, paddingVertical: 8 },
    hint: { color: c.muted, fontSize: 13 },
    backdrop: { flex: 1, backgroundColor: c.backdrop, alignItems: 'center', justifyContent: 'center', padding: 32 },
    dialog: { width: '100%', maxWidth: 360, backgroundColor: c.dialog, borderRadius: 16, padding: 24, gap: 12 },
    dialogTitle: { fontSize: 22, fontWeight: '700', color: c.text },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  })
