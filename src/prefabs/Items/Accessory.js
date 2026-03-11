// Accessory.js - Accessory item class
class Accessory extends GameItem {
  constructor(scene, x, y, tier = 1) {
    const accessoryData = Accessory.generate(tier);
    super(scene, x, y, accessoryData);
  }

  static generate(tier) {
    const types = ['Ring', 'Amulet', 'Bracelet', 'Cloak', 'Belt'];
    const prefixes = ['Simple', 'Enchanted', 'Ancient', 'Mystic', 'Divine'];
    
    const name = `${prefixes[Math.min(tier-1, prefixes.length-1)]} ${types[Math.floor(Math.random() * types.length)]}`;
    
    return {
      id: `accessory_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name,
      type: 'accessory',
      tier: tier,
      value: Math.floor(30 * tier),
      stats: {
        luckBonus: 0.02 * tier,
        dodgeBonus: 0.01 * tier,
        hpBonus: Math.floor(10 * tier),
        expBonus: 0.05 * tier
      },
      requiredLevel: Math.max(1, tier * 2 - 1)
    };
  }
}

globalThis.Accessory = Accessory;
