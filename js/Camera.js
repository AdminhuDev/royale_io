export class Camera {
    constructor(game) {
        this.game = game;
        this.x = 0;
        this.y = 0;
        this.scale = 1;
        this.smoothing = 0.1;
        this.targetX = 0;
        this.targetY = 0;
    }

    update() {
        if (!this.game.localPlayer) return;

        // Calcular posição alvo (centro da tela)
        this.targetX = window.innerWidth / 2 - this.game.localPlayer.x;
        this.targetY = window.innerHeight / 2 - this.game.localPlayer.y;

        // Movimento suave da câmera
        this.x += (this.targetX - this.x) * this.smoothing;
        this.y += (this.targetY - this.y) * this.smoothing;

        // Limitar câmera aos limites do mundo
        const maxX = window.innerWidth - this.game.localPlayer.radius;
        const maxY = window.innerHeight - this.game.localPlayer.radius;
        const minX = -this.game.worldWidth + window.innerWidth;
        const minY = -this.game.worldHeight + window.innerHeight;

        this.x = Math.min(maxX, Math.max(minX, this.x));
        this.y = Math.min(maxY, Math.max(minY, this.y));
    }

    begin(ctx) {
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));
    }

    end(ctx) {
        ctx.restore();
    }

    screenToWorld(screenX, screenY) {
        return {
            x: screenX - this.x,
            y: screenY - this.y
        };
    }

    worldToScreen(worldX, worldY) {
        return {
            x: worldX + this.x,
            y: worldY + this.y
        };
    }
} 