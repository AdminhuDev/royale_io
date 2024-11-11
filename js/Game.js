import { SafeZoneManager } from './SafeZoneManager.js';
import { Player } from './Player.js';
import { BotManager } from './Bots.js';
import { UIManager } from './UIManager.js';
import { Effects } from './Effects.js';
import { LootManager } from './LootManager.js';
import { BulletManager } from './BulletManager.js';
import { NetworkManager } from './NetworkManager.js';
import { Logger } from './Logger.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) throw new Error('Canvas não encontrado');
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) throw new Error('Contexto 2D não suportado');
        this.setupCanvas();

        this.TOTAL_PLAYERS = 10;
        this.playersAlive = this.TOTAL_PLAYERS;

        this.initializeGame();
        this.setupEventListeners();
        this.gameLoop();

        // Inicializar NetworkManager
        this.network = new NetworkManager(this);
        
        // Adicionar estado de rede
        this.isMultiplayer = true;
        this.otherPlayers = new Map();

        // Adicionar monitoramento de performance
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.fps = 0;
        this.fpsUpdateInterval = setInterval(() => this.updateFPS(), 1000);

        // Adicionar propriedades de tiro
        this.firing = false;
        this.lastShotTime = 0;
        this.shotCooldown = 200; // 200ms entre tiros

        // Adicionar suporte a touch
        this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        this.touchStartPos = { x: 0, y: 0 };
        this.setupTouchControls();
    }

    initializeGame() {
        // Primeiro inicializar o SafeZone
        this.safeZone = new SafeZoneManager(this.canvas);
        this.safeZone.setGame(this);

        // Depois inicializar o player
        this.player = new Player(this.canvas.width/2, this.canvas.height/2);
        this.player.game = this;

        // Depois os managers que dependem do SafeZone
        this.botManager = new BotManager(this.TOTAL_PLAYERS-1, this.canvas);
        this.ui = new UIManager(this);
        this.bulletManager = new BulletManager(this);
        
        // LootManager por último, já que depende do SafeZone
        this.lootManager = new LootManager(this);
        // Só iniciar o spawn quando o jogo realmente começar
        if (this.gameState === 'playing') {
            this.lootManager.startLootSpawning();
        }

        this.gameState = 'waiting';
        this.waitingScreen = document.getElementById('waiting-screen');
        this.countdownElement = document.getElementById('countdown');
        this.mouse = {x: this.player.x, y: this.player.y};
        this.camera = {x: 0, y: 0, width: this.canvas.width, height: this.canvas.height};

        this.checkingWinner = false;
        this.gameEnded = false;
        this.victoryRoyale = false;
        this.deathProcessed = false;

        this.setupButtons();
    }

    setupButtons() {
        if (this.ui.playAgainButton) {
            this.ui.playAgainButton.onclick = () => {
                this.ui.hideGameOver();
                this.startNewGame();
            };
        }
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        this.boundHandleResize = this.handleResize.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleMouseDown = this.handleMouseDown.bind(this);
        this.boundHandleMouseUp = this.handleMouseUp.bind(this);
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);

        window.addEventListener('resize', this.boundHandleResize);
        this.canvas.addEventListener('mousemove', this.boundHandleMouseMove);
        this.canvas.addEventListener('mousedown', this.boundHandleMouseDown);
        this.canvas.addEventListener('mouseup', this.boundHandleMouseUp);
        window.addEventListener('keydown', this.boundHandleKeyDown);
    }

    gameLoop() {
        const now = performance.now();
        this.frameCount++;

        if (this.gameState === 'playing') {
            this.update();
            this.draw();
            
            // Atualizar FPS em tempo real
            if (now - this.lastFrameTime >= 1000) {
                this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFrameTime));
                this.frameCount = 0;
                this.lastFrameTime = now;
                if (this.ui) {
                    this.ui.updatePerformanceStats(this.fps, this.network?.lastPing || 0);
                }
            }
        } else if (this.gameState === 'gameover') {
            this.draw();
            if (this.gameEnded) {
                return;
            }
        }

        if (!this.gameEnded) {
            requestAnimationFrame(() => this.gameLoop());
        }
    }

    updateFPS() {
        const currentFPS = this.fps;
        if (this.ui) {
            this.ui.updatePerformanceStats(currentFPS, this.network?.lastPing || 0);
        }
    }

    update() {
        if (this.gameState !== 'playing') return;

        // Atualizar jogador local
        if (this.player.isAlive) {
            this.player.update(this.mouse, this.canvas, this.safeZone);
            
            // Enviar posição mais frequentemente
            if (this.network?.updatePosition) {
                this.network.updatePosition();
            }
        }

        // Atualizar outros jogadores com interpolação
        if (this.otherPlayers) {
            this.otherPlayers.forEach(player => {
                if (player.isAlive) {
                    player.update(null, this.canvas, this.safeZone);
                }
            });
        }

        this.safeZone.update();
        this.checkGameState();
        
        if (!this.gameEnded) {
            this.updatePlayer();
            
            if (this.isMultiplayer && this.network) {
                this.network.updatePosition();
            }
        }

        if (!this.gameEnded) {
            this.botManager.updateBots(this.safeZone.config, this.bulletManager.bullets, this.player);
            this.bulletManager.update();
            this.lootManager.update();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();

        const cameraX = this.player.x - this.canvas.width/2;
        const cameraY = this.player.y - this.canvas.height/2;
        this.ctx.translate(-cameraX, -cameraY);

        this.drawGameElements();

        this.otherPlayers.forEach(player => {
            if (player.isAlive) {
                player.draw(this.ctx);
            }
        });

        this.ctx.restore();

        if (this.player.isAlive) {
            this.drawCrosshair();
        }
    }

    drawGameElements() {
        this.safeZone.draw(this.ctx);
        this.bulletManager.draw(this.ctx);
        this.lootManager.draw(this.ctx);
        this.botManager.draw(this.ctx);
        
        if (this.player.isAlive) {
            this.player.draw(this.ctx);
        }
    }

    drawCrosshair() {
        const size = 16, width = 2, gap = 4;
        this.ctx.save();
        
        const crosshairColor = this.player.skin?.crosshairColor || 'rgba(255,255,255,0.8)';
        this.ctx.strokeStyle = crosshairColor;
        this.ctx.lineWidth = width;

        this.drawCrosshairElements(size, gap, crosshairColor);

        this.ctx.restore();
    }

    drawCrosshairElements(size, gap, color) {
        // Linhas horizontais
        this.ctx.beginPath();
        this.ctx.moveTo(this.mouse.x - size - gap, this.mouse.y);
        this.ctx.lineTo(this.mouse.x - gap, this.mouse.y);
        this.ctx.moveTo(this.mouse.x + gap, this.mouse.y);
        this.ctx.lineTo(this.mouse.x + size + gap, this.mouse.y);
        this.ctx.stroke();

        // Linhas verticais
        this.ctx.beginPath();
        this.ctx.moveTo(this.mouse.x, this.mouse.y - size - gap);
        this.ctx.lineTo(this.mouse.x, this.mouse.y - gap);
        this.ctx.moveTo(this.mouse.x, this.mouse.y + gap);
        this.ctx.lineTo(this.mouse.x, this.mouse.y + size + gap);
        this.ctx.stroke();

        // Ponto central e círculo
        this.drawCrosshairCenter(size, gap, color);
    }

    drawCrosshairCenter(size, gap, color) {
        this.ctx.beginPath();
        this.ctx.arc(this.mouse.x, this.mouse.y, 2, 0, Math.PI*2);
        this.ctx.fillStyle = color;
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(this.mouse.x, this.mouse.y, size + gap, 0, Math.PI*2);
        
        if (this.player.skin?.glowEffect) {
            this.ctx.shadowColor = this.player.skin.glowEffect.color;
            this.ctx.shadowBlur = this.player.skin.glowEffect.blur || 5;
        }
        
        this.ctx.strokeStyle = color.replace('0.8', '0.2');
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    handlePlayerShooting() {
        if (this.firing && this.player.isAlive && this.player.ammo > 0) {
            const now = Date.now();
            if (now - this.lastShotTime >= this.shotCooldown) {
                const worldMouseX = this.mouse.x + (this.player.x - this.canvas.width/2);
                const worldMouseY = this.mouse.y + (this.player.y - this.canvas.height/2);
                
                const bulletColor = this.player.skin?.bulletColor || 
                                  this.player.skin?.color || 
                                  this.bulletManager.bulletColor;
                
                const bulletFired = this.bulletManager.fireBullet(
                    this.player.x, 
                    this.player.y, 
                    worldMouseX, 
                    worldMouseY, 
                    this.player,
                    bulletColor
                );

                if (bulletFired && this.isMultiplayer) {
                    this.network.sendShot({
                        x: this.player.x,
                        y: this.player.y,
                        targetX: worldMouseX,
                        targetY: worldMouseY,
                        color: bulletColor,
                        timestamp: now
                    });
                }
                
                this.lastShotTime = now;
            }
        }
    }

    checkCollision(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        return Math.hypot(dx, dy) < (obj1.size + obj2.size);
    }

    checkGameState() {
        if (this.gameEnded) return;

        // Contar jogadores vivos
        const aliveBots = this.botManager.bots.filter(bot => bot.isAlive).length;
        const alivePlayers = this.isMultiplayer ? 
            Array.from(this.network.players.values()).filter(p => p.isAlive).length : 0;
        const totalAlive = aliveBots + alivePlayers + (this.player.isAlive ? 1 : 0);
        
        this.playersAlive = totalAlive;
        this.ui.updatePlayersAlive(this.playersAlive);

        // Verificar condições de fim de jogo
        if (!this.player.isAlive && !this.deathProcessed) {
            this.handlePlayerDeath();
        } else if (totalAlive === 1 && this.player.isAlive) {
            this.handleVictory();
        } else if (totalAlive === 1 && !this.player.isAlive) {
            const winnerBot = this.botManager.bots.find(bot => bot.isAlive);
            if (winnerBot) {
                this.gameEnded = true;
                this.gameState = 'gameover';
                this.ui.showBotVictoryScreen();
            }
        }
    }

    handlePlayerDeath() {
        this.deathProcessed = true;
        this.gameState = 'gameover';
        this.gameEnded = true;
        this.ui.showDeathScreen(false); // Sempre false pois não há mais espectador
    }

    handleVictory() {
        if (!this.gameEnded && this.player.isAlive) {
            this.gameEnded = true;
            this.gameState = 'gameover';
            this.victoryRoyale = true;
            
            const finalScore = this.player.score + Math.round(this.player.health);
            this.player.addScore(50); // Bônus de vitória
            this.ui.showVictoryScreen(finalScore);
        }
    }

    resetGame() {
        this.ui.hideGameOver();
        this.spectatorMode = false;
        this.spectatingBot = null;
        this.spectatorIndex = 0;
        this.deathProcessed = false;
        this._gameOverShown = false; // Reset da flag
        this.setupButtons();
    }

    startNewGame() {
        if (this.gameState !== 'destroyed') {
            this.destroy();
        }

        this.initializeNewGame();
        this.setupVisibility();
        this.setupEventListeners();
        this.startCountdown();
    }

    initializeNewGame() {
        this.gameState = 'waiting';
        this.gameEnded = false;
        this.victoryRoyale = false;
        this.countdown = 10;
        this.deathProcessed = false;
        this.spectatorMode = false;
        this.spectatingBot = null;
        this.spectatorIndex = 0;

        this.setupCanvas();
        this.safeZone = new SafeZoneManager(this.canvas);
        this.safeZone.setGame(this);
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
        this.player.game = this;
        this.botManager = new BotManager(this.TOTAL_PLAYERS - 1, this.canvas);
        this.ui = new UIManager(this);

        this.bullets = [];
        this.loots = [];
    }

    setupVisibility() {
        const startScreen = document.getElementById('start-screen');
        const canvas = document.getElementById('gameCanvas');
        const ui = document.getElementById('ui');

        if (startScreen) startScreen.style.display = 'none';
        if (canvas) canvas.style.display = 'block';
        if (ui) ui.style.display = 'block';
    }

    destroy() {
        this.gameState = 'destroyed';
        this.removeEventListeners();
        
        // Limpar componentes de forma segura
        const components = [
            'ui', 'botManager', 'safeZone', 'player', 
            'bulletManager', 'lootManager', 'network'
        ];
        
        components.forEach(component => {
            if (this[component]?.destroy) {
                try {
                    this[component].destroy();
                } catch (error) {
                    console.error(`Erro ao destruir ${component}:`, error);
                }
                this[component] = null;
            }
        });
        
        // Limpar arrays e timers
        this.bullets = [];
        this.loots = [];
        this.otherPlayers.clear();
        
        if (this.fpsUpdateInterval) {
            clearInterval(this.fpsUpdateInterval);
            this.fpsUpdateInterval = null;
        }

        // Limpar canvas
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    removeEventListeners() {
        window.removeEventListener('resize', this.boundHandleResize);
        if (this.canvas) {
            this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove);
            this.canvas.removeEventListener('mousedown', this.boundHandleMouseDown);
            this.canvas.removeEventListener('mouseup', this.boundHandleMouseUp);
        }
        window.removeEventListener('keydown', this.boundHandleKeyDown);
    }

    clearTimers() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = null;
        }

        if (this.lootSpawnInterval) {
            clearInterval(this.lootSpawnInterval);
            this.lootSpawnInterval = null;
        }
    }

    clearArrays() {
        this.bullets = [];
        this.loots = [];
    }

    destroyComponents() {
        if (this.ui) {
            this.ui.destroy();
            this.ui = null;
        }
        
        if (this.botManager) {
            this.botManager.destroy();
            this.botManager = null;
        }
        
        if (this.safeZone) {
            this.safeZone.destroy();
            this.safeZone = null;
        }
        
        if (this.player) {
            this.player.destroy();
            this.player = null;
        }

        this.bulletManager.destroy();
        this.lootManager.destroy();

        this.mouse = null;
        this.camera = null;
    }

    clearCanvas() {
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    handleResize() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            const oldWidth = this.canvas.width;
            const oldHeight = this.canvas.height;
            
            this.setupCanvas();
            
            const scaleX = this.canvas.width / oldWidth;
            const scaleY = this.canvas.height / oldHeight;
            
            if (this.safeZone) {
                this.safeZone.config.centerX *= scaleX;
                this.safeZone.config.centerY *= scaleY;
                
                const scale = Math.min(scaleX, scaleY);
                this.safeZone.config.currentRadius *= scale;
                this.safeZone.config.initialRadius *= scale;
            }
        }, 250);
    }

    handleMouseMove(e) {
        if (!this.canvas) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;

        if (this.gameState === 'playing' && !this.spectatorMode && this.player) {
            const dx = this.mouse.x - this.canvas.width/2;
            const dy = this.mouse.y - this.canvas.height/2;
            this.player.targetAngle = Math.atan2(dy, dx);
        }
    }

    handleMouseDown() {
        this.firing = true;
    }

    handleMouseUp() {
        this.firing = false;
    }

    handleKeyDown(e) {
        if (e.code === 'Escape') {
            // Se estiver em alguma tela de menu/overlay
            const tutorialScreen = document.getElementById('tutorial-screen');
            const skinSelector = document.getElementById('skin-selector');
            
            if (tutorialScreen?.style.display === 'flex' || skinSelector?.style.display === 'block') {
                // Fechar menus se estiverem abertos
                if (tutorialScreen) tutorialScreen.style.display = 'none';
                if (skinSelector) skinSelector.style.display = 'none';
            } else if (this.gameState === 'playing' && !this.gameEnded) {
                // Se estiver jogando, mostrar confirmação para sair
                if (confirm('Deseja realmente sair do jogo?')) {
                    this.gameEnded = true;
                    this.gameState = 'gameover';
                    if (this.ui) {
                        this.ui.showStartScreen();
                    }
                }
            }
            return;
        }

        // Resto dos controles
        if (e.code === 'KeyE') {
            if (this.player && this.player.isAlive) {
                if (!this.player.medkits.active && !this.player.medkits.cooldown && this.player.health < 100) {
                    this.player.activateHealing();
                }
            }
        } else if (e.code === 'Space') {
            if (this.player && this.player.isAlive) {
                if (!this.player.shield.cooldown && !this.player.shield.active) {
                    this.player.activateShield();
                }
            }
        } else if (e.code === 'KeyI' || e.code === 'KeyV') {
            const skinSelector = document.getElementById('skin-selector');
            if (skinSelector) {
                const isVisible = skinSelector.style.display === 'block';
                skinSelector.style.display = isVisible ? 'none' : 'block';
                
                if (!isVisible) {
                    skinSelector.classList.add('fade-in');
                    setTimeout(() => skinSelector.classList.remove('fade-in'), 300);
                }
            }
        }

        if (this.spectatorMode) {
            if (e.code === 'ArrowLeft') this.switchSpectatorTarget(-1);
            else if (e.code === 'ArrowRight') this.switchSpectatorTarget(1);
        }
    }

    // Métodos para gerenciar outros jogadores
    addPlayer(playerData) {
        const otherPlayer = new Player(playerData.x, playerData.y);
        otherPlayer.id = playerData.id;
        otherPlayer.name = playerData.name;
        otherPlayer.setSkin(playerData.skin);
        this.otherPlayers.set(playerData.id, otherPlayer);
    }

    removePlayer(playerId) {
        this.otherPlayers.delete(playerId);
    }

    updatePlayerPosition(playerId, position) {
        const player = this.otherPlayers.get(playerId);
        if (player) {
            player.x = position.x;
            player.y = position.y;
            player.targetAngle = position.angle;
        }
    }

    startGame() {
        this.gameState = 'playing';
        this.gameEnded = false;
        this.deathProcessed = false;
        
        // Posicionar jogador em local seguro
        const spawnPos = this.network ? 
            this.network.calculateSafeSpawnPosition() : 
            {
                x: this.canvas.width / 2,
                y: this.canvas.height / 2
            };
        
        this.player.x = spawnPos.x;
        this.player.y = spawnPos.y;
        
        // Iniciar sistemas
        this.safeZone.reset();
        this.lootManager.startLootSpawning();
        
        // Mostrar UI do jogo e esconder tela de espera
        if (this.ui) {
            this.ui.hideWaitingScreen();
            this.ui.showGameElements();
        }

        // Esconder waiting screen e mostrar elementos do jogo
        if (this.waitingScreen) {
            this.waitingScreen.style.display = 'none';
        }
        
        const elements = [
            document.querySelector('.zone-info'),
            document.querySelector('.player-ui')
        ];
        
        elements.forEach(el => {
            if (el) el.style.display = 'flex';
        });
    }

    startOfflineGame() {
        Logger.info('Iniciando jogo offline');
        this.isMultiplayer = false;
        this.gameState = 'playing';
        this.gameStarted = true;
        
        // Adicionar bots
        const numBots = this.TOTAL_PLAYERS - 1;
        this.botManager = new BotManager(numBots, this.canvas);
        
        // Iniciar elementos do jogo
        if (this.ui) {
            this.ui.hideWaitingScreen();
            this.ui.showGameElements();
        }
        
        // Iniciar sistemas
        this.safeZone.reset();
        if (this.lootManager) {
            this.lootManager.startLootSpawning();
        }
    }

    updatePlayer() {
        if (!this.player || !this.player.isAlive) return;
        
        this.player.update(this.mouse, this.canvas, this.safeZone);
        this.handlePlayerShooting();
        
        if (this.ui) {
            this.ui.updateHealth(this.player.health);
            this.ui.updateAmmo(this.player.ammo);
            this.ui.updateShield(this.player);
            this.ui.updateMedkit(this.player);
        }
    }

    setupTouchControls() {
        if (!this.isTouchDevice) return;

        const shootButton = document.getElementById('shoot-button');
        const shieldButton = document.getElementById('shield-button');
        const medkitButton = document.getElementById('medkit-button');

        if (shootButton) {
            shootButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.firing = true;
                shootButton.classList.add('active');
            });

            shootButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.firing = false;
                shootButton.classList.remove('active');
            });
        }

        if (shieldButton) {
            shieldButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.player && !this.player.shield.active && !this.player.shield.cooldown) {
                    this.player.activateShield();
                    shieldButton.classList.add('active');
                    setTimeout(() => shieldButton.classList.remove('active'), 200);
                }
            });
        }

        if (medkitButton) {
            medkitButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.player && !this.player.medkits.active && !this.player.medkits.cooldown) {
                    this.player.activateHealing();
                    medkitButton.classList.add('active');
                    setTimeout(() => medkitButton.classList.remove('active'), 200);
                }
            });
        }

        let lastTouch = null;
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.touchStartPos = {
                x: touch.clientX,
                y: touch.clientY
            };
            lastTouch = touch;
            
            // Atualizar mira
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = touch.clientX - rect.left;
            this.mouse.y = touch.clientY - rect.top;
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            lastTouch = touch;
            
            // Atualizar posição do mouse para mira
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = touch.clientX - rect.left;
            this.mouse.y = touch.clientY - rect.top;

            if (this.player && this.player.isAlive) {
                // Calcular movimento baseado na diferença do toque inicial
                const dx = touch.clientX - this.touchStartPos.x;
                const dy = touch.clientY - this.touchStartPos.y;
                const moveAngle = Math.atan2(dy, dx);
                const moveDistance = Math.hypot(dx, dy);
                
                // Aplicar movimento apenas se houver distância significativa
                if (moveDistance > 20) {
                    this.player.x += Math.cos(moveAngle) * this.player.speed;
                    this.player.y += Math.sin(moveAngle) * this.player.speed;
                    
                    // Atualizar ângulo do jogador para a direção do movimento
                    this.player.targetAngle = moveAngle;
                }
            }
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            lastTouch = null;
        });
    }
}
