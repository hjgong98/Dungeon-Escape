const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 800,
  height: 600,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [
    Menu,
    Instructions,
    Play,
    Inventory,
    Upgrades,
    Dungeons,
    Credits,
    Saves,
  ],
};

const game = new Phaser.Game(config);
globalThis.game = game;

// Game state
const gameState = {
  player: {
    name: 'Adventurer',
    level: 1,
    hp: 100,
    maxHP: 100,
    atk: 10,
    def: 5,
    luck: 0,
    exp: 0,
    expToNext: 10,
    gold: 50,
    maxInventory: 20,
    bagSlots: 20,
    storageSlots: 20,
    inventory: [], // Bag items (lost on death)
    storage: [], // Storage items (permanent)
    equipment: {
      weapon: null,
      armor: null,
      accessory: null,
    },
  },
  settings: {
    sound: true,
    music: true,
  },
  currentSaveId: null,
  lootTables: {},
};

gameState.player.addItem = function addItem(itemData) {
  if (!Array.isArray(this.inventory)) {
    this.inventory = [];
  }
  this.inventory.push(itemData);
  return true;
};

gameState.player.addToStorage = function addToStorage(itemData) {
  if (!Array.isArray(this.storage)) {
    this.storage = [];
  }
  this.storage.push(itemData);
  return true;
};

globalThis.gameState = gameState;
