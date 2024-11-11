export class Skins {
    static RARITIES = {
        COMUM: {
            color: '#FFFFFF',
            effects: {
                glow: { intensity: 5 }
            }
        },
        RARO: {
            color: '#0A84FF',
            effects: {
                glow: { intensity: 10 },
                aura: { scale: 1.2 }
            }
        },
        ÉPICO: {
            color: '#BF5AF2',
            effects: {
                glow: { intensity: 15 },
                aura: { scale: 1.4 },
                pulse: true
            }
        },
        LENDÁRIO: {
            color: '#FFD700',
            effects: {
                glow: { intensity: 20 },
                aura: { scale: 1.6 },
                pulse: true,
                particles: true
            }
        }
    };

    static PLAYER_SKINS = {
        default: {
            name: 'Padrão',
            color: '#ffffff',
            unlocked: true,
            rarity: 'COMUM',
            crosshairColor: '#ffffff',
            bulletColor: '#ffffff'
        },
        neon: {
            name: 'Neon',
            color: '#00ff00',
            price: 100,
            unlocked: false,
            rarity: 'RARO',
            glowEffect: {
                color: '#00ff00',
                blur: 15
            },
            bulletColor: '#00ff00',
            crosshairColor: '#00ff00'
        },
        plasma: {
            name: 'Plasma',
            color: '#ff00ff',
            price: 200,
            unlocked: false,
            rarity: 'RARO',
            auraEffect: {
                color: 'rgba(255, 0, 255, 0.2)',
                radius: 40,
                pulseSpeed: 2
            },
            glowEffect: {
                color: '#ff00ff',
                blur: 20
            },
            bulletColor: '#ff00ff',
            crosshairColor: '#ff00ff'
        },
        fire: {
            name: 'Fogo',
            color: '#ff4500',
            price: 300,
            unlocked: false,
            rarity: 'ÉPICO',
            auraEffect: {
                color: 'rgba(255, 69, 0, 0.2)',
                radius: 35,
                pulseSpeed: 3
            },
            glowEffect: {
                color: '#ff4500',
                blur: 25
            },
            bulletColor: '#ff4500',
            crosshairColor: '#ff6347'
        },
        ice: {
            name: 'Gelo',
            color: '#00ffff',
            price: 400,
            unlocked: false,
            rarity: 'ÉPICO',
            auraEffect: {
                color: 'rgba(0, 255, 255, 0.15)',
                radius: 45,
                pulseSpeed: 1
            },
            glowEffect: {
                color: '#00ffff',
                blur: 20
            },
            bulletColor: '#00ffff',
            crosshairColor: '#e0ffff'
        },
        toxic: {
            name: 'Tóxico',
            color: '#32CD32',
            price: 500,
            unlocked: false,
            rarity: 'ÉPICO',
            auraEffect: {
                color: 'rgba(50, 205, 50, 0.2)',
                radius: 40,
                pulseSpeed: 2
            },
            glowEffect: {
                color: '#32CD32',
                blur: 15
            },
            bulletColor: '#32CD32',
            crosshairColor: '#98FB98'
        },
        galaxy: {
            name: 'Galáxia',
            color: '#9370DB',
            price: 600,
            unlocked: false,
            rarity: 'LENDÁRIO',
            transparency: true,
            opacityPulse: {
                min: 0.2,
                max: 0.9,
                speed: 1.5
            },
            bulletColor: '#9370DB',
            crosshairColor: '#DDA0DD'
        },
        blood: {
            name: 'Sangue',
            color: '#DC143C',
            price: 700,
            unlocked: false,
            rarity: 'LENDÁRIO',
            auraEffect: {
                color: 'rgba(220, 20, 60, 0.25)',
                radius: 35,
                pulseSpeed: 2.5
            },
            glowEffect: {
                color: '#DC143C',
                blur: 20
            },
            bulletColor: '#DC143C',
            crosshairColor: '#FF0000'
        },
        gold: {
            name: 'Ouro',
            color: '#FFD700',
            price: 1000,
            unlocked: false,
            rarity: 'LENDÁRIO',
            auraEffect: {
                color: 'rgba(255, 215, 0, 0.3)',
                radius: 45,
                pulseSpeed: 1
            },
            glowEffect: {
                color: '#FFD700',
                blur: 25
            },
            bulletColor: '#FFD700',
            crosshairColor: '#DAA520'
        },
        rainbow: {
            name: 'Arco-Íris',
            price: 2000,
            unlocked: false,
            rarity: 'LENDÁRIO',
            colorCycle: true,
            colorSpeed: 0.03,
            auraEffect: {
                rainbow: true,
                radius: 40,
                pulseSpeed: 2
            },
            bulletColor: '#ffffff',
            crosshairColor: '#ffffff'
        }
    };

    static FOOD_SKINS = {
        ammo: {
            color: '#ffff00',
            size: 8,
            value: 10
        },
        medkit: {
            color: '#ff69b4',
            size: 10,
            value: 1
        },
        supergum: {
            color: '#00ffff',
            size: 12,
            value: 1
        },
        laser: {
            color: '#ff4500',
            size: 12,
            value: 1
        }
    };

    static getRarityEffects(skin) {
        const rarity = this.RARITIES[skin.rarity];
        if (!rarity) return {};

        const effects = { ...rarity.effects };

        // Aplicar efeitos baseados na raridade
        if (effects.glow) {
            skin.glowEffect = {
                ...skin.glowEffect,
                blur: (skin.glowEffect?.blur || 10) + effects.glow.intensity
            };
        }

        if (effects.aura && skin.auraEffect) {
            skin.auraEffect.radius *= effects.aura.scale;
        }

        if (effects.pulse) {
            skin.pulsing = true;
        }

        if (effects.particles) {
            skin.particles = true;
        }

        return effects;
    }

    static loadUnlockedSkins() {
        try {
            const unlockedSkinsStr = localStorage.getItem('unlockedSkins');
            if (!unlockedSkinsStr) return;

            const unlockedSkins = JSON.parse(unlockedSkinsStr);
            if (Array.isArray(unlockedSkins)) {
                unlockedSkins.forEach(skinName => {
                    if (this.PLAYER_SKINS[skinName]) {
                        this.PLAYER_SKINS[skinName].unlocked = true;
                    }
                });
            }
        } catch (e) {
            console.error('Erro ao carregar skins:', e);
        }
    }

    static saveUnlockedSkins() {
        try {
            const unlockedSkins = Object.entries(this.PLAYER_SKINS)
                .filter(([_, skin]) => skin.unlocked)
                .map(([name, _]) => name);
            localStorage.setItem('unlockedSkins', JSON.stringify(unlockedSkins));
        } catch (e) {
            console.error('Erro ao salvar skins:', e);
        }
    }
}
