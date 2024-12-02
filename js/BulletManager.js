export class BulletManager {
    constructor(game) {
        this.game = game;
        this.bullets = [];
    }

    addBullet(data) {
        this.bullets.push({
            ...data,
            lifetime: 60,
            radius: 5
        });
    }

    update() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            bullet.x += bullet.dirX * bullet.speed;
            bullet.y += bullet.dirY * bullet.speed;
            bullet.lifetime--;

            // Verificar colisão com jogador local
            if (bullet && this.game.localPlayer && bullet.playerId !== 'local') {
                if (this.checkCollision(bullet, this.game.localPlayer)) {
                    this.handlePlayerHit(bullet, i);
                    continue;
                }
            }

            // Verificar colisão com outros jogadores
            this.game.players.forEach((player, playerId) => {
                if (bullet && playerId !== bullet.playerId) {
                    if (this.checkCollision(bullet, player)) {
                        this.handlePlayerHit(bullet, i, player, playerId);
                        return;
                    }
                }
            });

            // Verificar colisão com bots
            if (bullet) {
                this.game.bots.forEach((bot, botId) => {
                    if (bullet.playerId !== botId && this.checkCollision(bullet, bot)) {
                        this.handleBotHit(bullet, i, bot, botId);
                        return;
                    }
                });
            }
            
            // Verificar colisão com os limites do mundo
            if (bullet && (bullet.lifetime <= 0 ||
                bullet.x < 0 || bullet.x > this.game.worldWidth ||
                bullet.y < 0 || bullet.y > this.game.worldHeight)) {
                this.bullets.splice(i, 1);
            }
        }
    }

    checkCollision(bullet, target) {
        const dx = bullet.x - target.x;
        const dy = bullet.y - target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < target.radius + bullet.radius;
    }

    handlePlayerHit(bullet, bulletIndex, player = null, playerId = null) {
        if (player) {
            // Hit em outro jogador
            player.health -= bullet.damage;
            
            if (this.game.networkManager) {
                this.game.networkManager.sendHit(playerId, bullet.damage);
            }
        } else {
            // Hit no jogador local
            this.game.localPlayer.health -= bullet.damage;
            
            const hitAngle = Math.atan2(bullet.dirY, bullet.dirX);
            this.game.effectManager.effects.push({
                x: this.game.localPlayer.x + Math.cos(hitAngle) * this.game.localPlayer.radius,
                y: this.game.localPlayer.y + Math.sin(hitAngle) * this.game.localPlayer.radius,
                opacity: 1,
                yOffset: 0,
                type: 'damage',
                color: '#ff0000'
            });

            if (this.game.localPlayer.health <= 0) {
                this.game.localPlayer.health = 0;
                this.game.handleGameOver(false);
            }
        }

        this.bullets.splice(bulletIndex, 1);
    }

    handleBotHit(bullet, bulletIndex, bot, botId) {
        bot.health -= bullet.damage;
        
        if (bot.health <= 0) {
            this.game.bots.delete(botId);
            if (this.game.localPlayer && bullet.playerId === 'local') {
                this.game.localPlayer.kills++;
                this.game.score += 100;
                this.game.localPlayer.score = this.game.score;
                
                this.updateUI();
            }
        }
        
        this.bullets.splice(bulletIndex, 1);
    }

    updateUI() {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = this.game.score;
        }
        
        const killsElement = document.getElementById('kills');
        if (killsElement) {
            killsElement.textContent = this.game.localPlayer.kills;
        }
    }

    render(ctx) {
        for (const bullet of this.bullets) {
            // Obter a cor da skin do jogador que atirou
            let bulletColor = '#ff4444';  // Cor padrão
            if (bullet.playerId === 'local') {
                const skin = this.game.skinManager.skins[this.game.skinManager.currentSkin];
                bulletColor = skin.color === 'rainbow' ? 
                    `hsl(${(this.game.frameCount * 2) % 360}, 100%, 50%)` : 
                    skin.color;
            } else if (this.game.players.has(bullet.playerId)) {
                const player = this.game.players.get(bullet.playerId);
                bulletColor = player.skinColor;
            }

            // Desenhar o projétil
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fillStyle = bulletColor;
            ctx.fill();
            ctx.closePath();

            // Rastro do projétil
            ctx.beginPath();
            ctx.moveTo(bullet.x, bullet.y);
            ctx.lineTo(bullet.x - bullet.dirX * 20, bullet.y - bullet.dirY * 20);
            ctx.strokeStyle = bulletColor.replace(')', ', 0.5)').replace('rgb', 'rgba');
            ctx.lineWidth = bullet.radius;
            ctx.stroke();
            ctx.closePath();
        }
    }

    clear() {
        this.bullets = [];
    }
} 