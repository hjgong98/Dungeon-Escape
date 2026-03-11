// Player.js - Player prefab with simplified stats
class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    
    // Add to physics
    if (scene) {
      scene.physics.add.existing(this);
      scene.add.existing(this);
    }
    
    // Core stats - simplified
    this.baseStats = {
      hp: 100,
      maxHp: 100,
      atk: 10,
      def: 5,
      luck: 0
    };
    
    this.level = 1;
    this.exp = 0;
    this.expToNext = this.calcExpToNext();
    
    // Equipment slots
    this.equipment = {
      weapon: null,
      armor: null,
      accessory: null
    };
    
    // Inventory
    this.inventory = [];
    this.maxInventory = 20;
    
    // Class and name
    this.class = 'warrior';
    this.name = 'Adventurer';
    this.gold = 0;
  }

  setClass(className) {
    this.class = className;
    
    switch(className) {
      case 'warrior':
        this.baseStats.maxHp = 120;
        this.baseStats.hp = 120;
        this.baseStats.atk = 12;
        this.baseStats.def = 8;
        this.baseStats.luck = 0;
        break;
        
      case 'mage':
        this.baseStats.maxHp = 80;
        this.baseStats.hp = 80;
        this.baseStats.atk = 15;
        this.baseStats.def = 3;
        this.baseStats.luck = 5;
        break;
        
      case 'rogue':
        this.baseStats.maxHp = 90;
        this.baseStats.hp = 90;
        this.baseStats.atk = 11;
        this.baseStats.def = 4;
        this.baseStats.luck = 10;
        break;
        
      case 'bow':
        this.baseStats.maxHp = 95;
        this.baseStats.hp = 95;
        this.baseStats.atk = 13;
        this.baseStats.def = 5;
        this.baseStats.luck = 3;
        break;
    }
  }

  getTotalStats() {
    const total = { ...this.baseStats };
    
    if (this.equipment.weapon) {
      total.atk += this.equipment.weapon.stats.atkBonus || 0;
      total.luck += this.equipment.weapon.stats.luckBonus || 0;
    }
    
    if (this.equipment.armor) {
      total.def += this.equipment.armor.stats.defBonus || 0;
      total.maxHp += this.equipment.armor.stats.hpBonus || 0;
      total.luck += this.equipment.armor.stats.luckBonus || 0;
    }
    
    if (this.equipment.accessory) {
      total.luck += this.equipment.accessory.stats.luckBonus || 0;
      total.maxHp += this.equipment.accessory.stats.hpBonus || 0;
      total.def += this.equipment.accessory.stats.defBonus || 0;
      total.atk += this.equipment.accessory.stats.atkBonus || 0;
    }
    
    return total;
  }

  getDodgeChance() {
    const stats = this.getTotalStats();
    return Math.min(0.25, 0.02 + (stats.luck * 0.005));
  }

  getLuckMultiplier() {
    const stats = this.getTotalStats();
    return 1.0 + (stats.luck * 0.02);
  }

  addExp(amount) {
    this.exp += amount;
    
    while (this.exp >= this.expToNext) {
      this.levelUp();
    }
  }

  levelUp() {
    this.level++;
    this.exp -= this.expToNext;
    this.expToNext = this.calcExpToNext();
    
    this.baseStats.maxHp += 8;
    this.baseStats.hp = this.baseStats.maxHp;
    this.baseStats.atk += 2;
    this.baseStats.def += 1;
    
    switch(this.class) {
      case 'warrior':
        this.baseStats.maxHp += 4;
        this.baseStats.def += 1;
        break;
      case 'mage':
        this.baseStats.atk += 2;
        this.baseStats.luck += 1;
        break;
      case 'rogue':
        this.baseStats.luck += 2;
        break;
      case 'bow':
        this.baseStats.atk += 1;
        this.baseStats.luck += 1;
        break;
    }
    
    if (this.scene) {
      this.showLevelUp();
    }
  }

  showLevelUp() {
    const text = this.scene.add.text(this.x, this.y - 30, 'LEVEL UP!', {
      fontSize: '20px',
      fill: '#ff0',
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(0.5);
    
    this.scene.tweens.add({
      targets: text,
      y: text.y - 50,
      alpha: 0,
      duration: 2000,
      onComplete: () => text.destroy()
    });
  }

  calcExpToNext() {
    return Math.floor(100 * Math.pow(1.2, this.level - 1));
  }

  addItem(itemData) {
    if (this.inventory.length < this.maxInventory) {
      this.inventory.push(itemData);
      return true;
    }
    return false;
  }

  removeItem(itemId) {
    const index = this.inventory.findIndex(i => i.id === itemId);
    if (index !== -1) {
      return this.inventory.splice(index, 1)[0];
    }
    return null;
  }

  equipItem(itemData) {
    if (!itemData || !itemData.type) return false;
    if (!['weapon', 'armor', 'accessory'].includes(itemData.type)) return false;
    
    if (this.equipment[itemData.type]) {
      this.inventory.push(this.equipment[itemData.type]);
    }
    
    this.equipment[itemData.type] = itemData;
    
    const index = this.inventory.findIndex(i => i.id === itemData.id);
    if (index !== -1) this.inventory.splice(index, 1);
    
    return true;
  }

  unequipItem(slot) {
    if (!this.equipment[slot]) return false;
    
    if (this.inventory.length < this.maxInventory) {
      this.inventory.push(this.equipment[slot]);
      this.equipment[slot] = null;
      return true;
    }
    return false;
  }

  takeDamage(amount) {
    const stats = this.getTotalStats();
    const reduced = Math.max(1, amount - stats.def);
    
    const dodgeChance = this.getDodgeChance();
    if (Math.random() < dodgeChance) {
      return { dodged: true, damage: 0 };
    }
    
    this.baseStats.hp -= reduced;
    return { dodged: false, damage: reduced };
  }

  toJSON() {
    return {
      name: this.name,
      class: this.class,
      level: this.level,
      exp: this.exp,
      expToNext: this.expToNext,
      baseStats: this.baseStats,
      equipment: this.equipment,
      inventory: this.inventory,
      maxInventory: this.maxInventory,
      gold: this.gold
    };
  }

  fromJSON(data) {
    this.name = data.name || 'Adventurer';
    this.class = data.class || 'warrior';
    this.level = data.level || 1;
    this.exp = data.exp || 0;
    this.expToNext = data.expToNext || 100;
    this.baseStats = data.baseStats || {
      hp: 100,
      maxHp: 100,
      atk: 10,
      def: 5,
      luck: 0
    };
    this.equipment = data.equipment || {
      weapon: null,
      armor: null,
      accessory: null
    };
    this.inventory = data.inventory || [];
    this.maxInventory = data.maxInventory || 20;
    this.gold = data.gold || 0;
    
    this.setClass(this.class);
  }
}

globalThis.Player = Player;
console.log('Player class loaded');
