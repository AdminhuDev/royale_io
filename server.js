import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const TICK_RATE = 60;
const UPDATE_RATE = 20;

class GameServer {
    constructor(port) {
        this.app = express();
        this.server = createServer(this.app);
        this.wss = new WebSocketServer({ server: this.server });
        
        this.rooms = new Map();
        this.players = new Map();
        
        this.maxPlayers = 10;
        this.minPlayersToStart = 1;
        
        this.countdownStarted = false;
        this.countdownTime = 15;
        this.readyPlayers = new Set();
        this.countdownInterval = null;
        
        this.setupServer();
        this.startGameLoop();
        
        this.server.listen(port, () => {
            console.log(`Servidor rodando na porta ${port}`);
        });
    }

    setupServer() {
        this.app.use(express.static('./'));
        this.wss.on('connection', this.handleConnection.bind(this));
    }

    handleConnection(ws) {
        const playerId = uuidv4();
        
        this.players.set(playerId, {
            ws,
            data: null,
            lastHeartbeat: Date.now(),
            inputs: []
        });

        ws.send(JSON.stringify({
            type: 'init',
            id: playerId,
            serverInfo: {
                currentPlayers: this.players.size,
                maxPlayers: this.maxPlayers,
                minPlayersToStart: this.minPlayersToStart
            }
        }));

        this.broadcastPlayersCount();
        this.sendPlayersList(ws);

        ws.on('message', (message) => this.handleMessage(playerId, JSON.parse(message)));
        ws.on('close', () => {
            this.handleDisconnect(playerId);
            this.broadcastPlayersCount();
        });
    }

    sendPlayersList(ws) {
        const playersList = Array.from(this.players.entries())
            .filter(([_, player]) => player.data)
            .map(([id, player]) => ({
                id,
                ...player.data
            }));

        ws.send(JSON.stringify({
            type: 'playersList',
            players: playersList
        }));
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

    handleMessage(playerId, data) {
        const player = this.players.get(playerId);
        if (!player) return;

        switch(data.type) {
            case 'join':
                player.data = {
                    name: data.name,
                    skin: data.skin,
                    position: data.position,
                    health: 100,
                    isAlive: true
                };
                this.broadcastPlayers();
                break;

            case 'position':
                if (player.data) {
                    player.data.position = {
                        x: data.x,
                        y: data.y,
                        angle: data.angle
                    };
                    // Broadcast imediato da posição
                    this.broadcast({
                        type: 'playerPosition',
                        id: playerId,
                        position: player.data.position
                    }, playerId);
                }
                break;

            case 'shot':
                this.broadcast({
                    type: 'shot',
                    playerId: playerId,
                    ...data
                });
                break;

            case 'heartbeat':
                player.lastHeartbeat = Date.now();
                player.ws.send(JSON.stringify({
                    type: 'pong',
                    timestamp: data.timestamp
                }));
                break;

            case 'readyToStart':
                this.readyPlayers.add(playerId);
                if (this.readyPlayers.size >= this.minPlayersToStart && !this.countdownStarted) {
                    this.startCountdown();
                }
                break;
        }
    }

    startCountdown() {
        if (this.players.size < this.minPlayersToStart) {
            console.log('Aguardando pelo menos 1 jogador');
            this.countdownStarted = false;
            this.readyPlayers.clear();
            
            this.broadcast({
                type: 'countdownCancelled',
                reason: 'Aguardando jogadores'
            });
            
            return;
        }

        this.countdownStarted = true;
        let timeLeft = this.countdownTime;

        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        this.countdownInterval = setInterval(() => {
            if (this.players.size < this.minPlayersToStart) {
                clearInterval(this.countdownInterval);
                this.countdownStarted = false;
                this.readyPlayers.clear();
                
                this.broadcast({
                    type: 'countdownCancelled',
                    reason: 'Aguardando jogadores'
                });
                
                return;
            }

            this.broadcast({
                type: 'countdown',
                timeLeft: timeLeft,
                currentPlayers: this.players.size,
                minPlayers: this.minPlayersToStart
            });

            if (timeLeft <= 0) {
                clearInterval(this.countdownInterval);
                this.broadcast({ type: 'gameStart' });
                this.countdownStarted = false;
                this.readyPlayers.clear();
            }

            timeLeft--;
        }, 1000);
    }

    handleDisconnect(playerId) {
        const player = this.players.get(playerId);
        if (!player) return;

        this.players.delete(playerId);
        this.readyPlayers.delete(playerId);
        
        this.broadcast({
            type: 'playerLeft',
            id: playerId
        });

        if (this.players.size < this.minPlayersToStart) {
            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }
            this.countdownStarted = false;
            this.readyPlayers.clear();
            
            this.broadcast({
                type: 'countdownCancelled',
                reason: 'Aguardando jogadores'
            });
        }

        this.broadcastPlayersCount();
    }

    broadcast(data, excludeId = null) {
        this.wss.clients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
                const clientId = Array.from(this.players.entries())
                    .find(([_, p]) => p.ws === client)?.[0];
                
                if (clientId !== excludeId) {
                    client.send(JSON.stringify(data));
                }
            }
        });
    }

    startGameLoop() {
        setInterval(() => {
            this.broadcastGameState();
        }, 1000 / UPDATE_RATE);

        setInterval(() => {
            this.checkHeartbeats();
        }, 5000);
    }

    broadcastGameState() {
        const state = {
            players: Array.from(this.players.entries()).map(([id, player]) => ({
                id,
                position: player.data?.position,
                health: player.data?.health,
                isAlive: player.data?.isAlive
            })),
            timestamp: Date.now()
        };

        this.broadcast({
            type: 'gameState',
            state
        });
    }

    checkHeartbeats() {
        const now = Date.now();
        this.players.forEach((player, id) => {
            if (now - player.lastHeartbeat > 10000) {
                this.handleDisconnect(id);
            }
        });
    }

    broadcastPlayersCount() {
        this.broadcast({
            type: 'playersCount',
            count: this.players.size,
            maxPlayers: this.maxPlayers,
            minPlayersToStart: this.minPlayersToStart
        });
    }
}

try {
    const gameServer = new GameServer(3000);
} catch (error) {
    console.error('Erro ao criar servidor:', error);
}