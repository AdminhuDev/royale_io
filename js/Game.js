import { LootManager } from './LootManager.js';
import { Camera } from './Camera.js';
import { NetworkManager } from './NetworkManager.js';

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
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            const screenX = (e.clientX - rect.left) * scaleX;
            const screenY = (e.clientY - rect.top) * scaleY;
            
            const worldPos = this.camera.screenToWorld(screenX, screenY);
            this.mouseX = worldPos.x;
            this.mouseY = worldPos.y;
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.localPlayer && this.localPlayer.health > 0) {
                this.shoot();
            }
        });
    }

    createPlayer() {
        const playerName = localStorage.getItem('playerName') || 'Player';
        this.localPlayer = {
            x: 1500, // Começa no centro do mundo
            y: 1500,
            radius: 20,
            speed: 5,
            name: playerName,
            health: 100,
            ammo: 30
        };
    }

    movePlayer() {
        if (!this.localPlayer) return;

        const dx = this.mouseX - this.localPlayer.x;
        const dy = this.mouseY - this.localPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
            const speed = this.localPlayer.speed;
            const dirX = (dx / distance) * speed;
            const dirY = (dy / distance) * speed;

            // Verificar limites do mundo
            const newX = this.localPlayer.x + dirX;
            const newY = this.localPlayer.y + dirY;

            if (newX >= this.localPlayer.radius && newX <= 3000 - this.localPlayer.radius) {
                this.localPlayer.x = newX;
            }
            if (newY >= this.localPlayer.radius && newY <= 3000 - this.localPlayer.radius) {
                this.localPlayer.y = newY;
            }
        }
    }

    shoot() {
        if (!this.localPlayer || this.localPlayer.ammo <= 0) return;

        // Calcular direção do tiro
        const dx = this.mouseX - this.localPlayer.x;
        const dy = this.mouseY - this.localPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Criar projétil
        const bullet = {
            x: this.localPlayer.x + dirX * (this.localPlayer.radius + 10),
            y: this.localPlayer.y + dirY * (this.localPlayer.radius + 10),
            dirX: dirX,
            dirY: dirY,
            speed: 15,
            radius: 5,
            damage: 10,
            lifetime: 60
        };

        this.bullets.push(bullet);
        this.localPlayer.ammo--;

        // Enviar tiro para o servidor
        if (this.networkManager) {
            this.networkManager.sendShoot(bullet);
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

    handleHit(damage) {
        if (!this.localPlayer) return;
        
        this.localPlayer.health -= damage;
        
        if (this.localPlayer.health <= 0) {
            this.localPlayer.health = 0;
            this.handleGameOver();
        }
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
            this.safeZone.damage = 2 + (shrinkProgress * 8); // Aumentado o dano máximo
            
            if (this.safeZone.currentRadius > this.safeZone.targetRadius) {
                this.safeZone.currentRadius -= this.safeZone.shrinkSpeed;
            } else {
                this.safeZone.currentRadius -= this.safeZone.shrinkSpeed * 0.3;
            }
            
            if (this.safeZone.currentRadius < 0) {
                this.safeZone.currentRadius = 0;
            }
        }

        if (this.localPlayer) {
            const dx = this.localPlayer.x - this.safeZone.x;
            const dy = this.localPlayer.y - this.safeZone.y;
            const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
            
            if (distanceFromCenter > this.safeZone.currentRadius) {
                this.localPlayer.health -= this.safeZone.damage * (1/60);
                
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
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        const gridSize = 100;
        for (let x = 0; x <= 3000; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, 3000);
            this.ctx.stroke();
        }
        for (let y = 0; y <= 3000; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(3000, y);
            this.ctx.stroke();
        }

        // Desenhar borda do mundo
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, 3000, 3000);

        // Desenhar zona segura
        this.ctx.beginPath();
        this.ctx.arc(1500, 1500, this.safeZone.currentRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#4CAF50';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Área fora da zona
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, 3000, 3000);
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(1500, 1500, this.safeZone.currentRadius, 0, Math.PI * 2);
        this.ctx.clip();
        this.ctx.clearRect(0, 0, 3000, 3000);
        this.ctx.restore();

        // Desenhar loots
        this.lootManager.render(this.ctx);

        // Desenhar outros jogadores
        this.players.forEach(player => {
            // Corpo do jogador
            this.ctx.beginPath();
            this.ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ff4444';
            this.ctx.fill();
            this.ctx.closePath();

            // Nome do jogador
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                player.name,
                player.x,
                player.y - player.radius - 10
            );

            // Barra de vida
            const healthBarWidth = 40;
            const healthBarHeight = 4;
            const healthPercentage = player.health / 100;
            
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(
                player.x - healthBarWidth/2,
                player.y - player.radius - 20,
                healthBarWidth,
                healthBarHeight
            );
            
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.fillRect(
                player.x - healthBarWidth/2,
                player.y - player.radius - 20,
                healthBarWidth * healthPercentage,
                healthBarHeight
            );
        });

        // Desenhar projéteis
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

        // Desenhar jogador local
        if (this.localPlayer) {
            // Corpo do jogador
            this.ctx.beginPath();
            this.ctx.arc(
                this.localPlayer.x,
                this.localPlayer.y,
                this.localPlayer.radius,
                0,
                Math.PI * 2
            );
            this.ctx.fillStyle = '#fff';
            this.ctx.fill();
            this.ctx.closePath();

            // Nome do jogador
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                this.localPlayer.name,
                this.localPlayer.x,
                this.localPlayer.y - this.localPlayer.radius - 10
            );

            // Linha de mira
            this.ctx.beginPath();
            this.ctx.moveTo(this.localPlayer.x, this.localPlayer.y);
            this.ctx.lineTo(this.mouseX, this.mouseY);
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.stroke();
            this.ctx.closePath();
        }

        // Terminar transformação da câmera
        this.camera.end(this.ctx);

        // UI (fora da transformação da câmera)
        this.updateUI();
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
        this.players.set(playerId, {
            id: playerId,
            x: data.x,
            y: data.y,
            name: data.name,
            health: data.health,
            score: data.score,
            kills: data.kills,
            radius: 20
        });
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
