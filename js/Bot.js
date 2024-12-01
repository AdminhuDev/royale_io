import { Player } from './Player.js';

export class Bot extends Player {
    constructor(x = 1500, y = 1500) {
        super(x, y);
        this.name = this.generateBotName();
        this.targetX = x;
        this.targetY = y;
        this.updateInterval = 60; // Atualiza alvo a cada 60 frames
        this.updateCounter = 0;
        this.state = 'wandering'; // wandering, chasing, attacking, fleeing
        this.target = null;
        this.reactionTime = Math.random() * 10 + 10; // 10-20 frames de delay
        this.reactionCounter = 0;
        this.accuracy = Math.random() * 0.3 + 0.6; // 60-90% de precisão
    }

    generateBotName() {
        const prefixes = ['Bot', 'AI', 'CPU', 'NPC', 'Robo'];
        const numbers = Math.floor(Math.random() * 1000);
        return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${numbers}`;
    }

    update(game) {
        this.updateCounter++;
        this.reactionCounter++;

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
        // Encontrar jogador mais próximo
        let nearestPlayer = null;
        let nearestDistance = Infinity;

        game.players.forEach((player) => {
            if (player.health <= 0) return;
            
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestPlayer = player;
            }
        });

        // Atualizar estado baseado na distância e saúde
        if (nearestPlayer) {
            this.target = nearestPlayer;

            if (nearestDistance > 500) {
                this.state = 'wandering';
            } else if (nearestDistance > 300) {
                this.state = 'chasing';
            } else if (this.health < 30) {
                this.state = 'fleeing';
            } else {
                this.state = 'attacking';
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
            this.targetX = this.target.x;
            this.targetY = this.target.y;
        }
    }

    attack(game) {
        if (this.target && this.reactionCounter >= this.reactionTime) {
            // Adicionar imprecisão ao tiro
            const spread = (1 - this.accuracy) * 100;
            const targetX = this.target.x + (Math.random() - 0.5) * spread;
            const targetY = this.target.y + (Math.random() - 0.5) * spread;

            const bullet = this.shoot(targetX, targetY);
            if (bullet) {
                game.bullets.push(bullet);
                this.reactionCounter = 0;
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
        // Renderizar com uma cor diferente para identificar que é um bot
        const originalFillStyle = ctx.fillStyle;
        
        // Cor base laranja, mais vermelha quando com pouca vida
        const healthPercent = this.health / 100;
        const red = Math.min(255, Math.round(255 * (1 + (1 - healthPercent))));
        const green = Math.min(255, Math.round(140 * healthPercent));
        ctx.fillStyle = `rgb(${red}, ${green}, 0)`;
        
        super.render(ctx);
        ctx.fillStyle = originalFillStyle;

        // Mostrar estado do bot acima do nome
        ctx.font = '12px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(
            this.state.toUpperCase(),
            this.x,
            this.y - this.radius - 30
        );
    }
} 