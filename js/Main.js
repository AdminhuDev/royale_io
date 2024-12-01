import { Game } from './Game.js';
import { Logger } from './Logger.js';

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
    const gameCanvas = document.getElementById('gameCanvas');
    const gameUI = document.getElementById('game-ui');
    const startButton = document.getElementById('start-game-button');
    const playerNameInput = document.getElementById('player-name-input');
    const tutorialButton = document.getElementById('tutorial-button');
    const tutorialScreen = document.getElementById('tutorial-screen');
    const closeTutorialButton = document.getElementById('close-tutorial');
    const playAgainButton = document.getElementById('play-again');
    const backToMenuButton = document.getElementById('back-to-menu');
    
    let game = null;

    // Carregar nome do jogador salvo
    playerNameInput.value = localStorage.getItem('playerName') || '';

    function startGame() {
        startScreen.style.display = 'none';
        gameCanvas.style.display = 'block';
        gameUI.style.display = 'block';
        
        // Salvar nome do jogador
        if (playerNameInput.value.trim()) {
            localStorage.setItem('playerName', playerNameInput.value.trim());
        }

        game = new Game();
    }

    function backToMenu() {
        if (game) {
            game.destroy();
            game = null;
        }
        
        // Atualizar estatísticas ao voltar ao menu
        updateStats();
        
        gameCanvas.style.display = 'none';
        gameUI.style.display = 'none';
        document.getElementById('game-over').style.display = 'none';
        startScreen.style.display = 'flex';
    }

    startButton.addEventListener('click', startGame);
    playAgainButton.addEventListener('click', startGame);
    backToMenuButton.addEventListener('click', backToMenu);

    tutorialButton.addEventListener('click', () => {
        tutorialScreen.style.display = 'flex';
    });

    closeTutorialButton.addEventListener('click', () => {
        tutorialScreen.style.display = 'none';
    });
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