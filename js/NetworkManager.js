import { Logger } from './Logger.js';
import { Player } from './Player.js';
import { BotManager } from './BotManager.js';

export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.playerId = null;
        this.roomId = null;
        this.players = new Map();
        this.matchmakingState = 'idle';
        
        // URL dinâmica baseada no ambiente
        this.serverUrl = window.location.hostname === 'localhost' 
            ? 'ws://localhost:3000'
            : `wss://${window.location.hostname}`;
        
        this.lastPing = 0;
        this.pingInterval = null;
        this.lastUpdateTime = Date.now();
        this.updateRate = 50; // Atualizar a cada 50ms
        this.interpolationDelay = 100; // 100ms de delay para interpolação
        
        this.setupConnection();
    }

    setupConnection() {
        this.socket = new WebSocket(this.serverUrl);

        this.socket.onopen = () => {
            Logger.info('Conectado ao servidor');
            this.startPing();
            this.joinRoom();
            this.startUpdateLoop();
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);
        };

        this.socket.onclose = () => {
            Logger.info('Desconectado do servidor');
            this.handleDisconnect();
        };
    }

    startUpdateLoop() {
        setInterval(() => {
            if (this.game?.player?.isAlive) {
                this.updatePosition();
            }
        }, this.updateRate);
    }

    startPing() {
        this.pingInterval = setInterval(() => {
            const start = Date.now();
            this.send({
                type: 'ping',
                timestamp: start
            });
        }, 2000);
    }

    joinRoom() {
        if (this.matchmakingState !== 'idle') return;
        
        this.matchmakingState = 'searching';
        Logger.info('Entrando na sala...');
        
        this.send({
            type: 'joinRoom',
            name: this.game.player.name,
            skin: this.game.player.currentSkin,
            position: {
                x: this.game.player.x,
                y: this.game.player.y
            }
        });

        this.game.ui.updateWaitingScreen(true, 1, 10, 'Aguardando jogadores...');
    }

    handleServerMessage(data) {
        switch(data.type) {
            case 'playerId':
                this.playerId = data.id;
                Logger.info('Conectado com ID:', this.playerId);
                break;

            case 'roomAssigned':
                this.handleRoomAssignment(data);
                break;

            case 'playerJoined':
                this.handlePlayerJoined(data);
                break;

            case 'playerLeft':
                this.handlePlayerLeft(data);
                break;

            case 'gameStart':
                this.handleGameStart(data);
                break;

            case 'gameAction':
                this.handleGameAction(data);
                break;

            case 'position':
                this.handlePlayerPosition(data);
                break;

            case 'shot':
                this.handlePlayerShot(data);
                break;

            case 'pong':
                this.lastPing = Date.now() - data.timestamp;
                if (this.game?.ui) {
                    this.game.ui.updatePerformanceStats(this.game.fps, this.lastPing);
                }
                break;

            case 'timeUpdate':
                this.handleTimeUpdate(data);
                break;
        }
    }

    handleRoomAssignment(data) {
        this.roomId = data.roomId;
        this.matchmakingState = 'inRoom';
        Logger.info(`Sala atribuída: ${this.roomId} (${data.playersInRoom}/${data.maxPlayers} jogadores)`);

        const timeLeft = Math.max(0, data.timeLeft || 15000);
        
        this.game.ui.updateWaitingScreen(
            true, 
            data.playersInRoom,
            data.maxPlayers,
            timeLeft
        );
    }

    handlePlayerJoined(data) {
        if (data.player.id !== this.playerId) {
            this.addPlayer(data.player);
        }
        
        const timeLeft = Math.max(0, data.timeLeft || 15000);
        
        this.game.ui.updateWaitingScreen(
            true,
            data.playersInRoom,
            data.maxPlayers,
            timeLeft
        );
    }

    handlePlayerLeft(data) {
        this.removePlayer(data.id);
        
        const timeLeft = Math.max(0, data.timeLeft || 15000);
        
        this.game.ui.updateWaitingScreen(
            true,
            data.playersInRoom,
            data.maxPlayers,
            timeLeft
        );
    }

    handlePlayerPosition(data) {
        if (data.id !== this.playerId) {
            const player = this.players.get(data.id);
            if (player) {
                // Adicionar timestamp para interpolação
                player.positionBuffer = player.positionBuffer || [];
                player.positionBuffer.push({
                    x: data.x,
                    y: data.y,
                    angle: data.angle,
                    timestamp: Date.now()
                });

                // Manter apenas os últimos 10 estados
                if (player.positionBuffer.length > 10) {
                    player.positionBuffer.shift();
                }

                this.interpolatePlayerPosition(player);
            }
        }
    }

    interpolatePlayerPosition(player) {
        if (!player.positionBuffer || player.positionBuffer.length < 2) return;

        const now = Date.now() - this.interpolationDelay;
        
        // Encontrar os dois estados mais próximos do tempo atual
        while (player.positionBuffer.length >= 2 && 
               player.positionBuffer[1].timestamp <= now) {
            player.positionBuffer.shift();
        }

        if (player.positionBuffer.length >= 2) {
            const pos0 = player.positionBuffer[0];
            const pos1 = player.positionBuffer[1];
            const t = (now - pos0.timestamp) / (pos1.timestamp - pos0.timestamp);

            // Interpolação linear
            player.x = pos0.x + (pos1.x - pos0.x) * t;
            player.y = pos0.y + (pos1.y - pos0.y) * t;
            player.targetAngle = pos0.angle + (pos1.angle - pos0.angle) * t;
        }
    }

    handlePlayerShot(data) {
        if (data.id !== this.playerId) {
            const shooter = this.players.get(data.id);
            if (shooter && this.game.bulletManager) {
                this.game.bulletManager.fireBullet(
                    data.x,
                    data.y,
                    data.targetX,
                    data.targetY,
                    shooter,
                    data.color || '#ff4444'
                );
            }
        }
    }

    handleGameStart(data) {
        Logger.info('Iniciando partida');
        
        // Garantir que todos os jogadores estejam sincronizados
        this.updatePlayersList(data.players || []);
        
        // Calcular quantos bots são necessários usando o playerCount do servidor
        const currentPlayers = data.playerCount;
        const botsNeeded = this.game.TOTAL_PLAYERS - currentPlayers;
        
        Logger.info(`Iniciando com ${currentPlayers} jogadores e ${botsNeeded} bots`);
        
        // Limpar bots existentes
        if (this.game.botManager) {
            this.game.botManager.destroy();
        }
        
        // Criar bots necessários
        if (botsNeeded > 0) {
            this.game.botManager = new BotManager(botsNeeded, this.game.canvas);
        }
        
        // Garantir que todos os jogadores comecem na mesma posição
        if (data.positions) {
            this.players.forEach((player, id) => {
                const pos = data.positions[id];
                if (pos) {
                    player.x = pos.x;
                    player.y = pos.y;
                }
            });
        }
        
        this.game.startGame();
    }

    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        }
    }

    updatePosition() {
        if (!this.game?.player?.isAlive) return;

        this.send({
            type: 'position',
            x: this.game.player.x,
            y: this.game.player.y,
            angle: this.game.player.targetAngle,
            timestamp: Date.now()
        });
    }

    sendShot(shotData) {
        this.send({
            type: 'shot',
            x: shotData.x,
            y: shotData.y,
            targetX: shotData.targetX,
            targetY: shotData.targetY,
            color: shotData.color,
            timestamp: shotData.timestamp
        });
    }

    handleGameAction(data) {
        switch(data.action) {
            case 'shot':
                if (data.playerId !== this.playerId) {
                    const shooter = this.players.get(data.playerId);
                    if (shooter && this.game.bulletManager) {
                        this.game.bulletManager.fireBullet(
                            data.x,
                            data.y,
                            data.targetX,
                            data.targetY,
                            shooter,
                            data.color
                        );
                    }
                }
                break;
            // Adicionar outros casos conforme necessário
        }
    }

    handleDisconnect() {
        this.matchmakingState = 'idle';
        this.players.clear();
        if (this.game?.otherPlayers) {
            this.game.otherPlayers.clear();
        }
        
        // Tentar reconectar após um delay
        setTimeout(() => {
            if (this.game && !this.socket) {
                this.setupConnection();
            }
        }, 5000);
    }

    updatePlayersList(players) {
        // Limpar jogadores antigos
        this.players.clear();
        this.game.otherPlayers.clear();

        // Adicionar jogadores atuais
        players.forEach(playerData => {
            if (playerData.id !== this.playerId) {
                this.addPlayer(playerData);
                Logger.info(`Jogador na lista: ${playerData.name} (${playerData.id})`);
            }
        });

        Logger.info(`Total de jogadores atualizados: ${this.players.size + 1}`); // +1 para incluir o jogador local
    }

    addPlayer(playerData) {
        if (!playerData || !playerData.id || playerData.id === this.playerId) return;
        
        const player = new Player(playerData.x, playerData.y);
        player.id = playerData.id;
        player.name = playerData.name;
        player.setSkin(playerData.skin);
        player.isNetworkPlayer = true;
        
        this.players.set(playerData.id, player);
        this.game.otherPlayers.set(playerData.id, player);
        
        Logger.info(`Jogador adicionado: ${playerData.name} (${playerData.id})`);
    }

    updatePlayer(playerData) {
        const player = this.players.get(playerData.id);
        if (player) {
            player.x = playerData.x;
            player.y = playerData.y;
            player.targetAngle = playerData.angle;
        }
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        this.game.otherPlayers.delete(playerId);
    }

    startGame(playerCount) {
        const botsNeeded = 10 - playerCount;
        if (botsNeeded > 0) {
            this.game.botManager = new BotManager(botsNeeded, this.game.canvas);
        }

        this.game.startGame();
    }

    destroy() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        this.players.clear();
        this.game = null;
    }

    calculateSafeSpawnPosition() {
        if (!this.game?.safeZone?.config) {
            return {
                x: this.game.canvas.width / 2,
                y: this.game.canvas.height / 2
            };
        }

        const config = this.game.safeZone.config;
        const margin = 100; // Margem de segurança da borda
        const radius = config.currentRadius - margin;
        
        // Gerar posição aleatória dentro da zona segura
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;
        
        return {
            x: config.centerX + Math.cos(angle) * distance,
            y: config.centerY + Math.sin(angle) * distance
        };
    }

    handleTimeUpdate(data) {
        const timeLeft = Math.max(0, data.timeLeft);
        
        this.game.ui.updateWaitingScreen(
            true,
            data.playersInRoom,
            data.maxPlayers,
            timeLeft
        );
    }
} 