const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 800,
  height: 600,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600,
  },
  physics: {
    default: 'arcade',
    arcade: {
      // set to true when testing collisions
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

// Game state - simple object to hold player data
const gameState = {
  player: {
    name: 'Adventurer',
    class: 'bow',
    level: 1,
    hp: 100,
    maxHP: 100,
    atk: 10,
    def: 5,
    dodge: 0.05,
    exp: 0,
    expToNext: 100,
    inventory: [],
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
};

globalThis.gameState = gameState;

// Add some test items so we have something to look at
gameState.player.inventory.push({
  id: 'sword_1',
  name: 'Iron Sword',
  type: 'weapon',
  tier: 2,
  value: 50,
  stats: { atkBonus: 5 },
});

gameState.player.inventory.push({
  id: 'potion_1',
  name: 'Health Potion',
  type: 'health',
  tier: 1,
  value: 20,
  stats: { hpRestore: 30 },
});

gameState.player.inventory.push({
  id: 'scrap_1',
  name: 'Crafting Scrap',
  type: 'material',
  tier: 1,
  value: 5,
  stats: {},
});
