const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class GameServer {
    constructor(port) {
        this.wss = new WebSocket.Server({ port });
        this.players = new Map();
        this.setupServer();
    }

    setupServer() {
        this.wss.on('connection', (ws) => {
            const playerId = uuidv4();
            
            ws.playerId = playerId;
            this.players.set(playerId, {
                ws,
                data: null
            });

            // Enviar ID para o jogador
            ws.send(JSON.stringify({
                type: 'playerId',
                id: playerId
            }));

            // Enviar lista de jogadores atual
            this.broadcastPlayers();

            ws.on('message', (message) => {
                this.handleMessage(playerId, JSON.parse(message));
            });

            ws.on('close', () => {
                this.players.delete(playerId);
                this.broadcast({
                    type: 'playerLeft',
                    id: playerId
                });
            });
        });
    }

    handleMessage(playerId, data) {
        const player = this.players.get(playerId);
        if (!player) return;

        switch(data.type) {
            case 'join':
                player.data = {
                    name: data.name,
                    skin: data.skin
                };
                this.broadcastPlayers();
                break;

            case 'position':
            case 'shot':
                // Repassar para outros jogadores
                this.broadcast({
                    ...data,
                    id: playerId
                }, playerId);
                break;
        }
    }

    broadcast(data, excludeId = null) {
        this.players.forEach((player, id) => {
            if (id !== excludeId && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify(data));
            }
        });
    }

    broadcastPlayers() {
        const playersList = Array.from(this.players.entries())
            .filter(([_, player]) => player.data)
            .map(([id, player]) => ({
                id,
                ...player.data
            }));

        this.broadcast({
            type: 'playersList',
            players: playersList
        });
    }
}

const server = new GameServer(3000); 