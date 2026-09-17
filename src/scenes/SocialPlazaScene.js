class SocialPlazaScene extends BaseScene {
  constructor(engine) {
    super('social_plaza', '社交广场', '繁华的网络社交平台');
    this.engine = engine;
    this.interactiveItems = [];
    this.comments = [];
    this.initializeContent();
  }

  initializeContent() {
    this.posts = [
      {
        id: 1,
        author: '消息通',
        avatar: '📢',
        content: '重大消息！今晚24点全市将断网维护，大家提前做好准备！',
        isRumor: true,
        rumors: [],
        reactions: ['😱', '🤔', '💬'],
        comments: [
          { id: 1, user: '暴躁小王', avatar: '😤', text: '真的假的？太突然了！', isBad: false },
          { id: 2, user: '黑粉头子', avatar: '👿', text: '小编脑子有病吧，这种假消息也发？', isBad: true },
          { id: 3, user: '地域黑', avatar: '😠', text: 'XX地方的人就是爱传谣', isBad: true },
          { id: 4, user: '理性网友', avatar: '😊', text: '大家等官方通知吧', isBad: false }
        ]
      },
      {
        id: 2,
        author: '热心市民',
        avatar: '🏠',
        content: '求帮忙转发！我朋友的孩子走失了...联系方式：13800138000 张三',
        isRumor: false,
        hasSensitiveInfo: true,
        comments: [
          { id: 5, user: '好心人', avatar: '❤️', text: '帮转！希望孩子早点找到', isBad: false }
        ]
      },
      {
        id: 3,
        author: '优惠达人',
        avatar: '🎁',
        content: '限时特惠！点击链接领取1000元红包：https://fake-url.com/claim',
        isPhishing: true,
        comments: []
      }
    ];
  }

  render() {
    const container = document.getElementById('game-container');
    container.innerHTML = `
      <div class="scene-social">
        <div class="scene-header">
          <button class="btn-back" onclick="gameEngine.switchScene('map')">← 返回地图</button>
          <h2 class="scene-title">🏪 社交广场</h2>
        </div>
        
        <div class="plaza-content">
          <div class="scene-instruction">
            <p>💡 <strong>探索提示：</strong>点击可疑内容进行识别和举报</p>
          </div>
          
          <div class="posts-container">
            ${this.renderPosts()}
          </div>
        </div>
        
        <div class="scene-footer">
          <div class="action-bar">
            <button class="action-btn" onclick="this.toggleInventory()">🎒 道具</button>
            <button class="action-btn" onclick="this.markAllComplete()">✅ 完成</button>
          </div>
        </div>
      </div>
    `;
  }

  renderPosts() {
    return this.posts.map(post => `
      <div class="post-card" id="post-${post.id}">
        <div class="post-header">
          <span class="post-avatar">${post.avatar}</span>
          <span class="post-author">${post.author}</span>
          ${post.isRumor ? '<span class="tag-suspicious">⚠️ 可疑</span>' : ''}
        </div>
        <div class="post-content">${post.content}</div>
        
        <div class="post-actions">
          <button class="action-small" onclick="this.investigatePost(${post.id})">🔍 调查</button>
          <button class="action-small" onclick="this.reportPost(${post.id})">📢 举报</button>
          <button class="action-small" onclick="this.collectClue(${post.id})">📎 收集线索</button>
        </div>
        
        ${post.comments.length > 0 ? `
          <div class="comments-section">
            <div class="comments-header">💬 评论</div>
            ${post.comments.map(comment => `
              <div class="comment-item ${comment.isBad ? 'comment-bad' : ''}">
                <span class="comment-avatar">${comment.avatar}</span>
                <span class="comment-user">${comment.user}</span>
                <span class="comment-text">${comment.text}</span>
                ${comment.isBad ? `<button class="btn-report-mini" onclick="this.reportComment(${comment.id})">举报</button>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  investigatePost(postId) {
    const post = this.posts.find(p => p.id === postId);
    const ui = this.engine.getModule('uiManager');
    
    if (post.isRumor) {
      ui.showToast('🔍 这是一条谣言！建议举报');
      this.highlightPost(postId, 'rumor');
    } else if (post.isPhishing) {
      ui.showToast('⚠️ 这是钓鱼链接！不要点击');
      this.highlightPost(postId, 'phishing');
    } else if (post.hasSensitiveInfo) {
      ui.showToast('👁️ 发现敏感信息，建议保护');
      this.highlightPost(postId, 'sensitive');
    } else {
      ui.showToast('✅ 这条内容看起来没问题');
    }
  }

  reportPost(postId) {
    const post = this.posts.find(p => p.id === postId);
    const ui = this.engine.getModule('uiManager');
    
    if (post.isRumor || post.isPhishing) {
      ui.showToast('✅ 举报成功！感谢你的贡献');
      this.engine.updateProgress(5);
      this.removePost(postId);
      this.checkCompletion();
    } else {
      ui.showToast('请确认内容违规后再举报');
    }
  }

  reportComment(commentId) {
    const ui = this.engine.getModule('uiManager');
    ui.showToast('✅ 评论已举报');
    const commentEl = document.querySelector(`.comment-item:has(button[onclick*="${commentId}"])`);
    if (commentEl) {
      commentEl.classList.add('reported');
    }
  }

  collectClue(postId) {
    const itemManager = this.engine.getModule('itemManager');
    itemManager.addItem('wisdom_scroll');
  }

  highlightPost(postId, type) {
    const postEl = document.getElementById(`post-${postId}`);
    if (postEl) {
      postEl.classList.add(`highlight-${type}`);
    }
  }

  removePost(postId) {
    const postEl = document.getElementById(`post-${postId}`);
    if (postEl) {
      postEl.style.opacity = '0';
      setTimeout(() => postEl.remove(), 300);
    }
  }

  checkCompletion() {
    this.engine.unlockScene('news_station');
  }

  toggleInventory() {
    this.engine.getModule('uiManager').showToast('🎒 背包功能');
  }

  markAllComplete() {
    this.engine.getModule('taskManager').completeTask('rumor_hunt');
    this.engine.switchScene('map');
  }
}
