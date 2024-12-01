export class Player {
    constructor(x = 1500, y = 1500) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.speed = 5;
        this.name = localStorage.getItem('playerName') || 'Player';
        this.health = 100;
        this.ammo = 30;
        this.score = 0;
        this.kills = 0;
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
            lifetime: 60
        };

        this.ammo--;
        return bullet;
    }

    takeDamage(damage) {
        this.health -= damage;
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
        // Corpo do jogador
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = isLocal ? '#fff' : '#ff4444';
        ctx.fill();
        ctx.closePath();

        // Nome do jogador
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            this.name,
            this.x,
            this.y - this.radius - 10
        );

        // Barra de vida
        const healthBarWidth = 40;
        const healthBarHeight = 4;
        const healthPercentage = this.health / 100;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(
            this.x - healthBarWidth/2,
            this.y - this.radius - 20,
            healthBarWidth,
            healthBarHeight
        );
        
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(
            this.x - healthBarWidth/2,
            this.y - this.radius - 20,
            healthBarWidth * healthPercentage,
            healthBarHeight
        );

        // Linha de mira (apenas para jogador local)
        if (isLocal) {
            // Linha principal
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(mouseX, mouseY);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.closePath();

            // Mira no cursor
            const crosshairSize = 10;
            ctx.strokeStyle = '#fff';
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
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.closePath();
        }
    }
} 