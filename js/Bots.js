export class BotManager {
    constructor(numBots, canvas) {
        this.bots = [];
        for (let i = 0; i < numBots; i++) {
            const bot = new Bot(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                this.getRandomSkin()
            );
            this.bots.push(bot);
        }
    }

    getRandomSkin() {
        const skins = ['#ff4444', '#44ff44', '#4444ff'];
        return skins[Math.floor(Math.random() * skins.length)];
    }

    updateBots(safeZoneConfig, bulletsArray, player) {
        this.bots.forEach(bot => {
            if (bot.isAlive) {
                bot.update(safeZoneConfig, bulletsArray, player, this.bots);
            }
        });
    }

    draw(ctx) {
        this.bots.forEach(bot => {
            if (bot.isAlive) {
                bot.draw(ctx);
            }
        });
    }

    destroy() {
        this.bots = [];
    }
}

class Bot {
    constructor(x, y, skin) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.health = 100;
        this.isAlive = true;
        this.ammo = 30;
        this.targetAngle = 0;
        this.speed = 2;
        this.moveDirection = Math.random() * Math.PI * 2;
        this.skin = skin;
        this.lastDamageTime = Date.now();
        this.damageInterval = 500;
        this.safeZoneMargin = 50;
    }

    update(safeZoneConfig, bulletsArray, player, otherBots) {
        if (!this.isAlive) return;

        const dxFromCenter = this.x - safeZoneConfig.centerX;
        const dyFromCenter = this.y - safeZoneConfig.centerY;
        const distanceFromCenter = Math.hypot(dxFromCenter, dyFromCenter);
        const angleToCenter = Math.atan2(dyFromCenter, dxFromCenter);

        if (distanceFromCenter > safeZoneConfig.currentRadius - this.safeZoneMargin) {
            this.moveDirection = angleToCenter + Math.PI;
            this.speed = 3;
        } else {
            this.speed = 2;
            
            if (Math.random() < 0.01) {
                if (Math.random() < 0.8) {
                    const safeAngle = Math.atan2(
                        safeZoneConfig.centerY - this.y,
                        safeZoneConfig.centerX - this.x
                    ) + (Math.random() - 0.5) * Math.PI;
                    this.moveDirection = safeAngle;
                } else {
                    this.moveDirection = Math.random() * Math.PI * 2;
                }
            }
        }

        const nextX = this.x + Math.cos(this.moveDirection) * this.speed;
        const nextY = this.y + Math.sin(this.moveDirection) * this.speed;

        const nextDistanceFromCenter = Math.hypot(
            nextX - safeZoneConfig.centerX,
            nextY - safeZoneConfig.centerY
        );

        if (nextDistanceFromCenter < safeZoneConfig.currentRadius + this.safeZoneMargin) {
            this.x = nextX;
            this.y = nextY;
        }

        if (distanceFromCenter > safeZoneConfig.currentRadius) {
            const now = Date.now();
            if (now - this.lastDamageTime >= this.damageInterval) {
                const distanceFromBorder = distanceFromCenter - safeZoneConfig.currentRadius;
                const damageMultiplier = Math.min(1 + (distanceFromBorder / 100), 3);
                const damage = 0.5 * damageMultiplier;
                
                this.takeDamage(damage);
                this.lastDamageTime = now;
            }
        }

        let closestTarget = null;
        let closestDistance = Infinity;

        if (player.isAlive) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            closestDistance = Math.hypot(dx, dy);
            closestTarget = player;
        }

        otherBots.forEach(bot => {
            if (bot !== this && bot.isAlive) {
                const dx = bot.x - this.x;
                const dy = bot.y - this.y;
                const distance = Math.hypot(dx, dy);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestTarget = bot;
                }
            }
        });

        if (closestTarget && closestDistance < 500 && distanceFromCenter < safeZoneConfig.currentRadius) {
            const dx = closestTarget.x - this.x;
            const dy = closestTarget.y - this.y;
            this.targetAngle = Math.atan2(dy, dx);

            if (this.ammo > 0 && Math.random() < 0.01) {
                this.fireBullet(bulletsArray);
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.targetAngle);

        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.skin;
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, -5, this.size + 10, 10);

        ctx.restore();
    }

    fireBullet(bulletsArray) {
        const angle = this.targetAngle;
        const bulletSpeed = 6;
        const bulletSize = 5;

        const bulletX = this.x + Math.cos(angle) * (this.size + bulletSize + 1);
        const bulletY = this.y + Math.sin(angle) * (this.size + bulletSize + 1);

        bulletsArray.push({
            x: bulletX,
            y: bulletY,
            dx: Math.cos(angle) * bulletSpeed,
            dy: Math.sin(angle) * bulletSpeed,
            size: bulletSize,
            color: this.skin,
            damage: 10,
            shooter: this
        });

        this.ammo--;
    }

    takeDamage(damage) {
        this.health = Math.max(0, this.health - damage);
        if (this.health <= 0) {
            this.isAlive = false;
        }
    }
}