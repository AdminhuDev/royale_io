const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Servir arquivos estáticos
app.use(express.static('.'));

// Estado do jogo
const players = new Map();
let nextPlayerId = 1;

wss.on('connection', (ws) => {
    const playerId = nextPlayerId++;
    console.log(`Jogador ${playerId} conectou`);

    ws.playerId = playerId;
    players.set(playerId, {
        ws: ws,
        data: null
    });

    // Enviar ID para o jogador
    ws.send(JSON.stringify({
        type: 'join_ack',
        playerId: playerId
    }));

    // Enviar lista de jogadores atual
    players.forEach((player, id) => {
        if (id !== playerId && player.data) {
            ws.send(JSON.stringify({
                type: 'player_joined',
                playerId: id,
                data: player.data
            }));
        }
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'join':
                    players.get(playerId).data = data.data;
                    broadcast({
                        type: 'player_joined',
                        playerId: playerId,
                        data: data.data
                    }, playerId);
                    break;

                case 'position':
                    if (players.has(playerId)) {
                        players.get(playerId).data = {
                            ...players.get(playerId).data,
                            ...data.data
                        };
                        broadcast({
                            type: 'player_update',
                            playerId: playerId,
                            data: data.data
                        }, playerId);
                    }
                    break;

                case 'shoot':
                    broadcast({
                        type: 'bullet_created',
                        playerId: playerId,
                        data: data.data
                    }, playerId);
                    break;

                case 'hit':
                    const targetPlayer = players.get(data.data.targetId);
                    if (targetPlayer && targetPlayer.ws.readyState === WebSocket.OPEN) {
                        targetPlayer.ws.send(JSON.stringify({
                            type: 'player_hit',
                            playerId: data.data.targetId,
                            data: {
                                damage: data.data.damage,
                                attackerId: playerId
                            }
                        }));

                        // Atualizar estado do jogador
                        if (targetPlayer.data) {
                            targetPlayer.data.health -= data.data.damage;
                            
                            // Broadcast da atualização de vida
                            broadcast({
                                type: 'player_update',
                                playerId: data.data.targetId,
                                data: targetPlayer.data
                            });
                        }
                    }
                    break;
            }
        } catch (error) {
            console.error('Erro ao processar mensagem:', error);
        }
    });

    ws.on('close', () => {
        console.log(`Jogador ${playerId} desconectou`);
        players.delete(playerId);
        broadcast({
            type: 'player_left',
            playerId: playerId
        });
    });
});

function broadcast(message, excludePlayerId = null) {
    players.forEach((player, id) => {
        if (id !== excludePlayerId && player.ws.readyState === WebSocket.OPEN) {
            try {
                player.ws.send(JSON.stringify(message));
            } catch (error) {
                console.error('Erro ao enviar mensagem:', error);
            }
        }
    });
}

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});