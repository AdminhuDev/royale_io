import { Logger } from './Logger.js';
import { Player } from './Player.js';
import { BotManager } from './BotManager.js';

export class NetworkManager {
    static instance = null; // Singleton instance

    constructor(game) {
        // Se já existe uma instância, retorná-la
        if (NetworkManager.instance) {
            return NetworkManager.instance;
        }

        NetworkManager.instance = this;
        this.game = game;
        this.socket = null;
        this.playerId = null;
        this.serverUrl = this.getServerUrl();
        this.connected = false;
        
        this.inputSequence = 0;
        this.pendingInputs = [];
        this.lastProcessedInput = 0;
        
        this.stateBuffer = [];
        this.interpolationDelay = 100;
        
        this.maxPlayers = 0;
        this.minPlayersToStart = 0;
        this.currentPlayers = 0;
        
        this.setupConnection();
    }

    getServerUrl() {
        return window.location.hostname === 'localhost' 
            ? 'ws://localhost:3000'
            : `wss://${window.location.hostname}`;
    }

    setupConnection() {
        // Se já está conectado, não fazer nada
        if (this.connected || this.socket) {
            console.log('Conexão já existe');
            return;
        }

        try {
            this.socket = new WebSocket(this.serverUrl);
            
            this.socket.onopen = () => {
                if (!this.connected) {
                    console.log('Conectado ao servidor');
                    this.connected = true;
                    
                    this.send({
                        type: 'join',
                        name: this.game.player.name,
                        skin: this.game.player.currentSkin,
                        position: {
                            x: this.game.player.x,
                            y: this.game.player.y,
                            angle: this.game.player.targetAngle
                        }
                    });
                    this.startHeartbeat();
                }
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleServerMessage(data);
                } catch (error) {
                    console.error('Erro ao processar mensagem:', error);
                }
            };

            this.socket.onclose = () => {
                console.log('Desconectado do servidor');
                this.connected = false;
                this.socket = null;
                NetworkManager.instance = null; // Limpar instância ao desconectar
            };

            this.socket.onerror = (error) => {
                console.error('Erro na conexão WebSocket:', error);
            };
        } catch (error) {
            console.error('Erro ao configurar conexão:', error);
            this.connected = false;
            this.socket = null;
            NetworkManager.instance = null;
        }
    }

    handleServerMessage(data) {
        switch(data.type) {
            case 'init':
                this.playerId = data.id;
                console.log('ID recebido:', this.playerId);
                if (data.serverInfo) {
                    this.maxPlayers = data.serverInfo.maxPlayers;
                    this.minPlayersToStart = data.serverInfo.minPlayersToStart;
                    this.currentPlayers = data.serverInfo.currentPlayers;
                    this.updateWaitingScreen();
                }
                break;
            
            case 'playersList':
                this.updatePlayers(data.players);
                break;
            
            case 'playerPosition':
                this.updatePlayerPosition(data);
                break;
            
            case 'playerLeft':
                this.removePlayer(data.id);
                break;
            
            case 'gameState':
                this.processGameState(data.state);
                break;
            
            case 'pong':
                this.updatePing(data.timestamp);
                break;

            case 'shot':
                this.handleShot(data);
                break;

            case 'playersCount':
                this.currentPlayers = data.count;
                this.maxPlayers = data.maxPlayers;
                this.minPlayersToStart = data.minPlayersToStart;
                
                // Iniciar contagem apenas quando houver jogadores suficientes
                if (this.currentPlayers >= this.minPlayersToStart && !this.game.countdownStarted) {
                    this.send({
                        type: 'readyToStart'
                    });
                }
                
                this.updateWaitingScreen();
                break;

            case 'countdown':
                if (this.game.countdownElement) {
                    this.game.countdownElement.textContent = data.timeLeft;
                }
                if (data.timeLeft <= 0) {
                    this.game.startGame();
                }
                break;

            case 'gameStart':
                this.game.startGame();
                break;
        }
    }

    updatePlayers(players) {
        players.forEach(playerData => {
            if (playerData.id !== this.playerId) {
                if (!this.game.otherPlayers.has(playerData.id)) {
                    // Criar novo jogador
                    const otherPlayer = new Player(playerData.position.x, playerData.position.y);
                    otherPlayer.id = playerData.id;
                    otherPlayer.name = playerData.name;
                    otherPlayer.setSkin(playerData.skin);
                    otherPlayer.isNetworkPlayer = true;
                    otherPlayer.health = playerData.health;
                    otherPlayer.isAlive = playerData.isAlive;
                    this.game.otherPlayers.set(playerData.id, otherPlayer);
                } else {
                    // Atualizar jogador existente
                    const player = this.game.otherPlayers.get(playerData.id);
                    if (player && playerData.position) {
                        player.x = playerData.position.x;
                        player.y = playerData.position.y;
                        player.targetAngle = playerData.position.angle;
                        player.health = playerData.health;
                        player.isAlive = playerData.isAlive;
                    }
                }
            }
        });
    }

    updatePlayerPosition(data) {
        if (data.id !== this.playerId) {
            this.game.updatePlayerPosition(data.id, data.position);
        }
    }

    removePlayer(playerId) {
        this.game.removePlayer(playerId);
    }

    updatePosition() {
        if (this.socket?.readyState === WebSocket.OPEN && this.game.player?.isAlive) {
            this.send({
                type: 'position',
                x: this.game.player.x,
                y: this.game.player.y,
                angle: this.game.player.targetAngle,
                health: this.game.player.health,
                isAlive: this.game.player.isAlive
            });
        }
    }

    send(data) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            try {
                this.socket.send(JSON.stringify(data));
            } catch (error) {
                console.error('Erro ao enviar mensagem:', error);
            }
        }
    }

    startHeartbeat() {
        setInterval(() => {
            if (this.socket?.readyState === WebSocket.OPEN) {
                this.send({
                    type: 'heartbeat',
                    timestamp: Date.now()
                });
            }
        }, 1000);
    }

    updatePing(timestamp) {
        this.lastPing = Date.now() - timestamp;
        if (this.game.ui) {
            this.game.ui.updatePerformanceStats(this.game.fps, this.lastPing);
        }
    }

    destroy() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.connected = false;
        NetworkManager.instance = null;
    }

    calculateSafeSpawnPosition() {
        const margin = 100; // Margem de segurança da borda
        const safeZone = this.game.safeZone;
        
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            // Gerar posição aleatória dentro do círculo da safe zone
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * (safeZone.config.currentRadius * 0.8); // 80% do raio para garantir spawn seguro
            
            const x = safeZone.config.centerX + Math.cos(angle) * radius;
            const y = safeZone.config.centerY + Math.sin(angle) * radius;
            
            // Verificar se a posição está longe o suficiente de outros jogadores
            let isSafe = true;
            this.game.otherPlayers.forEach(player => {
                const dx = x - player.x;
                const dy = y - player.y;
                const distance = Math.hypot(dx, dy);
                if (distance < 100) { // Distância mínima de outros jogadores
                    isSafe = false;
                }
            });
            
            if (isSafe) {
                return { x, y };
            }
            
            attempts++;
        }
        
        // Se não encontrar posição segura, retornar posição padrão
        return {
            x: safeZone.config.centerX,
            y: safeZone.config.centerY
        };
    }

    sendShot(shotData) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.send({
                type: 'shot',
                ...shotData,
                playerId: this.playerId,
                timestamp: Date.now(),
                position: {
                    x: this.game.player.x,
                    y: this.game.player.y,
                    angle: this.game.player.targetAngle
                }
            });
        }
    }

    handleShot(data) {
        if (data.playerId !== this.playerId) {
            // Criar tiro de outro jogador
            const shooter = this.game.otherPlayers.get(data.playerId);
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
    }

    processGameState(state) {
        state.players.forEach(playerData => {
            if (playerData.id !== this.playerId) {
                const player = this.game.otherPlayers.get(playerData.id);
                if (player) {
                    // Atualizar estado do jogador
                    player.health = playerData.health;
                    player.isAlive = playerData.isAlive;
                    if (playerData.position) {
                        player.x = playerData.position.x;
                        player.y = playerData.position.y;
                        player.targetAngle = playerData.position.angle;
                    }
                }
            }
        });
    }

    updateWaitingScreen() {
        if (this.game.waitingScreen) {
            const waitingInfo = this.game.waitingScreen.querySelector('.waiting-info');
            if (waitingInfo) {
                let text = `Aguardando jogadores... (${this.currentPlayers}/${this.maxPlayers})`;
                
                if (this.currentPlayers < this.minPlayersToStart) {
                    text += `\nNecessário mínimo de ${this.minPlayersToStart} jogadores`;
                } else {
                    text += '\nPreparando para iniciar...';
                }
                
                waitingInfo.textContent = text;
            }
        }
    }
} 