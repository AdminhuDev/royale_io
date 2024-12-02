import { CONFIG } from './config.js';

export class EffectManager {
    constructor(game) {
        this.game = game;
        this.effects = [];
    }

    showHealEffect(amount) {
        if (!this.game.localPlayer) return;

        this.effects.push({
            x: this.game.localPlayer.x,
            y: this.game.localPlayer.y - this.game.localPlayer.radius - 40,
            amount: amount,
            opacity: 1,
            yOffset: 0,
            type: 'heal'
        });
    }

    update() {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.opacity -= CONFIG.EFFECTS.HEAL_FADE_SPEED;
            effect.yOffset -= CONFIG.EFFECTS.HEAL_MOVE_SPEED;
            
            if (effect.opacity <= 0) {
                this.effects.splice(i, 1);
            }
        }
    }

    render(ctx) {
        this.effects.forEach(effect => {
            ctx.save();
            
            switch(effect.type) {
                case 'heal':
                    ctx.fillStyle = `rgba(76, 175, 80, ${effect.opacity})`;
                    ctx.font = 'bold 20px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(
                        `+${Math.round(effect.amount)}`,
                        effect.x,
                        effect.y + effect.yOffset
                    );
                    break;
                    
                case 'damage':
                    ctx.beginPath();
                    ctx.arc(effect.x, effect.y, 5, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 0, 0, ${effect.opacity})`;
                    ctx.fill();
                    ctx.closePath();
                    break;
            }
            
            ctx.restore();
        });
    }
} 