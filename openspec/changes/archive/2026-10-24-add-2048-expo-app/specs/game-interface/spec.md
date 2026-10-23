# Spec Delta

## Purpose

Defines how the player sees and controls the 2048 game on iOS and Android phones: board display, swipe input, animation, dialogs, theme, and which preferences persist on the device.

## ADDED Requirements

### Requirement: Board display
The app SHALL show the board as a square grid of the current size that fits the screen width, each tile showing its value with a background color specific to that value. It SHALL also show the current score, the best score for the current size, a new game control, an undo control, a board size selector and a theme toggle. Content SHALL stay inside the device safe area.

#### Scenario: Initial screen
- **WHEN** the app opens
- **THEN** a 4x4 board with two tiles is shown with score 0 and the new game, undo, size and theme controls

#### Scenario: Large values stay readable
- **WHEN** a tile holds a value of 4 or more digits on a 6x6 board
- **THEN** the full value is visible inside the tile without being cut off

#### Scenario: Notch and home indicator
- **WHEN** the app runs on a phone with a notch or home indicator
- **THEN** no control or tile is hidden behind them

### Requirement: Portrait layout
The app SHALL run in portrait orientation only.

#### Scenario: Rotating the phone
- **WHEN** the player rotates the phone to landscape
- **THEN** the app stays in portrait layout

### Requirement: Swipe input
A swipe on the board SHALL trigger a move in the swipe's dominant direction. Swipes shorter than a minimum distance SHALL be ignored.

#### Scenario: Swipe left
- **WHEN** the player swipes mostly left across the board
- **THEN** a left move is applied

#### Scenario: Tap is not a move
- **WHEN** the player taps the board without dragging
- **THEN** no move is applied

### Requirement: Tile animation
Tiles SHALL visibly slide from their old cell to their new cell when a move is applied. Spawned tiles and tiles produced by a merge SHALL play a short pop effect. Undo SHALL show the restored board without sliding. Swipes made during an animation SHALL be applied, not dropped.

#### Scenario: Slide on move
- **WHEN** a tile moves from column 4 to column 1
- **THEN** the tile is seen travelling across the row to column 1

#### Scenario: Fast swipes
- **WHEN** the player makes two swipes in quick succession
- **THEN** both moves are applied in order

### Requirement: Reduced motion
When the device's reduce motion accessibility setting is on, the app SHALL show moves without sliding or pop animations.

#### Scenario: Reduce motion enabled
- **WHEN** reduce motion is enabled on the device and a move is applied
- **THEN** tiles appear in their new cells without animation

### Requirement: Win dialog
When the game enters the won state, the app SHALL show a dialog offering "Keep playing" and "New game". Moves SHALL NOT be applied while the dialog is open, and the Android back button SHALL NOT dismiss it.

#### Scenario: Keep playing from dialog
- **WHEN** the win dialog is open and the player taps "Keep playing"
- **THEN** the dialog closes and the current game continues

### Requirement: Game over dialog
When the game enters the game over state, the app SHALL show a dialog with the final score offering "New game" and "Undo". The Android back button SHALL NOT dismiss it.

#### Scenario: Undo from game over dialog
- **WHEN** the game over dialog is open and the player taps "Undo"
- **THEN** the dialog closes and the last move is undone

### Requirement: New game control
The new game control SHALL start a new game on the current board size.

#### Scenario: Restart
- **WHEN** the player taps new game mid-game
- **THEN** a fresh game starts on the same board size with score 0 and no undo available

### Requirement: Undo control state
The undo control SHALL be disabled when there is nothing to undo.

#### Scenario: Undo disabled at start
- **WHEN** a new game has just started
- **THEN** the undo control is disabled

### Requirement: Theme
The app SHALL support light and dark themes. Without a saved choice it SHALL follow the device color scheme. Toggling the theme SHALL apply immediately, including the status bar, and SHALL persist across app restarts.

#### Scenario: Persisted dark mode
- **WHEN** the player switches to dark mode and restarts the app
- **THEN** the app opens in dark mode

### Requirement: Persistence
Best scores per board size and the theme choice SHALL persist on the device across app restarts. The in-progress game, the selected board size and undo history SHALL NOT persist; a restart begins a new 4x4 game. If saved data is missing or unreadable, the app SHALL fall back to defaults without error.

#### Scenario: Best score survives restart
- **WHEN** the player reaches a best score of 500 on 5x5 and restarts the app
- **THEN** selecting 5x5 shows a best score of 500

#### Scenario: Corrupt saved data
- **WHEN** saved data on the device is invalid
- **THEN** the app opens with best scores of 0 and the device theme, and remains playable
