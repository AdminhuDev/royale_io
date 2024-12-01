import { Game } from './Game.js';
import { Logger } from './Logger.js';

document.addEventListener('DOMContentLoaded', () => {
    try {
        // Elementos da UI
        const canvas = document.getElementById('gameCanvas');
        const startScreen = document.getElementById('start-screen');
        const startButton = document.getElementById('start-game-button');
        const playerNameInput = document.getElementById('player-name-input');
        const waitingScreen = document.getElementById('waiting-screen');
        const gameUI = document.getElementById('game-ui');
        const gameOver = document.getElementById('game-over');
        const playAgainButton = document.getElementById('play-again');
        const backToMenuButton = document.getElementById('back-to-menu');

        if (!canvas || !startScreen || !startButton || !playerNameInput) {
            throw new Error('Elementos essenciais não encontrados');
        }

        // Configurar canvas
        canvas.style.display = 'none';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });

        // Event Listeners
        startButton.addEventListener('click', startNewGame);

        // Botões do Game Over
        if (playAgainButton) {
            playAgainButton.addEventListener('click', () => {
                if (window.game) {
                    window.game.destroy();
                }
                hideAllScreens();
                startNewGame();
            });
        }

        if (backToMenuButton) {
            backToMenuButton.addEventListener('click', () => {
                if (window.game) {
                    window.game.destroy();
                }
                hideAllScreens();
                showStartScreen();
            });
        }

        // Tutorial
        const tutorialButton = document.getElementById('tutorial-button');
        const tutorialScreen = document.getElementById('tutorial-screen');
        const closeTutorialButton = document.getElementById('close-tutorial');

        if (tutorialButton && tutorialScreen && closeTutorialButton) {
            tutorialButton.addEventListener('click', () => {
                tutorialScreen.style.display = 'flex';
            });

            closeTutorialButton.addEventListener('click', () => {
                tutorialScreen.style.display = 'none';
            });
        }

        function hideAllScreens() {
            const screens = [
                gameOver,
                startScreen,
                waitingScreen,
                gameUI,
                canvas
            ];
            
            screens.forEach(screen => {
                if (screen) {
                    screen.style.display = 'none';
                }
            });
        }

        function startNewGame() {
            const playerName = playerNameInput.value.trim();
            if (!playerName) {
                showInputError(playerNameInput);
                return;
            }

            localStorage.setItem('playerName', playerName);
            hideAllScreens();
            waitingScreen.style.display = 'flex';
            
            // Limpar jogo anterior se existir
            if (window.game) {
                // Remover eventos do mouse antigos
                canvas.removeEventListener('mousemove', window.handleMouseMove);
                canvas.removeEventListener('click', window.handleClick);
                window.game = null;
            }
            
            // Criar nova instância do jogo
            window.game = new Game();

            // Adicionar eventos do mouse
            setupMouseEvents(canvas);

            // Iniciar contagem
            startCountdown(3);
        }

        function showStartScreen() {
            hideAllScreens();
            startScreen.style.display = 'flex';
            
            // Limpar jogo se existir
            if (window.game) {
                canvas.removeEventListener('mousemove', window.handleMouseMove);
                canvas.removeEventListener('click', window.handleClick);
                window.game = null;
            }

            // Resetar input do nome se necessário
            if (playerNameInput.value.trim() === '') {
                playerNameInput.value = localStorage.getItem('playerName') || '';
            }
        }

    } catch (error) {
        Logger.error('Erro na inicialização da aplicação', error);
        alert('Erro ao iniciar o jogo. Por favor, recarregue a página.');
    }
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