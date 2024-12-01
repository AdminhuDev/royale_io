import { LootManager } from './LootManager.js';
import { Camera } from './Camera.js';
import { NetworkManager } from './NetworkManager.js';
import { Player } from './Player.js';

export class Game {
    setupCanvas() {
        // Ajustar para resolução do dispositivo e zoom
        const updateCanvasSize = () => {
            const pixelRatio = window.devicePixelRatio || 1;
            
            // Tamanho lógico (CSS)
            this.canvas.style.width = window.innerWidth + 'px';
            this.canvas.style.height = window.innerHeight + 'px';
            
            // Tamanho real do canvas (considerando pixel ratio)
            this.canvas.width = window.innerWidth * pixelRatio;
            this.canvas.height = window.innerHeight * pixelRatio;
            
            // Ajustar contexto para pixel ratio
            this.ctx.scale(pixelRatio, pixelRatio);
        };

        // Ocultar cursor do mouse
        this.canvas.style.cursor = 'none';

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
    }

    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Estado do jogo
        this.players = new Map();
        this.localPlayer = null;
        this.mouseX = 0;
        this.mouseY = 0;
        this.bullets = [];
        this.frameCount = 0;
        this.worldWidth = 3000;
        this.worldHeight = 3000;
        this.isGameOver = false;
        this.gameLoopId = null;
        
        // Gerenciadores
        this.camera = new Camera(this);
        this.lootManager = new LootManager(this);
        this.networkManager = new NetworkManager(this);
        
        // Zona Segura
        this.safeZone = {
            x: this.worldWidth / 2,
            y: this.worldHeight / 2,
            maxRadius: 1500,
            currentRadius: 1500,
            targetRadius: 750,
            shrinkSpeed: 0.5,
            damage: 2,
            timer: 60,
            shrinking: false,
            minRadius: 0,
            active: true
        };
        
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

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            // Armazenar coordenadas da tela
            this.lastScreenX = (e.clientX - rect.left) * scaleX;
            this.lastScreenY = (e.clientY - rect.top) * scaleY;
            
            // Atualizar coordenadas do mundo
            this.updateMouseWorldPosition();
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.localPlayer && this.localPlayer.health > 0) {
                this.shoot();
            }
        });
    }

    // Novo método para atualizar a posição do mouse no mundo
    updateMouseWorldPosition() {
        const worldPos = this.camera.screenToWorld(this.lastScreenX, this.lastScreenY);
        this.mouseX = worldPos.x;
        this.mouseY = worldPos.y;
    }

    createPlayer() {
        this.localPlayer = new Player();
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
            this.handleGameOver();
        }
    }

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            bullet.x += bullet.dirX * bullet.speed;
            bullet.y += bullet.dirY * bullet.speed;
            bullet.lifetime--;

            // Verificar colisão com jogadores
            this.players.forEach((player, playerId) => {
                // Não verificar colisão com o próprio jogador
                if (playerId === this.networkManager.playerId) return;
                
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
            });
            
            // Verificar colisão com os limites do mundo
            if (bullet.lifetime <= 0 ||
                bullet.x < 0 || bullet.x > this.worldWidth ||
                bullet.y < 0 || bullet.y > this.worldHeight) {
                this.bullets.splice(i, 1);
                continue;
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

        if (this.safeZone.shrinking && this.safeZone.currentRadius > 0) {
            const shrinkProgress = 1 - (this.safeZone.currentRadius / this.safeZone.maxRadius);
            // Limitar dano entre 2 e 10 por segundo
            this.safeZone.damage = Math.min(10, Math.max(2, 2 + (shrinkProgress * 8)));
            
            if (this.safeZone.currentRadius > this.safeZone.targetRadius) {
                this.safeZone.currentRadius -= this.safeZone.shrinkSpeed;
            } else {
                this.safeZone.currentRadius -= this.safeZone.shrinkSpeed * 0.3;
            }
            
            // Garantir que a zona nunca fique menor que o raio mínimo
            if (this.safeZone.currentRadius < 50) {
                this.safeZone.currentRadius = 50;
            }
        }

        if (this.localPlayer) {
            const dx = this.localPlayer.x - this.safeZone.x;
            const dy = this.localPlayer.y - this.safeZone.y;
            const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
            
            if (distanceFromCenter > this.safeZone.currentRadius) {
                // Aplicar dano com base na distância da zona
                const distanceMultiplier = Math.min(2, (distanceFromCenter - this.safeZone.currentRadius) / 100);
                this.localPlayer.health -= (this.safeZone.damage * distanceMultiplier) * (1/60);
                
                if (this.localPlayer.health <= 0) {
                    this.localPlayer.health = 0;
                    this.handleGameOver();
                }
            }
        }
    }

    handleGameOver() {
        this.isGameOver = true;
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }

        const gameOverScreen = document.getElementById('game-over');
        const finalScoreElement = document.getElementById('final-score');
        const finalKillsElement = document.getElementById('final-kills');
        const finalTimeElement = document.getElementById('final-time');
        const gameUI = document.getElementById('game-ui');

        if (gameOverScreen) {
            // Atualizar estatísticas finais
            if (finalScoreElement) finalScoreElement.textContent = this.localPlayer.score || 0;
            if (finalKillsElement) finalKillsElement.textContent = this.localPlayer.kills || 0;
            if (finalTimeElement) {
                const minutes = Math.floor(this.frameCount / (60 * 60));
                const seconds = Math.floor((this.frameCount / 60) % 60);
                finalTimeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }

            // Salvar estatísticas
            const stats = JSON.parse(localStorage.getItem('gameStats') || '{}');
            const currentScore = this.localPlayer.score || 0;
            
            stats.lastScore = currentScore;
            stats.highScore = Math.max(stats.highScore || 0, currentScore);
            stats.totalKills = (stats.totalKills || 0) + (this.localPlayer.kills || 0);
            
            localStorage.setItem('gameStats', JSON.stringify(stats));

            // Mostrar tela de game over
            if (gameUI) gameUI.style.display = 'none';
            gameOverScreen.style.display = 'flex';
        }
    }

    update() {
        this.movePlayer();
        this.updateBullets();
        this.updateSafeZone();
        this.lootManager.update();
        this.camera.update();
        
        // Atualizar posição do mouse no mundo a cada frame
        this.updateMouseWorldPosition();

        // Enviar posição para o servidor
        if (this.networkManager && this.localPlayer) {
            this.networkManager.sendPosition();
        }
    }

    render() {
        // Limpar canvas
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        // Começar transformação da câmera
        this.camera.begin(this.ctx);

        // Desenhar grade de fundo
        this.renderGrid();

        // Desenhar zona segura
        this.renderSafeZone();

        // Desenhar loots
        this.lootManager.render(this.ctx);

        // Desenhar outros jogadores
        this.players.forEach(player => {
            player.render(this.ctx);
        });

        // Desenhar projéteis
        this.renderBullets();

        // Desenhar jogador local
        if (this.localPlayer) {
            this.localPlayer.render(this.ctx, this.mouseX, this.mouseY, true);
        }

        // Terminar transformação da câmera
        this.camera.end(this.ctx);

        // UI (fora da transformação da câmera)
        this.updateUI();
    }

    renderGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        const gridSize = 100;
        
        for (let x = 0; x <= this.worldWidth; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.worldHeight);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.worldHeight; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.worldWidth, y);
            this.ctx.stroke();
        }

        // Borda do mundo
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, this.worldWidth, this.worldHeight);
    }

    renderSafeZone() {
        // Desenhar círculo da zona segura
        this.ctx.beginPath();
        this.ctx.arc(this.safeZone.x, this.safeZone.y, this.safeZone.currentRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#4CAF50';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Área fora da zona
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(this.safeZone.x, this.safeZone.y, this.safeZone.currentRadius, 0, Math.PI * 2);
        this.ctx.clip();
        this.ctx.clearRect(0, 0, this.worldWidth, this.worldHeight);
        this.ctx.restore();
    }

    renderBullets() {
        for (const bullet of this.bullets) {
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ff4444';
            this.ctx.fill();
            this.ctx.closePath();

            // Rastro do projétil
            this.ctx.beginPath();
            this.ctx.moveTo(bullet.x, bullet.y);
            this.ctx.lineTo(bullet.x - bullet.dirX * 20, bullet.y - bullet.dirY * 20);
            this.ctx.strokeStyle = 'rgba(255, 68, 68, 0.5)';
            this.ctx.lineWidth = bullet.radius;
            this.ctx.stroke();
            this.ctx.closePath();
        }
    }

    updateUI() {
        // Atualizar elementos da UI
        const healthElement = document.getElementById('health');
        const ammoElement = document.getElementById('ammo');
        const zoneTimerElement = document.getElementById('zone-timer');

        if (healthElement) {
            healthElement.textContent = Math.ceil(this.localPlayer.health);
        }
        if (ammoElement) {
            ammoElement.textContent = this.localPlayer.ammo;
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
        const player = new Player(data.x, data.y);
        player.name = data.name;
        player.health = data.health;
        player.score = data.score;
        player.kills = data.kills;
        this.players.set(playerId, player);
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
    }

    updatePlayer(playerId, data) {
        const player = this.players.get(playerId);
        if (player) {
            Object.assign(player, data);
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
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        if (this.networkManager) {
            this.networkManager.disconnect();
        }
    }
}
