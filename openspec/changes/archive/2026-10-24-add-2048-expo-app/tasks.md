# Tasks

## 1. Project setup

- [x] 1.1 Generate `create-expo-app --template blank-typescript` (SDK 58) in a temp folder, copy its files into this project (keeping `.claude/` and `openspec/`), set the app name to "2048" and portrait orientation in `app.json`, and verify `npx tsc --noEmit` passes
- [x] 1.2 Add `react-native-reanimated`, `react-native-gesture-handler`, `react-native-safe-area-context` and `@react-native-async-storage/async-storage` via `npx expo install`, add dev dependency `vitest` and a `"test": "vitest run"` script, and verify `npx expo export --platform ios` and `--platform android` both bundle without errors

## 2. Game engine

- [x] 2.1 Copy `engine.ts` and `engine.test.ts` verbatim from `../game-2048/src/game/` into `src/game/` and verify `npm test` passes all engine tests

## 3. Persistence and theme

- [x] 3.1 Implement `src/storage.ts` (async `loadBest`/`saveBest`/`loadTheme`/`saveTheme` on AsyncStorage, with validation and try/catch) plus `src/storage.test.ts` with AsyncStorage mocked, and verify tests cover round-trip, invalid JSON and a throwing store
- [x] 3.2 Add `src/theme.ts` with light/dark palettes and the tile color map, and verify `tsc --noEmit` passes

## 4. Board

- [x] 4.1 Implement `src/Board.tsx`: background cells and absolutely positioned tiles sized from `useWindowDimensions`, digit-based font size with `adjustsFontSizeToFit`, then verify it type-checks and bundles
- [x] 4.2 Add Reanimated slide (`LinearTransition`), spawn pop (`ZoomIn`), merge pop (`Keyframe` on inner view keyed `${id}-${value}`), consumed tiles below survivors, and no animation when `animate` is false, then verify it type-checks and bundles
- [x] 4.3 Add the `Gesture.Pan` swipe (dominant axis, 30 px minimum) on the board and verify it type-checks and bundles

## 5. Game screen

- [x] 5.1 Implement `src/Game.tsx` with the reducer copied from the web app (move with pre-drawn rolls, newGame, undo, keepPlaying, best in state), the header (title, score, best, theme toggle), new game and undo buttons (undo disabled when history is empty) and the size selector, then verify it type-checks
- [x] 5.2 Add win and game over `Modal` dialogs that the Android back button can't dismiss, with moves blocked while open, and verify it type-checks
- [x] 5.3 Implement `App.tsx`: load storage, then mount `<Game>` inside `GestureHandlerRootView` and `SafeAreaProvider`; save best and theme on change; status bar follows theme; reduced motion via `useReducedMotion()`. Verify `npm test`, `tsc --noEmit` and both `expo export` bundles pass

## 6. On-device check

- [x] 6.1 Run `npx expo start` and play on a phone with Expo Go (or a simulator if available): swipes move and slide, tap does nothing, undo, all 4 sizes, dark mode toggle, game over dialog with undo, best score and theme survive an app restart, nothing hidden by notch or home indicator
