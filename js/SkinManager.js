export class SkinManager {
    constructor() {
        this.skins = {
            default: {
                name: 'Espírito Lunar',
                color: '#fff',
                price: 0,
                unlocked: true
            },
            red: {
                name: 'Chama Infernal',
                color: '#ff4444',
                price: 1000,
                unlocked: true
            },
            blue: {
                name: 'Gelo Eterno',
                color: '#4444ff',
                price: 2000,
                unlocked: true
            },
            green: {
                name: 'Veneno Ancestral',
                color: '#44ff44',
                price: 3000,
                unlocked: true
            },
            gold: {
                name: 'Relíquia Sagrada',
                color: '#ffd700',
                price: 5000,
                unlocked: true
            },
            rainbow: {
                name: 'Prisma Dimensional',
                color: 'rainbow',
                price: 10000,
                unlocked: true
            }
        };

        this.currentSkin = 'default';
        this.loadUnlockedSkins();
    }

    loadUnlockedSkins() {
        try {
            const unlockedSkins = localStorage.getItem('unlockedSkins');
            if (unlockedSkins) {
                const skins = JSON.parse(unlockedSkins);
                if (Array.isArray(skins)) {
                    skins.forEach(skinId => {
                        if (this.skins[skinId]) {
                            this.skins[skinId].unlocked = true;
                        }
                    });
                }
            }

            const currentSkin = localStorage.getItem('currentSkin');
            if (currentSkin && this.skins[currentSkin] && this.skins[currentSkin].unlocked) {
                this.currentSkin = currentSkin;
            } else {
                this.currentSkin = 'default';
            }
        } catch (error) {
            console.error('Erro ao carregar skins:', error);
            this.currentSkin = 'default';
        }
    }

    saveUnlockedSkins() {
        const unlockedSkins = Object.keys(this.skins).filter(skinId => this.skins[skinId].unlocked);
        localStorage.setItem('unlockedSkins', JSON.stringify(unlockedSkins));
        localStorage.setItem('currentSkin', this.currentSkin);
    }

    getCurrentSkin() {
        const skin = this.skins[this.currentSkin];
        if (!skin) {
            console.warn('Skin não encontrada:', this.currentSkin);
            this.currentSkin = 'default';
            return this.skins.default;
        }
        return skin;
    }

    unlockSkin(skinId) {
        if (!this.skins[skinId]) {
            console.error('Tentativa de desbloquear skin inválida:', skinId);
            return false;
        }
        
        if (this.skins[skinId].unlocked) {
            console.warn('Skin já desbloqueada:', skinId);
            return false;
        }
        
        this.skins[skinId].unlocked = true;
        this.saveUnlockedSkins();
        return true;
    }

    selectSkin(skinId) {
        if (!this.skins[skinId]) {
            console.error('Tentativa de selecionar skin inválida:', skinId);
            return false;
        }
        
        if (!this.skins[skinId].unlocked) {
            console.warn('Tentativa de selecionar skin bloqueada:', skinId);
            return false;
        }
        
        this.currentSkin = skinId;
        this.saveUnlockedSkins();
        return true;
    }

    getPlayerColor(frameCount) {
        const skin = this.getCurrentSkin();
        if (!skin || !skin.color) {
            console.warn('Cor da skin inválida, usando cor padrão');
            return '#ffffff';
        }
        
        if (skin.color === 'rainbow') {
            return `hsl(${Math.abs(frameCount % 360)}, 100%, 50%)`;
        }
        
        return skin.color;
    }

    getAllSkins() {
        return this.skins;
    }
}
