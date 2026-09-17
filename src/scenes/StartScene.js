class StartScene extends BaseScene {
  constructor(engine) {
    super('start', '特工总部', '网络清朗行动指挥中心');
    this.engine = engine;
  }

  render() {
    const container = document.getElementById('game-container');
    container.innerHTML = `
      <div class="scene-start">
        <div class="start-header">
          <div class="start-icon animate-pulse">🛡️</div>
          <h1 class="game-title">谣言终结者</h1>
          <p class="game-subtitle">清朗特工</p>
          <p class="tagline">每一件举报，都是共治的力量</p>
        </div>
        
        <div class="start-content">
          <div class="mission-briefing">
            <div class="briefing-header">📋 任务简报</div>
            <p>欢迎加入网络清朗行动！作为一名新晋特工，你的任务是：</p>
            <ul>
              <li>🔍 识别网络谣言</li>
              <li>📢 举报不良信息</li>
              <li>🛡️ 保护个人信息</li>
              <li>✨ 净化网络空间</li>
            </ul>
          </div>
          
          <div class="character-preview">
            <div class="npc-card" onclick="gameEngine.getModule('uiManager').showToast('总指挥是你的上级，会给你分配任务！')">
              <div class="npc-avatar">👮‍♂️</div>
              <div class="npc-name">总指挥</div>
            </div>
          </div>
        </div>
        
        <div class="start-actions">
          <button class="btn btn-primary btn-large" onclick="this.startGame()">
            🚀 开始行动
          </button>
          <button class="btn btn-secondary" onclick="this.showTutorial()">
            📖 游戏教程
          </button>
        </div>
      </div>
    `;
  }

  startGame() {
    this.engine.unlockScene('map');
    this.engine.switchScene('map');
    this.engine.getModule('taskManager').activateTask('tutorial');
  }

  showTutorial() {
    this.engine.getModule('uiManager').showToast('教程系统开发中...');
  }
}
