class Instructions extends Phaser.Scene {
  constructor() {
    super('Instructions');
  }

  preload() {
    globalThis.registerSharedSfx?.(this);
    this.load.image('background', './assets/game_background_3.1.png');
  }

  create() {
    globalThis.enableSceneUiClickSfx?.(this);
    const { width, height } = this.scale;
    const bgImage = this.textures.get('background').getSourceImage();
    const bgScale = height / bgImage.height;

    this.background = this.add.image(width / 2, 0, 'background').setOrigin(
      0.5,
      0,
    );
    this.background.setScale(bgScale);

    this.add.text(400, 80, 'INSTRUCTIONS', {
      fontSize: '48px',
      fill: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(400, 200, 'How to Play:', {
      fontSize: '28px',
      fill: '#ff0',
    }).setOrigin(0.5);

    this.add.text(400, 245, '• Start a New Game or Load a Save to begin', {
      fontSize: '18px',
      fill: '#fff',
    }).setOrigin(0.5);

    this.add.text(400, 280, '• Rename your adventurer in the Play screen', {
      fontSize: '18px',
      fill: '#fff',
    }).setOrigin(0.5);

    this.add.text(400, 315, '• Click your character sprite to choose a look', {
      fontSize: '18px',
      fill: '#fff',
    }).setOrigin(0.5);

    this.add.text(
      400,
      350,
      '• Move items from bag (temporary) into storage (permanent)',
      {
        fontSize: '18px',
        fill: '#fff',
      },
    ).setOrigin(0.5);

    this.add.text(
      400,
      385,
      '• If you die in a dungeon, your bag items are lost',
      {
        fontSize: '18px',
        fill: '#fff',
      },
    ).setOrigin(0.5);

    this.add.text(
      400,
      420,
      '• Equip and upgrade gear at the Upgrades station',
      {
        fontSize: '18px',
        fill: '#fff',
      },
    ).setOrigin(0.5);

    this.add.text(400, 455, '• Buy health potions in Upgrades when HP is low', {
      fontSize: '18px',
      fill: '#fff',
    }).setOrigin(0.5);

    this.add.text(400, 490, "• Explore the dungeon and don't die", {
      fontSize: '18px',
      fill: '#fff',
    }).setOrigin(0.5);

    const backButton = this.add.text(400, 550, '← BACK TO MENU', {
      fontSize: '24px',
      fill: '#fff',
      backgroundColor: '#333',
      padding: { x: 15, y: 8 },
    }).setInteractive();

    backButton.on('pointerdown', () => {
      this.scene.start('Menu');
    });
  }
}

globalThis.Instructions = Instructions;
