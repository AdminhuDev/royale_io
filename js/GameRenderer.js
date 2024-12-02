export class GameRenderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
    }

    render() {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        this.game.camera.begin(this.ctx);
        this.game.gridRenderer.render(this.ctx);

        switch (this.game.gameState) {
            case 'waiting':
                this.renderWaitingScreen();
                break;

            case 'starting':
                this.renderStartingScreen();
                break;

            case 'running':
                this.renderSafeZone();
                this.game.lootManager.render(this.ctx);
                this.renderPlayers();
                this.game.bulletManager.render(this.ctx);
                this.game.effectManager.render(this.ctx);
                break;
        }

        this.game.camera.end(this.ctx);
        this.updateUI();
    }

    renderPlayers() {
        // Renderizar outros jogadores
        this.game.players.forEach(player => {
            if (player.health > 0) {
                player.render(this.ctx);
            }
        });

        // Renderizar bots
        this.game.bots.forEach(bot => {
            if (bot.health > 0) {
                bot.render(this.ctx, null, null, false);
            }
        });

        // Renderizar jogador local
        if (this.game.localPlayer && this.game.localPlayer.health > 0) {
            this.game.localPlayer.render(this.ctx, this.game.mouseX, this.game.mouseY, true);
        }
    }

    renderSafeZone() {
        // Atualizar campo de estrelas
        this.game.starField.update();

        // Área fora da zona
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.game.worldWidth, this.game.worldHeight);
        
        // Salvar contexto para clipping
        this.ctx.save();
        
        // Criar máscara para a zona segura
        this.ctx.beginPath();
        this.ctx.arc(this.game.safeZone.x, this.game.safeZone.y, this.game.safeZone.currentRadius, 0, Math.PI * 2);
        this.ctx.clip();
        
        // Limpar área da zona segura
        this.ctx.clearRect(0, 0, this.game.worldWidth, this.game.worldHeight);
        
        // Desenhar fundo espacial
        const gradient = this.ctx.createRadialGradient(
            this.game.safeZone.x, this.game.safeZone.y, 0,
            this.game.safeZone.x, this.game.safeZone.y, this.game.safeZone.currentRadius
        );
        gradient.addColorStop(0, 'rgba(25, 25, 112, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 30, 0.4)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.game.worldWidth, this.game.worldHeight);
        
        // Desenhar estrelas
        for (const star of this.game.starField.stars) {
            const distance = Math.sqrt(
                Math.pow(star.x - this.game.safeZone.x, 2) + 
                Math.pow(star.y - this.game.safeZone.y, 2)
            );
            
            if (distance <= this.game.safeZone.currentRadius) {
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.7})`;
                this.ctx.fill();
                
                // Brilho da estrela
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.2})`;
                this.ctx.fill();
            }
        }
        
        this.ctx.restore();
        
        // Borda da zona segura
        this.ctx.beginPath();
        this.ctx.arc(this.game.safeZone.x, this.game.safeZone.y, this.game.safeZone.currentRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#4CAF50';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    renderWaitingScreen() {
        const text = 'Preparando partida...';
        const totalPlayers = this.game.players.size + 1 + this.game.bots.size;
        const statusText = `${totalPlayers} jogadores (${this.game.bots.size} bots)`;

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, this.game.worldWidth/2, this.game.worldHeight/2 - 50);
        
        this.ctx.font = '24px Arial';
        this.ctx.fillText(statusText, this.game.worldWidth/2, this.game.worldHeight/2 + 50);
    }

    renderStartingScreen() {
        const text = 'Partida começando em:';
        const timerText = Math.ceil(this.game.matchStartTimer / 60).toString();

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, this.game.worldWidth/2, this.game.worldHeight/2 - 50);
        
        this.ctx.font = '72px Arial';
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillText(timerText, this.game.worldWidth/2, this.game.worldHeight/2 + 50);
    }

    updateUI() {
        const healthElement = document.getElementById('health');
        const ammoElement = document.getElementById('ammo');
        const scoreElement = document.getElementById('score');
        const killsElement = document.getElementById('kills');
        const zoneTimerElement = document.getElementById('zone-timer');
        const playersAliveElement = document.getElementById('players-alive');

        if (this.game.localPlayer) {
            if (healthElement) {
                healthElement.textContent = Math.ceil(this.game.localPlayer.health);
            }
            if (ammoElement) {
                ammoElement.textContent = this.game.localPlayer.ammo;
            }
            if (scoreElement) {
                scoreElement.textContent = this.game.score;
            }
            if (killsElement) {
                killsElement.textContent = this.game.localPlayer.kills;
            }
        }

        // Atualizar contagem de jogadores vivos
        if (playersAliveElement) {
            let alivePlayers = 0;
            
            // Contar jogadores vivos
            this.game.players.forEach(player => {
                if (player.health > 0) alivePlayers++;
            });
            
            // Contar bots vivos
            this.game.bots.forEach(bot => {
                if (bot.health > 0) alivePlayers++;
            });
            
            // Adicionar jogador local se estiver vivo
            if (this.game.localPlayer && this.game.localPlayer.health > 0) {
                alivePlayers++;
            }

            playersAliveElement.textContent = `Jogadores: ${alivePlayers}`;

            // Verificar condição de vitória
            if (alivePlayers === 1 && this.game.localPlayer && this.game.localPlayer.health > 0) {
                // Bônus de vitória
                this.game.score += 500;
                if (scoreElement) {
                    scoreElement.textContent = this.game.score;
                }
                this.game.handleGameOver(true);
            }
        }

        if (zoneTimerElement) {
            if (!this.game.safeZone.shrinking) {
                zoneTimerElement.textContent = `Zona: ${this.game.safeZone.timer}s`;
            } else {
                zoneTimerElement.textContent = 'ZONA DIMINUINDO!';
                zoneTimerElement.style.color = '#ff4444';
            }
        }
    }
} 