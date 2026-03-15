// Player.js - Simple player prefab with basic stats and luck
class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');

    // Add to physics if scene exists
    if (scene) {
      scene.physics.add.existing(this);
      scene.add.existing(this);
    }

    // Basic stats
    this.name = 'Adventurer';
    this.level = 1;
    this.hp = 100;
    this.maxHp = 100;
    this.atk = 10;
    this.def = 5;
    this.luck = 0; // Luck affects dodge and drop rates
    this.exp = 0;
    this.expToNext = 10;
    this.gold = 0;

    // Equipment slots
    this.equipment = {
      weapon: null,
      armor: null,
      accessory: null,
    };

    // Inventory
    this.inventory = [];
    this.maxInventory = 20;
  }

  // Calculate total stats including equipment
  getTotalStats() {
    const total = {
      hp: this.hp,
      maxHp: this.maxHp,
      atk: this.atk,
      def: this.def,
      luck: this.luck,
    };

    // Add weapon bonus
    if (this.equipment.weapon && this.equipment.weapon.stats) {
      total.atk += this.equipment.weapon.stats.atkBonus || 0;
      total.luck += this.equipment.weapon.stats.luckBonus || 0;
    }

    // Add armor bonus
    if (this.equipment.armor && this.equipment.armor.stats) {
      total.def += this.equipment.armor.stats.defBonus || 0;
      total.maxHp += this.equipment.armor.stats.hpBonus || 0;
      total.luck += this.equipment.armor.stats.luckBonus || 0;
    }

    // Add accessory bonus
    if (this.equipment.accessory && this.equipment.accessory.stats) {
      total.atk += this.equipment.accessory.stats.atkBonus || 0;
      total.def += this.equipment.accessory.stats.defBonus || 0;
      total.maxHp += this.equipment.accessory.stats.hpBonus || 0;
      total.luck += this.equipment.accessory.stats.luckBonus || 0;
    }

    return total;
  }

  // Dodge chance is based on luck
  // Formula: 2% base + (luck * 0.5%) - capped at 25%
  getDodgeChance() {
    const stats = this.getTotalStats();
    return Math.min(0.25, 0.02 + (stats.luck * 0.005));
  }

  // Drop rate multiplier based on luck
  // Formula: 1.0 + (luck * 0.02) - so 10 luck = 1.2x better drops
  getLuckMultiplier() {
    const stats = this.getTotalStats();
    return 1.0 + (stats.luck * 0.02);
  }

  // Add experience and level up if needed
  addExp(amount) {
    this.exp += Math.max(0, Math.floor(Number(amount) || 0));
    this.expToNext = this.getRequiredExpForLevel(this.level);

    while (this.exp >= this.expToNext) {
      this.exp -= this.expToNext;
      this.levelUp();
    }
  }

  getRequiredExpForLevel(level = this.level) {
    const safeLevel = Math.max(1, Number(level) || 1);
    return Math.max(10, Math.round(10 * (1 + (safeLevel - 1) * 0.1)));
  }

  // Level up increases stats
  levelUp() {
    this.level++;
    this.expToNext = this.getRequiredExpForLevel(this.level);

    // Stat increases
    this.maxHp += 10;
    this.hp = Math.min(this.maxHp, this.hp + 10);
    this.atk += 1;
    this.def += 1;

    // Show level up effect if in a scene
    if (this.scene) {
      this.showLevelUp();
    }
  }

  // Visual feedback for level up
  showLevelUp() {
    const text = this.scene.add.text(this.x, this.y - 30, 'LEVEL UP!', {
      fontSize: '20px',
      fill: '#ff0',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 50,
      alpha: 0,
      duration: 2000,
      onComplete: () => text.destroy(),
    });
  }

  // Add item to inventory
  addItem(itemData) {
    if (this.inventory.length < this.maxInventory) {
      this.inventory.push(itemData);
      return true;
    }
    return false;
  }

  // Remove item from inventory
  removeItem(itemId) {
    const index = this.inventory.findIndex((i) => i.id === itemId);
    if (index !== -1) {
      return this.inventory.splice(index, 1)[0];
    }
    return null;
  }

  // Equip an item
  equipItem(itemData) {
    if (!itemData || !itemData.type) return false;
    if (!['weapon', 'armor', 'accessory'].includes(itemData.type)) return false;

    // Unequip current item if exists
    if (this.equipment[itemData.type]) {
      this.inventory.push(this.equipment[itemData.type]);
    }

    // Equip new item
    this.equipment[itemData.type] = itemData;

    // Remove from inventory
    const index = this.inventory.findIndex((i) => i.id === itemData.id);
    if (index !== -1) this.inventory.splice(index, 1);

    return true;
  }

  // Unequip an item from a slot
  unequipItem(slot) {
    if (!this.equipment[slot]) return false;

    if (this.inventory.length < this.maxInventory) {
      this.inventory.push(this.equipment[slot]);
      this.equipment[slot] = null;
      return true;
    }
    return false;
  }

  // Take damage (returns damage actually taken and if dodged)
  takeDamage(amount) {
    const stats = this.getTotalStats();

    // Check dodge first
    const dodgeChance = this.getDodgeChance();
    if (Math.random() < dodgeChance) {
      return { damage: 0, dodged: true };
    }

    // Calculate damage after defense
    const reducedDamage = Math.max(1, amount - stats.def);
    this.hp -= reducedDamage;
    return { damage: reducedDamage, dodged: false };
  }

  // Check if player is alive
  isAlive() {
    return this.hp > 0;
  }

  // Heal player
  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  // Convert to JSON for saving
  toJSON() {
    return {
      name: this.name,
      level: this.level,
      hp: this.hp,
      maxHp: this.maxHp,
      atk: this.atk,
      def: this.def,
      luck: this.luck,
      exp: this.exp,
      expToNext: this.expToNext || this.getRequiredExpForLevel(this.level),
      gold: this.gold,
      equipment: this.equipment,
      inventory: this.inventory,
      maxInventory: this.maxInventory,
    };
  }

  // Load from JSON
  fromJSON(data) {
    this.name = data.name || 'Adventurer';
    this.level = data.level || 1;
    this.hp = data.hp || 100;
    this.maxHp = data.maxHp || 100;
    this.atk = data.atk || 10;
    this.def = data.def || 5;
    this.luck = data.luck || 0;
    this.exp = data.exp || 0;
    this.expToNext = data.expToNext || this.getRequiredExpForLevel(this.level);
    this.gold = data.gold || 0;
    this.equipment = data.equipment ||
      { weapon: null, armor: null, accessory: null };
    this.inventory = data.inventory || [];
    this.maxInventory = data.maxInventory || 20;
  }
}

globalThis.Player = Player;
