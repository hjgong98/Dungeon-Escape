// Items.js - Base item class
class GameItem extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, itemData) {
    super(scene, x, y, '');

    this.itemData = itemData || {
      id: `item_${Date.now()}_${Math.random()}`,
      name: 'Unknown Item',
      type: 'material',
      tier: 1,
      value: 1,
      stats: {},
    };
  }

  // Get color based on tier
  getTierColor() {
    const colors = {
      1: 0x888888, // Common - Gray
      2: 0x44aa44, // Uncommon - Green
      3: 0x4444aa, // Rare - Blue
      4: 0xaa44aa, // Epic - Purple
      5: 0xffaa00, // Legendary - Orange
      6: 0xff55ff, // Mythic - Pink
    };
    return colors[this.itemData.tier] || 0x888888;
  }

  // Get tier name
  getTierName() {
    const names = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];
    return names[this.itemData.tier - 1] || `Tier ${this.itemData.tier}`;
  }

  static generateCraftingMaterial(tier = 1) {
    return {
      id: `craft_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: `craft(${tier})`,
      type: 'crafting_material',
      tier: tier,
      value: Math.max(1, Math.floor(8 * tier)),
      sellable: true,
      stats: {},
      use: 'crafting',
    };
  }

  static generateSellingMaterial(tier = 1) {
    return {
      id: `selling_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: `selling(${tier})`,
      type: 'selling_material',
      tier: tier,
      value: Math.max(1, Math.floor(12 * tier)),
      sellable: true,
      onlyForSelling: true,
      stats: {},
      use: 'vendor',
    };
  }

  // Display stats as string
  getStatsString() {
    const stats = [];
    for (const [key, value] of Object.entries(this.itemData.stats)) {
      if (typeof value === 'number') {
        if (key.includes('Bonus')) {
          stats.push(`${key.replace('Bonus', '')}: +${value}`);
        } else if (
          key.includes('Chance') || key.includes('dodge') ||
          key.includes('luck')
        ) {
          stats.push(`${key}: +${Math.floor(value * 100)}%`);
        } else {
          stats.push(`${key}: +${value}`);
        }
      }
    }
    return stats.join(', ');
  }
}

globalThis.GameItem = GameItem;
