// Weapon.js - Weapon item class
class Weapon extends GameItem {
  constructor(scene, x, y, tier = 1) {
    // Generate weapon data
    const weaponData = Weapon.generate(tier);
    super(scene, x, y, weaponData);
  }

  static generate(tier) {
    const prefixes = ['Iron', 'Steel', 'Dark', 'Runic', 'Ancient', 'Mythril'];
    const types = ['Sword', 'Axe', 'Bow', 'Staff', 'Dagger', 'Hammer'];

    const name = `${prefixes[Math.min(tier - 1, prefixes.length - 1)]} ${
      types[Math.floor(Math.random() * types.length)]
    }`;

    // Calculate stats
    const baseAtk = tier * 5;
    const variance = 0.8 + Math.random() * 0.4;

    return {
      id: `weapon_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name,
      type: 'weapon',
      tier: tier,
      value: Math.floor(20 * tier),
      stats: {
        atkBonus: Math.floor(baseAtk * variance),
        critChance: 0.01 * tier,
        critDamage: 0.5 + (0.05 * tier),
      },
      requiredLevel: Math.max(1, tier * 2 - 1),
    };
  }
}

globalThis.Weapon = Weapon;
