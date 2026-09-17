class TaskManager {
  constructor(engine) {
    this.engine = engine;
    this.tasks = new Map();
    this.activeTasks = [];
    this.completedTasks = [];
  }

  registerTask(task) {
    this.tasks.set(task.id, task);
  }

  activateTask(taskId) {
    const task = this.tasks.get(taskId);
    if (task && !this.activeTasks.includes(taskId) && !this.completedTasks.includes(taskId)) {
      this.activeTasks.push(taskId);
      this.engine.eventBus.emit('taskActivated', task);
    }
  }

  completeTask(taskId) {
    const task = this.tasks.get(taskId);
    if (task && this.activeTasks.includes(taskId)) {
      this.activeTasks = this.activeTasks.filter(id => id !== taskId);
      this.completedTasks.push(taskId);
      this.engine.eventBus.emit('taskCompleted', task);
      this.engine.updateProgress(task.reward?.progress || 5);
      
      if (task.reward?.item) {
        this.engine.getModule('itemManager').addItem(task.reward.item);
      }
    }
  }

  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  getActiveTasks() {
    return this.activeTasks.map(id => this.tasks.get(id));
  }
}

class Task {
  constructor(config) {
    this.id = config.id;
    this.title = config.title;
    this.description = config.description;
    this.objectives = config.objectives || [];
    this.reward = config.reward || {};
    this.prerequisites = config.prerequisites || [];
    this.progress = 0;
  }

  isComplete() {
    return this.objectives.every(obj => obj.completed);
  }

  updateProgress() {
    const completed = this.objectives.filter(obj => obj.completed).length;
    this.progress = (completed / this.objectives.length) * 100;
  }
}

class Objective {
  constructor(config) {
    this.id = config.id;
    this.description = config.description;
    this.type = config.type;
    this.target = config.target;
    this.current = 0;
    this.completed = false;
  }

  update(amount = 1) {
    this.current += amount;
    if (this.current >= this.target) {
      this.completed = true;
    }
  }
}
