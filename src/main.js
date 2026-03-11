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

// Game state - simple object to hold player data
const gameState = {
  player: {
    name: "Adventurer",
    level: 1,
    hp: 100,
    maxHP: 100,
    atk: 10,
    def: 5,
    exp: 0,
    expToNext: 100,
    gold: 0,
    inventory: [],
    equipment: {
      weapon: null,
      armor: null,
      accessory: null
    }
  },
  settings: {
    sound: true,
    music: true,
  },
};

globalThis.gameState = gameState;
