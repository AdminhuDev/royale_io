import { Game } from './Game.js';
import { Logger } from './Logger.js';

window.DEBUG_MODE = location.hostname === 'localhost';

document.addEventListener('DOMContentLoaded', () => {
    Logger.info('Inicializando aplicação');
    try {
        // Elementos principais
        const canvas = document.getElementById('gameCanvas');
        const startScreen = document.getElementById('start-screen');
        const playerNameInput = document.getElementById('player-name-input');
        const startGameButton = document.getElementById('start-game-button');
        const openSkinsButton = document.getElementById('open-skins-button');
        const tutorialButton = document.getElementById('tutorial-button');
        const tutorialScreen = document.getElementById('tutorial-screen');
        const closeTutorialButton = document.getElementById('close-tutorial');
        const deathChoice = document.getElementById('death-choice');
        const ui = document.getElementById('ui');
        const startScreenScore = document.getElementById('start-screen-score');
        const zoneInfo = document.querySelector('.zone-info');
        
        if (!canvas || !startScreen || !playerNameInput || !startGameButton) {
            throw new Error('Elementos necessários não encontrados');
        }

        // Configuração inicial
        setupInitialState();
        setupEventListeners();
        initializeParticles();

        function setupInitialState() {
            canvas.style.display = 'none';
            startScreen.style.display = 'flex';
            if (deathChoice) deathChoice.style.display = 'none';
            if (ui) ui.style.display = 'none';
            if (zoneInfo) zoneInfo.style.display = 'none';
            if (tutorialScreen) tutorialScreen.style.display = 'none';
            
            // Atualizar texto do waiting screen
            const waitingScreen = document.getElementById('waiting-screen');
            const countdownElement = document.getElementById('countdown');
            if (waitingScreen && countdownElement) {
                countdownElement.textContent = '15'; // Atualizado para 15 segundos
            }
            
            // Carregar dados salvos
            loadSavedData();
        }

        function loadSavedData() {
            const savedScore = localStorage.getItem('playerScore');
            if (savedScore && startScreenScore) {
                startScreenScore.textContent = `Pontuação: ${savedScore}`;
            }
            
            const savedName = localStorage.getItem('playerName');
            if (savedName) {
                playerNameInput.value = savedName;
            }
        }

        function setupEventListeners() {
            // Evento de início de jogo
            startGameButton.addEventListener('click', handleGameStart);
            
            // Eventos de input
            playerNameInput.addEventListener('keypress', handleEnterKey);
            
            // Eventos do tutorial
            if (tutorialButton) {
                tutorialButton.addEventListener('click', () => {
                    tutorialScreen.style.display = 'flex';
                });
            }
            
            if (closeTutorialButton) {
                closeTutorialButton.addEventListener('click', () => {
                    tutorialScreen.style.display = 'none';
                });
            }
            
            // Evento do botão de skins
            if (openSkinsButton) {
                openSkinsButton.addEventListener('click', () => {
                    const skinSelector = document.getElementById('skin-selector');
                    if (skinSelector) {
                        skinSelector.style.display = 'block';
                    }
                });
            }

            // Atalhos de teclado globais
            document.addEventListener('keydown', handleKeyboardShortcuts);
        }

        function handleGameStart() {
            const playerName = playerNameInput.value.trim();
            if (!playerName) {
                Logger.warn('Tentativa de iniciar jogo sem nome');
                showInputError();
                return;
            }

            Logger.info('Iniciando novo jogo', { playerName });
            localStorage.setItem('playerName', playerName);
            
            try {
                cleanupPreviousGame();
                showGameElements();
                createNewGame();

                // Atualizar texto inicial do waiting screen
                const waitingScreen = document.getElementById('waiting-screen');
                if (waitingScreen) {
                    const countdownElement = waitingScreen.querySelector('#countdown');
                    if (countdownElement) {
                        countdownElement.textContent = '15'; // Atualizado para 15 segundos
                    }
                }
            } catch (error) {
                Logger.error('Erro ao iniciar jogo', error);
                handleGameStartError();
            }
        }

        function showInputError() {
            playerNameInput.classList.add('shake');
            setTimeout(() => playerNameInput.classList.remove('shake'), 500);
        }

        function cleanupPreviousGame() {
            if (window.game) {
                Logger.info('Destruindo jogo anterior');
                window.game.destroy();
                window.game = null;
            }
        }

        function showGameElements() {
            startScreen.style.display = 'none';
            canvas.style.display = 'block';
            if (ui) ui.style.display = 'flex';
            if (zoneInfo) zoneInfo.style.display = 'flex';
        }

        function createNewGame() {
            try {
                window.game = new Game();
                Logger.info('Jogo criado com sucesso');
            } catch (error) {
                throw new Error(`Falha ao criar jogo: ${error.message}`);
            }
        }

        function handleGameStartError() {
            alert('Erro ao iniciar o jogo. Por favor, recarregue a página.');
            startScreen.style.display = 'flex';
            canvas.style.display = 'none';
            if (ui) ui.style.display = 'none';
            if (zoneInfo) zoneInfo.style.display = 'none';
        }

        function handleEnterKey(e) {
            if (e.key === 'Enter') {
                startGameButton.click();
            }
        }

        function handleKeyboardShortcuts(e) {
            if (e.key === 'Escape') {
                const tutorialScreen = document.getElementById('tutorial-screen');
                const skinSelector = document.getElementById('skin-selector');
                
                if (tutorialScreen?.style.display === 'flex') {
                    tutorialScreen.style.display = 'none';
                }
                if (skinSelector?.style.display === 'block') {
                    skinSelector.style.display = 'none';
                }
            }
        }

    } catch (error) {
        Logger.error('Erro na inicialização da aplicação', error);
        alert('Erro ao iniciar o jogo. Por favor, recarregue a página.');
    }

    // Configuração das partículas
    initializeParticles();
});

function initializeParticles() {
    particlesJS('particles-js', {
        particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            color: { value: '#0A84FF' },
            shape: { type: 'circle' },
            opacity: {
                value: 0.5,
                random: true,
                animation: {
                    enable: true,
                    speed: 1,
                    opacity_min: 0.1,
                    sync: false
                }
            },
            size: {
                value: 3,
                random: true,
                animation: {
                    enable: true,
                    speed: 2,
                    size_min: 0.1,
                    sync: false
                }
            },
            line_linked: {
                enable: true,
                distance: 150,
                color: '#0A84FF',
                opacity: 0.4,
                width: 1
            },
            move: {
                enable: true,
                speed: 2,
                direction: 'none',
                random: true,
                straight: false,
                out_mode: 'out',
                bounce: false,
            }
        },
        interactivity: {
            detect_on: 'canvas',
            events: {
                onhover: { enable: true, mode: 'grab' },
                onclick: { enable: true, mode: 'push' },
                resize: true
            },
            modes: {
                grab: {
                    distance: 140,
                    line_linked: { opacity: 0.8 }
                },
                push: { particles_nb: 4 }
            }
        },
        retina_detect: true
    });
}

// Funções globais
window.resetGame = () => {
    if (window.game) {
        const elements = {
            deathChoice: document.getElementById('death-choice'),
            startScreen: document.getElementById('start-screen'),
            canvas: document.getElementById('gameCanvas'),
            ui: document.getElementById('ui'),
            zoneInfo: document.querySelector('.zone-info')
        };
        
        // Atualizar visibilidade dos elementos
        Object.entries(elements).forEach(([key, element]) => {
            if (element) {
                element.style.display = 
                    key === 'canvas' ? 'block' :
                    key === 'ui' || key === 'zoneInfo' ? 'flex' : 'none';
            }
        });
        
        window.game.startNewGame();
    }
};

window.cleanupGame = () => {
    if (window.game) {
        try {
            window.game.destroy();
            window.game = null;
            Logger.info('Jogo destruído com sucesso');
        } catch (error) {
            Logger.error('Erro ao destruir jogo', error);
        }
    }
};

window.addEventListener('beforeunload', () => {
    window.cleanupGame();
});
