import { Loot } from './Loot.js';

export class LootManager {
    constructor(game) {
        this.game = game;
        this.loots = [];
        this.spawnTimer = 0;
        this.spawnInterval = 180; // 3 segundos
        this.minZoneRadius = 50; // Raio mínimo da zona para gerar loots
    }

    update() {
        // Spawn de novos loots apenas se a zona for grande o suficiente
        if (this.game.safeZone.currentRadius > this.minZoneRadius) {
            this.spawnTimer++;
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnLoot();
                this.spawnTimer = 0;
            }
        }

        // Atualizar loots existentes
        for (let i = this.loots.length - 1; i >= 0; i--) {
            const loot = this.loots[i];
            
            // Atualizar animação
            loot.update();
            
            // Verificar coleta
            if (this.game.localPlayer && !loot.collected) {
                if (loot.isColliding(this.game.localPlayer)) {
                    loot.collect(this.game.localPlayer);
                    this.loots.splice(i, 1);
                }
            }

            // Remover loots fora da zona
            const dx = loot.x - this.game.safeZone.x;
            const dy = loot.y - this.game.safeZone.y;
            const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
            if (distanceFromCenter > this.game.safeZone.currentRadius) {
                this.loots.splice(i, 1);
            }
        }
    }

    render(ctx) {
        for (const loot of this.loots) {
            loot.render(ctx);
        }
    }

    spawnLoot() {
        // Definir área de spawn dentro da zona segura
        const angle = Math.random() * Math.PI * 2;
        const maxSpawnRadius = this.game.safeZone.currentRadius * 0.8; // 80% do raio atual
        const minSpawnRadius = this.game.safeZone.currentRadius * 0.2; // 20% do raio atual
        const radius = minSpawnRadius + Math.random() * (maxSpawnRadius - minSpawnRadius);
        
        const x = this.game.safeZone.x + Math.cos(angle) * radius;
        const y = this.game.safeZone.y + Math.sin(angle) * radius;
        
        // Tipo aleatório: medkit ou munição
        const type = Math.random() < 0.5 ? 'medkit' : 'ammo';
        
        const loot = new Loot(x, y, type);
        this.loots.push(loot);
    }

    clear() {
        this.loots = [];
        this.spawnTimer = 0;
    }
} 