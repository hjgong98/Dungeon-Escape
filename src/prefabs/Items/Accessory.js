// Accessory.js - Accessory item class
class Accessory extends GameItem {
  constructor(scene, x, y, tier = 1, upgradeLevel = 0) {
    const accessoryData = Accessory.generate(tier, upgradeLevel);
    super(scene, x, y, accessoryData);
    this.upgradeLevel = upgradeLevel || 0;
    this.maxUpgradeLevel = 5;
  }

  static generate(tier = 1, upgradeLevel = 0) {
    // Tier-based names
    const tierNames = {
      1: 'Simple', // Common
      2: 'Enchanted', // Uncommon
      3: 'Ancient', // Rare
      4: 'Mystic', // Epic
      5: 'Divine', // Legendary
      6: 'Transcendent', // Mythic
    };

    const types = ['Ring', 'Amulet', 'Bracelet', 'Cloak', 'Crown'];

    const prefix = tierNames[tier] || 'Simple';
    const type = types[Math.floor(Math.random() * types.length)];
    const name = `${prefix} ${type}`;

    // Accessory stats distribution:
    // 40% luck, 30% exp, 30% gold
    const stats = {
      luckBonus: 0.02 * tier, // Base luck
      hpBonus: Math.floor(10 * tier), // Base HP
    };

    // Randomly assign bonus stat based on chances
    const rand = Math.random();
    if (rand < 0.4) {
      // 40% chance for extra luck
      stats.luckBonus = 0.03 * tier; // 3% per tier
    } else if (rand < 0.7) {
      // 30% chance for exp bonus
      stats.expBonus = 0.05 * tier; // 5% per tier
    } else {
      // 30% chance for gold bonus (we'll add this stat)
      stats.goldBonus = 0.05 * tier; // 5% more gold
    }

    // Apply upgrade level to stats (each upgrade increases by 4% of base)
    // At max level (5) with tier 1: +20% of base stat
    // At max level (5) with tier 6: +30% of base stat
    const upgradeMultiplier = 1 + (upgradeLevel * 0.04 * (1 + (tier * 0.02)));

    for (const key in stats) {
      if (typeof stats[key] === 'number') {
        if (key.includes('Bonus') && !key.includes('hp')) {
          stats[key] = stats[key] * upgradeMultiplier;
        } else if (key === 'hpBonus') {
          stats[key] = Math.floor(stats[key] * upgradeMultiplier);
        }
      }
    }

    // Sell price based on tier and upgrade level
    const basePrice = Math.floor(30 * tier);
    const upgradePriceBonus = basePrice * 0.1 * upgradeLevel;
    const sellPrice = Math.floor(basePrice + upgradePriceBonus);

    return {
      id: `accessory_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name,
      type: 'accessory',
      tier: tier,
      upgradeLevel: upgradeLevel,
      maxUpgradeLevel: 5,
      value: sellPrice,
      buyPrice: Math.floor(sellPrice * 2),
      sellable: true,
      stats: stats,
      requiredLevel: Math.max(1, tier * 2 - 1),
    };
  }

  // Get upgrade cost for next level
  getNextUpgradeCost() {
    if (this.upgradeLevel >= this.maxUpgradeLevel) return null;

    const tier = this.itemData.tier;
    const nextLevel = this.upgradeLevel + 1;

    return {
      gold: Math.floor(40 * tier * (1 + nextLevel * 0.2)),
      materials: Math.floor(2 * tier * (1 + nextLevel * 0.1)),
    };
  }

  // Get stat increase preview for next upgrade
  getNextUpgradePreview() {
    if (this.upgradeLevel >= this.maxUpgradeLevel) return null;

    const currentStats = { ...this.itemData.stats };
    const nextMultiplier = 1 +
      ((this.upgradeLevel + 1) * 0.04 * (1 + (this.itemData.tier * 0.02)));
    const currentMultiplier = 1 +
      (this.upgradeLevel * 0.04 * (1 + (this.itemData.tier * 0.02)));

    const increase = {};
    for (const [key, value] of Object.entries(currentStats)) {
      if (key === 'hpBonus') {
        increase[key] =
          Math.floor(value * (nextMultiplier / currentMultiplier)) - value;
      } else {
        increase[key] = (value * (nextMultiplier / currentMultiplier)) - value;
      }
    }

    return increase;
  }
}

globalThis.Accessory = Accessory;
