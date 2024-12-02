import { Player } from './Player.js';

export class Bot extends Player {
    constructor(x = 1500, y = 1500, game = null) {
        super(x, y, false, game);
        this.name = this.generateBotName();
        this.targetX = x;
        this.targetY = y;
        this.updateInterval = 60;
        this.updateCounter = 0;
        this.state = 'wandering';
        this.target = null;
        this.reactionTime = Math.random() * 5 + 5;
        this.reactionCounter = 0;
        this.accuracy = Math.random() * 0.3 + 0.6;
        this.shootInterval = Math.random() * 20 + 30;
        this.shootCounter = 0;
        this.ammo = Infinity;
        
        // Usar apenas a skin padrão
        if (game && game.skinManager) {
            this.skinColor = game.skinManager.skins.default.color;
        }
    }

    generateBotName() {
        const prefixes = ['Bot', 'AI', 'CPU', 'NPC', 'Robo'];
        const numbers = Math.floor(Math.random() * 1000);
        return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${numbers}`;
    }

    update(game) {
        this.updateCounter++;
        this.reactionCounter++;
        this.shootCounter++;

        // Atualizar estado e alvo
        if (this.updateCounter >= this.updateInterval) {
            this.updateState(game);
            this.updateCounter = 0;
        }

        // Atualizar movimento baseado no estado
        switch (this.state) {
            case 'wandering':
                this.wander(game);
                break;
            case 'chasing':
                this.chase(game);
                break;
            case 'attacking':
                this.attack(game);
                break;
            case 'fleeing':
                this.flee(game);
                break;
        }

        // Movimento
        super.move(this.targetX, this.targetY, game.worldWidth, game.worldHeight);
    }

    updateState(game) {
        // Lista de possíveis alvos
        let potentialTargets = [];

        // Adicionar jogador local
        if (game.localPlayer && game.localPlayer.health > 0) {
            const dx = game.localPlayer.x - this.x;
            const dy = game.localPlayer.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            potentialTargets.push({
                target: game.localPlayer,
                distance: distance,
                type: 'player'
            });
        }

        // Adicionar outros jogadores
        game.players.forEach((player) => {
            if (player.health <= 0) return;
            
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            potentialTargets.push({
                target: player,
                distance: distance,
                type: 'player'
            });
        });

        // Adicionar outros bots
        game.bots.forEach((bot, botId) => {
            if (bot === this || bot.health <= 0) return;
            
            const dx = bot.x - this.x;
            const dy = bot.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            potentialTargets.push({
                target: bot,
                distance: distance,
                type: 'bot'
            });
        });

        // Ordenar alvos por distância
        potentialTargets.sort((a, b) => a.distance - b.distance);

        // Escolher alvo com base em probabilidade e distância
        if (potentialTargets.length > 0) {
            // 70% de chance de escolher um dos 3 alvos mais próximos
            // 30% de chance de escolher aleatoriamente
            let selectedTarget;
            if (Math.random() < 0.7 && potentialTargets.length >= 3) {
                // Escolher aleatoriamente entre os 3 mais próximos
                const index = Math.floor(Math.random() * Math.min(3, potentialTargets.length));
                selectedTarget = potentialTargets[index];
            } else {
                // Escolher aleatoriamente entre todos
                selectedTarget = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
            }

            this.target = selectedTarget.target;
            const distance = selectedTarget.distance;

            // Atualizar estado baseado na distância e saúde
            if (distance > 400) {
                this.state = 'chasing';
            } else if (this.health < 30 && distance < 200) {
                this.state = 'fleeing';
            } else {
                this.state = 'attacking';
            }

            // Adicionar comportamento mais variado
            if (Math.random() < 0.1) { // 10% de chance de mudar para comportamento aleatório
                const states = ['wandering', 'chasing', 'attacking', 'fleeing'];
                this.state = states[Math.floor(Math.random() * states.length)];
            }
        } else {
            this.state = 'wandering';
            this.target = null;
        }
    }

    wander(game) {
        if (this.updateCounter % this.updateInterval === 0) {
            // Novo ponto aleatório dentro da zona segura
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * game.safeZone.currentRadius * 0.8;
            this.targetX = game.safeZone.x + Math.cos(angle) * radius;
            this.targetY = game.safeZone.y + Math.sin(angle) * radius;
        }
    }

    chase(game) {
        if (this.target) {
            // Manter uma distância ideal para atirar que varia por bot
            const idealDistance = 200 + Math.random() * 100;  // 200-300 de distância
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > idealDistance) {
                // Aproximar com um pouco de variação
                const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.5;
                this.targetX = this.target.x - Math.cos(angle) * idealDistance;
                this.targetY = this.target.y - Math.sin(angle) * idealDistance;
            } else {
                // Movimento lateral quando próximo
                const sideAngle = Math.atan2(dy, dx) + Math.PI/2 * (Math.random() < 0.5 ? 1 : -1);
                this.targetX = this.x + Math.cos(sideAngle) * 50;
                this.targetY = this.y + Math.sin(sideAngle) * 50;
            }

            // Evitar sair da zona segura
            const distanceToCenter = Math.sqrt(
                Math.pow(this.targetX - game.safeZone.x, 2) + 
                Math.pow(this.targetY - game.safeZone.y, 2)
            );

            if (distanceToCenter > game.safeZone.currentRadius * 0.8) {
                const angle = Math.atan2(this.targetY - game.safeZone.y, this.targetX - game.safeZone.x);
                this.targetX = game.safeZone.x + Math.cos(angle) * game.safeZone.currentRadius * 0.7;
                this.targetY = game.safeZone.y + Math.sin(angle) * game.safeZone.currentRadius * 0.7;
            }
        }
    }

    attack(game) {
        if (this.target && 
            this.reactionCounter >= this.reactionTime && 
            this.shootCounter >= this.shootInterval) {
            
            // Adicionar imprecisão ao tiro
            const spread = (1 - this.accuracy) * 100;
            const targetX = this.target.x + (Math.random() - 0.5) * spread;
            const targetY = this.target.y + (Math.random() - 0.5) * spread;

            const bullet = this.shoot(targetX, targetY);
            if (bullet) {
                game.bulletManager.addBullet(bullet);
                this.reactionCounter = 0;
                this.shootCounter = 0;

                // Atualizar direção para onde está atirando
                this.targetX = this.x + (targetX - this.x) * 0.5;
                this.targetY = this.y + (targetY - this.y) * 0.5;
            }
        }
    }

    flee(game) {
        if (this.target) {
            // Mover na direção oposta ao alvo
            const dx = this.x - this.target.x;
            const dy = this.y - this.target.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            this.targetX = this.x + (dx / distance) * 300;
            this.targetY = this.y + (dy / distance) * 300;

            // Manter dentro da zona segura
            const angle = Math.atan2(this.targetY - game.safeZone.y, this.targetX - game.safeZone.x);
            const distanceToCenter = Math.sqrt(
                Math.pow(this.targetX - game.safeZone.x, 2) + 
                Math.pow(this.targetY - game.safeZone.y, 2)
            );

            if (distanceToCenter > game.safeZone.currentRadius * 0.8) {
                this.targetX = game.safeZone.x + Math.cos(angle) * game.safeZone.currentRadius * 0.7;
                this.targetY = game.safeZone.y + Math.sin(angle) * game.safeZone.currentRadius * 0.7;
            }
        }
    }

    render(ctx) {
        // Renderizar efeitos da skin padrão (Espírito Lunar)
        if (this.game) {
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
        }

        // Renderizar o bot
        const originalFillStyle = ctx.fillStyle;
        ctx.fillStyle = this.skinColor;
        
        // Desenhar o corpo do bot
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        // Nome do bot
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

        // Mostrar estado do bot acima do nome
        ctx.font = '12px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(
            this.state.toUpperCase(),
            this.x,
            this.y - this.radius - 30
        );

        ctx.fillStyle = originalFillStyle;
    }
} 