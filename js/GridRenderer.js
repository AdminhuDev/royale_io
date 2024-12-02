export class GridRenderer {
    constructor(width, height, gridSize = 100) {
        this.width = width;
        this.height = height;
        this.gridSize = gridSize;
        this.gridCanvas = document.createElement('canvas');
        this.gridCanvas.width = width;
        this.gridCanvas.height = height;
        this.createGrid();
    }

    createGrid() {
        const ctx = this.gridCanvas.getContext('2d');
        
        // Desenhar linhas do grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Linhas verticais
        for (let x = 0; x <= this.width; x += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        
        // Linhas horizontais
        for (let y = 0; y <= this.height; y += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }

        // Borda do mundo
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, this.width, this.height);
    }

    render(ctx) {
        ctx.drawImage(this.gridCanvas, 0, 0);
    }
} 