# 2048

The sliding-tile puzzle 2048 for iOS and Android, built with Expo, React Native and TypeScript.

Combine equal tiles to reach the 2048 tile.

## Features

- Tiles slide with animation, and new and merged tiles pop
- Undo any number of moves, including after game over
- Board sizes 3x3, 4x4, 5x5 and 6x6
- A separate best score for each board size, saved on the device
- Light and dark themes; follows your phone's setting until you choose one
- Option to keep playing after reaching 2048
- Swipe controls
- Animations turn off when your phone's reduce motion setting is on

## Getting started

Requires Node.js 20.19+ and the [Expo Go](https://expo.dev/go) app (SDK 58) on your phone.

```bash
npm install
npx expo start
```

Then scan the QR code with Expo Go (Android) or the Camera app (iOS). Press `i` or `a` in the terminal to open an iOS simulator or Android emulator instead.

## Controls

| Action | Input |
|---|---|
| Move | Swipe on the board |
| Undo | **Undo** button |
| Restart | **New game** button |
| Change board size | `3×3` / `4×4` / `5×5` / `6×6` buttons (starts a new game) |
| Toggle theme | Sun/moon icon |

Restarting the app starts a new 4x4 game. The device keeps only your best scores and your theme choice.

## Scripts

| Command | What it does |
|---|---|
| `npx expo start` | Start the dev server |
| `npm test` | Run the unit tests (Vitest) |
| `npx tsc --noEmit` | Type-check |
| `npx expo export --platform ios` | Bundle for iOS (use `android` for Android) |
| `npx expo-doctor` | Check dependency versions against the Expo SDK |

## Project structure

```
App.tsx                Loads saved data, then mounts the game
src/
  game/engine.ts       Game rules: move, merge, spawn, score, win/over, undo
  game/engine.test.ts  Tests for the rules
  storage.ts           Saves best scores and theme (falls back safely if storage fails)
  theme.ts             Light/dark palettes and tile colors
  Board.tsx            Board, tiles, animations, swipe input
  Game.tsx             Game state, controls, dialogs, theme
openspec/
  specs/               Behavior specs: game-rules, game-interface
  changes/archive/     Past change proposals, designs and task lists
```

The rules in `engine.ts` are pure functions that don't depend on React, so you can test them without a phone. The engine is copied from the web version, [game-2048](https://github.com/thanhvd/game-2048).

## Specs and workflow

Changes to this project are planned with [OpenSpec](https://github.com/Fission-AI/OpenSpec). The current behavior is described in `openspec/specs/`. In Claude Code, the `/opsx:explore`, `/opsx:propose`, `/opsx:apply` and `/opsx:archive` commands (stored in `.claude/`) take a change from idea to archived spec.

## License

[MIT](LICENSE)
