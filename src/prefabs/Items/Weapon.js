// Weapon.js - Weapon item class
class Weapon extends GameItem {
  constructor(scene, x, y, tier = 1, upgradeLevel = 0) {
    const weaponData = Weapon.generate(tier, upgradeLevel);
    super(scene, x, y, weaponData);
    this.upgradeLevel = upgradeLevel || 0;
    this.maxUpgradeLevel = 5;
  }

  static generate(tier = 1, upgradeLevel = 0) {
    // Tier-based names
    const tierNames = {
      1: 'Iron', // Common
      2: 'Steel', // Uncommon
      3: 'Dark', // Rare
      4: 'Runic', // Epic
      5: 'Ancient', // Legendary
      6: 'Mythril', // Mythic
    };

    const types = ['Sword', 'Axe', 'Bow', 'Staff', 'Dagger', 'Hammer'];

    const prefix = tierNames[tier] || 'Iron';
    const type = types[Math.floor(Math.random() * types.length)];
    const name = `${prefix} ${type}`;

    const rollType = Weapon.pickRollType();
    const stats = Weapon.buildStats(tier, upgradeLevel, rollType);

    // Sell price based on tier and upgrade level
    const basePrice = Math.floor(20 * tier);
    const upgradePriceBonus = basePrice * 0.1 * upgradeLevel;
    const sellPrice = Math.floor(basePrice + upgradePriceBonus);

    return {
      id: `weapon_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name,
      type: 'weapon',
      tier: tier,
      weaponRollType: rollType,
      upgradeLevel: upgradeLevel,
      maxUpgradeLevel: 5,
      value: sellPrice, // Sell price
      buyPrice: Math.floor(sellPrice * 2), // Buy price (for future shop)
      sellable: true,
      stats: stats,
      requiredLevel: Math.max(1, tier * 2 - 1),
    };
  }

  static pickRollType() {
    return Math.random() < 0.8 ? 'atkPct' : 'luck';
  }

  static getRarityScaledMaxAtkPct(tier) {
    const safeTier = Phaser.Math.Clamp(Number(tier) || 1, 1, 6);
    return 0.2 + (safeTier - 1) * 0.04;
  }

  static getRarityScaledMinAtkPct(tier) {
    return Math.max(0, Weapon.getRarityScaledMaxAtkPct(tier) - 0.1);
  }

  static getRarityScaledMaxLuck(tier) {
    const safeTier = Phaser.Math.Clamp(Number(tier) || 1, 1, 6);
    return 0.2 + (safeTier - 1) * 0.02;
  }

  static getRarityScaledMinLuck(tier) {
    return Math.max(0, Weapon.getRarityScaledMaxLuck(tier) - 0.1);
  }

  static scaleByLevel(minValue, maxValue, upgradeLevel) {
    const safeLevel = Phaser.Math.Clamp(Number(upgradeLevel) || 0, 0, 5);
    return minValue + (maxValue - minValue) * (safeLevel / 5);
  }

  static buildStats(tier = 1, upgradeLevel = 0, rollType = null) {
    const safeTier = Phaser.Math.Clamp(Number(tier) || 1, 1, 6);
    const safeLevel = Phaser.Math.Clamp(Number(upgradeLevel) || 0, 0, 5);
    const resolvedRollType = rollType === 'atkPct' || rollType === 'luck'
      ? rollType
      : Weapon.pickRollType();

    const stats = {
      atkBonus: safeTier * 5 + safeLevel * 5,
    };

    if (resolvedRollType === 'atkPct') {
      stats.atkPctBonus = Weapon.scaleByLevel(
        Weapon.getRarityScaledMinAtkPct(safeTier),
        Weapon.getRarityScaledMaxAtkPct(safeTier),
        safeLevel,
      );
    } else {
      stats.luckBonus = Weapon.scaleByLevel(
        Weapon.getRarityScaledMinLuck(safeTier),
        Weapon.getRarityScaledMaxLuck(safeTier),
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
      gold: Math.floor(30 * tier * (1 + nextLevel * 0.2)),
      materials: Math.floor(2 * tier * (1 + nextLevel * 0.1)),
    };
  }

  // Get stat increase preview for next upgrade
  getNextUpgradePreview() {
    if (this.upgradeLevel >= this.maxUpgradeLevel) return null;

    const currentRollType = this.itemData.weaponRollType ||
      (this.itemData.stats?.atkPctBonus ? 'atkPct' : 'luck');
    const currentStats = Weapon.buildStats(
      this.itemData.tier,
      this.upgradeLevel,
      currentRollType,
    );
    const nextStats = Weapon.buildStats(
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

globalThis.Weapon = Weapon;
