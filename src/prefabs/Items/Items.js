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
      upgradeLevel: 0,
      maxUpgradeLevel: 5,
    };

    this.upgradeLevel = this.itemData.upgradeLevel || 0;
    this.maxUpgradeLevel = this.itemData.maxUpgradeLevel || 5;
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
      name: `Crafting Material T${tier}`,
      type: 'crafting_material',
      tier: tier,
      value: Math.max(1, Math.floor(8 * tier)),
      sellable: true,
      stats: {},
      use: 'crafting',
      upgradeLevel: 0,
      maxUpgradeLevel: 0,
    };
  }

  static generateSellingMaterial(tier = 1) {
    return {
      id: `selling_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: `Valuable T${tier}`,
      type: 'selling_material',
      tier: tier,
      value: Math.max(1, Math.floor(12 * tier)),
      sellable: true,
      onlyForSelling: true,
      stats: {},
      use: 'vendor',
      upgradeLevel: 0,
      maxUpgradeLevel: 0,
    };
  }

  // Check if item can be upgraded
  canUpgrade() {
    return this.itemData.upgradeLevel < this.itemData.maxUpgradeLevel;
  }

  // Get upgrade cost
  getUpgradeCost() {
    if (!this.canUpgrade()) return null;

    const tier = this.itemData.tier;
    const nextLevel = this.itemData.upgradeLevel + 1;

    // Different costs based on item type
    let baseGold = 30;
    let baseMats = 2;

    switch (this.itemData.type) {
      case 'weapon':
        baseGold = 30;
        baseMats = 2;
        break;
      case 'armor':
        baseGold = 35;
        baseMats = 3;
        break;
      case 'accessory':
        baseGold = 40;
        baseMats = 2;
        break;
      default:
        return null;
    }

    return {
      gold: Math.floor(baseGold * tier * (1 + nextLevel * 0.2)),
      materials: Math.floor(baseMats * tier * (1 + nextLevel * 0.1)),
    };
  }

  // Get stats for display
  getFormattedStats() {
    const stats = [];
    for (const [key, value] of Object.entries(this.itemData.stats)) {
      if (typeof value === 'number') {
        if (key.includes('PctBonus')) {
          if (key.includes('atk')) {
            stats.push(`ATK+${Math.floor(value * 100)}%`);
          } else if (key.includes('def')) {
            stats.push(`DEF+${Math.floor(value * 100)}%`);
          } else if (key.includes('hp')) {
            stats.push(`HP+${Math.floor(value * 100)}%`);
          }
          continue;
        }
        if (key.includes('atk')) stats.push(`ATK+${value}`);
        else if (key.includes('def')) stats.push(`DEF+${value}`);
        else if (key.includes('hp')) stats.push(`HP+${value}`);
        else if (key.includes('luck')) {
          stats.push(`LCK+${Math.floor(value * 100)}%`);
        } else if (key.includes('exp')) {
          stats.push(`EXP+${Math.floor(value * 100)}%`);
        } else if (key.includes('gold')) {
          stats.push(`GLD+${Math.floor(value * 100)}%`);
        }
      }
    }
    return stats.join(' ');
  }

  // Get item color as hex
  getTierColorHex() {
    const colors = {
      1: '#888888',
      2: '#44aa44',
      3: '#4444aa',
      4: '#aa44aa',
      5: '#ffaa00',
      6: '#ff55ff',
    };
    return colors[this.itemData.tier] || '#888888';
  }

  // Display stats as string (legacy method)
  getStatsString() {
    const stats = [];
    for (const [key, value] of Object.entries(this.itemData.stats)) {
      if (typeof value === 'number') {
        if (key.includes('PctBonus')) {
          stats.push(
            `${key.replace('Bonus', '')}: +${Math.floor(value * 100)}%`,
          );
          continue;
        }
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
