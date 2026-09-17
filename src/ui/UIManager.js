class UIManager {
  constructor(engine) {
    this.engine = engine;
    this.container = null;
    this.components = new Map();
  }

  init(containerId) {
    this.container = document.getElementById(containerId);
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.engine.eventBus.on('sceneChanged', () => this.updateUI());
    this.engine.eventBus.on('taskActivated', (task) => this.showTaskNotification(task));
    this.engine.eventBus.on('taskCompleted', (task) => this.showTaskComplete(task));
    this.engine.eventBus.on('itemAdded', (item) => this.showItemNotification(item));
  }

  render(componentId, html) {
    const el = document.getElementById(componentId);
    if (el) {
      el.innerHTML = html;
    }
  }

  showToast(message, duration = 2000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, duration);
  }

  showTaskNotification(task) {
    this.showToast(`📋 新任务: ${task.title}`);
  }

  showTaskComplete(task) {
    this.showToast(`✅ 任务完成: ${task.title}`, 3000);
  }

  showItemNotification(item) {
    this.showToast(`🎁 获得: ${item.icon} ${item.name}`);
  }

  updateUI() {
    this.updateProgressBar();
    this.updateInventoryDisplay();
  }

  updateProgressBar() {
    const progressBar = document.getElementById('progress-bar-fill');
    if (progressBar) {
      progressBar.style.width = `${this.engine.state.gameProgress + '%'}
    }
  }

  updateInventoryDisplay() {
    const inventory = this.engine.getModule('itemManager').getInventory();
    const container = document.getElementById('inventory-display');
    if (container) {
      container.innerHTML = inventory.map(item => 
        `<div class="inventory-item">${item.icon} ${item.name}</div>`
      ).join('');
    }
  }
}

class SaveSystem {
  constructor(engine) {
    this.engine = engine;
    this.storageKey = 'qinglang_game_save';
  }

  save() {
    const saveData = {
      state: this.engine.state,
      timestamp: Date.now()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(saveData));
    this.engine.getModule('uiManager').showToast('💾 游戏已保存');
  }

  load() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      const saveData = JSON.parse(saved);
      Object.assign(this.engine.state, saveData.state);
      this.engine.getModule('uiManager').showToast('📂 游戏已加载');
      return true;
    }
    return false;
  }

  clearSave() {
    localStorage.removeItem(this.storageKey);
  }
}
