class MapScene extends BaseScene {
  constructor(engine) {
    super('map', '任务地图', '选择你的下一个目的地');
    this.engine = engine;
    this.sceneNodes = [
      { id: 'social_plaza', name: '社交广场', icon: '🏪', unlocked: true, position: {x:50, y:30} },
      { id: 'news_station', name: '新闻站点', icon: '📰', unlocked: false, position: {x:25, y:50} },
      { id: 'shopping_mall', name: '购物商城', icon: '🛒', unlocked: false, position: {x:75, y:50} },
      { id: 'secret_forum', name: '隐秘论坛', icon: '🔮', unlocked: false, position: {x:50, y:70} },
      { id: 'final_showdown', name: '终极对决', icon: '⚔️', unlocked: false, position: {x:50, y:90} }
    ];
  }

  render() {
    const container = document.getElementById('game-container');
    container.innerHTML = `
      <div class="scene-map">
        <div class="map-header">
          <h2 class="map-title">🗺️ 任务地图</h2>
          <div class="progress-section">
            <div class="progress-bar">
              <div id="progress-bar-fill" class="progress-fill" style="width: ${this.engine.state.gameProgress}%"></div>
            </div>
            <span class="progress-text">进度: ${this.engine.state.gameProgress}%</span>
          </div>
        </div>
        
        <div class="map-container">
          ${this.renderSceneNodes()}
        </div>
        
        <div class="map-footer">
          <div class="quick-actions">
            <button class="btn btn-icon" onclick="this.showInventory()">🎒 背包</button>
            <button class="btn btn-icon" onclick="this.showTasks()">📋 任务</button>
            <button class="btn btn-icon" onclick="this.saveGame()">💾 保存</button>
          </div>
        </div>
      </div>
    `;
  }

  renderSceneNodes() {
    return this.sceneNodes.map(node => `
      <div class="scene-node ${node.unlocked ? 'unlocked' : 'locked'}"
           style="left: ${node.position.x}%; top: ${node.position.y}%"
           onclick="${node.unlocked ? `this.enterScene('${node.id}')` : ''}">
        <div class="node-icon">${node.icon}</div>
        <div class="node-name">${node.name}</div>
        ${!node.unlocked ? '<div class="lock-icon">🔒</div>' : ''}
      </div>
    `).join('');
  }

  enterScene(sceneId) {
    this.engine.switchScene(sceneId);
  }

  showInventory() {
    const items = this.engine.getModule('itemManager').getInventory();
    const itemsHtml = items.length > 0 
      ? items.map(item => `<div class="inventory-item">${item.icon} ${item.name}</div>`).join('')
      : '<div class="empty-state">背包是空的</div>';
      
    this.engine.getModule('uiManager').showToast(`背包有 ${items.length} 件物品`);
  }

  showTasks() {
    const tasks = this.engine.getModule('taskManager').getActiveTasks();
    const tasksHtml = tasks.length > 0
      ? tasks.map(task => `<div class="task-item">📋 ${task.title}</div>`).join('')
      : '<div class="empty-state">暂无进行中的任务</div>';
    this.engine.getModule('uiManager').showToast(`当前 ${tasks.length} 个任务`);
  }

  saveGame() {
    this.engine.getModule('saveSystem').save();
  }
}
