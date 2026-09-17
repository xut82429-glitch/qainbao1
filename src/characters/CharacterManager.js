class CharacterManager {
  constructor(engine) {
    this.engine = engine;
    this.characters = new Map();
  }

  createPlayer() {
    return {
      id: 'player',
      name: '清朗特工',
      avatar: '🛡️',
      level: 1,
      exp: 0,
      stats: {
        wisdom: 80,
        courage: 85,
        empathy: 90
      },
      skills: ['谣言识别', '网络举报', '信息保护'],
      inventory: []
    };
  }

  registerCharacter(character) {
    this.characters.set(character.id, character);
  }

  getCharacter(characterId) {
    return this.characters.get(characterId);
  }

  createNPC(config) {
    return {
      id: config.id,
      name: config.name,
      avatar: config.avatar || '👤',
      type: config.type || 'npc',
      dialogues: config.dialogues || [],
      interactable: config.interactable !== false
    };
  }
}

class InteractiveCharacter {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.avatar = config.avatar;
    this.currentDialogue = 0;
    this.dialogueTree = config.dialogueTree || [];
  }

  talk() {
    if (this.currentDialogue < this.dialogueTree.length) {
      return this.dialogueTree[this.currentDialogue++];
    }
    return this.dialogueTree[this.dialogueTree.length - 1];
  }

  resetDialogue() {
    this.currentDialogue = 0;
  }
}
