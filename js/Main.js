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
        
        const preview = document.createElement('div');
        preview.className = 'skin-preview';
        preview.style.backgroundColor = skin.color === 'rainbow' ? '#ff0000' : skin.color;
        
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
                const availablePoints = stats.highScore || 0;
                
                if (availablePoints >= skin.price) {
                    if (confirm(`Deseja comprar a skin ${skin.name} por ${skin.price} pontos?`)) {
                        // Atualizar pontos disponíveis
                        stats.highScore = availablePoints - skin.price;
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
function updateStats() {
    const stats = JSON.parse(localStorage.getItem('gameStats') || '{}');
    
    // Valores padrão caso não existam
    stats.highScore = stats.highScore || 0;
    stats.lastScore = stats.lastScore || 0;
    stats.totalKills = stats.totalKills || 0;
    stats.wins = stats.wins || 0;

    // Atualizar elementos na tela
    document.getElementById('high-score-value').textContent = stats.highScore;
    document.getElementById('last-score-value').textContent = stats.lastScore;
    document.getElementById('total-kills-value').textContent = stats.totalKills;
    document.getElementById('wins-value').textContent = stats.wins;
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