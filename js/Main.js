import { Game } from './Game.js';
import { Logger } from './Logger.js';
import { SkinManager } from './SkinManager.js';

let game = null;
const skinManager = new SkinManager();

function initializeSkins() {
    const skinsGrid = document.getElementById('skins-grid');
    const skins = skinManager.getAllSkins();

    for (const [skinId, skin] of Object.entries(skins)) {
        const skinElement = document.createElement('div');
        skinElement.className = `skin-item ${skin.unlocked ? '' : 'locked'} ${skinManager.currentSkin === skinId ? 'selected' : ''}`;
        
        // Criar canvas para preview da skin
        const preview = document.createElement('canvas');
        preview.className = 'skin-preview';
        preview.width = 100;
        preview.height = 100;
        const ctx = preview.getContext('2d');
        
        // Variável global para o frameCount
        let frameCount = 0;
        
        // Função de animação
        function animate() {
            if (!preview.isConnected) return; // Parar animação se o canvas for removido
            
            ctx.clearRect(0, 0, preview.width, preview.height);
            
            const centerX = preview.width / 2;
            const centerY = preview.height / 2;
            const radius = 20;
            
            // Cor base da skin
            let skinColor = skin.color;
            if (skin.color === 'rainbow') {
                skinColor = `hsl(${(frameCount * 2) % 360}, 100%, 50%)`;
            }
            
            // Efeitos específicos por skin
            switch(skinId) {
                case 'default': // Espírito Lunar
                    // Aura lunar pulsante
                    const lunarPulse = 0.5 + Math.sin(frameCount * 0.05) * 0.3;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 255, 255, ${lunarPulse * 0.2})`;
                    ctx.fill();
                    ctx.closePath();

                    // Estrelas orbitantes
                    for (let i = 0; i < 5; i++) {
                        const angle = (frameCount * 0.02) + (i * Math.PI * 2 / 5);
                        const x = centerX + Math.cos(angle) * (30 + Math.sin(frameCount * 0.05) * 5);
                        const y = centerY + Math.sin(angle) * (30 + Math.sin(frameCount * 0.05) * 5);
                        
                        // Estrela
                        const starSize = 2 + Math.sin(frameCount * 0.1 + i) * 1;
                        ctx.beginPath();
                        ctx.arc(x, y, starSize, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + Math.sin(frameCount * 0.1 + i) * 0.3})`;
                        ctx.fill();
                        ctx.closePath();

                        // Rastro da estrela
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(x - Math.cos(angle) * 5, y - Math.sin(angle) * 5);
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                        ctx.stroke();
                        ctx.closePath();
                    }
                    break;

                case 'red': // Chama Infernal
                    // Aura de fogo
                    const fireGlow = 0.3 + Math.sin(frameCount * 0.1) * 0.1;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 50, 0, ${fireGlow})`;
                    ctx.fill();
                    ctx.closePath();

                    // Partículas de fogo
                    for (let i = 0; i < 8; i++) {
                        const angle = Math.PI * 2 * Math.random();
                        const distance = radius + Math.random() * 20;
                        const x = centerX + Math.cos(angle) * distance;
                        const y = centerY + Math.sin(angle) * distance - Math.random() * 10;
                        
                        // Chama
                        ctx.beginPath();
                        ctx.moveTo(x - 3, y + 6);
                        ctx.quadraticCurveTo(x, y - 6, x + 3, y + 6);
                        ctx.fillStyle = `rgba(255, ${50 + Math.random() * 150}, 0, ${0.5 + Math.random() * 0.5})`;
                        ctx.fill();
                        ctx.closePath();
                    }
                    break;

                case 'blue': // Gelo Eterno
                    // Aura gelada
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius + 12, 0, Math.PI * 2);
                    const iceGradient = ctx.createRadialGradient(
                        centerX, centerY, radius,
                        centerX, centerY, radius + 12
                    );
                    iceGradient.addColorStop(0, 'rgba(100, 200, 255, 0.3)');
                    iceGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
                    ctx.fillStyle = iceGradient;
                    ctx.fill();
                    ctx.closePath();

                    // Cristais de gelo
                    for (let i = 0; i < 6; i++) {
                        const angle = (frameCount * 0.02) + (i * Math.PI * 2 / 6);
                        const x = centerX + Math.cos(angle) * 25;
                        const y = centerY + Math.sin(angle) * 25;

                        ctx.save();
                        ctx.translate(x, y);
                        ctx.rotate(angle + frameCount * 0.02);
                        
                        // Cristal
                        ctx.beginPath();
                        ctx.moveTo(0, -5);
                        ctx.lineTo(3, 0);
                        ctx.lineTo(0, 5);
                        ctx.lineTo(-3, 0);
                        ctx.closePath();
                        ctx.fillStyle = `rgba(150, 220, 255, ${0.6 + Math.sin(frameCount * 0.1) * 0.2})`;
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                        ctx.stroke();
                        
                        ctx.restore();
                    }
                    break;

                case 'green': // Veneno Ancestral
                    // Aura tóxica
                    const toxicPulse = 0.3 + Math.sin(frameCount * 0.05) * 0.1;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius + 15, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(0, 255, 0, ${toxicPulse})`;
                    ctx.fill();
                    ctx.closePath();

                    // Bolhas de veneno
                    for (let i = 0; i < 12; i++) {
                        const time = frameCount * 0.05 + i;
                        const angle = time + (i * Math.PI * 2 / 12);
                        const distance = 20 + Math.sin(time * 0.5) * 10;
                        const x = centerX + Math.cos(angle) * distance;
                        const y = centerY + Math.sin(angle) * distance;
                        
                        // Bolha
                        const bubbleSize = 2 + Math.sin(time) * 1;
                        ctx.beginPath();
                        ctx.arc(x, y, bubbleSize, 0, Math.PI * 2);
                        const gradient = ctx.createRadialGradient(x, y, 0, x, y, bubbleSize);
                        gradient.addColorStop(0, 'rgba(150, 255, 150, 0.8)');
                        gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
                        ctx.fillStyle = gradient;
                        ctx.fill();
                        ctx.closePath();
                    }
                    break;

                case 'gold': // Relíquia Sagrada
                    // Aura divina
                    const divineGlow = 0.4 + Math.sin(frameCount * 0.05) * 0.2;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
                    const divineGradient = ctx.createRadialGradient(
                        centerX, centerY, radius,
                        centerX, centerY, radius + 10
                    );
                    divineGradient.addColorStop(0, `rgba(255, 215, 0, ${divineGlow})`);
                    divineGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
                    ctx.fillStyle = divineGradient;
                    ctx.fill();
                    ctx.closePath();

                    // Símbolos sagrados
                    for (let i = 0; i < 4; i++) {
                        const angle = (frameCount * 0.02) + (i * Math.PI / 2);
                        const x = centerX + Math.cos(angle) * 30;
                        const y = centerY + Math.sin(angle) * 30;

                        ctx.save();
                        ctx.translate(x, y);
                        ctx.rotate(angle);
                        
                        // Símbolo
                        ctx.beginPath();
                        ctx.moveTo(-5, -5);
                        ctx.lineTo(5, -5);
                        ctx.lineTo(0, 5);
                        ctx.closePath();
                        ctx.fillStyle = `rgba(255, 215, 0, ${0.7 + Math.sin(frameCount * 0.1) * 0.3})`;
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                        ctx.stroke();
                        
                        ctx.restore();
                    }
                    break;

                case 'rainbow': // Prisma Dimensional
                    // Aura dimensional
                    for (let i = 0; i < 360; i += 30) {
                        const hue = (i + frameCount * 2) % 360;
                        const angle = (i * Math.PI / 180);
                        const distance = radius + 10 + Math.sin(frameCount * 0.05) * 5;
                        
                        ctx.beginPath();
                        ctx.moveTo(centerX, centerY);
                        ctx.lineTo(
                            centerX + Math.cos(angle) * distance,
                            centerY + Math.sin(angle) * distance
                        );
                        ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.3)`;
                        ctx.lineWidth = 2;
                        ctx.stroke();
                        ctx.closePath();
                    }

                    // Partículas dimensionais
                    for (let i = 0; i < 8; i++) {
                        const time = frameCount * 0.05 + i;
                        const angle = time + (i * Math.PI * 2 / 8);
                        const distance = 25 + Math.sin(time) * 10;
                        const x = centerX + Math.cos(angle) * distance;
                        const y = centerY + Math.sin(angle) * distance;
                        const hue = (frameCount * 2 + i * 45) % 360;
                        
                        // Partícula
                        ctx.beginPath();
                        ctx.arc(x, y, 3, 0, Math.PI * 2);
                        const particleGradient = ctx.createRadialGradient(x, y, 0, x, y, 3);
                        particleGradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.8)`);
                        particleGradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
                        ctx.fillStyle = particleGradient;
                        ctx.fill();
                        ctx.closePath();

                        // Rastro dimensional
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(
                            x - Math.cos(angle) * 8,
                            y - Math.sin(angle) * 8
                        );
                        ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.3)`;
                        ctx.lineWidth = 2;
                        ctx.stroke();
                        ctx.closePath();
                    }
                    break;
            }

            // Desenhar o jogador
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fillStyle = skinColor;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();

            frameCount++;
            requestAnimationFrame(animate);
        }

        // Iniciar animação
        requestAnimationFrame(animate);
        
        const name = document.createElement('div');
        name.className = 'skin-name';
        name.textContent = skin.name;
        
        const price = document.createElement('div');
        price.className = 'skin-price';
        price.textContent = skin.price > 0 ? `${skin.price} pontos` : 'Grátis';
        
        skinElement.appendChild(preview);
        skinElement.appendChild(name);
        skinElement.appendChild(price);
        
        skinElement.addEventListener('click', () => {
            if (skin.unlocked) {
                // Remover seleção anterior
                const selected = skinsGrid.querySelector('.selected');
                if (selected) selected.classList.remove('selected');
                
                // Selecionar nova skin
                skinElement.classList.add('selected');
                skinManager.selectSkin(skinId);
            } else {
                // Verificar se tem pontos suficientes
                const stats = JSON.parse(localStorage.getItem('gameStats') || '{}');
                const availablePoints = stats.totalPoints || 0;
                
                if (availablePoints >= skin.price) {
                    if (confirm(`Deseja comprar a skin ${skin.name} por ${skin.price} pontos?`)) {
                        // Atualizar pontos disponíveis
                        stats.totalPoints = availablePoints - skin.price;
                        localStorage.setItem('gameStats', JSON.stringify(stats));
                        
                        // Desbloquear skin
                        skinManager.unlockSkin(skinId);
                        skinElement.classList.remove('locked');
                        
                        // Atualizar interface
                        updateStats();
                    }
                } else {
                    alert(`Você precisa de ${skin.price} pontos para comprar esta skin! (Você tem ${availablePoints} pontos)`);
                }
            }
        });
        
        skinsGrid.appendChild(skinElement);
    }
}

// Carregar e mostrar estatísticas
export function updateStats() {
    const stats = JSON.parse(localStorage.getItem('gameStats') || '{}');
    
    // Valores padrão caso não existam
    stats.highScore = stats.highScore || 0;
    stats.lastScore = stats.lastScore || 0;
    stats.totalKills = stats.totalKills || 0;
    stats.wins = stats.wins || 0;
    stats.totalPoints = stats.totalPoints || 0;

    // Atualizar elementos na tela
    document.getElementById('high-score-value').textContent = stats.highScore;
    document.getElementById('last-score-value').textContent = stats.lastScore;
    document.getElementById('total-kills-value').textContent = stats.totalKills;
    document.getElementById('wins-value').textContent = stats.wins;
    document.getElementById('total-points-value').textContent = stats.totalPoints;
}

document.addEventListener('DOMContentLoaded', () => {
    // Atualizar estatísticas ao carregar a página
    updateStats();

    const startScreen = document.getElementById('start-screen');
    const waitingScreen = document.getElementById('waiting-screen');
    const gameCanvas = document.getElementById('gameCanvas');
    const gameUI = document.getElementById('game-ui');
    const startButton = document.getElementById('start-game-button');
    const playerNameInput = document.getElementById('player-name-input');
    const tutorialButton = document.getElementById('tutorial-button');
    const tutorialScreen = document.getElementById('tutorial-screen');
    const closeTutorialButton = document.getElementById('close-tutorial');
    const playAgainButton = document.getElementById('play-again');
    const backToMenuButton = document.getElementById('back-to-menu');
    const countdownElement = document.getElementById('countdown');
    
    let game = null;

    // Carregar nome do jogador salvo
    playerNameInput.value = localStorage.getItem('playerName') || '';

    function startCountdown() {
        let count = 5; // 5 segundos de contagem regressiva
        countdownElement.textContent = count;
        
        const interval = setInterval(() => {
            count--;
            countdownElement.textContent = count;
            
            if (count <= 0) {
                clearInterval(interval);
                startGame();
            }
        }, 1000);
    }

    function showWaitingScreen() {
        // Destruir jogo anterior se existir
        if (game) {
            game.destroy();
            game = null;
        }

        // Esconder todas as outras telas
        startScreen.style.display = 'none';
        gameCanvas.style.display = 'none';
        gameUI.style.display = 'none';
        document.getElementById('game-over').style.display = 'none';
        
        // Mostrar tela de espera
        waitingScreen.style.display = 'flex';
        startCountdown();
    }

    function startGame() {
        // Destruir jogo anterior se existir
        if (game) {
            game.destroy();
            game = null;
        }

        // Esconder todas as outras telas
        startScreen.style.display = 'none';
        waitingScreen.style.display = 'none';
        document.getElementById('game-over').style.display = 'none';
        
        // Mostrar tela do jogo
        gameCanvas.style.display = 'block';
        gameUI.style.display = 'block';
        
        // Salvar nome do jogador
        if (playerNameInput.value.trim()) {
            localStorage.setItem('playerName', playerNameInput.value.trim());
        }

        // Criar novo jogo
        game = new Game();
    }

    function backToMenu() {
        if (game) {
            game.destroy();
            game = null;
        }
        
        // Atualizar estatísticas ao voltar ao menu
        updateStats();
        
        // Esconder todas as outras telas
        gameCanvas.style.display = 'none';
        gameUI.style.display = 'none';
        waitingScreen.style.display = 'none';
        document.getElementById('game-over').style.display = 'none';
        
        // Mostrar menu inicial
        startScreen.style.display = 'flex';
    }

    startButton.addEventListener('click', () => {
        // Verificar se o nome foi preenchido
        if (!playerNameInput.value.trim()) {
            playerNameInput.style.borderColor = 'red';
            return;
        }
        playerNameInput.style.borderColor = '';
        showWaitingScreen();
    });

    playAgainButton.addEventListener('click', showWaitingScreen);
    backToMenuButton.addEventListener('click', backToMenu);

    tutorialButton.addEventListener('click', () => {
        tutorialScreen.style.display = 'flex';
    });

    closeTutorialButton.addEventListener('click', () => {
        tutorialScreen.style.display = 'none';
    });

    const skinsButton = document.getElementById('skins-button');
    const skinsPopup = document.getElementById('skins-popup');
    const closeSkinsButton = document.getElementById('close-skins');

    // Abrir popup de skins
    skinsButton.addEventListener('click', () => {
        skinsPopup.classList.add('show');
    });

    // Fechar popup de skins
    closeSkinsButton.addEventListener('click', () => {
        skinsPopup.classList.remove('show');
    });

    // Fechar popup ao clicar fora
    skinsPopup.addEventListener('click', (e) => {
        if (e.target === skinsPopup) {
            skinsPopup.classList.remove('show');
        }
    });

    // Inicializar skins
    initializeSkins();
});

function setupMouseEvents(canvas) {
    window.handleMouseMove = function(e) {
        if (!window.game || !window.game.camera) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const screenX = (e.clientX - rect.left) * scaleX;
        const screenY = (e.clientY - rect.top) * scaleY;
        
        const worldPos = window.game.camera.screenToWorld(screenX, screenY);
        window.game.mouseX = worldPos.x;
        window.game.mouseY = worldPos.y;
    };

    window.handleClick = function(e) {
        if (window.game && window.game.localPlayer && window.game.localPlayer.health > 0) {
            window.game.shoot();
        }
    };

    canvas.addEventListener('mousemove', window.handleMouseMove);
    canvas.addEventListener('click', window.handleClick);
}

function showInputError(input) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 500);
}

function startCountdown(seconds) {
    const countdownElement = document.getElementById('countdown');
    if (!countdownElement) return;

    let timeLeft = seconds;
    countdownElement.textContent = timeLeft;

    const countdownInterval = setInterval(() => {
        timeLeft--;
        countdownElement.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            startGame();
        }
    }, 1000);
}

function startGame() {
    const waitingScreen = document.getElementById('waiting-screen');
    const gameUI = document.getElementById('game-ui');
    const canvas = document.getElementById('gameCanvas');

    if (waitingScreen) waitingScreen.style.display = 'none';
    if (gameUI) gameUI.style.display = 'flex';
    if (canvas) canvas.style.display = 'block';
}