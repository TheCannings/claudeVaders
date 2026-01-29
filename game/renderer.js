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
