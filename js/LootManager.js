import { Effects } from './Effects.js';
import { Skins } from './Skins.js';

export class LootManager {
    constructor(game) {
        this.game = game;
        this.loots = [];
        this.spawnInterval = 2000;
        this.spawnTimer = null;
        this.lootValues = {
            ammo: {
                min: 15,
                max: 30,
                color: '#ffff00',
                size: 8,
                weight: 50
            },
            medkit: {
                min: 25,
                max: 50,
                color: '#ff69b4',
                size: 10,
                weight: 30
            },
            supergum: {
                color: '#00ffff',
                size: 12,
                value: 1,
                weight: 10,
                rarity: 'RARO'
            },
            laser: {
                color: '#ff4500',
                size: 12,
                value: 1,
                weight: 5,
                rarity: 'ÉPICO'
            }
        };
    }

    startLootSpawning() {
        if (!this.game || !this.game.safeZone) {
            Logger.warn('Tentativa de iniciar spawn de loots sem jogo/safeZone inicializado');
            return;
        }
        
        this.spawnTimer = setInterval(() => {
            if (this.game && this.game.safeZone) {
                this.spawnRandomLoot();
            }
        }, this.spawnInterval);
    }

    spawnRandomLoot() {
        if (!this.game?.safeZone?.config) {
            Logger.warn('Tentativa de spawn de loot sem safeZone configurada');
            return;
        }

        const totalWeight = Object.values(this.lootValues).reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        let selectedType = 'ammo';
        for (const [type, config] of Object.entries(this.lootValues)) {
            if (random < config.weight) {
                selectedType = type;
                break;
            }
            random -= config.weight;
        }

        const lootConfig = this.lootValues[selectedType];
        
        const maxRadius = this.game.safeZone.config.currentRadius * 0.8;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * maxRadius;
        
        const x = this.game.safeZone.config.centerX + Math.cos(angle) * radius;
        const y = this.game.safeZone.config.centerY + Math.sin(angle) * radius;

        const value = lootConfig.min && lootConfig.max ? 
            Math.floor(Math.random() * (lootConfig.max - lootConfig.min + 1) + lootConfig.min) :
            lootConfig.value;

        this.loots.push({
            x,
            y,
            type: selectedType,
            size: lootConfig.size,
            color: lootConfig.color,
            value,
            rarity: lootConfig.rarity || 'COMUM',
            spawnTime: Date.now(),
            pulsePhase: 0
        });
    }

    update() {
        const now = Date.now();
        this.loots = this.loots.filter(loot => {
            if (!this.game.player.isAlive) return true;

            const dx = this.game.player.x - loot.x;
            const dy = this.game.player.y - loot.y;
            const distance = Math.hypot(dx, dy);
            const collectionRadius = this.game.player.size + loot.size + 5;

            if (distance < collectionRadius) {
                this.collectLoot(loot);
                return false;
            }
            return true;
        });
    }

    collectLoot(loot) {
        switch(loot.type) {
            case 'ammo':
                this.game.player.updateAmmo(loot.value);
                this.showCollectionEffect(loot, `+${loot.value}`);
                break;
            case 'medkit':
                if (this.game.player.health < 100) {
                    const healAmount = Math.min(100 - this.game.player.health, loot.value);
                    this.game.player.health = Math.min(100, this.game.player.health + healAmount);
                    this.game.ui.updateHealth(this.game.player.health);
                    this.showCollectionEffect(loot, `+${healAmount}`);
                }
                break;
            case 'supergum':
                this.game.player.activateSupergum();
                this.showCollectionEffect(loot, 'SUPER VELOCIDADE!');
                break;
            case 'laser':
                this.game.player.activateLaser();
                this.showCollectionEffect(loot, 'LASER!');
                break;
        }
    }

    draw(ctx) {
        this.loots.forEach(loot => {
            ctx.save();
            
            const pulseIntensity = loot.rarity === 'ÉPICO' ? 0.2 : 
                                 loot.rarity === 'RARO' ? 0.15 : 0.1;
            const scale = 1 + Math.sin(loot.pulsePhase) * pulseIntensity;
            
            ctx.translate(loot.x, loot.y);
            ctx.scale(scale, scale);

            ctx.shadowColor = loot.color;
            ctx.shadowBlur = loot.rarity === 'ÉPICO' ? 20 :
                           loot.rarity === 'RARO' ? 15 : 10;
            
            ctx.beginPath();
            ctx.arc(0, 0, loot.size, 0, Math.PI * 2);
            ctx.fillStyle = loot.color;
            ctx.fill();

            ctx.restore();
        });
    }

    showCollectionEffect(loot, text) {
        const floatingText = document.createElement('div');
        floatingText.className = 'floating-text';
        floatingText.style.left = `${loot.x}px`;
        floatingText.style.top = `${loot.y}px`;
        floatingText.textContent = text;
        floatingText.style.color = loot.color;
        
        document.body.appendChild(floatingText);
        
        setTimeout(() => floatingText.remove(), 1000);
    }

    destroy() {
        if (this.spawnTimer) {
            clearInterval(this.spawnTimer);
            this.spawnTimer = null;
        }
        this.loots = [];
        this.game = null;
    }
} 