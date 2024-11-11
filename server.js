import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Servir arquivos estáticos
app.use(express.static('./'));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Gerenciar conexões WebSocket
const rooms = new Map();
const PLAYERS_PER_ROOM = 10;
const ROOM_TIMEOUT = 15000; // 15 segundos fixos

function createRoom() {
    const roomId = uuidv4();
    const room = {
        players: new Map(),
        gameStarted: false,
        createdAt: Date.now(),
        timeoutId: setTimeout(() => startGameIfReady(roomId), ROOM_TIMEOUT),
        updateInterval: setInterval(() => broadcastTimeLeft(roomId), 1000) // Atualizar a cada segundo
    };
    
    rooms.set(roomId, room);
    return roomId;
}

function findAvailableRoom() {
    for (const [roomId, room] of rooms) {
        if (room.players.size < PLAYERS_PER_ROOM && !room.gameStarted) {
            return roomId;
        }
    }
    return createRoom();
}

wss.on('connection', (ws) => {
    const playerId = uuidv4();
    console.log(`Novo jogador conectado: ${playerId}`);
    
    ws.playerId = playerId;
    ws.send(JSON.stringify({
        type: 'playerId',
        id: playerId
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, playerId, data);
        } catch (error) {
            console.error('Erro ao processar mensagem:', error);
        }
    });

    ws.on('close', () => {
        handlePlayerDisconnect(playerId);
    });
});

function handleMessage(ws, playerId, data) {
    switch(data.type) {
        case 'joinRoom':
            const roomId = findAvailableRoom();
            const room = rooms.get(roomId);
            
            room.players.set(playerId, {
                ws,
                data: {
                    name: data.name,
                    skin: data.skin,
                    position: data.position
                }
            });

            ws.roomId = roomId;
            
            const timeLeft = Math.max(0, ROOM_TIMEOUT - (Date.now() - room.createdAt));
            
            ws.send(JSON.stringify({
                type: 'roomAssigned',
                roomId,
                playersInRoom: room.players.size,
                maxPlayers: PLAYERS_PER_ROOM,
                timeLeft: timeLeft,
                players: getPlayersInRoom(roomId)
            }));

            broadcastToRoom(roomId, {
                type: 'playerJoined',
                player: {
                    id: playerId,
                    ...room.players.get(playerId).data
                },
                playersInRoom: room.players.size,
                maxPlayers: PLAYERS_PER_ROOM,
                timeLeft: timeLeft
            }, playerId);

            break;

        case 'position':
        case 'shot':
        case 'death':
            if (ws.roomId) {
                broadcastToRoom(ws.roomId, {
                    ...data,
                    id: playerId,
                    roomId: ws.roomId
                }, playerId);
            }
            break;

        case 'ping':
            ws.send(JSON.stringify({
                type: 'pong',
                timestamp: data.timestamp
            }));
            break;
    }
}

function broadcastToRoom(roomId, data, excludeId = null) {
    const room = rooms.get(roomId);
    if (!room) return;

    room.players.forEach((player, id) => {
        if (id !== excludeId && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(data));
        }
    });
}

function getPlayersInRoom(roomId) {
    const room = rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.players.entries())
        .filter(([_, player]) => player.data)
        .map(([id, player]) => ({
            id,
            ...player.data
        }));
}

function startGameIfReady(roomId) {
    const room = rooms.get(roomId);
    if (!room || room.gameStarted) return;

    clearTimeout(room.timeoutId);
    clearInterval(room.updateInterval);

    room.gameStarted = true;
    const playerCount = room.players.size;
    
    console.log(`Iniciando jogo na sala ${roomId} com ${playerCount} jogadores`);
    
    // Gerar posições iniciais
    const positions = {};
    room.players.forEach((player, id) => {
        positions[id] = {
            x: Math.random() * 1000 + 500,
            y: Math.random() * 1000 + 500
        };
    });

    // Obter lista atualizada de jogadores
    const currentPlayers = getPlayersInRoom(roomId);
    
    broadcastToRoom(roomId, {
        type: 'gameStart',
        timestamp: Date.now(),
        playerCount: playerCount,
        totalPlayers: PLAYERS_PER_ROOM,
        players: currentPlayers,
        positions: positions
    });
}

function handlePlayerDisconnect(playerId) {
    for (const [roomId, room] of rooms) {
        if (room.players.has(playerId)) {
            room.players.delete(playerId);
            console.log(`Jogador ${playerId} saiu da sala: ${roomId}`);
            console.log(`Jogadores na sala ${roomId}: ${room.players.size}/${PLAYERS_PER_ROOM}`);
            
            broadcastToRoom(roomId, {
                type: 'playerLeft',
                id: playerId,
                playersInRoom: room.players.size,
                maxPlayers: PLAYERS_PER_ROOM
            });
            
            if (room.players.size === 0) {
                rooms.delete(roomId);
                console.log(`Sala ${roomId} fechada por falta de jogadores`);
            }
            break;
        }
    }
}

// Adicionar broadcast do tempo restante
function broadcastTimeLeft(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;

    const timeLeft = Math.max(0, ROOM_TIMEOUT - (Date.now() - room.createdAt));
    
    broadcastToRoom(roomId, {
        type: 'timeUpdate',
        timeLeft: timeLeft,
        playersInRoom: room.players.size,
        maxPlayers: PLAYERS_PER_ROOM
    });
}

// Melhorar broadcast de posições
function broadcastPosition(roomId, playerId, position) {
    const room = rooms.get(roomId);
    if (!room) return;

    broadcastToRoom(roomId, {
        type: 'position',
        id: playerId,
        ...position,
        timestamp: Date.now()
    }, playerId);
}

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});