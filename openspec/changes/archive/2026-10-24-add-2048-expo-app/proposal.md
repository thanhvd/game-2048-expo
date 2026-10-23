# Proposal

## Why

The 2048 game exists only as a web app (`../game-2048`). This change builds a native iOS and Android version with Expo as a standalone project. The game rules are copied from the web app, not shared.

## What Changes

- New Expo project (React Native + TypeScript) for iOS and Android.
- Game rules engine copied unchanged from `game-2048/src/game/engine.ts`, along with its unit tests. The rules already match the `game-rules` spec in this repo.
- Native board with sliding tile animation and a pop on spawned and merged tiles.
- Swipe input on the board.
- Same features as the web app: undo, board sizes 3x3 to 6x6, light/dark theme, keep playing after 2048, best score per board size.
- Win and game over dialogs.
- Best scores and theme choice saved on the device.
- Not included: keyboard input, web build, haptics, store publishing (EAS build/submit).

## Capabilities

### New Capabilities
- `game-interface`: How the player sees and controls the game on a phone: board display, swipe input, animation, dialogs, theme, and saved preferences.

### Modified Capabilities

None. `game-rules` (copied from the web project) applies unchanged.

## Impact

- New project files: `package.json`, `app.json`, `App.tsx`, `src/`, `assets/`.
- Dependencies: `expo` (SDK 58), `react-native`, `react-native-reanimated`, `react-native-gesture-handler`, `@react-native-async-storage/async-storage`; dev dependency: `vitest` for engine tests.
- Runs in Expo Go during development. No backend.
