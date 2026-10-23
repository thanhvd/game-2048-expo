# CLAUDE.md

2048 mobile game for iOS and Android. Expo SDK 58 + React Native + TypeScript. Single screen, no router, no backend. Runs in Expo Go.

## Commands

- `npm test`: Vitest unit tests (engine + storage), run in Node, separate from Metro
- `npx tsc --noEmit`: type-check (test files included)
- `npx expo export --platform ios` / `--platform android`: proves the app bundles
- `npx expo-doctor`: dependency/SDK check. Keep it at all checks passed.
- `npx expo start`: dev server for Expo Go

Before calling work done, run test, tsc, both exports and expo-doctor. For UI changes, also check on a phone or simulator.

## Expo rules

- Add native packages with `npx expo install <pkg>`, never `npm install`, so versions match the SDK.
- Expo and React Native APIs change every SDK. Check the installed package's types or the versioned docs (`https://docs.expo.dev/versions/v58.0.0/`) instead of relying on memory. Example: gesture-handler 3 uses `usePanGesture`, not the deprecated `Gesture.Pan()`.
- No custom native code; everything must run in Expo Go.

## Specs come first

- `openspec/specs/game-rules` and `openspec/specs/game-interface` are the behavior contract. Read the relevant spec before changing behavior.
- New behavior goes through OpenSpec: `/opsx:explore` → `/opsx:propose` → `/opsx:apply` → `/opsx:archive`. Don't change spec'd behavior silently. If code and spec disagree, raise it.
- Past decisions and their reasoning are in `openspec/changes/archive/*/design.md`.

## Architecture invariants

- `src/game/engine.ts` is pure and has no React imports. All game rules live there; UI files never reimplement rules. It is a copy of the web project's engine (`../game-2048`); the copies may drift, and the `game-rules` spec is the reference.
- Randomness is injected as `rand: () => number`. In `Game.tsx`, random numbers are drawn **before** `dispatch` (`rolls`) so the reducer stays pure.
- Tiles have stable `id`s and are keyed on them so Reanimated can slide them. Don't switch to a `number[][]` grid.
- On merge, the edge-side tile keeps its id and doubles. The other tile stays for one render with `consumed: true` (rendered below survivors) and is dropped on the next `move`/`undo`.
- `status()` is derived, not stored: `won` is checked before `over`.
- The best score lives in reducer state and only ever rises. An effect writes it to storage.
- `App.tsx` loads storage **before** mounting `<Game>`, so the first save can't overwrite stored data with defaults. Don't switch to a hydrate action.
- Every AsyncStorage access goes through `src/storage.ts`, with try/catch and shape validation. Failing or corrupt storage must never break the game.
- `Game` state has a `gen` counter bumped on new game; the board is keyed on it because tile ids restart at 1.
- `Board.tsx` sizes from `useWindowDimensions` (board = `min(width - 32, 480)`, gap 3%). Animations: `LinearTransition` slide, `ZoomIn` spawn pop for `id >= spawnFrom`, `Keyframe` merge pop on an inner view keyed `${id}-${value}`. When `animate` is false (undo, keep playing, reduced motion), `layout`/`entering` are unset.
- Dialogs are `Modal` with a no-op `onRequestClose` so the Android back button can't dismiss them.

## Code style

- No semicolons, single quotes, 2-space indent. Match the existing files.
- Plain React Native components; no UI library. Colors come from `src/theme.ts`.
- Comments only for non-obvious reasons, same density as now.
- Engine tests build boards with `fromGrid([[...]])` and use `seq(...)` for deterministic randomness.
