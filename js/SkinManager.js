export class SkinManager {
    constructor() {
        this.skins = {
            default: {
                name: 'Padrão',
                color: '#fff',
                price: 0,
                unlocked: true
            },
            red: {
                name: 'Vermelho',
                color: '#ff4444',
                price: 100,
                unlocked: false
            },
            blue: {
                name: 'Azul',
                color: '#4444ff',
                price: 100,
                unlocked: false
            },
            green: {
                name: 'Verde',
                color: '#44ff44',
                price: 100,
                unlocked: false
            },
            gold: {
                name: 'Dourado',
                color: '#ffd700',
                price: 500,
                unlocked: false
            },
            rainbow: {
                name: 'Arco-íris',
                color: 'rainbow',
                price: 1000,
                unlocked: false
            }
        };

        this.currentSkin = 'default';
        this.loadUnlockedSkins();
    }

    loadUnlockedSkins() {
        const unlockedSkins = localStorage.getItem('unlockedSkins');
        if (unlockedSkins) {
            const skins = JSON.parse(unlockedSkins);
            for (const skinId of skins) {
                if (this.skins[skinId]) {
                    this.skins[skinId].unlocked = true;
                }
            }
        }

        const currentSkin = localStorage.getItem('currentSkin');
        if (currentSkin && this.skins[currentSkin] && this.skins[currentSkin].unlocked) {
            this.currentSkin = currentSkin;
        }
    }

    saveUnlockedSkins() {
        const unlockedSkins = Object.keys(this.skins).filter(skinId => this.skins[skinId].unlocked);
        localStorage.setItem('unlockedSkins', JSON.stringify(unlockedSkins));
        localStorage.setItem('currentSkin', this.currentSkin);
    }

    getCurrentSkin() {
        return this.skins[this.currentSkin];
    }

    unlockSkin(skinId) {
        if (this.skins[skinId] && !this.skins[skinId].unlocked) {
            this.skins[skinId].unlocked = true;
            this.saveUnlockedSkins();
            return true;
        }
        return false;
    }

    selectSkin(skinId) {
        if (this.skins[skinId] && this.skins[skinId].unlocked) {
            this.currentSkin = skinId;
            this.saveUnlockedSkins();
            return true;
        }
        return false;
    }

    getPlayerColor(frameCount) {
        const skin = this.getCurrentSkin();
        if (skin.color === 'rainbow') {
            // Efeito arco-íris animado
            const hue = (frameCount % 360);
            return `hsl(${hue}, 100%, 50%)`;
        }
        return skin.color;
    }

    getAllSkins() {
        return this.skins;
    }
}
