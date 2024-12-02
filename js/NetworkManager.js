export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.connected = false;
        this.playerId = null;
        this.reconnectTimeout = null;
        this.connect();
    }

    connect() {
        // Limpar timeout de reconexão anterior se existir
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        // Limpar socket anterior se existir
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        const serverUrl = window.location.hostname === 'localhost' 
            ? 'ws://localhost:3000'
            : `wss://${window.location.host}`;
            
        this.socket = new WebSocket(serverUrl);

        this.socket.onopen = () => {
            console.log('Conectado ao servidor');
            this.connected = true;
            this.sendJoin();
        };

        this.socket.onclose = () => {
            console.log('Desconectado do servidor');
            this.connected = false;
            this.playerId = null;
            
            // Tentar reconectar apenas se o jogo não estiver terminado
            if (!this.game.isGameOver) {
                this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
            }
        };

        this.socket.onerror = (error) => {
            console.error('Erro na conexão WebSocket:', error);
        };

        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Erro ao processar mensagem:', error);
            }
        };
    }

    handleMessage(message) {
        try {
            switch (message.type) {
                case 'join_ack':
                    this.playerId = message.playerId;
                    break;

                case 'player_joined':
                    if (message.playerId !== this.playerId && message.data) {
                        this.game.addPlayer(message.playerId, message.data);
                        if (this.game.gameState === 'waiting' && 
                            this.game.players.size + 1 >= 2) {
                            this.game.gameState = 'starting';
                        }
                    }
                    break;

                case 'player_left':
                case 'player_died':
                    if (message.playerId !== this.playerId) {
                        this.game.removePlayer(message.playerId);
                    }
                    break;

                case 'game_state':
                    if (message.data) {
                        this.handleGameState(message.data);
                    }
                    break;

                case 'player_update':
                    if (this.game.gameState === 'running' && 
                        message.playerId !== this.playerId && 
                        this.game.players.has(message.playerId) &&
                        message.data) {
                        this.game.updatePlayer(message.playerId, message.data);
                    }
                    break;

                case 'bullet_created':
                    if (this.game.gameState === 'running' && 
                        message.playerId !== this.playerId &&
                        message.data) {
                        this.game.addBullet(message.data);
                    }
                    break;

                case 'player_hit':
                    if (this.game.gameState === 'running' && 
                        message.playerId === this.playerId &&
                        message.data) {
                        this.game.handleHit(message.data.damage);
                    }
                    break;
            }
        } catch (error) {
            console.error('Erro ao processar mensagem:', error, message);
        }
    }

    handleGameState(data) {
        const oldState = this.game.gameState;
        this.game.gameState = data.state;

        if (data.state === 'starting') {
            this.game.matchStartTimer = data.startTimer;
        }
    }

    sendJoin() {
        if (!this.connected) return;
        
        this.send({
            type: 'join',
            data: {
                name: this.game.localPlayer.name,
                x: this.game.localPlayer.x,
                y: this.game.localPlayer.y,
                health: this.game.localPlayer.health,
                score: this.game.localPlayer.score,
                kills: this.game.localPlayer.kills
            }
        });
    }

    sendPosition() {
        if (!this.connected || !this.playerId || this.game.gameState !== 'running') return;

        this.send({
            type: 'position',
            data: {
                x: this.game.localPlayer.x,
                y: this.game.localPlayer.y,
                health: this.game.localPlayer.health,
                score: this.game.localPlayer.score,
                kills: this.game.localPlayer.kills
            }
        });
    }

    sendShoot(bullet) {
        if (!this.connected || !this.playerId || this.game.gameState !== 'running') return;

        this.send({
            type: 'shoot',
            data: {
                x: bullet.x,
                y: bullet.y,
                dirX: bullet.dirX,
                dirY: bullet.dirY,
                speed: bullet.speed,
                damage: bullet.damage
            }
        });
    }

    sendHit(targetPlayerId, damage) {
        if (!this.connected || !this.playerId || this.game.gameState !== 'running') return;

        this.send({
            type: 'hit',
            data: {
                targetId: targetPlayerId,
                damage: damage
            }
        });
    }

    sendDeath() {
        if (!this.connected || !this.playerId) return;

        this.send({
            type: 'player_died',
            data: {
                killedBy: null,
                score: this.game.localPlayer.score,
                kills: this.game.localPlayer.kills
            }
        });
    }

    send(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            message.playerId = this.playerId;
            this.socket.send(JSON.stringify(message));
        }
    }

    disconnect() {
        // Limpar timeout de reconexão
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        // Fechar socket
        if (this.socket) {
            // Remover todos os event listeners
            this.socket.onopen = null;
            this.socket.onclose = null;
            this.socket.onerror = null;
            this.socket.onmessage = null;

            // Fechar conexão
            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.close();
            }
            this.socket = null;
        }

        this.connected = false;
        this.playerId = null;
    }
}