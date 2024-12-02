export class SafeZone {
    constructor(worldWidth, worldHeight) {
        this.x = worldWidth / 2;
        this.y = worldHeight / 2;
        this.maxRadius = 1500;
        this.currentRadius = 1500;
        this.targetRadius = 0;
        this.shrinkSpeed = 0.8;
        this.damage = 2;
        this.timer = 60;
        this.shrinking = false;
        this.minRadius = 0;
        this.active = true;
        this.frameCount = 0;
    }

    update() {
        if (!this.shrinking && this.timer > 0) {
            this.frameCount++;
            
            if (this.frameCount >= 60) {
                this.timer--;
                this.frameCount = 0;
                
                if (this.timer <= 0) {
                    this.shrinking = true;
                    this.timer = 0;
                }
            }
        }

        if (this.shrinking) {
            const shrinkProgress = 1 - (this.currentRadius / this.maxRadius);
            this.damage = Math.min(15, Math.max(2, 2 + (shrinkProgress * 13)));
            this.currentRadius = Math.max(0, this.currentRadius - this.shrinkSpeed);
            
            if (this.currentRadius < 500) {
                this.shrinkSpeed = 1.2;
            }
        }
    }

    isOutside(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
        return distanceFromCenter > this.currentRadius;
    }

    getDamage(x, y) {
        if (!this.isOutside(x, y)) return 0;
        
        const dx = x - this.x;
        const dy = y - this.y;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
        const distanceMultiplier = Math.min(3, (distanceFromCenter - this.currentRadius) / 100);
        return (this.damage * distanceMultiplier) * (1/60);
    }
} 