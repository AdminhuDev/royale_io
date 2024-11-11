export class SafeZoneManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.config = {
            initialRadius: Math.max(canvas.width, canvas.height) * 0.8,
            currentRadius: Math.max(canvas.width, canvas.height) * 0.8,
            centerX: canvas.width / 2,
            centerY: canvas.height / 2,
            shrinkRate: 0.3,
            damageOutside: 0.2,
            timeToShrink: 60,
            currentTime: 60,
            minRadius: 0,
            animationPhase: 0,
            isPaused: false,
            lastUpdateTime: Date.now(),
            damageInterval: 1000,
            maxDamageMultiplier: 2
        };
        
        this.lastDamageTime = Date.now();
    }

    update() {
        const now = Date.now();
        const deltaTime = (now - this.config.lastUpdateTime) / 1000;
        this.config.lastUpdateTime = now;

        if (!this.config.isPaused) {
            if (this.config.currentTime > 0) {
                this.config.currentTime -= deltaTime;
                this.updateTimer();
            } else {
                this.shrinkZone();
            }
            this.config.animationPhase += 0.02;

            if (now - this.lastDamageTime >= this.config.damageInterval) {
                this.lastDamageTime = now;
                this.checkOutsideDamage();
            }
        }
    }

    checkOutsideDamage() {
        if (!this.game?.player?.isAlive) return;

        const now = Date.now();
        if (now - this.lastDamageTime < this.config.damageInterval) return;

        const dx = this.game.player.x - this.config.centerX;
        const dy = this.game.player.y - this.config.centerY;
        const distanceFromCenter = Math.hypot(dx, dy);

        if (distanceFromCenter > this.config.currentRadius) {
            const distanceFromBorder = distanceFromCenter - this.config.currentRadius;
            const damageMultiplier = Math.min(
                1 + (distanceFromBorder / 200),
                this.config.maxDamageMultiplier
            );
            
            const damage = this.config.damageOutside * damageMultiplier;
            this.game.player.takeDamage(damage);
            
            this.lastDamageTime = now;

            if (this.game.ui) {
                this.game.ui.showDamageIndicator();
            }
        }
    }

    updateTimer() {
        const timerElement = document.getElementById('safe-zone-timer');
        if (!timerElement) return;

        if (this.config.currentTime <= 0) {
            timerElement.textContent = 'ÁREA DIMINUINDO!';
            timerElement.style.backgroundColor = 'rgba(255, 0, 0, 0.4)';
            timerElement.classList.add('pulse');
        } else {
            timerElement.textContent = `ÁREA DIMINUINDO EM: ${Math.ceil(this.config.currentTime)}s`;
            timerElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            timerElement.classList.remove('pulse');
        }
    }

    shrinkZone() {
        if (this.config.currentRadius > this.config.minRadius) {
            this.config.currentRadius -= this.config.shrinkRate;
        }
        this.config.currentRadius = Math.max(this.config.minRadius, this.config.currentRadius);
    }

    draw(ctx) {
        const segments = 200;
        const angleStep = (Math.PI * 2) / segments;
        const maxOffset = 8;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        ctx.beginPath();
        for (let i = 0; i <= segments; i++) {
            const angle = i * angleStep;
            const noise = Math.sin(this.config.animationPhase + angle * 5) * maxOffset;
            const radius = this.config.currentRadius + noise;
            
            const x = this.config.centerX + Math.cos(angle) * radius;
            const y = this.config.centerY + Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(50, 0, 100, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i <= segments; i++) {
            const angle = i * angleStep;
            const noise = Math.cos(this.config.animationPhase + angle * 7) * (maxOffset / 1.5);
            const radius = this.config.currentRadius + noise;
            
            const x = this.config.centerX + Math.cos(angle) * radius;
            const y = this.config.centerY + Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(100, 0, 150, 0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();

        const glowGradient = ctx.createRadialGradient(
            this.config.centerX, this.config.centerY, this.config.currentRadius,
            this.config.centerX, this.config.centerY, this.config.currentRadius + 20
        );
        glowGradient.addColorStop(0, 'rgba(50, 0, 100, 0.3)');
        glowGradient.addColorStop(1, 'rgba(100, 0, 150, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(this.config.centerX, this.config.centerY, this.config.currentRadius + 10, 0, Math.PI * 2);
        ctx.fill();

        const outerGradient = ctx.createRadialGradient(
            this.config.centerX, this.config.centerY, this.config.currentRadius,
            this.config.centerX, this.config.centerY, this.config.currentRadius * 1.2
        );
        
        outerGradient.addColorStop(0, 'rgba(30, 0, 60, 0.2)');
        outerGradient.addColorStop(1, 'rgba(50, 0, 100, 0)');
        
        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.arc(this.config.centerX, this.config.centerY, this.config.currentRadius * 1.2, 0, Math.PI * 2);
        ctx.fill();
    }

    reset() {
        const scale = Math.max(this.canvas.width, this.canvas.height) * 0.8 / this.config.initialRadius;
        
        this.config = {
            ...this.config,
            initialRadius: this.config.initialRadius * scale,
            currentRadius: this.config.initialRadius * scale,
            centerX: this.canvas.width / 2,
            centerY: this.canvas.height / 2,
            timeToShrink: 60,
            currentTime: 60,
            isPaused: false,
            lastUpdateTime: Date.now()
        };
    }

    pause() {
        this.config.isPaused = true;
    }

    resume() {
        this.config.isPaused = false;
        this.config.lastUpdateTime = Date.now();
    }

    isPointInSafeZone(x, y) {
        const dx = x - this.config.centerX;
        const dy = y - this.config.centerY;
        const distanceFromCenter = Math.hypot(dx, dy);
        return distanceFromCenter <= this.config.currentRadius;
    }

    destroy() {
        const timerElement = document.getElementById('safe-zone-timer');
        if (timerElement) {
            timerElement.textContent = '';
        }
        
        this.config = null;
        this.canvas = null;
    }

    setGame(game) {
        this.game = game;
    }
}