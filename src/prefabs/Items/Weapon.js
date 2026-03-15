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

    // Calculate base stats
    const baseAtk = tier * 5;
    const variance = 0.8 + Math.random() * 0.4;

    // 80% chance for ATK bonus, 20% chance for luck
    const stats = {
      atkBonus: Math.floor(baseAtk * variance),
    };

    // 20% chance for luck bonus
    if (Math.random() < 0.2) {
      stats.luckBonus = 0.01 * tier; // 1% per tier
    }

    // Apply upgrade level to stats (each upgrade increases by 4% of base)
    // At max level (5) with tier 1: +20% of base stat
    // At max level (5) with tier 6: +30% of base stat
    const upgradeMultiplier = 1 + (upgradeLevel * 0.04 * (1 + (tier * 0.02)));

    if (stats.atkBonus) {
      stats.atkBonus = Math.floor(stats.atkBonus * upgradeMultiplier);
    }
    if (stats.luckBonus) {
      stats.luckBonus = stats.luckBonus * upgradeMultiplier;
    }

    // Sell price based on tier and upgrade level
    const basePrice = Math.floor(20 * tier);
    const upgradePriceBonus = basePrice * 0.1 * upgradeLevel;
    const sellPrice = Math.floor(basePrice + upgradePriceBonus);

    return {
      id: `weapon_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name,
      type: 'weapon',
      tier: tier,
      upgradeLevel: upgradeLevel,
      maxUpgradeLevel: 5,
      value: sellPrice, // Sell price
      buyPrice: Math.floor(sellPrice * 2), // Buy price (for future shop)
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
      gold: Math.floor(30 * tier * (1 + nextLevel * 0.2)),
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
      increase[key] = Math.floor(value * (nextMultiplier / currentMultiplier)) -
        value;
    }

    return increase;
  }
}

globalThis.Weapon = Weapon;
