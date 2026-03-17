class Menu extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  preload() {
    globalThis.registerSharedSfx?.(this);
    this.load.image('background', './assets/Clouds 3.png');
  }

  create() {
    globalThis.enableSceneUiClickSfx?.(this);
    // Menu background
    const { width, height } = this.scale;
    const bgImage = this.textures.get('background').getSourceImage();
    const bgScale = height / bgImage.height;

    this.background = this.add.image(width / 2, 0, 'background').setOrigin(
      0.5,
      0,
    );
    this.background.setScale(bgScale);

    // Title
    this.add.text(400, 80, 'DUNGEON ESCAPE', {
      fontSize: '48px',
      fill: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // NEW GAME button
    const newGameButton = this.add.text(400, 200, 'NEW GAME', {
      fontSize: '32px',
      fill: '#0f0',
      backgroundColor: '#333',
      padding: { x: 30, y: 15 },
    }).setOrigin(0.5).setInteractive();

    newGameButton.on('pointerdown', () => {
      const starterMaterial = globalThis.GameItem
        ? GameItem.generateCraftingMaterial(Math.floor(Math.random() * 3) + 1)
        : {
          id: `craft_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: 'Crafting Material T1',
          type: 'crafting_material',
          tier: 1,
          value: 8,
          sellable: true,
          stats: {},
          use: 'crafting',
          upgradeLevel: 0,
          maxUpgradeLevel: 0,
        };

      // Create a new player with starter items
      const starterPlayerData = {
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
        selectedSpriteId: globalThis.getPlayerSpriteOption?.().id || 'owlet',
        maxInventory: 20,
        bagSlots: 20,
        storageSlots: 40,
        inventory: [
          {
            id: 'starter_sword',
            name: 'Rusty Sword',
            type: 'weapon',
            tier: 1,
            value: 10,
            stats: { atkBonus: 3 },
          },
          {
            id: 'starter_armor',
            name: 'Leather Armor',
            type: 'armor',
            tier: 1,
            value: 10,
            stats: { defBonus: 2 },
          },
          {
            ...starterMaterial,
          },
        ],
        equipment: {
          weapon: null,
          armor: null,
          accessory: null,
        },
      };

      if (globalThis.saveManager?.createRuntimePlayer) {
        globalThis.gameState.player = globalThis.saveManager
          .createRuntimePlayer(
            starterPlayerData,
          );
      } else {
        globalThis.gameState.player = starterPlayerData;
        globalThis.gameState.player.addItem = function addItem(itemData) {
          if (!Array.isArray(this.inventory)) {
            this.inventory = [];
          }
          this.inventory.push(itemData);
          return true;
        };
      }

      globalThis.gameState.currentSaveId = null;
      if (globalThis.saveManager) {
        globalThis.saveManager.currentSave = null;
      }

      // Generate loot tables for all chest types
      globalThis.lootTables = globalThis.lootGenerator.generateAllRarities();

      console.log('Loot tables generated:', globalThis.lootTables);

      this.scene.start('Play');
    });

    // LOAD GAME button
    const loadGameButton = this.add.text(400, 300, 'LOAD GAME', {
      fontSize: '32px',
      fill: '#ff0',
      backgroundColor: '#333',
      padding: { x: 30, y: 15 },
    }).setOrigin(0.5).setInteractive();

    loadGameButton.on('pointerdown', () => {
      this.scene.start('Saves', {
        mode: 'load',
        returnScene: 'Menu',
      });
    });

    // Instructions button
    const instructionsButton = this.add.text(400, 400, 'INSTRUCTIONS', {
      fontSize: '32px',
      fill: '#0ff',
      backgroundColor: '#333',
      padding: { x: 30, y: 15 },
    }).setOrigin(0.5).setInteractive();

    instructionsButton.on('pointerdown', () => {
      this.scene.start('Instructions');
    });

    // Credits button
    const creditsButton = this.add.text(400, 500, 'CREDITS', {
      fontSize: '32px',
      fill: '#f0f',
      backgroundColor: '#333',
      padding: { x: 30, y: 15 },
    }).setOrigin(0.5).setInteractive();

    creditsButton.on('pointerdown', () => {
      this.scene.start('Credits');
    });
  }
}

globalThis.Menu = Menu;
