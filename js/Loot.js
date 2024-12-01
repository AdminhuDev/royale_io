export class Loot {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'medkit' ou 'ammo'
        this.radius = 15;
        this.pulsePhase = 0;
        this.collected = false;
    }

    update() {
        this.pulsePhase = (this.pulsePhase + 0.05) % (Math.PI * 2);
    }

    render(ctx) {
        // Efeito de pulso
        const pulse = Math.sin(this.pulsePhase) * 0.2 + 1;
        const displayRadius = this.radius * pulse;
        
        // Desenhar loot
        ctx.beginPath();
        ctx.arc(this.x, this.y, displayRadius, 0, Math.PI * 2);
        
        if (this.type === 'medkit') {
            ctx.fillStyle = '#ff4444';
            
            // Cruz do medkit
            ctx.fillStyle = '#fff';
            ctx.fillRect(this.x - 2, this.y - 8, 4, 16); // Vertical
            ctx.fillRect(this.x - 8, this.y - 2, 16, 4); // Horizontal
        } else {
            ctx.fillStyle = '#ffaa00';
            
            // Símbolo de munição
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⦿', this.x, this.y);
        }
        
        // Brilho
        ctx.strokeStyle = this.type === 'medkit' ? '#ff6666' : '#ffcc00';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
    }

    isColliding(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < player.radius + this.radius;
    }
} 