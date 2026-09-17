const GAME_DATA = {
  scenes: [
    { id: 'start', name: '特工总部', description: '网络清朗行动指挥中心' },
    { id: 'social_plaza', name: '社交广场', description: '繁华的网络社交平台' },
    { id: 'news_station', name: '新闻站点', description: '各类资讯汇聚之地' },
    { id: 'shopping_mall', name: '购物商城', description: '网络购物平台' },
    { id: 'secret_forum', name: '隐秘论坛', description: '需要深入调查的神秘板块' },
    { id: 'final_showdown', name: '终极对决', description: '与谣言源头的最终战斗' }
  ],
  
  npcs: [
    { id: 'chief', name: '总指挥', avatar: '👮‍♂️', type: 'quest_giver' },
    { id: 'informant', name: '知情网友', avatar: '🕵️', type: 'information' },
    { id: 'victim', name: '受骗用户', avatar: '😰', type: 'victim' },
    { id: 'expert', name: '技术专家', avatar: '👨‍💻', type: 'helper' }
  ],
  
  items: [
    { id: 'magnifier', name: '放大镜', icon: '🔍', type: 'tool', description: '仔细查看可疑信息' },
    { id: 'report_form', name: '举报表', icon: '📝', type: 'tool', description: '提交网络举报' },
    { id: 'truth_badge', name: '求真徽章', icon: '🏅', type: 'badge', description: '识别谣言的荣誉' },
    { id: 'protection_shield', name: '防护盾', icon: '🛡️', type: 'tool', description: '保护个人信息' },
    { id: 'wisdom_scroll', name: '智慧卷轴', icon: '📜', type: 'clue', description: '网络安全知识手册' }
  ],
  
  tasks: [
    { id: 'tutorial', title: '新手训练', description: '了解基本操作流程' },
    { id: 'rumor_hunt', title: '谣言猎手', description: '找出并标记3条谣言' },
    { id: 'comment_cleanup', title: '评论净化', description: '举报5条违规评论' },
    { id: 'phish_trap', title: '钓鱼陷阱', description: '识别并举报诈骗链接' },
    { id: 'info_protect', title: '信息保护', description: '隐藏敏感个人信息' },
    { id: 'violence_report', title: '暴力举报', description: '处理不良内容' },
    { id: 'full_investigation', title: '全面调查', description: '完成完整举报流程' },
    { id: 'final_boss', title: '终极净化', description: '清除主要谣言源头' }
  ]
};
