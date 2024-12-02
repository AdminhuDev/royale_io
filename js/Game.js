import { LootManager } from './LootManager.js';
import { Camera } from './Camera.js';
import { NetworkManager } from './NetworkManager.js';
import { Player } from './Player.js';
import { Bot } from './Bot.js';
import { SkinManager } from './SkinManager.js';
import { SafeZone } from './SafeZone.js';
import { GridRenderer } from './GridRenderer.js';
import { EffectManager } from './EffectManager.js';
import { CONFIG } from './config.js';
import { updateStats } from './Main.js';

export class Game {
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
        this.bullets = [];
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

    setupEvents() {
        // Armazenar a última posição do mouse em coordenadas da tela
        this.lastScreenX = 0;
        this.lastScreenY = 0;

        const mouseMoveHandler = (e) => {
            if (this.isGameOver || !this.camera) return;

            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            // Armazenar coordenadas da tela
            this.lastScreenX = (e.clientX - rect.left) * scaleX;
            this.lastScreenY = (e.clientY - rect.top) * scaleY;
            
            // Atualizar coordenadas do mundo
            this.updateMouseWorldPosition();
        };

        const clickHandler = (e) => {
            if (this.localPlayer && this.localPlayer.health > 0 && !this.isGameOver) {
                this.shoot();
            }
        };

        const keyDownHandler = (e) => {
            if (e.code === 'Space' && this.localPlayer && !this.isGameOver) {
                e.preventDefault(); // Evitar scroll da página
                if (this.localPlayer.shield >= 20) { // Só ativa se tiver pelo menos 20 de escudo
                    if (this.localPlayer.activateShield()) {
                        // Diminui o escudo ao usar
                        this.localPlayer.shield = Math.max(0, this.localPlayer.shield - 20);
                        
                        // Atualizar UI do escudo
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

        // Armazenar referências para remover depois
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
        
        // Definir a cor da skin
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
            this.bullets.push(bullet);
            // Enviar tiro para o servidor
            if (this.networkManager) {
                this.networkManager.sendShoot(bullet);
            }
        }
    }

    handleHit(damage) {
        if (!this.localPlayer) return;
        
        const isDead = this.localPlayer.takeDamage(damage);
        if (isDead) {
            // Notificar o servidor sobre a morte
            if (this.networkManager) {
                this.networkManager.sendDeath();
            }
            this.handleGameOver();
        }
    }

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            bullet.x += bullet.dirX * bullet.speed;
            bullet.y += bullet.dirY * bullet.speed;
            bullet.lifetime--;

            // Verificar colisão com jogador local
            if (bullet && this.localPlayer && bullet.playerId !== 'local') {
                if (this.checkBulletCollision(bullet, this.localPlayer)) {
                    // Aplicar dano ao jogador local
                    this.localPlayer.health -= bullet.damage;
                    
                    // Efeito visual de dano usando o EffectManager
                    const hitAngle = Math.atan2(bullet.dirY, bullet.dirX);
                    this.effectManager.effects.push({
                        x: this.localPlayer.x + Math.cos(hitAngle) * this.localPlayer.radius,
                        y: this.localPlayer.y + Math.sin(hitAngle) * this.localPlayer.radius,
                        opacity: 1,
                        yOffset: 0,
                        type: 'damage',
                        color: '#ff0000'
                    });

                    // Verificar se o jogador morreu
                    if (this.localPlayer.health <= 0) {
                        this.localPlayer.health = 0;
                        this.handleGameOver(false);
                    }

                    // Remover projétil
                    this.bullets.splice(i, 1);
                    continue;
                }
            }

            // Verificar colisão com outros jogadores
            this.players.forEach((player, playerId) => {
                if (bullet && playerId !== bullet.playerId) {
                    if (this.checkBulletCollision(bullet, player)) {
                        // Aplicar dano
                        player.health -= bullet.damage;
                        
                        // Enviar atualização do dano
                        if (this.networkManager) {
                            this.networkManager.sendHit(playerId, bullet.damage);
                        }
                        
                        // Remover projétil
                        this.bullets.splice(i, 1);
                        return;
                    }
                }
            });

            // Verificar colisão com bots
            if (bullet) {
                this.bots.forEach((bot, botId) => {
                    if (bullet.playerId !== botId && this.checkBulletCollision(bullet, bot)) {
                        // Aplicar dano ao bot
                        bot.health -= bullet.damage;
                        
                        // Remover bot se morreu
                        if (bot.health <= 0) {
                            this.bots.delete(botId);
                            // Aumentar score do jogador local
                            if (this.localPlayer && bullet.playerId === 'local') {
                                this.localPlayer.kills++;
                                this.score += 100;
                                this.localPlayer.score = this.score;
                                
                                // Atualizar UI
                                const scoreElement = document.getElementById('score');
                                if (scoreElement) {
                                    scoreElement.textContent = this.score;
                                }
                                
                                const killsElement = document.getElementById('kills');
                                if (killsElement) {
                                    killsElement.textContent = this.localPlayer.kills;
                                }
                            }
                        }
                        
                        // Remover projétil
                        this.bullets.splice(i, 1);
                        return;
                    }
                });
            }
            
            // Verificar colisão com os limites do mundo
            if (bullet && (bullet.lifetime <= 0 ||
                bullet.x < 0 || bullet.x > this.worldWidth ||
                bullet.y < 0 || bullet.y > this.worldHeight)) {
                this.bullets.splice(i, 1);
            }
        }
    }

    checkBulletCollision(bullet, player) {
        const dx = bullet.x - player.x;
        const dy = bullet.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < player.radius + bullet.radius;
    }

    updateSafeZone() {
        if (!this.safeZone.shrinking && this.frameCount % 60 === 0) {
            this.safeZone.timer--;
            
            if (this.safeZone.timer <= 0) {
                this.safeZone.shrinking = true;
                this.safeZone.timer = 0;
            }
        }

        if (this.safeZone.shrinking) {
            const shrinkProgress = 1 - (this.safeZone.currentRadius / this.safeZone.maxRadius);
            this.safeZone.damage = Math.min(15, Math.max(2, 2 + (shrinkProgress * 13)));
            
            // Diminui a zona continuamente até chegar a 0
            this.safeZone.currentRadius = Math.max(0, this.safeZone.currentRadius - this.safeZone.shrinkSpeed);
            
            // Aumenta a velocidade de encolhimento conforme a zona fica menor
            if (this.safeZone.currentRadius < 500) {
                this.safeZone.shrinkSpeed = 1.2;
            }
        }

        // Aplicar dano da zona aos jogadores e bots
        if (this.localPlayer) {
            const dx = this.localPlayer.x - this.safeZone.x;
            const dy = this.localPlayer.y - this.safeZone.y;
            const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
            
            if (distanceFromCenter > this.safeZone.currentRadius) {
                const distanceMultiplier = Math.min(3, (distanceFromCenter - this.safeZone.currentRadius) / 100);
                this.localPlayer.health -= (this.safeZone.damage * distanceMultiplier) * (1/60);
                
                if (this.localPlayer.health <= 0) {
                    this.localPlayer.health = 0;
                    this.handleGameOver();
                }
            }
        }

        // Aplicar dano da zona aos bots
        this.bots.forEach((bot, botId) => {
            const dx = bot.x - this.safeZone.x;
            const dy = bot.y - this.safeZone.y;
            const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
            
            if (distanceFromCenter > this.safeZone.currentRadius) {
                const distanceMultiplier = Math.min(3, (distanceFromCenter - this.safeZone.currentRadius) / 100);
                bot.health -= (this.safeZone.damage * distanceMultiplier) * (1/60);
                
                if (bot.health <= 0) {
                    this.bots.delete(botId);
                }
            }
        });
    }

    handleGameOver(isVictory = false) {
        if (this.isGameOver) return;  // Evitar múltiplos game overs
        
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
            // Adicionar bônus de vitória
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

            // Salvar estatísticas
            const stats = JSON.parse(localStorage.getItem('gameStats') || '{}');
            
            stats.lastScore = this.score;
            stats.highScore = Math.max(stats.highScore || 0, this.score);
            stats.totalPoints = (stats.totalPoints || 0) + this.score;
            stats.totalKills = (stats.totalKills || 0) + (this.localPlayer ? this.localPlayer.kills : 0);
            stats.wins = (stats.wins || 0) + (isVictory ? 1 : 0);
            
            localStorage.setItem('gameStats', JSON.stringify(stats));
            
            // Atualizar estatísticas na interface
            updateStats();

            // Esconder UI do jogo e mostrar tela de game over
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
                    
                    if (this.localPlayer.shield < 100 && this.localPlayer.shieldCooldown <= 0) {
                        this.localPlayer.shield = Math.min(100, this.localPlayer.shield + 0.1);
                    }
                    
                    const shieldElement = document.getElementById('shield');
                    const shieldCooldown = document.getElementById('shield-cooldown');
                    
                    if (shieldElement) {
                        shieldElement.textContent = Math.ceil(this.localPlayer.shield);
                    }
                    
                    if (shieldCooldown) {
                        if (this.localPlayer.shieldCooldown > 0) {
                            const progress = ((this.localPlayer.shieldCooldownMax - this.localPlayer.shieldCooldown) / this.localPlayer.shieldCooldownMax) * 100;
                            shieldCooldown.style.height = `${100 - progress}%`;
                        } else {
                            shieldCooldown.style.height = '0%';
                        }
                    }
                }

                this.bots.forEach(bot => bot.update(this));
                this.movePlayer();
                this.updateBullets();
                this.safeZone.update();
                this.lootManager.update();
                this.camera.update();
                this.updateMouseWorldPosition();
                this.effectManager.update();

                if (this.networkManager && this.localPlayer) {
                    this.networkManager.sendPosition();
                }
                break;
        }
    }

    manageBots() {
        const totalPlayers = this.players.size + 1; // +1 para o jogador local
        const botsNeeded = Math.max(0, this.minPlayers - totalPlayers);
        
        // Remover bots extras se necessário
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
        
        // Adicionar bots faltantes com distribuição melhor
        while (this.bots.size < botsNeeded) {
            const botId = `bot_${Date.now()}_${Math.random()}`;
            
            // Distribuir bots em um padrão circular ao redor do centro
            const numSectors = this.minPlayers - 1; // -1 para o jogador local
            const sectorAngle = (Math.PI * 2) / numSectors;
            const currentSector = this.bots.size;
            const angle = sectorAngle * currentSector + (Math.random() - 0.5) * sectorAngle * 0.5;
            
            // Variar a distância do centro para cada bot
            const minRadius = this.safeZone.currentRadius * 0.3;
            const maxRadius = this.safeZone.currentRadius * 0.7;
            const radius = minRadius + Math.random() * (maxRadius - minRadius);
            
            const x = this.safeZone.x + Math.cos(angle) * radius;
            const y = this.safeZone.y + Math.sin(angle) * radius;
            
            const bot = new Bot(x, y, this);
            bot.skinColor = '#ff8800';  // Cor laranja para bots
            this.bots.set(botId, bot);
        }

        // Iniciar partida se houver jogadores suficientes
        if (totalPlayers + this.bots.size >= this.minPlayers && this.gameState === 'waiting') {
            this.gameState = 'starting';
        }
    }

    render() {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        this.camera.begin(this.ctx);
        this.gridRenderer.render(this.ctx);

        switch (this.gameState) {
            case 'waiting':
                this.renderWaitingScreen();
                break;

            case 'starting':
                this.renderStartingScreen();
                break;

            case 'running':
                this.renderSafeZone();
                this.lootManager.render(this.ctx);

                this.players.forEach(player => {
                    if (player.health > 0) {
                        player.render(this.ctx);
                    }
                });

                this.bots.forEach(bot => {
                    if (bot.health > 0) {
                        bot.render(this.ctx);
                    }
                });

                this.renderBullets();

                if (this.localPlayer && this.localPlayer.health > 0) {
                    this.localPlayer.render(this.ctx, this.mouseX, this.mouseY, true, this.skinManager, this.frameCount);
                }

                this.effectManager.render(this.ctx);
                break;
        }

        this.camera.end(this.ctx);
        this.updateUI();
    }

    renderSafeZone() {
        // Atualizar campo de estrelas
        this.starField.update();

        // Área fora da zona
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
        
        // Salvar contexto para clipping
        this.ctx.save();
        
        // Criar máscara para a zona segura
        this.ctx.beginPath();
        this.ctx.arc(this.safeZone.x, this.safeZone.y, this.safeZone.currentRadius, 0, Math.PI * 2);
        this.ctx.clip();
        
        // Limpar área da zona segura
        this.ctx.clearRect(0, 0, this.worldWidth, this.worldHeight);
        
        // Desenhar fundo espacial
        const gradient = this.ctx.createRadialGradient(
            this.safeZone.x, this.safeZone.y, 0,
            this.safeZone.x, this.safeZone.y, this.safeZone.currentRadius
        );
        gradient.addColorStop(0, 'rgba(25, 25, 112, 0.2)');  // Azul escuro
        gradient.addColorStop(1, 'rgba(0, 0, 30, 0.4)');     // Quase preto
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
        
        // Desenhar estrelas
        for (const star of this.starField.stars) {
            const distance = Math.sqrt(
                Math.pow(star.x - this.safeZone.x, 2) + 
                Math.pow(star.y - this.safeZone.y, 2)
            );
            
            if (distance <= this.safeZone.currentRadius) {
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.7})`;
                this.ctx.fill();
                
                // Brilho da estrela
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.2})`;
                this.ctx.fill();
            }
        }
        
        this.ctx.restore();
        
        // Borda da zona segura
        this.ctx.beginPath();
        this.ctx.arc(this.safeZone.x, this.safeZone.y, this.safeZone.currentRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#4CAF50';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    renderBullets() {
        for (const bullet of this.bullets) {
            // Obter a cor da skin do jogador que atirou
            let bulletColor = '#ff4444';  // Cor padrão
            if (bullet.playerId === 'local') {
                const skin = this.skinManager.skins[this.skinManager.currentSkin];
                bulletColor = skin.color === 'rainbow' ? 
                    `hsl(${(this.frameCount * 2) % 360}, 100%, 50%)` : 
                    skin.color;
            } else if (this.players.has(bullet.playerId)) {
                const player = this.players.get(bullet.playerId);
                bulletColor = player.skinColor;
            }

            // Desenhar o projétil
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = bulletColor;
            this.ctx.fill();
            this.ctx.closePath();

            // Rastro do projétil
            this.ctx.beginPath();
            this.ctx.moveTo(bullet.x, bullet.y);
            this.ctx.lineTo(bullet.x - bullet.dirX * 20, bullet.y - bullet.dirY * 20);
            this.ctx.strokeStyle = bulletColor.replace(')', ', 0.5)').replace('rgb', 'rgba');
            this.ctx.lineWidth = bullet.radius;
            this.ctx.stroke();
            this.ctx.closePath();
        }
    }

    updateUI() {
        // Atualizar elementos da UI
        const healthElement = document.getElementById('health');
        const ammoElement = document.getElementById('ammo');
        const scoreElement = document.getElementById('score');
        const killsElement = document.getElementById('kills');
        const zoneTimerElement = document.getElementById('zone-timer');
        const playersAliveElement = document.getElementById('players-alive');

        if (this.localPlayer) {
            if (healthElement) {
                healthElement.textContent = Math.ceil(this.localPlayer.health);
            }
            if (ammoElement) {
                ammoElement.textContent = this.localPlayer.ammo;
            }
            if (scoreElement) {
                scoreElement.textContent = this.score;
            }
            if (killsElement) {
                killsElement.textContent = this.localPlayer.kills;
            }
        }

        // Atualizar contagem de jogadores vivos
        if (playersAliveElement) {
            let alivePlayers = 0;
            
            // Contar jogadores vivos
            this.players.forEach(player => {
                if (player.health > 0) alivePlayers++;
            });
            
            // Contar bots vivos
            this.bots.forEach(bot => {
                if (bot.health > 0) alivePlayers++;
            });
            
            // Adicionar jogador local se estiver vivo
            if (this.localPlayer && this.localPlayer.health > 0) {
                alivePlayers++;
            }

            playersAliveElement.textContent = `Jogadores: ${alivePlayers}`;

            // Verificar condição de vitória
            if (alivePlayers === 1 && this.localPlayer && this.localPlayer.health > 0) {
                // Bônus de vitória
                this.score += 500;
                if (scoreElement) {
                    scoreElement.textContent = this.score;
                }
                this.handleGameOver(true);
            }
        }

        if (zoneTimerElement) {
            if (!this.safeZone.shrinking) {
                zoneTimerElement.textContent = `Zona: ${this.safeZone.timer}s`;
            } else {
                zoneTimerElement.textContent = 'ZONA DIMINUINDO!';
                zoneTimerElement.style.color = '#ff4444';
            }
        }
    }

    startGameLoop() {
        const loop = () => {
            if (!this.isGameOver) {
                this.frameCount++;
                this.update();
                this.render();
                this.gameLoopId = requestAnimationFrame(loop);
            }
        };
        loop();
    }

    addPlayer(playerId, data) {
        const player = new Player(data.x, data.y, false, this);
        player.name = data.name;
        player.health = data.health;
        player.score = data.score;
        player.kills = data.kills;
        player.id = playerId;
        player.skinColor = data.skinColor || '#ff4444';
        this.players.set(playerId, player);
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
    }

    updatePlayer(playerId, data) {
        const player = this.players.get(playerId);
        if (player) {
            Object.assign(player, data);
            // Remover jogador se estiver morto
            if (player.health <= 0) {
                this.players.delete(playerId);
            }
        }
    }

    addBullet(data) {
        this.bullets.push({
            ...data,
            lifetime: 60,
            radius: 5
        });
    }

    destroy() {
        this.isGameOver = true;
        this.gameState = 'ended';
        
        // Remover event listeners
        if (this.eventHandlers) {
            this.canvas.removeEventListener('mousemove', this.eventHandlers.mousemove);
            this.canvas.removeEventListener('click', this.eventHandlers.click);
            window.removeEventListener('keydown', this.eventHandlers.keydown);
            this.eventHandlers = null;
        }

        // Cancelar loop do jogo
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }

        // Desconectar do servidor
        if (this.networkManager) {
            this.networkManager.disconnect();
            this.networkManager = null;
        }

        // Limpar referências
        this.players.clear();
        this.bots.clear();
        this.bullets = [];
        this.localPlayer = null;
        this.camera = null;
        this.lootManager = null;
    }

    renderWaitingScreen() {
        const text = 'Preparando partida...';
        const totalPlayers = this.players.size + 1 + this.bots.size;
        const statusText = `${totalPlayers} jogadores (${this.bots.size} bots)`;

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, this.worldWidth/2, this.worldHeight/2 - 50);
        
        this.ctx.font = '24px Arial';
        this.ctx.fillText(statusText, this.worldWidth/2, this.worldHeight/2 + 50);
    }

    renderStartingScreen() {
        const text = 'Partida começando em:';
        const timerText = Math.ceil(this.matchStartTimer / 60).toString();

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, this.worldWidth/2, this.worldHeight/2 - 50);
        
        this.ctx.font = '72px Arial';
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillText(timerText, this.worldWidth/2, this.worldHeight/2 + 50);
    }

    renderEndScreen() {
        // Implementar renderização da tela de fim de jogo
    }

    updateEffects() {
        // Atualizar efeitos de cura
        for (let i = this.healEffects.length - 1; i >= 0; i--) {
            const effect = this.healEffects[i];
            effect.opacity -= 0.02;
            effect.yOffset -= 1;
            
            if (effect.opacity <= 0) {
                this.healEffects.splice(i, 1);
            }
        }
    }

    renderEffects() {
        // Renderizar efeitos de cura
        this.healEffects.forEach(effect => {
            this.ctx.save();
            this.ctx.fillStyle = `rgba(76, 175, 80, ${effect.opacity})`;
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                `+${Math.round(effect.amount)}`,
                effect.x,
                effect.y + effect.yOffset
            );
            this.ctx.restore();
        });
    }
}
