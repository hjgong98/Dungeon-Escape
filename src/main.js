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
    DungeonHud,
    Credits,
    Saves,
  ],
};

const game = new Phaser.Game(config);
globalThis.game = game;

const playerSpriteOptions = [
  {
    id: 'owlet',
    name: 'Owlet',
    walkPath: './assets/player/Owlet_Monster_Walk_6.png',
    idlePath: './assets/player/Owlet_Monster_Idle_4.png',
    attackPath: './assets/player/Owlet_Monster_Attack1_4.png',
    frameWidth: 32,
    frameHeight: 32,
    walkFrameCount: 6,
    idleFrameCount: 4,
    attackFrameCount: 4,
  },
  {
    id: 'dude',
    name: 'Dude',
    walkPath: './assets/player/Dude_Monster_Walk_6.png',
    idlePath: './assets/player/Dude_Monster_Idle_4.png',
    attackPath: './assets/player/Dude_Monster_Attack1_4.png',
    frameWidth: 32,
    frameHeight: 32,
    walkFrameCount: 6,
    idleFrameCount: 4,
    attackFrameCount: 4,
  },
  {
    id: 'pink',
    name: 'Pink',
    walkPath: './assets/player/Pink_Monster_Walk_6.png',
    idlePath: './assets/player/Pink_Monster_Idle_4.png',
    attackPath: './assets/player/Pink_Monster_Attack1_4.png',
    frameWidth: 32,
    frameHeight: 32,
    walkFrameCount: 6,
    idleFrameCount: 4,
    attackFrameCount: 4,
  },
];

globalThis.PLAYER_SPRITE_OPTIONS = playerSpriteOptions;
globalThis.getPlayerSpriteOption = function getPlayerSpriteOption(id) {
  return playerSpriteOptions.find((option) => option.id === id) ||
    playerSpriteOptions[0];
};

const monsterVariants = [
  {
    id: 'slime1',
    walkPath: './assets/slime/Slime1_Walk_with_shadow.png',
    hurtPath: './assets/slime/Slime1_Hurt_with_shadow.png',
    deathPath: './assets/slime/Slime1_Death_with_shadow.png',
    displayScale: 0.8,
  },
  {
    id: 'slime2',
    walkPath: './assets/slime/Slime2_Walk_with_shadow.png',
    hurtPath: './assets/slime/Slime2_Hurt_with_shadow.png',
    deathPath: './assets/slime/Slime2_Death_with_shadow.png',
    displayScale: 0.8,
  },
  {
    id: 'slime3',
    walkPath: './assets/slime/Slime3_Walk_with_shadow.png',
    hurtPath: './assets/slime/Slime3_Hurt_with_shadow.png',
    deathPath: './assets/slime/Slime3_Death_with_shadow.png',
    displayScale: 0.8,
  },
];
globalThis.MONSTER_VARIANTS = monsterVariants;

const sharedSfxPaths = {
  'ui-sfx': './assets/audio/UI.wav',
  'player-attack-sfx': './assets/audio/attack.wav',
  'enemy-death-sfx': './assets/audio/enemy_death.wav',
  'lootbox-open-sfx': './assets/audio/openchest.mp3',
};

globalThis.registerSharedSfx = function registerSharedSfx(scene) {
  if (!scene?.load || !scene?.cache?.audio) {
    return;
  }

  Object.entries(sharedSfxPaths).forEach(([key, path]) => {
    if (!scene.cache.audio.exists(key)) {
      scene.load.audio(key, path);
    }
  });
};

globalThis.playSharedSfx = function playSharedSfx(scene, key, config = {}) {
  if (!scene?.sound || !scene?.cache?.audio?.exists(key)) {
    return;
  }

  scene.sound.play(key, config);
};

globalThis.enableSceneUiClickSfx = function enableSceneUiClickSfx(scene) {
  if (!scene?.input) {
    return;
  }

  if (scene._uiClickSfxHandler) {
    scene.input.off('gameobjectdown', scene._uiClickSfxHandler, scene);
  }

  scene._uiClickSfxHandler = function handleUiClick() {
    globalThis.playSharedSfx(scene, 'ui-sfx', { volume: 0.35 });
  };

  scene.input.on('gameobjectdown', scene._uiClickSfxHandler, scene);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    if (scene._uiClickSfxHandler) {
      scene.input.off('gameobjectdown', scene._uiClickSfxHandler, scene);
    }
  });
};

// Game state
const gameState = {
  player: {
    name: 'Adventurer',
    level: 1,
    hp: 50,
    maxHP: 50,
    atk: 10,
    def: 5,
    luck: 0,
    exp: 0,
    expToNext: 10,
    gold: 50,
    selectedSpriteId: playerSpriteOptions[0].id,
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
