# Loading Game Plugin Design

A Claude Code plugin that launches a terminal-based Space Invaders game when Claude starts long-running Task operations.

## Overview

Inspired by the Amiga loading screen games, this plugin provides entertainment while waiting for Claude to complete complex tasks.

## Architecture

```
Claude Code
├── PreToolUse Hook (Task tool) ──► launch.sh start
│                                        │
│                                        ▼
│                                  New Terminal Window
│                                  ┌─────────────────┐
│                                  │ node game/      │
│                                  │ index.js        │
│                                  │                 │
│                                  │ Space Invaders! │
│                                  └─────────────────┘
│                                        ▲
└── PostToolUse Hook (Task tool) ──► launch.sh stop
                                   (signals completion)
```

## Components

### 1. Hook Configuration

**hooks/hooks.json:**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Task",
        "hooks": [{ "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/launch.sh start" }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Task",
        "hooks": [{ "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/launch.sh stop" }]
      }
    ]
  }
}
```

### 2. Terminal Launcher (hooks/launch.sh)

Cross-platform bash script that:

**start command:**
- Checks if game already running (via PID file)
- Detects OS (Linux/macOS/Windows via WSL detection)
- Finds available terminal emulator
- Spawns new terminal window running `node ${CLAUDE_PLUGIN_ROOT}/game/index.js`
- Writes PID to `~/.loading-game.pid`

**stop command:**
- Reads PID from `~/.loading-game.pid`
- Sends SIGUSR1 to game process (or writes to signal file on Windows)
- Game transitions to completion screen
- Cleans up PID file after game exits

**Terminal detection order:**

Linux:
1. `$LOADING_GAME_TERMINAL` env var (user override)
2. `kitty`
3. `alacritty`
4. `gnome-terminal`
5. `konsole`
6. `xterm`

macOS:
1. `$LOADING_GAME_TERMINAL` env var
2. `kitty` (if installed)
3. `iTerm.app` (via osascript)
4. `Terminal.app` (via osascript)

Windows (Git Bash/WSL):
1. `wt.exe` (Windows Terminal)
2. `cmd.exe /c start`

### 3. Game (Node.js + blessed)

**Technology:** Node.js with `blessed` library for cross-platform terminal UI

**game/package.json dependencies:**
- `blessed` - Terminal UI library
- No other runtime dependencies

**Game Structure:**
```
game/
├── package.json
├── index.js        # Entry point, signal handling
├── game.js         # Main game loop, state management
├── renderer.js     # blessed screen setup, rendering
├── aliens.js       # Alien grid: movement, speed scaling
├── player.js       # Ship movement, bullet firing
└── shields.js      # Destructible barrier logic
```

### 4. Gameplay

```
╔══════════════════════════════════════════════════╗
║  SCORE: 00340      HI: 01250      LIVES: ♥♥♥     ║
╠══════════════════════════════════════════════════╣
║    ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼                        ║
║    ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼                        ║
║    ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼                        ║
║    ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼                        ║
║                                                   ║
║                          |                        ║
║                                                   ║
║   ███      ███      ███      ███                 ║
║   ███      ███      ███      ███                 ║
║                                                   ║
║                       ▲                           ║
╚══════════════════════════════════════════════════╝
```

**Controls:**
- `←` / `→` or `A` / `D` - Move ship
- `Space` - Fire
- `P` - Pause
- `Q` - Quit early

**Mechanics:**
- Aliens move side-to-side, drop down at edges
- Aliens speed up as fewer remain
- Shields degrade when hit (by aliens or player)
- Endless waves (loading screen, not meant to end)
- High score persisted to `~/.loading-game-score`

### 5. Task Completion Flow

1. `PostToolUse` hook fires when Task tool completes
2. `launch.sh stop` sends SIGUSR1 to game process
3. Game catches signal, transitions to completion screen:

```
╔══════════════════════════════════════════════════╗
║                                                   ║
║                                                   ║
║             * TASK COMPLETE! *                    ║
║                                                   ║
║               FINAL SCORE: 00340                  ║
║                                                   ║
║                                                   ║
║           Press any key to continue...            ║
║                                                   ║
╚══════════════════════════════════════════════════╝
```

4. User presses any key
5. Game exits, terminal window closes
6. PID file cleaned up

### 6. Edge Cases

| Scenario | Handling |
|----------|----------|
| Game already running | `start` is no-op, don't spawn duplicate |
| User quit game early | `stop` checks PID validity, no-op if gone |
| Stale PID file | Validate process exists before signaling |
| Multiple rapid Task calls | Single game instance, ignore subsequent starts |
| Node.js not installed | `start` prints error, exits gracefully |
| Terminal not found | Falls back through detection list, ultimately fails with helpful message |

## Plugin Structure

```
loading-game/
├── .claude-plugin/
│   └── plugin.json
├── hooks/
│   ├── hooks.json
│   └── launch.sh
├── game/
│   ├── package.json
│   ├── index.js
│   ├── game.js
│   ├── renderer.js
│   ├── aliens.js
│   ├── player.js
│   └── shields.js
├── README.md
└── marketplace.json
```

**plugin.json:**
```json
{
  "name": "loading-game",
  "description": "Space Invaders while Claude thinks",
  "version": "1.0.0",
  "author": "Your Name",
  "repository": "https://github.com/yourname/loading-game",
  "license": "MIT",
  "keywords": ["game", "loading", "space-invaders", "hooks"]
}
```

## Installation

Users install via:
```
/plugin marketplace add yourname/loading-game
/plugin install loading-game
```

Or for development/testing:
```
/plugin marketplace add ./path/to/loading-game
/plugin install loading-game
```

**Prerequisite:** Node.js must be installed (most developers have this).

## Configuration

Optional environment variable for terminal override:
```bash
export LOADING_GAME_TERMINAL=kitty
```
