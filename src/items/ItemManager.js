class ItemManager {
  constructor(engine) {
    this.engine = engine;
    this.items = new Map();
    this.inventory = [];
  }

  registerItem(item) {
    this.items.set(item.id, item);
  }

  addItem(itemId) {
    const item = this.items.get(itemId);
    if (item) {
      this.inventory.push(item);
      this.engine.eventBus.emit('itemAdded', item);
    }
  }

  removeItem(itemId) {
    const index = this.inventory.findIndex(item => item.id === itemId);
    if (index > -1) {
      const removed = this.inventory.splice(index, 1)[0];
      this.engine.eventBus.emit('itemRemoved', removed);
    }
  }

  useItem(itemId) {
    const item = this.inventory.find(i => i.id === itemId);
    if (item && item.usable) {
      item.use(this.engine);
      if (item.consumable) {
        this.removeItem(itemId);
      }
    }
  }

  getInventory() {
    return this.inventory;
  }
}

class Item {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.icon = config.icon || '📦';
    this.usable = config.usable !== false;
    this.consumable = config.consumable || false;
    this.effect = config.effect || null;
  }

  use(engine) {
    if (this.effect) {
      this.effect(engine);
    }
  }
}

class ClueItem extends Item {
  constructor(config) {
    super({
      ...config,
      usable: true,
      consumable: false,
      icon: '🔍'
    });
    this.clueData = config.clueData;
  }
}

class ToolItem extends Item {
  constructor(config) {
    super({
      ...config,
      usable: true,
      consumable: false,
      icon: '🔧'
    });
    this.toolType = config.toolType;
  }
}

class BadgeItem extends Item {
  constructor(config) {
    super({
      ...config,
      usable: false,
      consumable: false,
      icon: '🏅'
    });
    this.achievement = config.achievement;
  }
}
