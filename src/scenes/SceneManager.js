class SceneManager {
  constructor(engine) {
    this.engine = engine;
    this.scenes = new Map();
  }

  registerScene(scene) {
    this.scenes.set(scene.id, scene);
  }

  getScene(sceneId) {
    return this.scenes.get(sceneId);
  }

  getAllScenes() {
    return Array.from(this.scenes.values());
  }
}

class BaseScene {
  constructor(id, name, description) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.interactiveElements = [];
    this.characters = [];
    this.hotspots = [];
  }

  addInteractiveElement(element) {
    this.interactiveElements.push(element);
  }

  addCharacter(character) {
    this.characters.push(character);
  }

  addHotspot(hotspot) {
    this.hotspots.push(hotspot);
  }

  render() {
    throw new Error('render() must be implemented by subclass');
  }
}
