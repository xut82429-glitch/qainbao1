class GameEngine {
  constructor() {
    this.state = {
      currentScene: 'start',
      player: null,
      inventory: [],
      completedTasks: [],
      unlockedScenes: ['start'],
      gameProgress: 0
    };
    this.modules = {};
    this.eventBus = new EventBus();
  }

  init() {
    console.log('🎮 游戏引擎初始化...');
    this.loadModules();
    this.loadGameData();
    this.render();
    console.log('✅ 游戏引擎就绪!');
  }

  loadModules() {
    this.modules = {
      sceneManager: new SceneManager(this),
      characterManager: new CharacterManager(this),
      taskManager: new TaskManager(this),
      itemManager: new ItemManager(this),
      uiManager: new UIManager(this),
      saveSystem: new SaveSystem(this)
    };
  }

  loadGameData() {
    this.state.player = this.modules.characterManager.createPlayer();
  }

  switchScene(sceneId) {
    if (this.state.unlockedScenes.includes(sceneId)) {
      this.state.currentScene = sceneId;
      this.render();
      this.eventBus.emit('sceneChanged', sceneId);
    } else {
      this.modules.uiManager.showToast('该场景尚未解锁！');
    }
  }

  unlockScene(sceneId) {
    if (!this.state.unlockedScenes.includes(sceneId)) {
      this.state.unlockedScenes.push(sceneId);
      this.eventBus.emit('sceneUnlocked', sceneId);
    }
  }

  updateProgress(amount) {
    this.state.gameProgress = Math.min(100, this.state.gameProgress + amount);
    this.modules.uiManager.updateProgressBar();
  }

  render() {
    const scene = this.modules.sceneManager.getScene(this.state.currentScene);
    if (scene) {
      scene.render();
    }
  }

  getModule(moduleName) {
    return this.modules[moduleName];
  }
}

const gameEngine = new GameEngine();
