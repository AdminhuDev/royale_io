export class Effects {
    static drawPlayerEffect(ctx, player) {
        if (!player.skin) return;

        // Efeito de transparência para skin galáxia
        if (player.skin.transparency) {
            // Aplicar transparência fixa mais alta
            ctx.globalAlpha = 0.2; // Aumentada a transparência
            
            // Desenhar jogador com transparência
            ctx.beginPath();
            ctx.arc(0, 0, player.size, 0, Math.PI * 2);
            ctx.fillStyle = player.skin.color;
            ctx.fill();

            // Resetar opacidade
            ctx.globalAlpha = 1;
        } else {
            // Desenho normal para outras skins
            ctx.beginPath();
            ctx.arc(0, 0, player.size, 0, Math.PI * 2);
            ctx.fillStyle = player.skin.color;
            ctx.fill();
        }
    }

    static drawBulletEffect(ctx, bullet) {
        ctx.save();
        ctx.shadowColor = bullet.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fillStyle = bullet.color;
        ctx.fill();
        ctx.restore();
    }

    static drawShieldEffect(ctx, player) {
        if (!player.shield.active) return;

        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, player.size + 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0, 229, 255, 0.7)';
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.restore();
    }
} 