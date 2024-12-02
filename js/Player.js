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

            // Efeitos específicos por skin
            switch(this.game.skinManager.currentSkin) {
                case 'default': // Espírito Lunar
                    // Aura lunar pulsante
                    const lunarPulse = 0.5 + Math.sin(this.game.frameCount * 0.05) * 0.3;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 255, 255, ${lunarPulse * 0.2})`;
                    ctx.fill();
                    ctx.closePath();

                    // Estrelas orbitantes
                    for (let i = 0; i < 5; i++) {
                        const angle = (this.game.frameCount * 0.02) + (i * Math.PI * 2 / 5);
                        const x = this.x + Math.cos(angle) * (30 + Math.sin(this.game.frameCount * 0.05) * 5);
                        const y = this.y + Math.sin(angle) * (30 + Math.sin(this.game.frameCount * 0.05) * 5);
                        
                        // Estrela
                        const starSize = 2 + Math.sin(this.game.frameCount * 0.1 + i) * 1;
                        ctx.beginPath();
                        ctx.arc(x, y, starSize, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + Math.sin(this.game.frameCount * 0.1 + i) * 0.3})`;
                        ctx.fill();
                        ctx.closePath();

                        // Rastro da estrela
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(x - Math.cos(angle) * 5, y - Math.sin(angle) * 5);
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                        ctx.stroke();
                        ctx.closePath();
                    }
                    break;

                case 'red': // Chama Infernal
                    // Aura de fogo
                    const fireGlow = 0.3 + Math.sin(this.game.frameCount * 0.1) * 0.1;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 50, 0, ${fireGlow})`;
                    ctx.fill();
                    ctx.closePath();

                    // Partículas de fogo
                    for (let i = 0; i < 8; i++) {
                        const angle = Math.PI * 2 * Math.random();
                        const distance = this.radius + Math.random() * 20;
                        const x = this.x + Math.cos(angle) * distance;
                        const y = this.y + Math.sin(angle) * distance - Math.random() * 10;
                        
                        // Chama
                        ctx.beginPath();
                        ctx.moveTo(x - 3, y + 6);
                        ctx.quadraticCurveTo(x, y - 6, x + 3, y + 6);
                        ctx.fillStyle = `rgba(255, ${50 + Math.random() * 150}, 0, ${0.5 + Math.random() * 0.5})`;
                        ctx.fill();
                        ctx.closePath();
                    }
                    break;

                case 'blue': // Gelo Eterno
                    // Aura gelada
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius + 12, 0, Math.PI * 2);
                    const iceGradient = ctx.createRadialGradient(
                        this.x, this.y, this.radius,
                        this.x, this.y, this.radius + 12
                    );
                    iceGradient.addColorStop(0, 'rgba(100, 200, 255, 0.3)');
                    iceGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
                    ctx.fillStyle = iceGradient;
                    ctx.fill();
                    ctx.closePath();

                    // Cristais de gelo
                    for (let i = 0; i < 6; i++) {
                        const angle = (this.game.frameCount * 0.02) + (i * Math.PI * 2 / 6);
                        const x = this.x + Math.cos(angle) * 25;
                        const y = this.y + Math.sin(angle) * 25;

                        ctx.save();
                        ctx.translate(x, y);
                        ctx.rotate(angle + this.game.frameCount * 0.02);
                        
                        // Cristal
                        ctx.beginPath();
                        ctx.moveTo(0, -5);
                        ctx.lineTo(3, 0);
                        ctx.lineTo(0, 5);
                        ctx.lineTo(-3, 0);
                        ctx.closePath();
                        ctx.fillStyle = `rgba(150, 220, 255, ${0.6 + Math.sin(this.game.frameCount * 0.1) * 0.2})`;
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                        ctx.stroke();
                        
                        ctx.restore();
                    }
                    break;

                case 'green': // Veneno Ancestral
                    // Aura tóxica
                    const toxicPulse = 0.3 + Math.sin(this.game.frameCount * 0.05) * 0.1;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius + 15, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(0, 255, 0, ${toxicPulse})`;
                    ctx.fill();
                    ctx.closePath();

                    // Bolhas de veneno
                    for (let i = 0; i < 12; i++) {
                        const time = this.game.frameCount * 0.05 + i;
                        const angle = time + (i * Math.PI * 2 / 12);
                        const distance = 20 + Math.sin(time * 0.5) * 10;
                        const x = this.x + Math.cos(angle) * distance;
                        const y = this.y + Math.sin(angle) * distance;
                        
                        // Bolha
                        const bubbleSize = 2 + Math.sin(time) * 1;
                        ctx.beginPath();
                        ctx.arc(x, y, bubbleSize, 0, Math.PI * 2);
                        const gradient = ctx.createRadialGradient(x, y, 0, x, y, bubbleSize);
                        gradient.addColorStop(0, 'rgba(150, 255, 150, 0.8)');
                        gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
                        ctx.fillStyle = gradient;
                        ctx.fill();
                        ctx.closePath();
                    }
                    break;

                case 'gold': // Relíquia Sagrada
                    // Aura divina
                    const divineGlow = 0.4 + Math.sin(this.game.frameCount * 0.05) * 0.2;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
                    const divineGradient = ctx.createRadialGradient(
                        this.x, this.y, this.radius,
                        this.x, this.y, this.radius + 10
                    );
                    divineGradient.addColorStop(0, `rgba(255, 215, 0, ${divineGlow})`);
                    divineGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
                    ctx.fillStyle = divineGradient;
                    ctx.fill();
                    ctx.closePath();

                    // Símbolos sagrados
                    for (let i = 0; i < 4; i++) {
                        const angle = (this.game.frameCount * 0.02) + (i * Math.PI / 2);
                        const x = this.x + Math.cos(angle) * 30;
                        const y = this.y + Math.sin(angle) * 30;

                        ctx.save();
                        ctx.translate(x, y);
                        ctx.rotate(angle);
                        
                        // Símbolo
                        ctx.beginPath();
                        ctx.moveTo(-5, -5);
                        ctx.lineTo(5, -5);
                        ctx.lineTo(0, 5);
                        ctx.closePath();
                        ctx.fillStyle = `rgba(255, 215, 0, ${0.7 + Math.sin(this.game.frameCount * 0.1) * 0.3})`;
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                        ctx.stroke();
                        
                        ctx.restore();
                    }
                    break;

                case 'rainbow': // Prisma Dimensional
                    // Aura dimensional
                    for (let i = 0; i < 360; i += 30) {
                        const hue = (i + this.game.frameCount * 2) % 360;
                        const angle = (i * Math.PI / 180);
                        const distance = this.radius + 10 + Math.sin(this.game.frameCount * 0.05) * 5;
                        
                        ctx.beginPath();
                        ctx.moveTo(this.x, this.y);
                        ctx.lineTo(
                            this.x + Math.cos(angle) * distance,
                            this.y + Math.sin(angle) * distance
                        );
                        ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.3)`;
                        ctx.lineWidth = 2;
                        ctx.stroke();
                        ctx.closePath();
                    }

                    // Partículas dimensionais
                    for (let i = 0; i < 8; i++) {
                        const time = this.game.frameCount * 0.05 + i;
                        const angle = time + (i * Math.PI * 2 / 8);
                        const distance = 25 + Math.sin(time) * 10;
                        const x = this.x + Math.cos(angle) * distance;
                        const y = this.y + Math.sin(angle) * distance;
                        const hue = (this.game.frameCount * 2 + i * 45) % 360;
                        
                        // Partícula
                        ctx.beginPath();
                        ctx.arc(x, y, 3, 0, Math.PI * 2);
                        const particleGradient = ctx.createRadialGradient(x, y, 0, x, y, 3);
                        particleGradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.8)`);
                        particleGradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
                        ctx.fillStyle = particleGradient;
                        ctx.fill();
                        ctx.closePath();

                        // Rastro dimensional
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(
                            x - Math.cos(angle) * 8,
                            y - Math.sin(angle) * 8
                        );
                        ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.3)`;
                        ctx.lineWidth = 2;
                        ctx.stroke();
                        ctx.closePath();
                    }
                    break;
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