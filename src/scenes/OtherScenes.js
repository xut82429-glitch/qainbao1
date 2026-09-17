class NewsStationScene extends BaseScene {
  constructor(engine) {
    super('news_station', '新闻站点', '各类资讯汇聚之地');
    this.engine = engine;
  }

  render() {
    const container = document.getElementById('game-container');
    container.innerHTML = `
      <div class="scene-news">
        <div class="scene-header">
          <button class="btn-back" onclick="gameEngine.switchScene('map')">← 返回</button>
          <h2 class="scene-title">📰 新闻站点</h2>
        </div>
        <div class="news-content">
          <p>⚠️ 此区域正在建设中...</p>
          <p>探索更多新闻内容，识别虚假新闻</p>
          <button class="btn btn-primary" onclick="this.completeScene()">完成本站任务</button>
        </div>
      </div>
    `;
  }

  completeScene() {
    this.engine.unlockScene('shopping_mall');
    this.engine.updateProgress(10);
    this.engine.switchScene('map');
  }
}

class ShoppingMallScene extends BaseScene {
  constructor(engine) {
    super('shopping_mall', '购物商城', '网络购物平台');
    this.engine = engine;
  }

  render() {
    const container = document.getElementById('game-container');
    container.innerHTML = `
      <div class="scene-shop">
        <div class="scene-header">
          <button class="btn-back" onclick="gameEngine.switchScene('map')">← 返回</button>
          <h2 class="scene-title">🛒 购物商城</h2>
        </div>
        <div class="shop-content">
          <p>⚠️ 此区域正在建设中...</p>
          <p>识别网络诈骗，保护财产安全</p>
          <button class="btn btn-primary" onclick="this.completeScene()">完成本站任务</button>
        </div>
      </div>
    `;
  }

  completeScene() {
    this.engine.unlockScene('secret_forum');
    this.engine.updateProgress(10);
    this.engine.switchScene('map');
  }
}

class SecretForumScene extends BaseScene {
  constructor(engine) {
    super('secret_forum', '隐秘论坛', '需要深入调查的神秘板块');
    this.engine = engine;
  }

  render() {
    const container = document.getElementById('game-container');
    container.innerHTML = `
      <div class="scene-forum">
        <div class="scene-header">
          <button class="btn-back" onclick="gameEngine.switchScene('map')">← 返回</button>
          <h2 class="scene-title">🔮 隐秘论坛</h2>
        </div>
        <div class="forum-content">
          <p>⚠️ 此区域正在建设中...</p>
          <p>深度调查，揭露更多网络不良内容</p>
          <button class="btn btn-primary" onclick="this.completeScene()">完成本站任务</button>
        </div>
      </div>
    `;
  }

  completeScene() {
    this.engine.unlockScene('final_showdown');
    this.engine.updateProgress(10);
    this.engine.switchScene('map');
  }
}

class FinalShowdownScene extends BaseScene {
  constructor(engine) {
    super('final_showdown', '终极对决', '与谣言源头的最终战斗');
    this.engine = engine;
  }

  render() {
    const container = document.getElementById('game-container');
    container.innerHTML = `
      <div class="scene-final">
        <div class="final-content">
          <h1 class="victory-title">🎉 恭喜通关！</h1>
          <p class="victory-subtitle">你已成功净化了网络空间</p>
          <div class="certificate-preview">
            <div class="cert-badge">🏆</div>
            <h3 class="cert-title">网络清朗卫士</h3>
            <p>感谢你为网络空间做出的贡献</p>
          </div>
          <div class="final-actions">
            <button class="btn btn-primary" onclick="this.saveAndRestart()">保存证书 & 重新开始</button>
            <button class="btn btn-secondary" onclick="this.backToMap()">返回地图</button>
          </div>
        </div>
      </div>
    `;
  }

  saveAndRestart() {
    this.engine.getModule('uiManager').showToast('💾 证书已保存');
    setTimeout(() => {
      this.engine.getModule('saveSystem').clearSave();
      location.reload();
    }, 1500);
  }

  backToMap() {
    this.engine.switchScene('map');
  }
}
