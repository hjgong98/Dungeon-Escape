// Armor.js - Armor item class
class Armor extends GameItem {
  constructor(scene, x, y, tier = 1) {
    const armorData = Armor.generate(tier);
    super(scene, x, y, armorData);
  }

  static generate(tier) {
    const prefixes = [
      'Leather',
      'Iron',
      'Steel',
      'Crystal',
      'Dragon',
      'Mythic',
    ];
    const types = ['Chestplate', 'Helm', 'Greaves', 'Pauldrons', 'Robe'];

    const name = `${prefixes[Math.min(tier - 1, prefixes.length - 1)]} ${
      types[Math.floor(Math.random() * types.length)]
    }`;

    const baseDef = tier * 4;
    const baseHp = tier * 8;
    const variance = 0.8 + Math.random() * 0.4;

    return {
      id: `armor_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name,
      type: 'armor',
      tier: tier,
      value: Math.floor(25 * tier),
      sellable: true,
      stats: {
        defBonus: Math.floor(baseDef * variance),
        hpBonus: Math.floor(baseHp * variance),
        luckBonus: 0.015 * tier,
      },
      requiredLevel: Math.max(1, tier * 2 - 1),
    };
  }
}

globalThis.Armor = Armor;
