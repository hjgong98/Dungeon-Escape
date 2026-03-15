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

    // Calculate base stats
    const baseDef = tier * 4;
    const baseHp = tier * 8;
    const variance = 0.8 + Math.random() * 0.4;

    // Armor always has def and hp, plus 20% chance for extra luck
    const stats = {
      defBonus: Math.floor(baseDef * variance),
      hpBonus: Math.floor(baseHp * variance),
      luckBonus: 0.015 * tier, // Always has some luck (your original had this)
    };

    // Apply upgrade level to stats (each upgrade increases by 4% of base)
    // At max level (5) with tier 1: +20% of base stat
    // At max level (5) with tier 6: +30% of base stat
    const upgradeMultiplier = 1 + (upgradeLevel * 0.04 * (1 + (tier * 0.02)));

    stats.defBonus = Math.floor(stats.defBonus * upgradeMultiplier);
    stats.hpBonus = Math.floor(stats.hpBonus * upgradeMultiplier);
    stats.luckBonus = stats.luckBonus * upgradeMultiplier;

    // Sell price based on tier and upgrade level
    const basePrice = Math.floor(25 * tier);
    const upgradePriceBonus = basePrice * 0.1 * upgradeLevel;
    const sellPrice = Math.floor(basePrice + upgradePriceBonus);

    return {
      id: `armor_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name,
      type: 'armor',
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
      gold: Math.floor(35 * tier * (1 + nextLevel * 0.2)),
      materials: Math.floor(3 * tier * (1 + nextLevel * 0.1)),
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
      if (key === 'defBonus' || key === 'hpBonus') {
        increase[key] =
          Math.floor(value * (nextMultiplier / currentMultiplier)) - value;
      } else {
        increase[key] = (value * (nextMultiplier / currentMultiplier)) - value;
      }
    }

    return increase;
  }
}

globalThis.Armor = Armor;
