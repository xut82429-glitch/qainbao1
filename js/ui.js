// UI渲染
const UI = {
    el: document.getElementById('app'),

    render() {
        const scene = Game.state.currentScene;
        
        if (scene === 'start') this.renderStart();
        else if (scene === 'plaza') this.renderPlaza();
        else if (scene === 'map') this.renderMap();
        else this.renderPlaceholder(scene);
    },

    renderStart() {
        this.el.innerHTML = `
            <div class="start-screen">
                <h1>谣言终结者</h1>
                <h2>清朗特工</h2>
                <p class="subtitle">每一件举报，都是共治的力量</p>
                
                <div class="tasks">
                    <p>欢迎加入网络清朗行动！你的任务是：</p>
                    <ul>
                        <li>🔍 识别网络谣言</li>
                        <li>📢 举报不良信息</li>
                        <li>🛡️ 保护个人信息</li>
                        <li>✨ 净化网络空间</li>
                    </ul>
                </div>
                
                <div class="buttons">
                    <button onclick="Game.goTo('plaza')" class="btn-primary">🚀 开始行动</button>
                    <button onclick="this.showTutorial()" class="btn-secondary">📖 游戏教程</button>
                </div>
            </div>
        `;
    },

    renderPlaza() {
        this.el.innerHTML = `
            <div class="scene">
                <div class="header">
                    <button onclick="Game.goTo('start')" class="btn-back">← 返回</button>
                    <h3>🏪 社交广场</h3>
                    <button onclick="UI.renderInventory()" class="btn-inventory">🎒 ${Game.state.inventory.length}</button>
                </div>
                
                <div class="scene-content">
                    <p>这是一个热闹的社交广场，请完成任务获得道具！</p>
                    
                    <div class="task-box">
                        <h4>今日任务</h4>
                        <p>识别一条谣言信息</p>
                        <button onclick="Inventory.add('scroll'); alert('获得了智慧卷轴！')" class="btn-task">完成任务</button>
                    </div>
                    
                    <div class="nav-buttons">
                        <button onclick="Game.goTo('map')" class="btn-nav">🗺️ 查看地图</button>
                    </div>
                </div>
            </div>
        `;
    },

    renderMap() {
        this.el.innerHTML = `
            <div class="scene">
                <div class="header">
                    <button onclick="Game.goTo('plaza')" class="btn-back">← 返回</button>
                    <h3>🗺️ 任务地图</h3>
                    <button onclick="UI.renderInventory()" class="btn-inventory">🎒 ${Game.state.inventory.length}</button>
                </div>
                
                <div class="map-grid">
                    <div class="map-node active" onclick="Game.goTo('plaza')">🏪 社交广场</div>
                    <div class="map-node locked">📰 新闻站点</div>
                    <div class="map-node locked">🛒 购物商城</div>
                    <div class="map-node locked">🔮 隐秘论坛</div>
                    <div class="map-node locked">⚔️ 终极对决</div>
                </div>
            </div>
        `;
    },

    renderInventory() {
        const items = Game.state.inventory;
        let slots = '';
        
        for (let i = 0; i < CONFIG.MAX_INVENTORY; i++) {
            if (items[i]) {
                slots += `<div class="inv-slot filled" onclick="Inventory.use(${i})">${items[i].icon}</div>`;
            } else {
                slots += `<div class="inv-slot"></div>`;
            }
        }
        
        this.el.innerHTML = `
            <div class="inventory-modal">
                <div class="inv-header">
                    <h3>🎒 道具背包</h3>
                    <button onclick="UI.render()" class="btn-close">✕</button>
                </div>
                <div class="inv-grid">${slots}</div>
                <p class="inv-tip">点击道具使用</p>
            </div>
        `;
    },

    renderPlaceholder(scene) {
        this.el.innerHTML = `
            <div class="scene">
                <div class="header">
                    <button onclick="Game.goTo('start')" class="btn-back">← 返回</button>
                    <h3>场景开发中...</h3>
                </div>
                <div class="scene-content">
                    <p>该场景正在建设中，敬请期待！</p>
                    <button onclick="Game.goTo('map')" class="btn-nav">返回地图</button>
                </div>
            </div>
        `;
    },

    showTutorial() {
        alert('游戏教程：\n\n1. 完成任务收集道具\n2. 使用道具解决问题\n3. 解锁新场景\n4. 最终击败谣言之王！');
    }
};
