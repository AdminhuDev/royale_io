import { Effects } from './Effects.js';

export class BulletManager {
    constructor(game) {
        this.game = game;
        this.bullets = [];
        this.bulletSpeed = 5.5;
        this.bulletSize = 5;
        this.bulletColor = '#0A84FF';
        this.fireRate = 5;
        this.fireInterval = 1000/this.fireRate;
        this.lastFireTime = 0;
        this.isFiring = false;
        this.bulletDamage = 10;
        this.bulletSpread = 0.1;
    }

    fireBullet(sourceX, sourceY, targetX, targetY, shooter, bulletColor) {
        const now = Date.now();
        if (shooter.ammo <= 0 || now - this.lastFireTime < this.fireInterval) {
            return false;
        }

        const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
        const spread = (Math.random() - 0.5) * this.bulletSpread;
        const bulletX = sourceX + Math.cos(angle) * (shooter.size + this.bulletSize + 1);
        const bulletY = sourceY + Math.sin(angle) * (shooter.size + this.bulletSize + 1);

        const bullet = {
            x: bulletX,
            y: bulletY,
            dx: Math.cos(angle + spread) * this.bulletSpeed,
            dy: Math.sin(angle + spread) * this.bulletSpeed,
            size: this.bulletSize,
            color: shooter === this.game.player ? bulletColor : '#ff4444',
            damage: this.bulletDamage,
            shooter,
            timestamp: now
        };

        this.bullets.push(bullet);

        if (shooter === this.game.player) {
            this.lastFireTime = now;
            shooter.updateAmmo(-1);
        }

        return true;
    }

    update() {
        const now = Date.now();
        this.bullets = this.bullets.filter(bullet => {
            if (now - bullet.timestamp > 5000) return false;

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

            let hitPlayer = false;
            this.game.otherPlayers.forEach(otherPlayer => {
                if (!hitPlayer && otherPlayer.isAlive && bullet.shooter !== otherPlayer && 
                    !otherPlayer.shield.active && this.checkCollision(bullet, otherPlayer)) {
                    otherPlayer.takeDamage(bullet.damage);
                    if (bullet.shooter === this.game.player) {
                        this.game.player.addScore(10);
                    }
                    hitPlayer = true;
                }
            });
            if (hitPlayer) return false;

            for (const bot of this.game.botManager.bots) {
                if (bot.isAlive && bullet.shooter !== bot && this.checkCollision(bullet, bot)) {
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
        const distance = Math.hypot(dx, dy);
        const hitboxSize = target.size * 0.9;
        return distance < (bullet.size + hitboxSize);
    }

    draw(ctx) {
        this.bullets.forEach(bullet => {
            Effects.drawBulletEffect(ctx, bullet);
        });
    }

    destroy() {
        this.bullets = [];
        this.game = null;
        this.isFiring = false;
    }
} 