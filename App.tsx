import { useEffect, useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Game from './src/Game'
import { type BestScores, loadBest, loadTheme, type ThemeMode } from './src/storage'

type Saved = { best: BestScores; theme: ThemeMode | null }

// Load saved data before mounting the game so it starts with real best scores
// and the first save can't overwrite storage with an empty object.
export default function App() {
  const [saved, setSaved] = useState<Saved | null>(null)

  useEffect(() => {
    Promise.all([loadBest(), loadTheme()]).then(([best, theme]) => setSaved({ best, theme }))
  }, [])

  if (!saved) return null
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Game initialBest={saved.best} initialTheme={saved.theme} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
