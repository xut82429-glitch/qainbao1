// 游戏状态和逻辑
const Game = {
    state: {
        currentScene: 'start',
        inventory: [],
        unlockedScenes: ['start', 'plaza']
    },

    save() {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.state));
    },

    load() {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (saved) {
            this.state = JSON.parse(saved);
        }
    },

    reset() {
        this.state = {
            currentScene: 'start',
            inventory: [],
            unlockedScenes: ['start', 'plaza']
        };
        this.save();
    },

    goTo(sceneId) {
        this.state.currentScene = sceneId;
        this.save();
        UI.render();
    }
};
