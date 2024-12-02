import { LootManager } from './LootManager.js';
import { Camera } from './Camera.js';
import { NetworkManager } from './NetworkManager.js';
import { Player } from './Player.js';
import { Bot } from './Bot.js';
import { SkinManager } from './SkinManager.js';
import { SafeZone } from './SafeZone.js';
import { GridRenderer } from './GridRenderer.js';
import { EffectManager } from './EffectManager.js';
import { BulletManager } from './BulletManager.js';
import { GameRenderer } from './GameRenderer.js';
import { CONFIG } from './config.js';
import { updateStats } from './Main.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Estado do jogo
        this.gameState = 'waiting';
        this.players = new Map();
        this.bots = new Map();
        this.localPlayer = null;
        this.mouseX = 0;
        this.mouseY = 0;
        this.frameCount = 0;
        this.worldWidth = CONFIG.WORLD.WIDTH;
        this.worldHeight = CONFIG.WORLD.HEIGHT;
        this.isGameOver = false;
        this.gameLoopId = null;
        this.matchStartTimer = CONFIG.GAME.MATCH_START_TIMER;
        this.minPlayers = CONFIG.GAME.MIN_PLAYERS;
        this.score = 0;
        
        // Gerenciadores
        this.camera = new Camera(this);
        this.lootManager = new LootManager(this);
        this.networkManager = new NetworkManager(this);
        this.skinManager = new SkinManager();
        this.gridRenderer = new GridRenderer(this.worldWidth, this.worldHeight);
        this.safeZone = new SafeZone(this.worldWidth, this.worldHeight);
        this.effectManager = new EffectManager(this);
        this.bulletManager = new BulletManager(this);
        this.renderer = new GameRenderer(this);
        
        // Campo de estrelas
        this.starField = {
            stars: [],
            numStars: CONFIG.STAR_FIELD.NUM_STARS,
            speed: CONFIG.STAR_FIELD.SPEED,
            init: () => {
                for (let i = 0; i < this.starField.numStars; i++) {
                    this.starField.stars.push({
                        x: Math.random() * this.worldWidth,
                        y: Math.random() * this.worldHeight,
                        size: Math.random() * (CONFIG.STAR_FIELD.MAX_SIZE - CONFIG.STAR_FIELD.MIN_SIZE) + CONFIG.STAR_FIELD.MIN_SIZE,
                        speed: Math.random() * 0.5 + 0.1
                    });
                }
            },
            update: () => {
                for (let star of this.starField.stars) {
                    star.y += star.speed * this.starField.speed;
                    if (star.y > this.worldHeight) {
                        star.y = 0;
                        star.x = Math.random() * this.worldWidth;
                    }
                }
            }
        };
        this.starField.init();
        
        // Inicialização
        this.setupCanvas();
        this.setupEvents();
        this.createPlayer();
        this.startGameLoop();
    }

    setupCanvas() {
        const updateCanvasSize = () => {
            const pixelRatio = window.devicePixelRatio || 1;
            this.canvas.style.width = window.innerWidth + 'px';
            this.canvas.style.height = window.innerHeight + 'px';
            this.canvas.width = window.innerWidth * pixelRatio;
            this.canvas.height = window.innerHeight * pixelRatio;
            this.ctx.scale(pixelRatio, pixelRatio);
        };

        this.canvas.style.cursor = 'none';
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
    }

    setupEvents() {
        this.lastScreenX = 0;
        this.lastScreenY = 0;

        const mouseMoveHandler = (e) => {
            if (this.isGameOver || !this.camera) return;

            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            this.lastScreenX = (e.clientX - rect.left) * scaleX;
            this.lastScreenY = (e.clientY - rect.top) * scaleY;
            
            this.updateMouseWorldPosition();
        };

        const clickHandler = (e) => {
            if (this.localPlayer && this.localPlayer.health > 0 && !this.isGameOver) {
                this.shoot();
            }
        };

        const keyDownHandler = (e) => {
            if (e.code === 'Space' && this.localPlayer && !this.isGameOver) {
                e.preventDefault();
                if (this.localPlayer.shield >= 20) {
                    if (this.localPlayer.activateShield()) {
                        this.localPlayer.shield = Math.max(0, this.localPlayer.shield - 20);
                        
                        const shieldElement = document.getElementById('shield');
                        if (shieldElement) {
                            shieldElement.textContent = Math.ceil(this.localPlayer.shield);
                        }
                        
                        const shieldCooldown = document.getElementById('shield-cooldown');
                        if (shieldCooldown) {
                            shieldCooldown.style.height = '100%';
                        }
                    }
                }
            }
        };

        this.canvas.addEventListener('mousemove', mouseMoveHandler);
        this.canvas.addEventListener('click', clickHandler);
        window.addEventListener('keydown', keyDownHandler);

        this.eventHandlers = {
            mousemove: mouseMoveHandler,
            click: clickHandler,
            keydown: keyDownHandler
        };
    }

    updateMouseWorldPosition() {
        if (!this.camera || this.isGameOver) return;
        
        const worldPos = this.camera.screenToWorld(this.lastScreenX, this.lastScreenY);
        this.mouseX = worldPos.x;
        this.mouseY = worldPos.y;
    }

    createPlayer() {
        const x = this.worldWidth / 2;
        const y = this.worldHeight / 2;
        this.localPlayer = new Player(x, y, true, this);
        this.localPlayer.name = localStorage.getItem('playerName') || 'Player';
        
        const skin = this.skinManager.skins[this.skinManager.currentSkin];
        this.localPlayer.skinColor = skin.color === 'rainbow' ? 
            `hsl(${(this.frameCount * 2) % 360}, 100%, 50%)` : 
            skin.color;
    }

    movePlayer() {
        if (!this.localPlayer) return;
        this.localPlayer.move(this.mouseX, this.mouseY, this.worldWidth, this.worldHeight);
    }

    shoot() {
        if (!this.localPlayer || this.localPlayer.health <= 0) return;

        const bullet = this.localPlayer.shoot(this.mouseX, this.mouseY);
        if (bullet) {
            this.bulletManager.addBullet(bullet);
            if (this.networkManager) {
                this.networkManager.sendShoot(bullet);
            }
        }
    }

    handleHit(damage) {
        if (!this.localPlayer) return;
        
        const isDead = this.localPlayer.takeDamage(damage);
        if (isDead) {
            if (this.networkManager) {
                this.networkManager.sendDeath();
            }
            this.handleGameOver();
        }
    }

    handleGameOver(isVictory = false) {
        if (this.isGameOver) return;
        
        this.isGameOver = true;
        this.gameState = 'ended';
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }

        const gameOverScreen = document.getElementById('game-over');
        const finalScoreElement = document.getElementById('final-score');
        const finalKillsElement = document.getElementById('final-kills');
        const finalTimeElement = document.getElementById('final-time');
        const gameUI = document.getElementById('game-ui');
        const gameOverTitle = document.querySelector('#game-over h2');

        if (gameOverScreen) {
            if (isVictory) {
                this.score += 500;
            }

            if (gameOverTitle) {
                gameOverTitle.textContent = isVictory ? 'Vitória!' : 'Game Over';
                gameOverTitle.style.color = isVictory ? '#4CAF50' : '#ff4444';
            }

            if (finalScoreElement) finalScoreElement.textContent = this.score;
            if (finalKillsElement && this.localPlayer) finalKillsElement.textContent = this.localPlayer.kills;
            if (finalTimeElement) {
                const minutes = Math.floor(this.frameCount / (60 * 60));
                const seconds = Math.floor((this.frameCount / 60) % 60);
                finalTimeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }

            const stats = JSON.parse(localStorage.getItem('gameStats') || '{}');
            
            stats.lastScore = this.score;
            stats.highScore = Math.max(stats.highScore || 0, this.score);
            stats.totalPoints = (stats.totalPoints || 0) + this.score;
            stats.totalKills = (stats.totalKills || 0) + (this.localPlayer ? this.localPlayer.kills : 0);
            stats.wins = (stats.wins || 0) + (isVictory ? 1 : 0);
            
            localStorage.setItem('gameStats', JSON.stringify(stats));
            updateStats();

            if (gameUI) gameUI.style.display = 'none';
            gameOverScreen.style.display = 'flex';
        }
    }

    update() {
        switch (this.gameState) {
            case 'waiting':
                this.manageBots();
                this.camera.update();
                break;

            case 'starting':
                this.matchStartTimer--;
                if (this.matchStartTimer <= 0) {
                    this.gameState = 'running';
                }
                this.camera.update();
                break;

            case 'running':
                if (this.localPlayer) {
                    this.localPlayer.updateShield();
                }

                this.bots.forEach(bot => bot.update(this));
                this.movePlayer();
                this.bulletManager.update();
                this.safeZone.update();
                this.lootManager.update();
                this.camera.update();
                this.updateMouseWorldPosition();
                this.effectManager.update();

                if (this.networkManager && this.localPlayer) {
                    this.networkManager.sendPosition();
                }

                this.applyZoneDamage();
                break;
        }
    }

    applyZoneDamage() {
        if (this.localPlayer && this.localPlayer.health > 0) {
            const damage = this.safeZone.getDamage(this.localPlayer.x, this.localPlayer.y);
            if (damage > 0) {
                this.localPlayer.health = Math.max(0, this.localPlayer.health - damage);
                
                this.effectManager.effects.push({
                    x: this.localPlayer.x,
                    y: this.localPlayer.y,
                    opacity: 0.5,
                    yOffset: 0,
                    type: 'damage',
                    color: '#ff0000'
                });

                if (this.localPlayer.health <= 0) {
                    this.handleGameOver(false);
                }
            }
        }

        this.bots.forEach((bot, botId) => {
            if (bot.health > 0) {
                const damage = this.safeZone.getDamage(bot.x, bot.y);
                if (damage > 0) {
                    bot.health = Math.max(0, bot.health - damage);
                    if (bot.health <= 0) {
                        this.bots.delete(botId);
                    }
                }
            }
        });

        this.players.forEach((player, playerId) => {
            if (player.health > 0) {
                const damage = this.safeZone.getDamage(player.x, player.y);
                if (damage > 0) {
                    player.health = Math.max(0, player.health - damage);
                    if (player.health <= 0) {
                        this.players.delete(playerId);
                    }
                }
            }
        });
    }

    manageBots() {
        const totalPlayers = this.players.size + 1;
        const botsNeeded = Math.max(0, this.minPlayers - totalPlayers);
        
        if (this.bots.size > botsNeeded) {
            const botsToRemove = this.bots.size - botsNeeded;
            let count = 0;
            this.bots.forEach((bot, id) => {
                if (count < botsToRemove) {
                    this.bots.delete(id);
                    count++;
                }
            });
        }
        
        while (this.bots.size < botsNeeded) {
            const botId = `bot_${Date.now()}_${Math.random()}`;
            
            const numSectors = this.minPlayers - 1;
            const sectorAngle = (Math.PI * 2) / numSectors;
            const currentSector = this.bots.size;
            const angle = sectorAngle * currentSector + (Math.random() - 0.5) * sectorAngle * 0.5;
            
            const minRadius = this.safeZone.currentRadius * 0.3;
            const maxRadius = this.safeZone.currentRadius * 0.7;
            const radius = minRadius + Math.random() * (maxRadius - minRadius);
            
            const x = this.safeZone.x + Math.cos(angle) * radius;
            const y = this.safeZone.y + Math.sin(angle) * radius;
            
            const bot = new Bot(x, y, this);
            bot.skinColor = this.skinManager.skins.default.color;
            this.bots.set(botId, bot);
        }

        if (totalPlayers + this.bots.size >= this.minPlayers && this.gameState === 'waiting') {
            this.gameState = 'starting';
        }
    }

    startGameLoop() {
        const loop = () => {
            if (!this.isGameOver) {
                this.frameCount++;
                this.update();
                this.renderer.render();
                this.gameLoopId = requestAnimationFrame(loop);
            }
        };
        loop();
    }

    addPlayer(playerId, data) {
        const player = new Player(data.x, data.y, false, this);
        player.id = playerId;
        player.name = data.name;
        player.health = data.health;
        player.score = data.score;
        player.kills = data.kills;
        player.skinId = data.skinId || 'default';
        player.updateSkinColor();
        this.players.set(playerId, player);
        return player;
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
    }

    updatePlayer(playerId, data) {
        const player = this.players.get(playerId);
        if (player) {
            player.updateFromNetwork(data);
        }
        return player;
    }

    destroy() {
        if (this.networkManager) {
            this.networkManager.disconnect();
        }

        if (this.eventHandlers) {
            this.canvas.removeEventListener('mousemove', this.eventHandlers.mousemove);
            this.canvas.removeEventListener('click', this.eventHandlers.click);
            window.removeEventListener('keydown', this.eventHandlers.keydown);
            window.removeEventListener('resize', this.eventHandlers.resize);
        }

        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }

        this.players.clear();
        this.bots.clear();
        this.bullets = [];
        this.lootManager.clear();
        this.effectManager.effects = [];

        this.localPlayer = null;
        this.networkManager = null;
        this.camera = null;
        this.ctx = null;
        this.canvas = null;
    }
}
