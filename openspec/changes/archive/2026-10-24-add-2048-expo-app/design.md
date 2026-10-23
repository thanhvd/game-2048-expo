# Design

## Context

Greenfield Expo project. The folder contains only OpenSpec setup. The web version in `../game-2048` already has a pure, tested rules engine and a reducer pattern that this app copies. `openspec/specs/game-rules` (copied from the web project) defines the rules; `specs/game-interface/spec.md` in this change defines the mobile UI.

## Goals / Non-Goals

**Goals:**
- Same game behavior as the web app, with a native feel on iOS and Android.
- Runs in Expo Go during development, with no custom native code.

**Non-Goals:**
- Sharing code with the web project. The engine is copied, and the two copies may drift.
- Web build, keyboard input, haptics, EAS build/store submission.
- Navigation or routing. This is a single screen.

## Decisions

### 1. Scaffold: `create-expo-app --template blank-typescript`, SDK 58
This gives the smallest template: one `App.tsx`, no Expo Router. The project folder already contains `.claude/` and `openspec/`, so the template is generated in a temporary folder and its files copied in. Native dependencies are added with `npx expo install` so their versions match the SDK.
Alternative: the default template with Expo Router. Rejected because it adds tabs and routing a single screen doesn't need.

### 2. File layout
```
App.tsx               loads storage, then mounts <Game>; GestureHandlerRootView + SafeAreaProvider
src/game/engine.ts    copied verbatim from ../game-2048/src/game/engine.ts
src/game/engine.test.ts  copied verbatim
src/Game.tsx          reducer (copied pattern), header controls, dialogs, theme
src/Board.tsx         board, tiles, Reanimated animations, swipe gesture
src/storage.ts        AsyncStorage read/write with validation and try/catch
src/theme.ts          light/dark palettes + tile color map
```

### 3. Engine and reducer are copied as-is
`engine.ts` has no DOM or React dependencies, so it runs unchanged on React Native. The reducer, `rolls` pattern (random numbers drawn before `dispatch` to keep the reducer pure under StrictMode) and best-in-reducer logic are copied from the web `App.tsx`. Engine tests run with Vitest in Node, separate from the Metro bundler.

### 4. Storage loads before the game mounts
AsyncStorage is async, unlike `localStorage`. `App.tsx` loads best scores and theme once, renders nothing until that finishes (a few ms), then mounts `<Game initialBest initialTheme>`. The reducer can then start with real best scores, and the save effect can never overwrite stored data with an empty object.
Alternative: mount immediately and dispatch a `hydrate` action later. Rejected because it races with the first save and needs merge logic.

### 5. Animation with Reanimated layout animations
Each tile is an absolutely positioned `Animated.View` keyed by tile `id`, with `left`/`top` from row/col:
- **Slide:** `layout={LinearTransition.duration(100)}` animates position changes automatically.
- **Spawn pop:** `entering={ZoomIn.delay(100).duration(150)}` on tiles with `id >= spawnFrom`.
- **Merge pop:** an inner `Animated.View` keyed `${id}-${value}` with a Reanimated `Keyframe` (scale 1 → 1.2 → 1) as `entering`, so it remounts when the value changes.
- **Consumed tiles** are rendered below survivors (`zIndex`), the same as on web.
- **Undo** or reduced motion: `layout` and `entering` are left unset, so changes apply instantly. Reduced motion uses Reanimated's `useReducedMotion()`.

Alternative: shared values with `withTiming` per tile. Rejected because layout animations do the same with less code.

### 6. Swipe with gesture-handler
`Gesture.Pan().runOnJS(true).onEnd(e => ...)` uses the dominant axis of `translationX/Y` and ignores anything under 30 px. It is wrapped in `GestureDetector` around the board, and `GestureHandlerRootView` sits at the app root. Moves are dispatched immediately; layout animations retarget mid-flight, so fast swipes aren't dropped.

### 7. Sizing
Board width is `min(windowWidth - 32, 480)` from `useWindowDimensions`. Gap is 3% of the board width, and cell size is derived from it, the same math as the web app's `cqw` version but in pixels. Tile font size uses the same digit-count factors as web, plus `adjustsFontSizeToFit` with `numberOfLines={1}` as a safety net.

### 8. UI components
Plain React Native: `Text`, `Pressable` buttons, a row of `Pressable`s for size, and `@expo/vector-icons` Ionicons (bundled with Expo) for the theme and undo icons. Dialogs are `Modal` with `transparent`, plus `onRequestClose={() => {}}` so the Android back button doesn't dismiss them. `expo-status-bar` style follows the theme. `react-native-safe-area-context` provides `SafeAreaView`. Portrait lock comes from `"orientation": "portrait"` in `app.json`.

### 9. Theme
`useColorScheme()` gives the device default. The saved choice overrides it, and toggling saves the choice to AsyncStorage. Colors come from a small `palette[mode]` object in `theme.ts`. No UI library.

## Risks / Trade-offs

- [Two copies of the engine can drift] → Accepted per user decision. The `game-rules` spec in both repos is the reference.
- [Reanimated layout animations behave slightly differently on iOS and Android] → Verify on both platforms (simulator or Expo Go) during apply.
- [Reanimated / worklets Babel setup changes between SDKs] → Use `npx expo install` and the SDK's `babel-preset-expo` defaults. Check with a bundle (`npx expo export`) before UI work.
- [No device or simulator available on this machine] → `tsc --noEmit` and `npx expo export` prove it compiles and bundles. Visual checks then need the user's phone with Expo Go, which the tasks call out explicitly.
