# game-rules Specification

## Purpose

Defines the rules of 2048 independent of presentation: how tiles move and merge, when tiles spawn, how score is kept, when the game is won or lost, undo, and board size.

## Requirements

### Requirement: New game setup
A new game SHALL start with an empty square board of the selected size (default 4x4), a score of 0, an empty undo history, and exactly two spawned tiles.

#### Scenario: Starting a game
- **WHEN** a new game starts on a 4x4 board
- **THEN** the board has 16 cells, exactly 2 of them hold tiles, and the score is 0

### Requirement: Sliding tiles
A move in a direction (up, down, left, right) SHALL slide every tile as far as possible toward that edge, preserving tile order within each row or column.

#### Scenario: Slide without merge
- **WHEN** a row is `[0, 2, 0, 4]` and the player moves left
- **THEN** the row becomes `[2, 4, 0, 0]`

#### Scenario: All directions
- **WHEN** a column is `[2, 0, 0, 4]` (top to bottom) and the player moves down
- **THEN** the column becomes `[0, 0, 2, 4]`

### Requirement: Merging tiles
When two tiles of equal value meet during a move, they SHALL merge into one tile of double value. A tile produced by a merge SHALL NOT merge again in the same move. Pairs closest to the destination edge merge first.

#### Scenario: Single merge
- **WHEN** a row is `[2, 2, 4, 0]` and the player moves left
- **THEN** the row becomes `[4, 4, 0, 0]`

#### Scenario: No double merge
- **WHEN** a row is `[2, 2, 2, 2]` and the player moves left
- **THEN** the row becomes `[4, 4, 0, 0]`

#### Scenario: Merge priority toward the edge
- **WHEN** a row is `[2, 2, 2, 0]` and the player moves right
- **THEN** the row becomes `[0, 0, 2, 4]`

### Requirement: Scoring
Each merge SHALL add the value of the resulting tile to the score.

#### Scenario: Score from merges
- **WHEN** a move produces one 4 tile and one 8 tile by merging
- **THEN** the score increases by 12

### Requirement: Spawning after a move
After a move that changes the board, the game SHALL place one new tile in a random empty cell. The new tile SHALL be 2 with 90% probability and 4 with 10% probability.

#### Scenario: Valid move spawns a tile
- **WHEN** the player makes a move that changes at least one tile
- **THEN** exactly one new tile of value 2 or 4 appears in a previously empty cell

### Requirement: Moves that change nothing
A move that changes no tile SHALL leave the board, score and undo history unchanged and SHALL NOT spawn a tile.

#### Scenario: Blocked move
- **WHEN** a row is `[2, 4, 0, 0]`, every other row is also packed to the left without equal neighbors, and the player moves left
- **THEN** the board, score and undo history are unchanged and no tile spawns

### Requirement: Winning
The game SHALL enter the won state when a tile of value 2048 exists on the board and the player has not chosen to keep playing in this game.

#### Scenario: Reaching 2048
- **WHEN** a merge produces a 2048 tile
- **THEN** the game is in the won state

#### Scenario: Keep playing
- **WHEN** the game is won and the player chooses to keep playing
- **THEN** the game returns to the playing state, moves are accepted, and later 2048 tiles do not enter the won state again in this game

### Requirement: Game over
The game SHALL enter the game over state when the board has no empty cell and no two orthogonally adjacent tiles share a value. In this state moves SHALL be rejected.

#### Scenario: No moves left
- **WHEN** the board is full and no adjacent tiles are equal
- **THEN** the game is over and any move leaves the board unchanged

### Requirement: Undo
The player SHALL be able to undo any number of moves made in the current game. Each undo SHALL restore the board, tile values, tile positions and score to exactly what they were before the most recent remaining move, including the tile that move spawned being removed. Game state (playing, won, over) SHALL be re-evaluated from the restored board.

#### Scenario: Undo one move
- **WHEN** the player makes a move and then undoes it
- **THEN** the board and score equal those before the move

#### Scenario: Undo out of game over
- **WHEN** the game is over and the player undoes
- **THEN** the game returns to the playing state with the board before the last move

#### Scenario: Nothing to undo
- **WHEN** no move has been made in the current game
- **THEN** undo is unavailable and has no effect

#### Scenario: Undo does not reroll spawns
- **WHEN** the player undoes a move and then repeats the same move
- **THEN** a new tile spawns at random; the earlier spawn is not replayed

### Requirement: Board size
The player SHALL be able to choose a board size of 3x3, 4x4, 5x5 or 6x6. Changing the size SHALL start a new game on the chosen size and clear the undo history.

#### Scenario: Change size
- **WHEN** the player selects 5x5 during a 4x4 game
- **THEN** a new 5x5 game starts with score 0, two tiles and no undo available

### Requirement: Best score per size
The game SHALL track the highest score reached for each board size. The best score SHALL only increase; undo SHALL NOT lower it.

#### Scenario: New best
- **WHEN** the current score exceeds the best score for the current size
- **THEN** the best score for that size equals the current score

#### Scenario: Undo keeps best
- **WHEN** a move sets a new best score and the player undoes that move
- **THEN** the best score keeps the higher value
