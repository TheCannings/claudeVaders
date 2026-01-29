# ClaudeVaders Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Claude Code plugin that launches terminal Space Invaders when the Task tool runs.

**Architecture:** Node.js game using `blessed` for terminal UI, bash launcher script for cross-platform terminal spawning, Claude Code hooks trigger on Task tool PreToolUse/PostToolUse events.

**Tech Stack:** Node.js, blessed (terminal UI), bash (launcher), JSON (plugin config)

---

## Task 1: Plugin Structure

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `hooks/hooks.json`

**Step 1: Create plugin manifest**

```json
{
  "name": "claudevaders",
  "description": "Space Invaders while Claude thinks - a loading screen game",
  "version": "1.0.0",
  "author": {
    "name": "TheCannings",
    "email": "cannings@gmail.com"
  },
  "repository": "https://github.com/TheCannings/claudeVaders",
  "license": "MIT",
  "keywords": ["game", "loading", "space-invaders", "hooks", "retro", "amiga"]
}
```

**Step 2: Create hooks configuration**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Task",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/launch.sh start"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Task",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/launch.sh stop"
          }
        ]
      }
    ]
  }
}
```

**Step 3: Commit**

```bash
git add .claude-plugin/ hooks/
git commit -m "feat: add plugin manifest and hook configuration"
```

---

## Task 2: Game Package Setup

**Files:**
- Create: `game/package.json`
- Create: `game/.gitignore`

**Step 1: Create package.json**

```json
{
  "name": "claudevaders-game",
  "version": "1.0.0",
  "description": "Terminal Space Invaders for Claude Code loading screens",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "node --test"
  },
  "dependencies": {
    "blessed": "^0.1.81"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**Step 2: Create .gitignore**

```
node_modules/
```

**Step 3: Install dependencies**

Run: `cd game && npm install`
Expected: node_modules created, package-lock.json generated

**Step 4: Commit**

```bash
git add game/package.json game/package-lock.json game/.gitignore
git commit -m "feat: initialize game package with blessed dependency"
```

---

## Task 3: Game Entry Point with Signal Handling

**Files:**
- Create: `game/index.js`

**Step 1: Create entry point with signal handling**

```javascript
#!/usr/bin/env node
'use strict';

const Game = require('./game');

// State
let game = null;
let taskComplete = false;

// Signal file for Windows compatibility (no SIGUSR1)
const fs = require('fs');
const path = require('path');
const SIGNAL_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.claudevaders-signal');

// Handle task completion signal
function handleTaskComplete() {
  taskComplete = true;
  if (game) {
    game.showTaskComplete();
  }
}

// Unix: SIGUSR1
process.on('SIGUSR1', handleTaskComplete);

// Windows: poll for signal file
const signalPollInterval = setInterval(() => {
  if (fs.existsSync(SIGNAL_FILE)) {
    try {
      fs.unlinkSync(SIGNAL_FILE);
    } catch (e) {
      // Ignore cleanup errors
    }
    handleTaskComplete();
  }
}, 500);

// Clean exit
function cleanup() {
  clearInterval(signalPollInterval);
  try {
    fs.unlinkSync(SIGNAL_FILE);
  } catch (e) {
    // Ignore
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start game
game = new Game({
  onExit: cleanup
});

game.start();
```

**Step 2: Verify syntax**

Run: `node --check game/index.js`
Expected: No output (syntax valid) - will fail on missing ./game module, that's expected

**Step 3: Commit**

```bash
git add game/index.js
git commit -m "feat: add game entry point with signal handling"
```

---

## Task 4: Blessed Screen Renderer

**Files:**
- Create: `game/renderer.js`

**Step 1: Create renderer module**

```javascript
'use strict';

const blessed = require('blessed');

class Renderer {
  constructor(options = {}) {
    this.width = options.width || 60;
    this.height = options.height || 24;
    this.screen = null;
    this.gameBox = null;
    this.onKey = options.onKey || (() => {});
    this.onQuit = options.onQuit || (() => {});
  }

  init() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'ClaudeVaders - Loading...',
      fullUnicode: true
    });

    this.gameBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: this.width,
      height: this.height,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'cyan'
        }
      }
    });

    // Key bindings
    this.screen.key(['left', 'a'], () => this.onKey('left'));
    this.screen.key(['right', 'd'], () => this.onKey('right'));
    this.screen.key(['space'], () => this.onKey('fire'));
    this.screen.key(['p'], () => this.onKey('pause'));
    this.screen.key(['q', 'C-c', 'escape'], () => this.onQuit());

    this.screen.render();
    return this;
  }

  render(state) {
    if (!this.gameBox) return;

    const lines = [];
    const innerWidth = this.width - 2;

    // Header
    const scoreText = `SCORE: ${String(state.score).padStart(5, '0')}`;
    const hiText = `HI: ${String(state.highScore).padStart(5, '0')}`;
    const livesText = 'LIVES: ' + '♥'.repeat(state.lives);
    const header = `  ${scoreText}    ${hiText}    ${livesText}`;
    lines.push(header);
    lines.push('─'.repeat(innerWidth));

    // Game area
    const gameHeight = this.height - 6;
    const gameArea = Array(gameHeight).fill(null).map(() =>
      Array(innerWidth).fill(' ')
    );

    // Draw aliens
    for (const alien of state.aliens) {
      if (alien.alive && alien.y >= 0 && alien.y < gameHeight && alien.x >= 0 && alien.x < innerWidth) {
        gameArea[alien.y][alien.x] = '▼';
      }
    }

    // Draw shields
    for (const shield of state.shields) {
      if (shield.health > 0 && shield.y >= 0 && shield.y < gameHeight && shield.x >= 0 && shield.x < innerWidth) {
        gameArea[shield.y][shield.x] = shield.health > 2 ? '█' : shield.health > 1 ? '▓' : '░';
      }
    }

    // Draw bullets
    for (const bullet of state.bullets) {
      if (bullet.y >= 0 && bullet.y < gameHeight && bullet.x >= 0 && bullet.x < innerWidth) {
        gameArea[bullet.y][bullet.x] = bullet.isAlien ? '·' : '│';
      }
    }

    // Draw player
    if (state.player.y >= 0 && state.player.y < gameHeight && state.player.x >= 0 && state.player.x < innerWidth) {
      gameArea[state.player.y][state.player.x] = '▲';
    }

    // Convert to lines
    for (const row of gameArea) {
      lines.push(row.join(''));
    }

    // Footer
    lines.push('─'.repeat(innerWidth));
    if (state.paused) {
      lines.push('         [PAUSED] Press P to resume'.padEnd(innerWidth));
    } else {
      lines.push('    ←/→ Move   SPACE Fire   P Pause   Q Quit'.padEnd(innerWidth));
    }

    this.gameBox.setContent(lines.join('\n'));
    this.screen.render();
  }

  showTaskComplete(finalScore) {
    if (!this.gameBox) return;

    const innerWidth = this.width - 2;
    const lines = [];

    const pad = Math.floor((this.height - 10) / 2);
    for (let i = 0; i < pad; i++) lines.push('');

    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + '╔══════════════════╗');
    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + '║                  ║');
    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + '║  TASK COMPLETE!  ║');
    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + '║                  ║');
    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + `║  SCORE: ${String(finalScore).padStart(5, '0')}    ║`);
    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + '║                  ║');
    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + '║  Press any key   ║');
    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + '║                  ║');
    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + '╚══════════════════╝');

    this.gameBox.setContent(lines.join('\n'));
    this.gameBox.style.border.fg = 'green';
    this.screen.render();
  }

  showGameOver(finalScore, highScore) {
    if (!this.gameBox) return;

    const innerWidth = this.width - 2;
    const lines = [];

    const pad = Math.floor((this.height - 12) / 2);
    for (let i = 0; i < pad; i++) lines.push('');

    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + '╔══════════════════╗');
    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + '║                  ║');
    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + '║    GAME OVER     ║');
    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + '║                  ║');
    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + `║  SCORE: ${String(finalScore).padStart(5, '0')}    ║`);
    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + `║  HIGH:  ${String(highScore).padStart(5, '0')}    ║`);
    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + '║                  ║');
    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + '║  SPACE to retry  ║');
    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + '║  Q to quit       ║');
    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + '║                  ║');
    lines.push(''.padStart(Math.floor((innerWidth - 20) / 2)) + '╚══════════════════╝');

    this.gameBox.setContent(lines.join('\n'));
    this.gameBox.style.border.fg = 'red';
    this.screen.render();
  }

  destroy() {
    if (this.screen) {
      this.screen.destroy();
    }
  }
}

module.exports = Renderer;
```

**Step 2: Verify syntax**

Run: `node --check game/renderer.js`
Expected: No output (syntax valid)

**Step 3: Commit**

```bash
git add game/renderer.js
git commit -m "feat: add blessed terminal renderer"
```

---

## Task 5: Game State and Logic

**Files:**
- Create: `game/game.js`

**Step 1: Create main game module**

```javascript
'use strict';

const fs = require('fs');
const path = require('path');
const Renderer = require('./renderer');

const HIGH_SCORE_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.claudevaders-highscore');
const GAME_WIDTH = 56;
const GAME_HEIGHT = 18;
const ALIEN_ROWS = 4;
const ALIEN_COLS = 11;
const SHIELD_COUNT = 4;

class Game {
  constructor(options = {}) {
    this.onExit = options.onExit || (() => process.exit(0));
    this.renderer = null;
    this.gameLoop = null;
    this.tickRate = 50; // ms per tick

    this.state = {
      score: 0,
      highScore: this.loadHighScore(),
      lives: 3,
      paused: false,
      gameOver: false,
      taskComplete: false,
      player: { x: Math.floor(GAME_WIDTH / 2), y: GAME_HEIGHT - 1 },
      aliens: [],
      shields: [],
      bullets: [],
      alienDirection: 1,
      alienMoveCounter: 0,
      alienMoveRate: 20, // ticks between alien moves
      alienShootChance: 0.02
    };
  }

  loadHighScore() {
    try {
      const data = fs.readFileSync(HIGH_SCORE_FILE, 'utf8');
      return parseInt(data, 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  saveHighScore() {
    try {
      fs.writeFileSync(HIGH_SCORE_FILE, String(this.state.highScore));
    } catch (e) {
      // Ignore save errors
    }
  }

  initAliens() {
    this.state.aliens = [];
    for (let row = 0; row < ALIEN_ROWS; row++) {
      for (let col = 0; col < ALIEN_COLS; col++) {
        this.state.aliens.push({
          x: 4 + col * 4,
          y: 2 + row * 2,
          alive: true
        });
      }
    }
    this.state.alienDirection = 1;
    this.state.alienMoveRate = 20;
  }

  initShields() {
    this.state.shields = [];
    const shieldY = GAME_HEIGHT - 5;
    const spacing = Math.floor(GAME_WIDTH / (SHIELD_COUNT + 1));

    for (let i = 0; i < SHIELD_COUNT; i++) {
      const baseX = spacing * (i + 1);
      // 3-wide shield
      for (let dx = -1; dx <= 1; dx++) {
        this.state.shields.push({
          x: baseX + dx,
          y: shieldY,
          health: 4
        });
        this.state.shields.push({
          x: baseX + dx,
          y: shieldY + 1,
          health: 4
        });
      }
    }
  }

  start() {
    this.renderer = new Renderer({
      width: GAME_WIDTH + 4,
      height: GAME_HEIGHT + 6,
      onKey: (key) => this.handleKey(key),
      onQuit: () => this.quit()
    });

    this.renderer.init();
    this.initAliens();
    this.initShields();

    this.gameLoop = setInterval(() => this.tick(), this.tickRate);
  }

  handleKey(key) {
    if (this.state.taskComplete) {
      // Any key exits on task complete
      this.quit();
      return;
    }

    if (this.state.gameOver) {
      if (key === 'fire') {
        this.restart();
      }
      return;
    }

    if (key === 'pause') {
      this.state.paused = !this.state.paused;
      return;
    }

    if (this.state.paused) return;

    switch (key) {
      case 'left':
        if (this.state.player.x > 1) {
          this.state.player.x--;
        }
        break;
      case 'right':
        if (this.state.player.x < GAME_WIDTH - 2) {
          this.state.player.x++;
        }
        break;
      case 'fire':
        this.playerShoot();
        break;
    }
  }

  playerShoot() {
    // Limit to 2 player bullets on screen
    const playerBullets = this.state.bullets.filter(b => !b.isAlien);
    if (playerBullets.length < 2) {
      this.state.bullets.push({
        x: this.state.player.x,
        y: this.state.player.y - 1,
        isAlien: false
      });
    }
  }

  alienShoot() {
    // Find bottom-most alien in each column
    const bottomAliens = [];
    for (let col = 0; col < GAME_WIDTH; col++) {
      const aliensInCol = this.state.aliens.filter(a => a.alive && a.x === col);
      if (aliensInCol.length > 0) {
        const bottom = aliensInCol.reduce((a, b) => a.y > b.y ? a : b);
        bottomAliens.push(bottom);
      }
    }

    if (bottomAliens.length > 0 && Math.random() < this.state.alienShootChance) {
      const shooter = bottomAliens[Math.floor(Math.random() * bottomAliens.length)];
      this.state.bullets.push({
        x: shooter.x,
        y: shooter.y + 1,
        isAlien: true
      });
    }
  }

  tick() {
    if (this.state.paused || this.state.gameOver || this.state.taskComplete) {
      this.renderer.render(this.state);
      return;
    }

    // Move bullets
    this.state.bullets = this.state.bullets.filter(bullet => {
      if (bullet.isAlien) {
        bullet.y++;
        return bullet.y < GAME_HEIGHT;
      } else {
        bullet.y--;
        return bullet.y >= 0;
      }
    });

    // Check bullet collisions
    this.checkCollisions();

    // Move aliens
    this.state.alienMoveCounter++;
    if (this.state.alienMoveCounter >= this.state.alienMoveRate) {
      this.state.alienMoveCounter = 0;
      this.moveAliens();
    }

    // Alien shooting
    this.alienShoot();

    // Check win condition
    const aliensAlive = this.state.aliens.filter(a => a.alive).length;
    if (aliensAlive === 0) {
      this.nextWave();
    }

    this.renderer.render(this.state);
  }

  moveAliens() {
    const aliveAliens = this.state.aliens.filter(a => a.alive);
    if (aliveAliens.length === 0) return;

    const minX = Math.min(...aliveAliens.map(a => a.x));
    const maxX = Math.max(...aliveAliens.map(a => a.x));

    let shouldDrop = false;
    if (this.state.alienDirection > 0 && maxX >= GAME_WIDTH - 2) {
      shouldDrop = true;
      this.state.alienDirection = -1;
    } else if (this.state.alienDirection < 0 && minX <= 1) {
      shouldDrop = true;
      this.state.alienDirection = 1;
    }

    for (const alien of this.state.aliens) {
      if (alien.alive) {
        if (shouldDrop) {
          alien.y++;
        } else {
          alien.x += this.state.alienDirection;
        }
      }
    }

    // Check if aliens reached bottom
    const maxY = Math.max(...aliveAliens.map(a => a.y));
    if (maxY >= GAME_HEIGHT - 2) {
      this.loseLife();
    }
  }

  checkCollisions() {
    const bulletsToRemove = new Set();

    for (let i = 0; i < this.state.bullets.length; i++) {
      const bullet = this.state.bullets[i];

      if (!bullet.isAlien) {
        // Player bullet hitting alien
        for (const alien of this.state.aliens) {
          if (alien.alive && alien.x === bullet.x && alien.y === bullet.y) {
            alien.alive = false;
            bulletsToRemove.add(i);
            this.state.score += 10;
            if (this.state.score > this.state.highScore) {
              this.state.highScore = this.state.score;
              this.saveHighScore();
            }
            // Speed up remaining aliens
            const remaining = this.state.aliens.filter(a => a.alive).length;
            this.state.alienMoveRate = Math.max(2, Math.floor(20 * remaining / (ALIEN_ROWS * ALIEN_COLS)));
            break;
          }
        }

        // Player bullet hitting shield
        for (const shield of this.state.shields) {
          if (shield.health > 0 && shield.x === bullet.x && shield.y === bullet.y) {
            shield.health--;
            bulletsToRemove.add(i);
            break;
          }
        }
      } else {
        // Alien bullet hitting player
        if (bullet.x === this.state.player.x && bullet.y === this.state.player.y) {
          bulletsToRemove.add(i);
          this.loseLife();
        }

        // Alien bullet hitting shield
        for (const shield of this.state.shields) {
          if (shield.health > 0 && shield.x === bullet.x && shield.y === bullet.y) {
            shield.health--;
            bulletsToRemove.add(i);
            break;
          }
        }
      }
    }

    this.state.bullets = this.state.bullets.filter((_, i) => !bulletsToRemove.has(i));
  }

  loseLife() {
    this.state.lives--;
    this.state.bullets = [];
    this.state.player.x = Math.floor(GAME_WIDTH / 2);

    if (this.state.lives <= 0) {
      this.state.gameOver = true;
      this.renderer.showGameOver(this.state.score, this.state.highScore);
    }
  }

  nextWave() {
    this.state.score += 100; // Bonus for clearing wave
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      this.saveHighScore();
    }
    this.initAliens();
    this.state.alienMoveRate = Math.max(5, this.state.alienMoveRate - 2); // Faster each wave
    this.state.bullets = [];
  }

  restart() {
    this.state.score = 0;
    this.state.lives = 3;
    this.state.gameOver = false;
    this.state.paused = false;
    this.state.bullets = [];
    this.state.player.x = Math.floor(GAME_WIDTH / 2);
    this.state.alienMoveRate = 20;
    this.initAliens();
    this.initShields();
  }

  showTaskComplete() {
    this.state.taskComplete = true;
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
    }
    this.renderer.showTaskComplete(this.state.score);
  }

  quit() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
    }
    if (this.renderer) {
      this.renderer.destroy();
    }
    this.onExit();
  }
}

module.exports = Game;
```

**Step 2: Verify syntax**

Run: `node --check game/game.js`
Expected: No output (syntax valid)

**Step 3: Test game runs**

Run: `cd game && timeout 2 node index.js || true`
Expected: Game window briefly appears (or timeout kills it) - no crash

**Step 4: Commit**

```bash
git add game/game.js
git commit -m "feat: add main game logic with aliens, shields, collision"
```

---

## Task 6: Cross-Platform Launcher Script

**Files:**
- Create: `hooks/launch.sh`

**Step 1: Create launcher script**

```bash
#!/usr/bin/env bash
set -euo pipefail

# ClaudeVaders Launcher
# Usage: launch.sh start|stop

COMMAND="${1:-}"
PID_FILE="${HOME}/.claudevaders.pid"
SIGNAL_FILE="${HOME}/.claudevaders-signal"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GAME_DIR="${SCRIPT_DIR}/../game"

# Detect OS
detect_os() {
  case "$(uname -s)" in
    Linux*)  echo "linux" ;;
    Darwin*) echo "macos" ;;
    CYGWIN*|MINGW*|MSYS*) echo "windows" ;;
    *)       echo "unknown" ;;
  esac
}

# Find available terminal emulator (Linux)
find_linux_terminal() {
  local term="${LOADING_GAME_TERMINAL:-}"
  if [[ -n "$term" ]] && command -v "$term" &>/dev/null; then
    echo "$term"
    return
  fi

  for t in kitty alacritty gnome-terminal konsole xfce4-terminal xterm; do
    if command -v "$t" &>/dev/null; then
      echo "$t"
      return
    fi
  done

  echo ""
}

# Launch game in new terminal (Linux)
launch_linux() {
  local term
  term=$(find_linux_terminal)

  if [[ -z "$term" ]]; then
    echo "Error: No terminal emulator found" >&2
    exit 1
  fi

  local game_cmd="cd '$GAME_DIR' && node index.js"

  case "$term" in
    kitty)
      kitty --title "ClaudeVaders" -d "$GAME_DIR" bash -c "$game_cmd" &
      ;;
    alacritty)
      alacritty --title "ClaudeVaders" --working-directory "$GAME_DIR" -e bash -c "$game_cmd" &
      ;;
    gnome-terminal)
      gnome-terminal --title="ClaudeVaders" --working-directory="$GAME_DIR" -- bash -c "$game_cmd" &
      ;;
    konsole)
      konsole --workdir "$GAME_DIR" -e bash -c "$game_cmd" &
      ;;
    xfce4-terminal)
      xfce4-terminal --title="ClaudeVaders" --working-directory="$GAME_DIR" -e "bash -c '$game_cmd'" &
      ;;
    xterm)
      xterm -title "ClaudeVaders" -e "cd '$GAME_DIR' && node index.js" &
      ;;
  esac

  echo $!
}

# Launch game in new terminal (macOS)
launch_macos() {
  local term="${LOADING_GAME_TERMINAL:-}"

  # Try kitty first if available/configured
  if [[ "$term" == "kitty" ]] || { [[ -z "$term" ]] && command -v kitty &>/dev/null; }; then
    kitty --title "ClaudeVaders" -d "$GAME_DIR" bash -c "node index.js" &
    echo $!
    return
  fi

  # Try iTerm2
  if [[ -d "/Applications/iTerm.app" ]]; then
    osascript <<EOF
tell application "iTerm"
  create window with default profile
  tell current session of current window
    write text "cd '$GAME_DIR' && node index.js"
  end tell
end tell
EOF
    # Can't get PID easily from AppleScript, use pgrep
    sleep 0.5
    pgrep -n "node" || echo ""
    return
  fi

  # Fall back to Terminal.app
  osascript <<EOF
tell application "Terminal"
  do script "cd '$GAME_DIR' && node index.js"
  activate
end tell
EOF
  sleep 0.5
  pgrep -n "node" || echo ""
}

# Launch game in new terminal (Windows/Git Bash)
launch_windows() {
  local game_cmd="cd '$GAME_DIR' && node index.js"

  if command -v wt.exe &>/dev/null; then
    wt.exe -d "$GAME_DIR" bash -c "$game_cmd" &
    echo $!
  elif command -v cmd.exe &>/dev/null; then
    cmd.exe /c start bash -c "$game_cmd" &
    echo $!
  else
    echo "Error: No terminal found" >&2
    exit 1
  fi
}

# Check if game is already running
is_running() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    # Stale PID file
    rm -f "$PID_FILE"
  fi
  return 1
}

# Start the game
cmd_start() {
  # Don't start if already running
  if is_running; then
    exit 0
  fi

  # Check node is available
  if ! command -v node &>/dev/null; then
    echo "Error: Node.js not found" >&2
    exit 1
  fi

  # Install deps if needed
  if [[ ! -d "$GAME_DIR/node_modules" ]]; then
    (cd "$GAME_DIR" && npm install --silent) || true
  fi

  local os
  os=$(detect_os)

  local pid=""
  case "$os" in
    linux)   pid=$(launch_linux) ;;
    macos)   pid=$(launch_macos) ;;
    windows) pid=$(launch_windows) ;;
    *)
      echo "Error: Unsupported OS" >&2
      exit 1
      ;;
  esac

  if [[ -n "$pid" ]]; then
    echo "$pid" > "$PID_FILE"
  fi
}

# Stop the game
cmd_stop() {
  if [[ ! -f "$PID_FILE" ]]; then
    exit 0
  fi

  local pid
  pid=$(cat "$PID_FILE")

  # Check if still running
  if ! kill -0 "$pid" 2>/dev/null; then
    rm -f "$PID_FILE"
    exit 0
  fi

  local os
  os=$(detect_os)

  # Send signal based on OS
  case "$os" in
    linux|macos)
      kill -USR1 "$pid" 2>/dev/null || true
      ;;
    windows)
      # Use signal file for Windows
      touch "$SIGNAL_FILE"
      ;;
  esac

  # Don't remove PID file - game will clean up on exit
}

# Main
case "$COMMAND" in
  start) cmd_start ;;
  stop)  cmd_stop ;;
  *)
    echo "Usage: launch.sh start|stop" >&2
    exit 1
    ;;
esac
```

**Step 2: Make executable**

Run: `chmod +x hooks/launch.sh`

**Step 3: Verify syntax**

Run: `bash -n hooks/launch.sh`
Expected: No output (syntax valid)

**Step 4: Commit**

```bash
git add hooks/launch.sh
git commit -m "feat: add cross-platform terminal launcher script"
```

---

## Task 7: Integration Test

**Files:**
- None (manual testing)

**Step 1: Test game standalone**

Run: `cd game && node index.js`
Expected: Game launches in terminal, aliens visible, controls work
Action: Press Q to quit

**Step 2: Test launcher start (Linux)**

Run: `./hooks/launch.sh start`
Expected: New terminal window opens with game running
Check: `cat ~/.claudevaders.pid` shows a PID

**Step 3: Test launcher stop**

Run: `./hooks/launch.sh stop`
Expected: Game shows "TASK COMPLETE!" screen
Action: Press any key to close

**Step 4: Verify cleanup**

Run: `cat ~/.claudevaders.pid 2>/dev/null || echo "cleaned"`
Expected: "cleaned" (file removed)

**Step 5: Commit integration test notes**

```bash
git commit --allow-empty -m "test: verify game and launcher integration works"
```

---

## Task 8: Add marketplace.json

**Files:**
- Create: `marketplace.json`

**Step 1: Create marketplace file**

```json
{
  "plugins": [
    {
      "name": "claudevaders",
      "description": "Space Invaders while Claude thinks - a loading screen game inspired by Amiga tape loading",
      "version": "1.0.0",
      "path": "."
    }
  ]
}
```

**Step 2: Commit**

```bash
git add marketplace.json
git commit -m "feat: add marketplace.json for plugin distribution"
```

---

## Task 9: Final Push and Test Install

**Step 1: Push all commits**

```bash
git push origin main
```

**Step 2: Test plugin installation**

Run in a separate Claude Code session:
```
/plugin marketplace add TheCannings/claudeVaders
/plugin install claudevaders
```

**Step 3: Test hook fires**

Ask Claude to do something with the Task tool (e.g., "search the codebase for X")
Expected: Game window opens while task runs, closes with "Task Complete!" when done

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Plugin structure | `.claude-plugin/plugin.json`, `hooks/hooks.json` |
| 2 | Game package setup | `game/package.json`, `game/.gitignore` |
| 3 | Entry point + signals | `game/index.js` |
| 4 | Terminal renderer | `game/renderer.js` |
| 5 | Game logic | `game/game.js` |
| 6 | Cross-platform launcher | `hooks/launch.sh` |
| 7 | Integration testing | (manual) |
| 8 | Marketplace config | `marketplace.json` |
| 9 | Push and test install | (manual) |
