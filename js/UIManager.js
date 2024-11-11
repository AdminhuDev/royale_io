import { Skins } from './Skins.js';

export class UIManager {
    constructor(game) {
        if (!game) {
            // Inicializar apenas o seletor de skins se não houver jogo
            this.setupSkinSelector();
            return;
        }
        this.game = game;
        this.initializeElements();
        this.setupSkinSelector();
        this.setupHealthBar();
        this.setupAmmoBar();
        this.setupKeyboardShortcuts();
        this.setupTooltips();

        // Atualizar pontuação inicial
        if (game.player) {
            this.updateScore(game.player.score);
        }

        // Iniciar timestamp para o tempo de jogo
        this.gameStartTime = Date.now();

        // Performance monitoring
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.fps = 0;
        this.ping = 0;
        
        // Atualizar FPS a cada segundo
        this.fpsUpdateInterval = setInterval(() => {
            const now = performance.now();
            const elapsed = now - this.lastFrameTime;
            this.fps = Math.round((this.frameCount * 1000) / elapsed);
            this.frameCount = 0;
            this.lastFrameTime = now;
            this.updatePerformanceStats();
        }, 1000);
    }

    initializeElements() {
        this.healthElement = document.getElementById('health');
        this.healthFill = document.getElementById('health-fill');
        this.ammoElement = document.getElementById('ammo-count');
        this.ammoFill = document.getElementById('ammo-fill');
        this.playersAliveTopElement = document.getElementById('players-alive-top');
        this.scoreElement = document.getElementById('score');
        this.shieldStatus = document.getElementById('shield-status');
        this.shieldProgress = document.getElementById('shield-progress')?.querySelector('div');
        this.shieldContainer = document.getElementById('shield-container');
        this.medkitStatus = document.getElementById('medkit-status');
        this.medkitProgress = document.getElementById('medkit-progress')?.querySelector('div');
        this.medkitContainer = document.getElementById('medkit-container');
        this.backButton = document.querySelector('.back-button');
        this.deathScore = document.getElementById('death-score');
        this.deathTime = document.getElementById('death-time');
        this.waitingScreen = document.getElementById('waiting-screen');

        if (this.backButton) {
            this.backButton.onclick = () => {
                this.showStartScreen();
                this.hideGameOver();
            };
        }
    }

    setupHealthBar() {
        if (this.healthFill) {
            this.updateHealth(100); // Valor inicial
        }
    }

    setupAmmoBar() {
        if (this.ammoFill) {
            this.updateAmmo(30); // Valor inicial
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyE') {
                this.showKeyPressEffect('medkit-container');
            } else if (e.code === 'Space') {
                this.showKeyPressEffect('shield-container');
            }
        });
    }

    showKeyPressEffect(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('key-press');
            setTimeout(() => element.classList.remove('key-press'), 200);
        }
    }

    setupTooltips() {
        const tooltips = document.querySelectorAll('[data-tooltip]');
        tooltips.forEach(element => {
            element.addEventListener('mouseenter', this.showTooltip.bind(this));
            element.addEventListener('mouseleave', this.hideTooltip.bind(this));
        });
    }

    showTooltip(event) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = event.target.dataset.tooltip;
        document.body.appendChild(tooltip);

        const rect = event.target.getBoundingClientRect();
        tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
    }

    hideTooltip() {
        const tooltips = document.querySelectorAll('.tooltip');
        tooltips.forEach(tooltip => tooltip.remove());
    }

    updateHealth(health) {
        if (this.healthElement) {
            this.healthElement.textContent = Math.round(health);
            
            // Feedback visual quando a vida está baixa
            if (health <= 25) {
                this.healthElement.style.color = '#FF453A';
                this.healthElement.classList.add('pulse-warning');
                document.body.classList.add('low-health-effect');
            } else {
                this.healthElement.style.color = '#FFFFFF';
                this.healthElement.classList.remove('pulse-warning');
                document.body.classList.remove('low-health-effect');
            }
        }

        // Se a vida chegar a 0, mostrar game over
        if (health <= 0 && this.game.player.isAlive) {
            this.game.player.isAlive = false;
            this.showGameOver('SE FODEU!', true);
        }
    }

    updateAmmo(ammo) {
        if (this.ammoElement) {
            this.ammoElement.textContent = ammo;
            
            // Feedback visual baseado na munição
            if (ammo <= 5) {
                this.ammoElement.style.color = '#FF453A';
                this.ammoElement.classList.add('pulse-warning');
            } else if (ammo <= 10) {
                this.ammoElement.style.color = '#FFD60A';
                this.ammoElement.classList.remove('pulse-warning');
            } else {
                this.ammoElement.style.color = '#FFFFFF';
                this.ammoElement.classList.remove('pulse-warning');
            }
        }
    }

    pulseElement(element) {
        element.classList.remove('pulse');
        void element.offsetWidth; // Forçar reflow
        element.classList.add('pulse');
    }

    showGameOver(message, canSpectate = false) {
        // Evitar múltiplas chamadas
        if (this._showingGameOver || !this.game?.player) return;
        this._showingGameOver = true;

        if (!this.game.spectatorMode) {
            // Esconder elementos do jogo primeiro
            this.hideGameElements();
            
            const deathChoice = document.getElementById('death-choice');
            const deathMessage = document.getElementById('death-message');
            
            if (deathChoice && deathMessage) {
                // Mostrar tela de morte
                deathChoice.style.display = 'flex';
                deathMessage.textContent = message.includes('VITÓRIA') ? 'VITÓRIA ROYALE!' : 'SE FODEU!';
                deathMessage.style.color = message.includes('VITÓRIA') ? '#32D74B' : '#FF453A';
                
                // Atualizar estatísticas
                const gameTime = this.formatGameTime(Date.now() - this.gameStartTime);
                if (this.deathScore) {
                    this.deathScore.textContent = this.game.player.score;
                }
                if (this.deathTime) {
                    this.deathTime.textContent = gameTime;
                }

                // Configurar botões
                const spectateButton = document.getElementById('spectate-button');
                const backButton = document.getElementById('back-button');

                if (spectateButton) {
                    spectateButton.style.display = canSpectate ? 'block' : 'none';
                    spectateButton.onclick = () => {
                        deathChoice.style.display = 'none';
                        this._showingGameOver = false;
                        this.game.startSpectating();
                    };
                }

                if (backButton) {
                    backButton.onclick = () => {
                        deathChoice.style.display = 'none';
                        this._showingGameOver = false;
                        this.showStartScreen();
                    };
                }

                // Adicionar efeito de shake para morte
                if (!message.includes('VITÓRIA')) {
                    deathChoice.classList.add('shake-effect');
                    setTimeout(() => deathChoice.classList.remove('shake-effect'), 500);
                }
            }
        }
    }

    formatGameTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        // Garantir que os segundos sempre tenham dois dígitos
        const formattedSeconds = seconds.toString().padStart(2, '0');
        
        // Retornar no formato M:SS
        return `${minutes}:${formattedSeconds}`;
    }

    showTemporaryMessage(message, type = 'info') {
        const messageElement = document.createElement('div');
        messageElement.className = `game-message ${type}`;
        messageElement.textContent = message;
        messageElement.style.animation = 'fadeInOut 2s ease-in-out';
        document.body.appendChild(messageElement);
        
        setTimeout(() => messageElement.remove(), 2000);
    }

    // Gerenciamento de Skins
    setupSkinSelector() {
        const skinSelector = document.getElementById('skin-selector');
        if (!skinSelector) return;

        // Limpar conteúdo anterior
        skinSelector.innerHTML = '';

        // Adicionar header
        const header = document.createElement('div');
        header.className = 'skin-header';
        header.innerHTML = `
            <span class="header-label">SKINS DISPONÍVEIS</span>
            <button class="close-button" aria-label="Fechar">&times;</button>
        `;
        skinSelector.appendChild(header);

        // Configurar botão de fechar
        const closeButton = header.querySelector('.close-button');
        closeButton.onclick = () => skinSelector.style.display = 'none';

        // Criar grid de skins
        const skinGrid = document.createElement('div');
        skinGrid.className = 'skin-grid';

        // Carregar skins salvas
        Skins.loadUnlockedSkins();
        const currentSkin = localStorage.getItem('currentSkin') || 'default';
        const currentScore = parseInt(localStorage.getItem('playerScore')) || 0;

        // Iterar sobre todas as skins
        Object.entries(Skins.PLAYER_SKINS).forEach(([key, skin]) => {
            const skinOption = document.createElement('div');
            skinOption.className = `skin-option ${skin.unlocked ? '' : 'locked'}`;
            
            if (!skin.unlocked) {
                skinOption.setAttribute('data-tooltip', `Necessário ${skin.price} pontos para desbloquear`);
            }

            if (key === currentSkin) {
                skinOption.classList.add('selected');
            }

            // Preview da skin
            const preview = document.createElement('div');
            preview.className = 'skin-preview';
            preview.style.backgroundColor = skin.color || '#ffffff';
            
            if (skin.glowEffect) {
                preview.style.boxShadow = `0 0 15px ${skin.glowEffect.color}`;
            }
            if (skin.colorCycle) {
                preview.style.animation = 'colorCycle 5s linear infinite';
            }

            // Informações da skin
            const info = document.createElement('div');
            info.className = 'skin-info';
            info.innerHTML = `
                <div class="skin-name">${skin.name}</div>
                ${!skin.unlocked ? `<div class="skin-price">${skin.price} pts</div>` : ''}
            `;

            skinOption.appendChild(preview);
            skinOption.appendChild(info);

            // Eventos de clique
            if (skin.unlocked) {
                skinOption.onclick = () => {
                    localStorage.setItem('currentSkin', key);
                    document.querySelectorAll('.skin-option').forEach(opt => opt.classList.remove('selected'));
                    skinOption.classList.add('selected');
                    
                    if (this.game?.player) {
                        this.game.player.setSkin(key);
                    }
                };
            } else {
                skinOption.onclick = () => {
                    if (currentScore >= skin.price) {
                        // Desbloquear skin
                        skin.unlocked = true;
                        Skins.saveUnlockedSkins();
                        localStorage.setItem('playerScore', (currentScore - skin.price).toString());
                        
                        // Recarregar seletor
                        this.setupSkinSelector();
                    } else {
                        // Mostrar mensagem de pontos insuficientes
                        this.showInsufficientPointsMessage(skin.price - currentScore);
                    }
                };
            }

            skinGrid.appendChild(skinOption);
        });

        skinSelector.appendChild(skinGrid);

        // Configurar evento para abrir o seletor
        const openSkinsButton = document.getElementById('open-skins-button');
        if (openSkinsButton) {
            openSkinsButton.onclick = () => {
                skinSelector.style.display = 'block';
            };
        }
    }

    createSkinOption(key, skin) {
        const skinOption = document.createElement('div');
        skinOption.className = `skin-option ${skin.unlocked ? '' : 'locked'}`;
        
        if (!skin.unlocked) {
            skinOption.setAttribute('data-tooltip', `Necessrio ${skin.price} pontos para desbloquear`);
        }
        
        if (key === this.game?.player?.currentSkin) {
            skinOption.classList.add('selected');
        }

        const preview = document.createElement('div');
        preview.className = 'skin-preview';
        preview.style.backgroundColor = skin.color || '#ffffff';
        
        if (skin.glowEffect) {
            preview.style.boxShadow = `0 0 15px ${skin.glowEffect.color}`;
        }
        if (skin.colorCycle) {
            preview.style.animation = 'colorCycle 5s linear infinite';
        }

        const info = document.createElement('div');
        info.className = 'skin-info';
        info.innerHTML = `
            <div class="skin-name">${skin.name}</div>
            ${!skin.unlocked ? `<div class="skin-price">${skin.price} pts</div>` : ''}
        `;

        skinOption.appendChild(preview);
        skinOption.appendChild(info);
        
        if (skin.unlocked) {
            skinOption.onclick = () => this.selectSkin(key, skinOption);
        } else {
            skinOption.onclick = () => this.tryUnlockSkin(key);
        }
            
        return skinOption;
    }

    selectSkin(key, skinOption) {
        if (this.game?.player) {
            document.querySelectorAll('.skin-option').forEach(option => {
                option.classList.remove('selected');
            });
            skinOption.classList.add('selected');
            
            // Adicionar animação de seleção
            skinOption.classList.add('select-animation');
            setTimeout(() => skinOption.classList.remove('select-animation'), 1000);
            
            this.game.player.setSkin(key);
            
            // Feedback visual
            this.showTemporaryMessage(`Skin ${Skins.PLAYER_SKINS[key].name} selecionada!`, 'success');
        }
    }

    tryUnlockSkin(skinKey) {
        if (!this.game?.player) return;

        const skin = Skins.PLAYER_SKINS[skinKey];
        if (!skin) return;

        if (this.game.player.score >= skin.price) {
            this.unlockSkin(skin);
        } else {
            this.showInsufficientPointsMessage(skin.price - this.game.player.score);
        }
    }

    unlockSkin(skin) {
        this.game.player.score -= skin.price;
        localStorage.setItem('playerScore', this.game.player.score.toString());
        skin.unlocked = true;
        Skins.saveUnlockedSkins();
        this.updateScore(this.game.player.score);
        this.setupSkinSelector();
        this.showUnlockMessage(skin.name);
    }

    // Mensagens de Feedback
    showUnlockMessage(skinName) {
        const message = document.createElement('div');
        message.className = 'unlock-message success';
        message.innerHTML = `
            <span class="icon">✨</span>
            <span class="text">Skin ${skinName} desbloqueada!</span>
        `;
        document.body.appendChild(message);
        
        message.style.animation = 'slideIn 0.3s ease-out, fadeOut 0.3s ease-in 1.7s';
        setTimeout(() => message.remove(), 2000);
    }

    showInsufficientPointsMessage(missing) {
        const message = document.createElement('div');
        message.className = 'unlock-message error';
        message.innerHTML = `
            <span class="icon">❌</span>
            <span class="text">Faltam ${missing} pontos para desbloquear esta skin</span>
        `;
        document.body.appendChild(message);
        
        message.style.animation = 'slideIn 0.3s ease-out, fadeOut 0.3s ease-in 1.7s';
        setTimeout(() => message.remove(), 2000);
    }

    // Atualizaçes de UI
    updatePlayersAlive(count) {
        if (this.playersAliveTopElement) {
            this.playersAliveTopElement.textContent = `JOGADORES: ${count}`;
        }
    }

    formatScore(score) {
        if (score >= 1000000000) { // 1 bilhão
            return Math.floor(score / 1000000000) + 'kkk';
        }
        if (score >= 1000000) { // 1 milhão
            return Math.floor(score / 1000000) + 'kk';
        }
        if (score >= 1000) { // 1 mil
            return Math.floor(score / 1000) + 'k';
        }
        return score.toString();
    }

    updateScore(score) {
        if (this.scoreElement) {
            this.scoreElement.textContent = this.formatScore(score);
        }
    }

    updateShield(player) {
        if (!this.shieldStatus || !this.shieldProgress || !this.shieldContainer) return;

        const shieldDiv = this.shieldProgress.querySelector('div');
        if (!shieldDiv) return;

        if (player?.shield?.active) {
            const timeLeft = player.shield.duration - (Date.now() - player.shield.startTime);
            const progress = Math.max(0, (timeLeft / player.shield.duration) * 100);
            
            this.shieldStatus.textContent = 'ATIVO';
            requestAnimationFrame(() => {
                shieldDiv.style.height = `${progress}%`;
            });
            this.shieldContainer.classList.add('shield-active');
            this.shieldContainer.classList.remove('shield-cooldown');
        } else if (player?.shield?.cooldown) {
            const cooldownLeft = player.shield.cooldownTime - (Date.now() - player.shield.cooldownStartTime);
            const progress = Math.max(0, (cooldownLeft / player.shield.cooldownTime) * 100);
            
            this.shieldStatus.textContent = 'RECARREGANDO';
            requestAnimationFrame(() => {
                shieldDiv.style.height = `${progress}%`;
            });
            this.shieldContainer.classList.add('shield-cooldown');
            this.shieldContainer.classList.remove('shield-active');
        } else {
            this.shieldStatus.textContent = 'ESCUDO';
            requestAnimationFrame(() => {
                shieldDiv.style.height = '100%';
            });
            this.shieldContainer.classList.remove('shield-active', 'shield-cooldown');
        }
    }

    updateMedkit(player) {
        if (!this.medkitStatus || !this.medkitProgress || !this.medkitContainer || !player?.medkits) return;

        const medkitDiv = this.medkitProgress.querySelector('div');
        if (!medkitDiv) return;

        if (player.medkits.active) {
            const timeLeft = player.medkits.duration - (Date.now() - player.medkits.startTime);
            const progress = Math.max(0, (timeLeft / player.medkits.duration) * 100);
            
            this.medkitStatus.textContent = 'CURANDO';
            requestAnimationFrame(() => {
                medkitDiv.style.height = `${progress}%`;
            });
            this.medkitContainer.classList.add('healing-active');
            this.medkitContainer.classList.remove('healing-cooldown');
        } else if (player.medkits.cooldown) {
            const cooldownLeft = player.medkits.cooldownTime - (Date.now() - player.medkits.cooldownStartTime);
            const progress = Math.max(0, (cooldownLeft / player.medkits.cooldownTime) * 100);
            
            this.medkitStatus.textContent = 'RECARREGANDO';
            requestAnimationFrame(() => {
                medkitDiv.style.height = `${progress}%`;
            });
            this.medkitContainer.classList.add('healing-cooldown');
            this.medkitContainer.classList.remove('healing-active');
        } else {
            this.medkitStatus.textContent = `MEDKIT (${player.medkits.count})`;
            requestAnimationFrame(() => {
                medkitDiv.style.height = '100%';
            });
            this.medkitContainer.classList.remove('healing-active', 'healing-cooldown');
        }
    }

    // Gerenciamento de Estado do Jogo
    reset() {
        this.updateHealth(100);
        this.updateAmmo(30);
        this.updatePlayersAlive(this.game.TOTAL_PLAYERS);
        this.updateScore(this.game.player?.score || 0);
        
        this.resetShieldUI();
        this.resetMedkitUI();
        
        const elements = {
            canvas: document.getElementById('gameCanvas'),
            playerUI: document.querySelector('.player-ui'),
            startScreen: document.getElementById('start-screen'),
            zoneInfo: document.querySelector('.zone-info')
        };
        
        Object.entries(elements).forEach(([key, element]) => {
            if (element) {
                element.style.display = key === 'startScreen' ? 'none' : 
                    key === 'playerUI' || key === 'zoneInfo' ? 'flex' : 'block';
            }
        });
    }

    resetShieldUI() {
        if (this.shieldProgress) this.shieldProgress.style.width = '100%';
        if (this.shieldStatus) this.shieldStatus.textContent = 'ESCUDO';
        if (this.shieldContainer) {
            this.shieldContainer.classList.remove('shield-active', 'shield-cooldown');
        }
    }

    resetMedkitUI() {
        if (this.medkitProgress) this.medkitProgress.style.width = '100%';
        if (this.medkitStatus) this.medkitStatus.textContent = 'MEDKIT (3)';
        if (this.medkitContainer) {
            this.medkitContainer.classList.remove('healing-active', 'healing-cooldown');
        }
    }

    showGameOver(message, canSpectate = false) {
        if (!this.game.spectatorMode) {
            console.log('Mostrando tela de game over:', message); // Log de debug
            
            // Esconder elementos do jogo primeiro
            this.hideGameElements();
            
            if (!canSpectate || this.game.playersAlive <= 1) {
                this.showStartScreen();
                this.showTemporaryMessage(message);
            } else {
                this.showSpectateOptions(message);
            }
        }
    }

    hideGameElements() {
        const elements = [
            document.getElementById('gameCanvas'),
            document.querySelector('.player-ui'),
            document.querySelector('.zone-info')
        ];

        elements.forEach(element => {
            if (element) {
                element.style.display = 'none';
            }
        });
    }

    showStartScreen() {
        const startScreen = document.getElementById('start-screen');
        
        this.hideGameElements();
        
        if (startScreen) {
            startScreen.style.display = 'flex';
            const startScreenScore = document.getElementById('start-screen-score');
            if (startScreenScore && this.game?.player) {
                startScreenScore.textContent = `Pontuação: ${this.game.player.score}`;
                startScreenScore.classList.add('highlight-score');
            }
        }
    }

    showSpectateOptions(message) {
        const deathScreen = document.querySelector('.death-screen');
        if (!deathScreen) return;

        this.hideGameElements();
        deathScreen.style.display = 'flex';
        
        const messageElement = deathScreen.querySelector('.death-message');
        if (messageElement) messageElement.textContent = message;
        
        const spectateButton = deathScreen.querySelector('.spectate-button');
        if (spectateButton) {
            spectateButton.style.display = 'block';
            spectateButton.onclick = () => {
                this.hideGameOver();
                this.game.startSpectating();
            };
        }
        
        const backButton = deathScreen.querySelector('.back-button');
        if (backButton) {
            backButton.style.display = 'block';
            backButton.onclick = () => {
                this.showStartScreen();
                this.hideGameOver();
            };
        }
    }

    destroy() {
        // Limpar event listeners
        document.removeEventListener('keydown', this.handleKeyboardShortcuts);
        
        // Limpar elementos
        const elements = [
            'healthElement', 'ammoElement', 'playersAliveTopElement', 
            'scoreElement', 'shieldStatus', 'shieldProgress', 
            'shieldContainer', 'medkitStatus', 'medkitProgress', 
            'medkitContainer', 'game'
        ];
        
        elements.forEach(prop => this[prop] = null);
        
        // Limpar tooltips
        document.querySelectorAll('.tooltip').forEach(tooltip => tooltip.remove());
        if (this.fpsUpdateInterval) {
            clearInterval(this.fpsUpdateInterval);
            this.fpsUpdateInterval = null;
        }
    }

    // Adicionar novos métodos para melhor feedback visual
    showAbilityFeedback(type) {
        const container = type === 'shield' ? this.shieldContainer : this.medkitContainer;
        if (!container) return;

        // Efeito visual de uso
        container.classList.add('ability-active');
        this.createAbilityParticles(container, type);
        
        setTimeout(() => container.classList.remove('ability-active'), 300);
    }

    createAbilityParticles(container, type) {
        const rect = container.getBoundingClientRect();
        const particleCount = 8;
        const colors = type === 'shield' ? 
            ['#0A84FF', '#30B8FF', '#00fff2'] : 
            ['#ff69b4', '#ff1493', '#ff4d94'];

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'ability-particle';
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            
            // Posição inicial
            particle.style.left = rect.left + rect.width/2 + 'px';
            particle.style.top = rect.top + rect.height/2 + 'px';
            
            // Movimento aleatório
            const angle = (Math.PI * 2 * i) / particleCount;
            const velocity = 2 + Math.random() * 2;
            particle.style.setProperty('--tx', `${Math.cos(angle) * 50}px`);
            particle.style.setProperty('--ty', `${Math.sin(angle) * 50}px`);
            
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 1000);
        }
    }

    showPickupFeedback(type, amount) {
        const message = document.createElement('div');
        message.className = 'pickup-feedback';
        
        const icon = type === 'health' ? '❤️' : 
                    type === 'ammo' ? '🔫' : '🛡️';
        
        message.innerHTML = `
            <span class="pickup-icon">${icon}</span>
            <span class="pickup-amount">+${amount}</span>
        `;
        
        document.body.appendChild(message);
        
        // Animar e remover
        requestAnimationFrame(() => {
            message.style.transform = 'translateY(-50px) scale(0.8)';
            message.style.opacity = '0';
        });
        
        setTimeout(() => message.remove(), 1000);
    }

    showVictoryEffects() {
        // Criar fogos de artifício
        for (let i = 0; i < 10; i++) {
            setTimeout(() => this.createFirework(), i * 300);
        }
    }

    showDefeatEffects() {
        document.body.classList.add('defeat-effect');
        setTimeout(() => document.body.classList.remove('defeat-effect'), 1000);
    }

    createFirework() {
        const firework = document.createElement('div');
        firework.className = 'firework';
        
        // Posição aleatória
        firework.style.left = Math.random() * window.innerWidth + 'px';
        firework.style.top = Math.random() * (window.innerHeight/2) + 'px';
        
        document.body.appendChild(firework);
        
        // Criar partículas da explosão
        setTimeout(() => {
            firework.classList.add('explode');
            this.createFireworkParticles(firework);
        }, 1000);
        
        setTimeout(() => firework.remove(), 2000);
    }

    createFireworkParticles(firework) {
        const rect = firework.getBoundingClientRect();
        const colors = ['#FF453A', '#FFD60A', '#32D74B', '#0A84FF', '#BF5AF2'];
        
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'firework-particle';
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            
            const angle = (Math.PI * 2 * i) / 20;
            const velocity = 2 + Math.random() * 2;
            
            particle.style.left = rect.left + rect.width/2 + 'px';
            particle.style.top = rect.top + rect.height/2 + 'px';
            particle.style.setProperty('--angle', angle + 'rad');
            particle.style.setProperty('--velocity', velocity);
            
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 1000);
        }
    }

    createTutorialItem() {
        const tutorialItems = document.querySelector('.tutorial-items');
        if (tutorialItems) {
            // Adicionar novo item no tutorial
            const inventoryTutorial = document.createElement('div');
            inventoryTutorial.className = 'tutorial-item';
            inventoryTutorial.innerHTML = `
                <div class="key-indicator">I / V</div>
                <span>Abrir Mochila</span>
            `;
            tutorialItems.appendChild(inventoryTutorial);
        }
    }

    showDeathScreen(canSpectate = false, finalScore = 0) {
        const deathChoice = document.getElementById('death-choice');
        const deathMessage = document.getElementById('death-message');
        
        if (!deathChoice || !deathMessage) return;

        // Esconder elementos do jogo
        this.hideGameElements();

        // Configurar tela de morte
        deathChoice.style.display = 'flex';
        deathMessage.textContent = 'SE FODEU!';
        deathMessage.style.color = '#FF453A';

        // Atualizar estatísticas
        this.updateDeathStats(finalScore);

        // Configurar botões
        const backButton = document.getElementById('back-button');
        if (backButton) {
            backButton.onclick = () => {
                deathChoice.style.display = 'none';
                this.showStartScreen();
            };
        }
    }

    updateDeathStats(finalScore = 0) {
        const gameTime = this.formatGameTime(Date.now() - this.gameStartTime);
        
        if (this.deathScore) {
            this.deathScore.textContent = this.formatScore(finalScore);
        }
        if (this.deathTime) {
            this.deathTime.textContent = gameTime;
        }
    }

    showVictoryScreen(finalScore) {
        const deathChoice = document.getElementById('death-choice');
        const deathMessage = document.getElementById('death-message');
        
        if (!deathChoice || !deathMessage) return;

        // Esconder elementos do jogo
        this.hideGameElements();

        // Configurar tela de vitória
        deathChoice.style.display = 'flex';
        deathMessage.textContent = 'VITÓRIA ROYALE!';
        deathMessage.style.color = '#32D74B';

        // Atualizar estatísticas com pontuação formatada
        if (this.deathScore) {
            this.deathScore.textContent = this.formatScore(finalScore);
        }

        // Esconder botão de espectar e mostrar apenas o botão de voltar
        const spectateButton = document.getElementById('spectate-button');
        const backButton = document.getElementById('back-button');

        if (spectateButton) {
            spectateButton.style.display = 'none'; // Esconder botão de espectar
        }

        if (backButton) {
            backButton.onclick = () => {
                deathChoice.style.display = 'none';
                this.showStartScreen();
            };
        }
    }

    showBotVictoryScreen() {
        const deathChoice = document.getElementById('death-choice');
        const deathMessage = document.getElementById('death-message');
        
        if (!deathChoice || !deathMessage) return;

        // Esconder elementos do jogo
        this.hideGameElements();

        // Configurar tela de vitória do bot
        deathChoice.style.display = 'flex';
        deathMessage.textContent = 'BOT VENCEU!';
        deathMessage.style.color = '#FF453A';

        // Atualizar estatísticas
        this.updateDeathStats();

        // Configurar botão de voltar
        const backButton = document.getElementById('back-button');
        if (backButton) {
            backButton.onclick = () => {
                deathChoice.style.display = 'none';
                this.showStartScreen();
            };
        }
    }

    setupDeathButtons(canSpectate) {
        const spectateButton = document.getElementById('spectate-button');
        const backButton = document.getElementById('back-button');
        const deathChoice = document.getElementById('death-choice');

        if (spectateButton) {
            spectateButton.style.display = canSpectate ? 'block' : 'none';
            if (canSpectate) {
                spectateButton.onclick = () => {
                    deathChoice.style.display = 'none';
                    this.game.startSpectating();
                };
            }
        }

        if (backButton) {
            backButton.onclick = () => {
                deathChoice.style.display = 'none';
                this.showStartScreen();
            };
        }
    }

    showDamageIndicator() {
        // Adicionar efeito visual quando toma dano da zona
        const overlay = document.createElement('div');
        overlay.className = 'damage-overlay';
        document.body.appendChild(overlay);

        // Remover após a animação
        setTimeout(() => overlay.remove(), 500);
    }

    updateWaitingScreen(waiting, playerCount, maxPlayers, timeLeft) {
        const waitingScreen = document.getElementById('waiting-screen');
        const countdownElement = document.getElementById('countdown');
        const waitingInfo = waitingScreen?.querySelector('.waiting-info');
        
        if (waitingScreen && countdownElement) {
            if (waiting) {
                waitingScreen.style.display = 'flex';
                
                // Converter para segundos e garantir número inteiro
                const seconds = Math.ceil(timeLeft / 1000);
                countdownElement.textContent = seconds;
                
                if (waitingInfo) {
                    waitingInfo.textContent = `Aguardando jogadores... (${playerCount}/${maxPlayers})`;
                    if (playerCount < maxPlayers) {
                        waitingInfo.textContent += '\nBots serão adicionados se necessário';
                    }
                }

                // Adicionar classe de destaque quando estiver nos últimos 5 segundos
                if (seconds <= 5) {
                    countdownElement.classList.add('countdown-ending');
                } else {
                    countdownElement.classList.remove('countdown-ending');
                }
            } else {
                waitingScreen.style.display = 'none';
            }
        }
    }

    updateFPS() {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.updatePerformanceStats();
    }

    updatePing(ping) {
        this.ping = Math.round(ping);
        this.updatePerformanceStats();
    }

    updatePerformanceStats(fps, ping) {
        const fpsElement = document.getElementById('fps');
        const pingElement = document.getElementById('ping');
        
        if (fpsElement) {
            fpsElement.textContent = `${fps} FPS`;
            fpsElement.className = fps < 30 ? 'stat-value warning' : 'stat-value';
        }
        
        if (pingElement) {
            pingElement.textContent = `${ping}ms`;
            pingElement.className = ping > 100 ? 'stat-value warning' : 'stat-value';
        }
    }

    frameUpdate() {
        this.frameCount++;
        if (this.game?.ui) {
            this.game.ui.updatePerformanceStats();
        }
    }

    showGameElements() {
        // Esconder tela de espera
        const waitingScreen = document.getElementById('waiting-screen');
        if (waitingScreen) {
            waitingScreen.style.display = 'none';
        }

        // Mostrar elementos do jogo
        const elements = {
            canvas: document.getElementById('gameCanvas'),
            playerUI: document.querySelector('.player-ui'),
            zoneInfo: document.querySelector('.zone-info')
        };

        Object.entries(elements).forEach(([_, element]) => {
            if (element) {
                element.style.display = element === elements.canvas ? 'block' : 'flex';
            }
        });

        // Resetar estados da UI
        this.reset();
    }

    hideWaitingScreen() {
        const waitingScreen = document.getElementById('waiting-screen');
        if (waitingScreen) {
            waitingScreen.style.display = 'none';
        }
    }
}