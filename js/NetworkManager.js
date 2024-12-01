export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.connected = false;
        this.playerId = null;
        this.connect();
    }

    connect() {
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
            
            // Tentar reconectar após 5 segundos
            setTimeout(() => this.connect(), 5000);
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
        switch (message.type) {
            case 'join_ack':
                this.playerId = message.playerId;
                break;

            case 'player_joined':
                if (message.playerId !== this.playerId) {
                    this.game.addPlayer(message.playerId, message.data);
                }
                break;

            case 'player_left':
                if (message.playerId !== this.playerId) {
                    this.game.removePlayer(message.playerId);
                }
                break;

            case 'player_update':
                if (message.playerId !== this.playerId) {
                    this.game.updatePlayer(message.playerId, message.data);
                }
                break;

            case 'bullet_created':
                if (message.playerId !== this.playerId) {
                    this.game.addBullet(message.data);
                }
                break;

            case 'player_hit':
                if (message.playerId === this.playerId) {
                    this.game.handleHit(message.data.damage);
                }
                break;
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
        if (!this.connected || !this.playerId) return;

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
        if (!this.connected || !this.playerId) return;

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
        if (!this.connected || !this.playerId) return;

        this.send({
            type: 'hit',
            data: {
                targetId: targetPlayerId,
                damage: damage
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
        if (this.socket) {
            this.socket.close();
        }
    }
}