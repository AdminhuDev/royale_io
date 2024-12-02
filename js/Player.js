export class Player {
    constructor(x, y, isLocal = false, game = null) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.speed = 5;
        this.health = 100;
        this.shield = 100;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.shieldDuration = 120;  // 2 segundos (60fps * 2)
        this.shieldCooldown = 0;
        this.shieldCooldownMax = 180;  // 3 segundos (60fps * 3)
        this.shieldRegenRate = 0.5;  // Regenera 0.5 por frame
        this.shieldConsumptionRate = 2;  // Consome 2 por frame
        this.ammo = 30;
        this.score = 0;
        this.kills = 0;
        this.isLocal = isLocal;
        this.name = '';
        this.id = '';
        this.skinColor = '#fff';
        this.game = game;
    }

    move(targetX, targetY, worldWidth, worldHeight) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
            const dirX = (dx / distance) * this.speed;
            const dirY = (dy / distance) * this.speed;

            // Verificar limites do mundo
            const newX = this.x + dirX;
            const newY = this.y + dirY;

            if (newX >= this.radius && newX <= worldWidth - this.radius) {
                this.x = newX;
            }
            if (newY >= this.radius && newY <= worldHeight - this.radius) {
                this.y = newY;
            }
        }
    }

    shoot(targetX, targetY) {
        if (this.ammo <= 0) return null;

        // Calcular direção do tiro
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Criar projétil
        const bullet = {
            x: this.x + dirX * (this.radius + 10),
            y: this.y + dirY * (this.radius + 10),
            dirX: dirX,
            dirY: dirY,
            speed: 15,
            radius: 5,
            damage: 10,
            lifetime: 60,
            playerId: this.isLocal ? 'local' : this.id,
            skinColor: this.skinColor
        };

        this.ammo--;
        return bullet;
    }

    activateShield() {
        if (this.shield > 0 && this.shieldCooldown <= 0 && !this.shieldActive) {
            this.shieldActive = true;
            this.shieldTimer = this.shieldDuration;
            return true;
        }
        return false;
    }

    updateShield() {
        // Atualiza o cooldown do escudo
        if (this.shieldCooldown > 0) {
            this.shieldCooldown--;
        }

        // Se o escudo estiver ativo
        if (this.shieldActive) {
            // Atualiza o timer do escudo
            this.shieldTimer--;
            
            // Consome o escudo
            this.shield = Math.max(0, this.shield - this.shieldConsumptionRate);
            
            // Desativa o escudo se acabar o timer ou a energia
            if (this.shieldTimer <= 0 || this.shield <= 0) {
                this.shield = Math.max(0, this.shield);  // Garante que não fique negativo
                this.shieldActive = false;
                this.shieldCooldown = this.shieldCooldownMax;
            }
        } 
        // Se o escudo não estiver ativo e não estiver em cooldown, regenera
        else if (this.shieldCooldown <= 0 && this.shield < 100) {
            this.shield = Math.min(100, this.shield + this.shieldRegenRate);
        }
    }

    takeDamage(damage) {
        if (this.shieldActive) {
            // Reduzir dano pelo escudo
            const shieldDamage = damage * 0.5; // Escudo absorve 50% do dano
            this.shield -= shieldDamage;
            
            if (this.shield <= 0) {
                this.shield = 0;
                this.shieldActive = false;
                this.shieldCooldown = this.shieldCooldownMax;
                // Dano restante vai para a vida
                this.health -= damage * 0.5;
            }
        } else {
            this.health -= damage;
        }

        if (this.health < 0) this.health = 0;
        return this.health <= 0;
    }

    heal(amount) {
        this.health = Math.min(100, this.health + amount);
    }

    addAmmo(amount) {
        this.ammo += amount;
    }

    render(ctx, mouseX, mouseY, isLocal = false) {
        // Atualizar cor da skin rainbow se necessário
        if (isLocal && this.game) {
            const skin = this.game.skinManager.skins[this.game.skinManager.currentSkin];
            if (skin.color === 'rainbow') {
                this.skinColor = `hsl(${(this.game.frameCount * 2) % 360}, 100%, 50%)`;
            }
        }

        // Efeitos de partículas baseados na skin
        if (this.game) {
            const skin = this.game.skinManager.skins[this.game.skinManager.currentSkin];
            const particleColor = skin.color === 'rainbow' ? 
                `hsl(${(this.game.frameCount * 2) % 360}, 100%, 50%)` : 
                skin.color;

            // Desenhar partículas
            for (let i = 0; i < 3; i++) {
                const angle = (Math.PI * 2 / 3) * i + (this.game.frameCount * 0.02);
                const distance = 25 + Math.sin(this.game.frameCount * 0.1) * 5;
                const x = this.x + Math.cos(angle) * distance;
                const y = this.y + Math.sin(angle) * distance;
                
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fillStyle = particleColor;
                ctx.globalAlpha = 0.5 + Math.sin(this.game.frameCount * 0.1) * 0.3;
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.closePath();

                // Efeitos específicos por skin
                switch(this.game.skinManager.currentSkin) {
                    case 'default': // Espírito Lunar
                        // Partículas brilhantes que pulsam
                        ctx.beginPath();
                        ctx.arc(x, y, 4, 0, Math.PI * 2);
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                        ctx.fill();
                        ctx.closePath();
                        break;

                    case 'red': // Chama Infernal
                        // Partículas de fogo que sobem
                        const fireY = y - Math.random() * 5;
                        ctx.beginPath();
                        ctx.arc(x + Math.sin(this.game.frameCount * 0.1) * 2, fireY, 3, 0, Math.PI * 2);
                        ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
                        ctx.fill();
                        ctx.closePath();
                        break;

                    case 'blue': // Gelo Eterno
                        // Cristais de gelo girando
                        ctx.save();
                        ctx.translate(x, y);
                        ctx.rotate(this.game.frameCount * 0.05);
                        ctx.beginPath();
                        ctx.moveTo(-4, 0);
                        ctx.lineTo(4, 0);
                        ctx.moveTo(0, -4);
                        ctx.lineTo(0, 4);
                        ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
                        ctx.stroke();
                        ctx.restore();
                        break;

                    case 'green': // Veneno Ancestral
                        // Bolhas de veneno que flutuam
                        const bubbleY = y + Math.sin(this.game.frameCount * 0.1 + i) * 3;
                        ctx.beginPath();
                        ctx.arc(x, bubbleY, 2 + Math.random(), 0, Math.PI * 2);
                        ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
                        ctx.fill();
                        ctx.closePath();
                        break;

                    case 'gold': // Relíquia Sagrada
                        // Aura dourada brilhante
                        ctx.beginPath();
                        ctx.arc(x, y, 3, 0, Math.PI * 2);
                        ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
                        ctx.stroke();
                        ctx.closePath();
                        break;

                    case 'rainbow': // Prisma Dimensional
                        // Rastros de energia dimensional
                        const hue = (this.game.frameCount * 2 + i * 120) % 360;
                        ctx.beginPath();
                        ctx.arc(x, y, 3, 0, Math.PI * 2);
                        ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.3)`;
                        ctx.stroke();
                        ctx.closePath();
                        break;
                }
            }
        }

        // Desenhar o jogador
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.skinColor;
        ctx.fill();
        ctx.closePath();

        // Nome do jogador
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x, this.y - this.radius - 10);

        // Barra de vida
        const barWidth = 40;
        const barHeight = 4;
        const barSpacing = 5;

        // Barra de vida (vermelha/verde)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - barWidth/2, this.y - this.radius - 20, barWidth, barHeight);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x - barWidth/2, this.y - this.radius - 20, barWidth * (this.health/100), barHeight);

        // Barra de escudo (azul)
        if (this.shield > 0) {
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - barWidth/2, this.y - this.radius - 20 - barHeight - barSpacing, barWidth, barHeight);
            ctx.fillStyle = '#2196F3';
            ctx.fillRect(this.x - barWidth/2, this.y - this.radius - 20 - barHeight - barSpacing, barWidth * (this.shield/100), barHeight);
        }

        // Efeito visual do escudo ativo
        if (this.shieldActive) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(33, 150, 243, ${0.5 + Math.sin(Date.now() * 0.01) * 0.2})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.closePath();
        }

        // Linha do cursor e mira (apenas para jogador local)
        if (isLocal && this.game) {
            const skin = this.game.skinManager.skins[this.game.skinManager.currentSkin];
            const skinColor = skin.color === 'rainbow' ? 
                `hsl(${(this.game.frameCount * 2) % 360}, 100%, 50%)` : 
                skin.color;

            // Linha do cursor até o jogador
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(mouseX, mouseY);
            ctx.strokeStyle = skin.color === 'rainbow' ? 
                `hsla(${(this.game.frameCount * 2) % 360}, 100%, 50%, 0.2)` : 
                this.skinColor.replace('rgb', 'rgba').replace(')', ', 0.2)');
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.closePath();

            // Mira no cursor
            const crosshairSize = 10;
            ctx.strokeStyle = skinColor;
            ctx.lineWidth = 2;

            // Cruz da mira
            ctx.beginPath();
            // Linha horizontal
            ctx.moveTo(mouseX - crosshairSize, mouseY);
            ctx.lineTo(mouseX + crosshairSize, mouseY);
            // Linha vertical
            ctx.moveTo(mouseX, mouseY - crosshairSize);
            ctx.lineTo(mouseX, mouseY + crosshairSize);
            ctx.stroke();
            ctx.closePath();

            // Círculo externo da mira
            ctx.beginPath();
            ctx.arc(mouseX, mouseY, crosshairSize/2, 0, Math.PI * 2);
            ctx.strokeStyle = skinColor;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.closePath();
        }
    }
} 