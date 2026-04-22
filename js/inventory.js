// 背包系统
const Inventory = {
    add(itemId) {
        const item = ITEMS.find(i => i.id === itemId);
        if (item && Game.state.inventory.length < CONFIG.MAX_INVENTORY) {
            Game.state.inventory.push(item);
            Game.save();
            UI.render();
        }
    },

    use(index) {
        const item = Game.state.inventory[index];
        if (!item) return;

        Game.state.inventory.splice(index, 1);
        Game.save();
        
        this.showUseEffect(item);
        UI.render();
    },

    showUseEffect(item) {
        alert(`使用了${item.icon}${item.name}！\n\n${item.desc}`);
    }
};
