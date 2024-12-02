export class SafeZone {
    constructor(worldWidth, worldHeight) {
        this.x = worldWidth / 2;
        this.y = worldHeight / 2;
        this.maxRadius = 1500;
        this.currentRadius = 1500;
        this.targetRadius = 0;
        this.shrinkSpeed = 0.8;
        
        // Configurações de dano
        this.minDamage = 2;
        this.maxDamage = 15;
        this.damageScaling = 13;
        this.maxDistanceMultiplier = 3;
        this.distanceScaling = 100;
        this.damage = this.minDamage;
        
        this.timer = 60;
        this.shrinking = false;
        this.minRadius = 0;
        this.active = true;
        this.frameCount = 0;
        
        // Cache para otimização
        this.lastDamageCalculation = {
            x: 0,
            y: 0,
            damage: 0,
            timestamp: 0
        };
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
            // Calcula o progresso da redução da zona
            const shrinkProgress = 1 - (this.currentRadius / this.maxRadius);
            
            // Dano aumenta exponencialmente conforme a zona diminui
            this.damage = this.minDamage + (Math.pow(shrinkProgress, 1.5) * this.damageScaling);
            this.damage = Math.min(this.maxDamage, Math.max(this.minDamage, this.damage));
            
            // Atualiza o raio da zona
            this.currentRadius = Math.max(0, this.currentRadius - this.shrinkSpeed);
            
            // Aumenta a velocidade quando a zona está pequena
            if (this.currentRadius < this.maxRadius * 0.3) { // 30% do tamanho original
                this.shrinkSpeed = 1.2;
            }
        }
    }

    getDistanceFromCenter(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    isOutside(x, y) {
        return this.getDistanceFromCenter(x, y) > this.currentRadius;
    }

    getDamage(x, y) {
        // Verifica cache para evitar cálculos repetidos
        const now = performance.now();
        if (
            this.lastDamageCalculation.x === x &&
            this.lastDamageCalculation.y === y &&
            now - this.lastDamageCalculation.timestamp < 16 // Cache válido por 1 frame (60 FPS)
        ) {
            return this.lastDamageCalculation.damage;
        }

        // Se não está fora da zona, não causa dano
        if (!this.isOutside(x, y)) {
            this.lastDamageCalculation = { x, y, damage: 0, timestamp: now };
            return 0;
        }
        
        // Calcula a distância uma única vez
        const distanceFromCenter = this.getDistanceFromCenter(x, y);
        
        // Calcula o multiplicador de distância com uma curva mais suave
        const distanceFromZone = distanceFromCenter - this.currentRadius;
        const normalizedDistance = Math.min(distanceFromZone / this.distanceScaling, 1);
        const distanceMultiplier = Math.min(
            this.maxDistanceMultiplier,
            Math.pow(normalizedDistance, 1.5) * this.maxDistanceMultiplier
        );
        
        // Calcula o dano base com escala progressiva
        const zoneProgress = (this.maxRadius - this.currentRadius) / this.maxRadius;
        const baseDamage = this.damage * (1 + Math.pow(zoneProgress, 1.2));
        
        // Aplica o dano por frame com limites e aumenta o dano mínimo
        const damagePerFrame = Math.min(
            this.maxDamage,
            Math.max(this.minDamage/60, (baseDamage * distanceMultiplier) * (1/60))
        );
        
        // Atualiza o cache
        this.lastDamageCalculation = {
            x,
            y,
            damage: damagePerFrame,
            timestamp: now
        };
        
        return damagePerFrame;
    }
} 