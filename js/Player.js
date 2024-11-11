import { Skins } from './Skins.js';
import { Effects } from './Effects.js';

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.health = 100;
        this.isAlive = true;
        this.ammo = 30;
        this.maxAmmo = 100;
        this.score = 0;
        this.targetAngle = 0;
        this.speed = 2.2;
        this.baseSpeed = 2.2;
        this.maxSpeed = 3.5;
        this.acceleration = 0.2;
        this.deceleration = 0.15;
        this.velocity = { x: 0, y: 0 };
        this.input = { x: 0, y: 0 };
        this.lastPosition = { x, y };
        this.movementSmoothing = 0.2;

        this.shield = {
            active: false,
            cooldown: false,
            duration: 5000,
            cooldownTime: 10000,
            startTime: 0,
            cooldownStartTime: 0,
            timeoutId: null,
            cooldownTimeoutId: null
        };

        this.medkits = {
            count: 3,
            maxCount: 3,
            active: false,
            cooldown: false,
            duration: 5000,
            cooldownTime: 10000,
            healRate: 1,
            startTime: 0,
            cooldownStartTime: 0
        };

        this.supergum = {
            active: false,
            duration: 5000,
            speedBoost: 1.5,
            startTime: 0
        };
        
        this.laser = {
            active: false,
            duration: 3000,
            damage: 20,
            startTime: 0
        };

        this.score = parseInt(localStorage.getItem('playerScore')) || 0;
        Skins.loadUnlockedSkins();
        this.currentSkin = localStorage.getItem('currentSkin') || 'default';
        this.skin = Skins.PLAYER_SKINS[this.currentSkin];
        this.trailPositions = [];
        this.invincibilityTime = 100;
        this.lastDamageTime = 0;
        this.name = localStorage.getItem('playerName') || 'Jogador';

        this.isNetworkPlayer = false;
        this.lastUpdateTime = Date.now();
        this.interpolationBuffer = [];
    }

    update(mouse, canvas, safeZone) {
        if (this.isNetworkPlayer) {
            this.interpolatePosition();
            this.checkSafeZone(safeZone);
            return;
        }

        if (mouse && canvas) {
            const dx = mouse.x - canvas.width / 2;
            const dy = mouse.y - canvas.height / 2;
            const distance = Math.hypot(dx, dy);
            
            if (distance > 15) {
                const angle = Math.atan2(dy, dx);
                
                const inputScale = Math.min(distance / 150, 1);
                this.input.x = Math.cos(angle) * inputScale;
                this.input.y = Math.sin(angle) * inputScale;
                
                this.velocity.x += this.input.x * this.acceleration;
                this.velocity.y += this.input.y * this.acceleration;
            } else {
                this.velocity.x *= (1 - this.deceleration);
                this.velocity.y *= (1 - this.deceleration);
            }

            const currentSpeed = Math.hypot(this.velocity.x, this.velocity.y);
            if (currentSpeed > this.speed) {
                const scale = this.speed / currentSpeed;
                this.velocity.x *= scale;
                this.velocity.y *= scale;
            }

            this.lastPosition.x = this.x;
            this.lastPosition.y = this.y;
            
            const smoothing = this.movementSmoothing;
            this.x += this.velocity.x * smoothing;
            this.y += this.velocity.y * smoothing;

            const targetAngle = Math.atan2(dy, dx);
            const angleDiff = targetAngle - this.targetAngle;
            this.targetAngle += angleDiff * 0.1;
        }

        this.updateEffects();
        this.checkSafeZone(safeZone);
    }

    interpolatePosition() {
        if (this.interpolationBuffer.length < 2) return;

        const now = Date.now();
        const renderTimestamp = now - 100; // 100ms de delay para suavização

        while (this.interpolationBuffer.length >= 2 && 
               this.interpolationBuffer[1].timestamp <= renderTimestamp) {
            this.interpolationBuffer.shift();
        }

        if (this.interpolationBuffer.length >= 2) {
            const pos0 = this.interpolationBuffer[0];
            const pos1 = this.interpolationBuffer[1];
            const t = (renderTimestamp - pos0.timestamp) / (pos1.timestamp - pos0.timestamp);

            this.x = pos0.x + (pos1.x - pos0.x) * t;
            this.y = pos0.y + (pos1.y - pos0.y) * t;
            this.targetAngle = pos0.angle + (pos1.angle - pos0.angle) * t;
        }
    }

    checkSafeZone(safeZone) {
        if (!safeZone) return;

        const dxFromCenter = this.x - safeZone.config.centerX;
        const dyFromCenter = this.y - safeZone.config.centerY;
        const distanceFromCenter = Math.hypot(dxFromCenter, dyFromCenter);

        if (distanceFromCenter > safeZone.config.currentRadius) {
            const distanceFromBorder = distanceFromCenter - safeZone.config.currentRadius;
            const damageMultiplier = Math.min(1 + (distanceFromBorder / 100), 3);
            const damage = 0.5 * damageMultiplier;
            
            this.takeDamage(damage);

            if (this.game?.ui) {
                this.game.ui.showDamageIndicator();
            }
        }
    }

    updateEffects() {
        if (this.shield.active && Date.now() - this.shield.startTime >= this.shield.duration) {
            this.shield.active = false;
            this.shield.cooldown = true;
            this.shield.cooldownStartTime = Date.now();
        } else if (this.shield.cooldown && Date.now() - this.shield.cooldownStartTime >= this.shield.cooldownTime) {
            this.shield.cooldown = false;
        }

        if (this.medkits.active) {
            this.health = Math.min(100, this.health + this.medkits.healRate);
            if (Date.now() - this.medkits.startTime >= this.medkits.duration) {
                this.medkits.active = false;
                this.medkits.cooldown = true;
                this.medkits.cooldownStartTime = Date.now();
            }
        } else if (this.medkits.cooldown && Date.now() - this.medkits.cooldownStartTime >= this.medkits.cooldownTime) {
            this.medkits.cooldown = false;
        }

        if (this.supergum.active && Date.now() - this.supergum.startTime >= this.supergum.duration) {
            this.supergum.active = false;
            this.speed = this.baseSpeed;
            this.maxSpeed = this.speed * 1.5;
        }

        if (this.laser.active && Date.now() - this.laser.startTime >= this.laser.duration) {
            this.laser.active = false;
            if (this.game && this.game.bulletManager) {
                this.game.bulletManager.bulletDamage = 10;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.targetAngle);

        Effects.drawPlayerEffect(ctx, this);

        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.skin?.color || '#ffffff';
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, -5, this.size + 10, 10);

        if (this.shield.active) {
            Effects.drawShieldEffect(ctx, this);
        }

        ctx.restore();

        this.drawPlayerName(ctx);
    }

    getCurrentColor() {
        if (!this.skin) return '#ffffff';
        
        if (this.skin.colorCycle) {
            const hue = (Date.now() * (this.skin.colorSpeed || 0.02)) % 360;
            return `hsl(${hue}, 100%, 50%)`;
        }
        
        if (this.skin.transparency) {
            const opacity = this.getOpacityPulse();
            const baseColor = this.skin.color.replace(/[^\d,]/g, '').split(',');
            return `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${opacity})`;
        }
        
        return this.skin.color || '#ffffff';
    }

    getOpacityPulse() {
        if (!this.skin.opacityPulse) return 1;
        const { min = 0.3, max = 0.8, speed = 1 } = this.skin.opacityPulse;
        const pulse = Math.sin(Date.now() / 1000 * speed) * 0.5 + 0.5;
        return min + (max - min) * pulse;
    }

    drawPlayerName(ctx) {
        if (!this.name) return;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '14px Arial';
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(this.name, this.x, this.y - this.size - 10);
        
        ctx.fillStyle = this.isNetworkPlayer ? '#00ff00' : '#ffffff';
        ctx.fillText(this.name, this.x, this.y - this.size - 10);
        
        ctx.restore();
    }

    setSkin(skinName) {
        if (Skins.PLAYER_SKINS[skinName] && Skins.PLAYER_SKINS[skinName].unlocked) {
            this.currentSkin = skinName;
            this.skin = Skins.PLAYER_SKINS[skinName];
            localStorage.setItem('currentSkin', skinName);
            return true;
        }
        return false;
    }

    addScore(points) {
        this.score += points;
        localStorage.setItem('playerScore', this.score.toString());
        if (this.game?.ui) {
            this.game.ui.updateScore(this.score);
        }
    }

    takeDamage(damage) {
        if (this.shield.active || !this.isAlive) return;
        
        this.health = Math.max(0, this.health - damage);
        
        if (this.game?.ui) {
            this.game.ui.updateHealth(this.health);
        }
        
        if (this.health <= 0 && this.isAlive) {
            this.isAlive = false;
            if (this.game) {
                this.game.checkGameState();
            }
        }
    }

    activateShield() {
        if (!this.shield || this.shield.active || this.shield.cooldown) return false;

        this.shield.active = true;
        this.shield.startTime = Date.now();
        
        // Usar arrow functions para manter o contexto 'this'
        const shieldTimeout = setTimeout(() => {
            if (this.shield) {
                this.shield.active = false;
                this.shield.cooldown = true;
                this.shield.cooldownStartTime = Date.now();
                
                const cooldownTimeout = setTimeout(() => {
                    if (this.shield) {
                        this.shield.cooldown = false;
                    }
                }, this.shield.cooldownTime);
                
                this.shield.cooldownTimeoutId = cooldownTimeout;
            }
        }, this.shield.duration);
        
        this.shield.timeoutId = shieldTimeout;
        
        return true;
    }

    activateHealing() {
        if (!this.medkits || this.medkits.active || this.medkits.cooldown || 
            this.medkits.count <= 0 || this.health >= 100) return false;
        
        this.medkits.active = true;
        this.medkits.startTime = Date.now();
        this.medkits.count--;
        
        let healInterval = setInterval(() => {
            if (this.medkits?.active) {
                this.health = Math.min(100, this.health + this.medkits.healRate);
                if (this.game?.ui) {
                    this.game.ui.updateHealth(this.health);
                }
            }
        }, 100);
        
        setTimeout(() => {
            if (this.medkits) {
                clearInterval(healInterval);
                this.medkits.active = false;
                this.medkits.cooldown = true;
                this.medkits.cooldownStartTime = Date.now();
                
                setTimeout(() => {
                    if (this.medkits) {
                        this.medkits.cooldown = false;
                    }
                }, this.medkits.cooldownTime);
            }
        }, this.medkits.duration);
        
        return true;
    }

    activateSupergum() {
        if (!this.supergum.active) {
            this.supergum.active = true;
            this.supergum.startTime = Date.now();
            this.speed = this.baseSpeed * this.supergum.speedBoost;
            this.maxSpeed = this.speed * 1.5;

            setTimeout(() => {
                this.supergum.active = false;
                this.speed = this.baseSpeed;
                this.maxSpeed = this.speed * 1.5;
            }, this.supergum.duration);
        }
    }

    activateLaser() {
        if (!this.laser.active) {
            this.laser.active = true;
            this.laser.startTime = Date.now();
            
            const originalDamage = 10;
            if (this.game && this.game.bulletManager) {
                this.game.bulletManager.bulletDamage = this.laser.damage;
            }

            setTimeout(() => {
                this.laser.active = false;
                if (this.game && this.game.bulletManager) {
                    this.game.bulletManager.bulletDamage = originalDamage;
                }
            }, this.laser.duration);
        }
    }

    destroy() {
        // Limpar todos os timers antes de destruir
        if (this.shield) {
            if (this.shield.timeoutId) clearTimeout(this.shield.timeoutId);
            if (this.shield.cooldownTimeoutId) clearTimeout(this.shield.cooldownTimeoutId);
        }
        
        if (this.medkits) {
            if (this.medkits.healInterval) clearInterval(this.medkits.healInterval);
            if (this.medkits.cooldownTimeoutId) clearTimeout(this.medkits.cooldownTimeoutId);
        }
        
        if (this.supergum?.active) {
            this.supergum.active = false;
            this.speed = this.baseSpeed;
        }
        
        if (this.laser?.active) {
            this.laser.active = false;
            if (this.game?.bulletManager) {
                this.game.bulletManager.bulletDamage = 10;
            }
        }

        // Limpar referências
        this.shield = null;
        this.medkits = null;
        this.supergum = null;
        this.laser = null;
        this.game = null;
        this.skin = null;
        this.trailPositions = [];
    }

    updateAmmo(amount) {
        this.ammo = Math.min(this.maxAmmo, Math.max(0, this.ammo + amount));
        
        if (this.game?.ui) {
            this.game.ui.updateAmmo(this.ammo);
        }
    }

    setAmmo(amount) {
        this.ammo = Math.min(this.maxAmmo, Math.max(0, amount));
        if (this.game?.ui) {
            this.game.ui.updateAmmo(this.ammo);
        }
    }
}