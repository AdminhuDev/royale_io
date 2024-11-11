import { Effects } from './Effects.js';

export class BulletManager {
    constructor(game) {
        this.game = game;
        this.bullets = [];
        this.bulletSpeed = 4;
        this.bulletSize = 5;
        this.bulletColor = '#0A84FF';
        this.fireRate = 4;
        this.fireInterval = 1000/this.fireRate;
        this.lastFireTime = 0;
        this.isFiring = false;
    }

    fireBullet(sourceX, sourceY, targetX, targetY, shooter, bulletColor) {
        const now = Date.now();
        if (shooter.ammo <= 0 || now - this.lastFireTime < this.fireInterval) {
            return false;
        }

        const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
        const spread = (Math.random() - 0.5) * 0.15;
        const bulletX = sourceX + Math.cos(angle) * (shooter.size + this.bulletSize + 1);
        const bulletY = sourceY + Math.sin(angle) * (shooter.size + this.bulletSize + 1);

        const bullet = {
            x: bulletX,
            y: bulletY,
            dx: Math.cos(angle + spread) * this.bulletSpeed,
            dy: Math.sin(angle + spread) * this.bulletSpeed,
            size: this.bulletSize,
            color: shooter === this.game.player ? bulletColor : '#ff4444',
            damage: 10,
            shooter
        };

        this.bullets.push(bullet);

        if (shooter === this.game.player) {
            this.lastFireTime = now;
            shooter.updateAmmo(-1);
        }

        return true;
    }

    update() {
        this.bullets = this.bullets.filter(bullet => {
            bullet.x += bullet.dx;
            bullet.y += bullet.dy;

            if (!this.game.safeZone.isPointInSafeZone(bullet.x, bullet.y)) {
                return false;
            }

            if (this.game.player.isAlive && bullet.shooter !== this.game.player &&
                !this.game.player.shield.active && this.checkCollision(bullet, this.game.player)) {
                this.game.player.takeDamage(bullet.damage);
                return false;
            }

            this.game.otherPlayers.forEach(otherPlayer => {
                if (otherPlayer.isAlive && bullet.shooter !== otherPlayer && 
                    !otherPlayer.shield.active && this.checkCollision(bullet, otherPlayer)) {
                    otherPlayer.takeDamage(bullet.damage);
                    if (bullet.shooter === this.game.player) {
                        this.game.player.addScore(10);
                    }
                    return false;
                }
            });

            for (const bot of this.game.botManager.bots) {
                if (bot.isAlive && this.checkCollision(bullet, bot)) {
                    bot.takeDamage(bullet.damage);
                    if (bullet.shooter === this.game.player) {
                        this.game.player.addScore(10);
                    }
                    return false;
                }
            }

            return true;
        });
    }

    checkCollision(bullet, target) {
        if (!target.isAlive) return false;
        const dx = bullet.x - target.x;
        const dy = bullet.y - target.y;
        return Math.hypot(dx, dy) < (bullet.size + target.size);
    }

    draw(ctx) {
        this.bullets.forEach(bullet => {
            ctx.save();
            ctx.shadowColor = bullet.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
            ctx.fillStyle = bullet.color;
            ctx.fill();
            ctx.restore();
        });
    }

    destroy() {
        this.bullets = [];
        this.game = null;
        this.isFiring = false;
    }
} 