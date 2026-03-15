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

    const rollType = Accessory.pickRollType();
    const stats = Accessory.buildStats(tier, upgradeLevel, rollType);

    // Sell price based on tier and upgrade level
    const basePrice = Math.floor(30 * tier);
    const upgradePriceBonus = basePrice * 0.1 * upgradeLevel;
    const sellPrice = Math.floor(basePrice + upgradePriceBonus);

    return {
      id: `accessory_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name,
      type: 'accessory',
      tier: tier,
      accessoryRollType: rollType,
      upgradeLevel: upgradeLevel,
      maxUpgradeLevel: 5,
      value: sellPrice,
      buyPrice: Math.floor(sellPrice * 2),
      sellable: true,
      stats: stats,
      requiredLevel: Math.max(1, tier * 2 - 1),
    };
  }

  static pickRollType() {
    const rand = Math.random();
    if (rand < 0.4) return 'luck';
    if (rand < 0.7) return 'exp';
    return 'gold';
  }

  static scaleByLevel(minValue, maxValue, upgradeLevel) {
    const safeLevel = Phaser.Math.Clamp(Number(upgradeLevel) || 0, 0, 5);
    return minValue + (maxValue - minValue) * (safeLevel / 5);
  }

  static getLuckRangeForTier(tier) {
    const safeTier = Phaser.Math.Clamp(Number(tier) || 1, 1, 6);
    return {
      min: 0.1 + (safeTier - 1) * 0.02,
      max: 0.2 + (safeTier - 1) * 0.02,
    };
  }

  static getExpGoldRangeForTier(tier) {
    const safeTier = Phaser.Math.Clamp(Number(tier) || 1, 1, 6);
    return {
      min: 0.3 + (safeTier - 1) * 0.04,
      max: 0.4 + (safeTier - 1) * 0.04,
    };
  }

  static buildStats(tier = 1, upgradeLevel = 0, rollType = null) {
    const safeTier = Phaser.Math.Clamp(Number(tier) || 1, 1, 6);
    const safeLevel = Phaser.Math.Clamp(Number(upgradeLevel) || 0, 0, 5);
    const resolvedRollType = ['luck', 'exp', 'gold'].includes(rollType)
      ? rollType
      : Accessory.pickRollType();
    const stats = {};

    if (resolvedRollType === 'luck') {
      const range = Accessory.getLuckRangeForTier(safeTier);
      stats.luckBonus = Accessory.scaleByLevel(range.min, range.max, safeLevel);
    } else if (resolvedRollType === 'exp') {
      const range = Accessory.getExpGoldRangeForTier(safeTier);
      stats.expBonus = Accessory.scaleByLevel(range.min, range.max, safeLevel);
    } else {
      const range = Accessory.getExpGoldRangeForTier(safeTier);
      stats.goldBonus = Accessory.scaleByLevel(
        range.min,
        range.max,
        safeLevel,
      );
    }

    return stats;
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

    const currentRollType = this.itemData.accessoryRollType ||
      (this.itemData.stats?.expBonus
        ? 'exp'
        : (this.itemData.stats?.goldBonus ? 'gold' : 'luck'));
    const currentStats = Accessory.buildStats(
      this.itemData.tier,
      this.upgradeLevel,
      currentRollType,
    );
    const nextStats = Accessory.buildStats(
      this.itemData.tier,
      this.upgradeLevel + 1,
      currentRollType,
    );

    const increase = {};
    for (const [key, value] of Object.entries(nextStats)) {
      increase[key] = value - (currentStats[key] || 0);
    }

    return increase;
  }
}

globalThis.Accessory = Accessory;
