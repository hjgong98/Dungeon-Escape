// Armor.js - Armor item class
class Armor extends GameItem {
  constructor(scene, x, y, tier = 1, upgradeLevel = 0) {
    const armorData = Armor.generate(tier, upgradeLevel);
    super(scene, x, y, armorData);
    this.upgradeLevel = upgradeLevel || 0;
    this.maxUpgradeLevel = 5;
  }

  static generate(tier = 1, upgradeLevel = 0) {
    // Tier-based names
    const tierNames = {
      1: 'Leather', // Common
      2: 'Iron', // Uncommon
      3: 'Steel', // Rare
      4: 'Crystal', // Epic
      5: 'Dragon', // Legendary
      6: 'Mythic', // Mythic
    };

    const types = ['Chestplate', 'Helm', 'Greaves', 'Pauldrons', 'Robe'];

    const prefix = tierNames[tier] || 'Leather';
    const type = types[Math.floor(Math.random() * types.length)];
    const name = `${prefix} ${type}`;

    const rollType = Armor.pickRollType();
    const stats = Armor.buildStats(tier, upgradeLevel, rollType);

    // Sell price based on tier and upgrade level
    const basePrice = Math.floor(25 * tier);
    const upgradePriceBonus = basePrice * 0.1 * upgradeLevel;
    const sellPrice = Math.floor(basePrice + upgradePriceBonus);

    return {
      id: `armor_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name,
      type: 'armor',
      tier: tier,
      armorRollType: rollType,
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
    const roll = Math.random();
    if (roll < 0.4) return 'defPct';
    if (roll < 0.8) return 'hpPct';
    return 'luck';
  }

  static getRarityScaledMaxPct(tier) {
    const safeTier = Phaser.Math.Clamp(Number(tier) || 1, 1, 6);
    // Tier 1 => 20%, Tier 6 => 40% in +4% steps.
    return 0.2 + (safeTier - 1) * 0.04;
  }

  static getRarityScaledMinPct(tier) {
    const maxPct = Armor.getRarityScaledMaxPct(tier);
    return Math.max(0, maxPct - 0.1);
  }

  static getRarityScaledMaxLuck(tier) {
    const safeTier = Phaser.Math.Clamp(Number(tier) || 1, 1, 6);
    return 0.2 + (safeTier - 1) * 0.02;
  }

  static getRarityScaledMinLuck(tier) {
    const maxLuck = Armor.getRarityScaledMaxLuck(tier);
    return Math.max(0, maxLuck - 0.1);
  }

  static scaleByLevel(minValue, maxValue, upgradeLevel) {
    const safeLevel = Phaser.Math.Clamp(Number(upgradeLevel) || 0, 0, 5);
    const t = safeLevel / 5;
    return minValue + (maxValue - minValue) * t;
  }

  static buildStats(tier = 1, upgradeLevel = 0, rollType = null) {
    const safeTier = Phaser.Math.Clamp(Number(tier) || 1, 1, 6);
    const safeLevel = Phaser.Math.Clamp(Number(upgradeLevel) || 0, 0, 5);

    const stats = {
      defBonus: safeTier * 5 + safeLevel * 5,
      hpBonus: safeTier * 10 + safeLevel * 10,
    };

    const resolvedRollType =
      rollType === 'defPct' || rollType === 'hpPct' || rollType === 'luck'
        ? rollType
        : Armor.pickRollType();

    const maxPctAtLevel5 = Armor.getRarityScaledMaxPct(safeTier);
    const minPctAtLevel0 = Armor.getRarityScaledMinPct(safeTier);
    const scaledPct = Armor.scaleByLevel(
      minPctAtLevel0,
      maxPctAtLevel5,
      safeLevel,
    );

    const maxLuckAtLevel5 = Armor.getRarityScaledMaxLuck(safeTier);
    const minLuckAtLevel0 = Armor.getRarityScaledMinLuck(safeTier);
    const scaledLuck = Armor.scaleByLevel(
      minLuckAtLevel0,
      maxLuckAtLevel5,
      safeLevel,
    );

    if (resolvedRollType === 'defPct') {
      stats.defPctBonus = scaledPct;
    } else if (resolvedRollType === 'hpPct') {
      stats.hpPctBonus = scaledPct;
    } else {
      stats.luckBonus = scaledLuck;
    }

    return stats;
  }

  // Get upgrade cost for next level
  getNextUpgradeCost() {
    if (this.upgradeLevel >= this.maxUpgradeLevel) return null;

    const tier = this.itemData.tier;
    const nextLevel = this.upgradeLevel + 1;

    return {
      gold: Math.floor(35 * tier * (1 + nextLevel * 0.2)),
      materials: Math.floor(3 * tier * (1 + nextLevel * 0.1)),
    };
  }

  // Get stat increase preview for next upgrade
  getNextUpgradePreview() {
    if (this.upgradeLevel >= this.maxUpgradeLevel) return null;

    const currentRollType = this.itemData.armorRollType ||
      (this.itemData.stats?.defPctBonus
        ? 'defPct'
        : (this.itemData.stats?.hpPctBonus ? 'hpPct' : 'luck'));
    const currentStats = Armor.buildStats(
      this.itemData.tier,
      this.upgradeLevel,
      currentRollType,
    );
    const nextStats = Armor.buildStats(
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

globalThis.Armor = Armor;
