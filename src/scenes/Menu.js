class Menu extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  preload() {
    this.load.image('background', './assets/game_background_3.1.png');
  }

  create() {
    // Menu background
    this.background = this.add.image(0, 0, 'background').setOrigin(0, 0);
    this.background.setDisplaySize(800, 600);

    // Title
    this.add.text(400, 80, 'DUNGEON ESCAPE', {
      fontSize: '48px',
      fill: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // NEW GAME button - creates fresh player with starter items
    const newGameButton = this.add.text(400, 200, 'NEW GAME', {
      fontSize: '32px',
      fill: '#0f0',
      backgroundColor: '#333',
      padding: { x: 30, y: 15 },
    }).setOrigin(0.5).setInteractive();

    newGameButton.on('pointerdown', () => {
      // Reset player to default stats with starter items
      globalThis.gameState.player = {
        name: "Adventurer",
        level: 1,
        hp: 100,
        maxHP: 100,
        atk: 10,
        def: 5,
        exp: 0,
        expToNext: 100,
        gold: 50,
        inventory: [
          {
            id: "starter_sword",
            name: "Rusty Sword",
            type: "weapon",
            tier: 1,
            value: 10,
            stats: { atkBonus: 3 }
          },
          {
            id: "starter_armor",
            name: "Leather Armor",
            type: "armor",
            tier: 1,
            value: 10,
            stats: { defBonus: 2 }
          },
          {
            id: "potion_1",
            name: "Health Potion",
            type: "consumable",
            tier: 1,
            value: 5,
            stats: { hpRestore: 30 }
          },
          {
            id: "scrap_1",
            name: "Crafting Scrap",
            type: "material",
            tier: 1,
            value: 2,
            stats: {}
          }
        ],
        equipment: {
          weapon: null,
          armor: null,
          accessory: null
        }
      };
      
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
        returnScene: 'Play'
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
