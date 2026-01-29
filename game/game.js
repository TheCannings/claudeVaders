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
