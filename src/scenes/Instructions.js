class Instructions extends Phaser.Scene {
  constructor() {
    super('Instructions');
  }

  preload() {
    this.load.image('background', './assets/game_background_3.1.png');
  }

  create() {
    this.background = this.add.image(0, 0, 'background').setOrigin(0, 0);
    this.background.setDisplaySize(800, 600);

    this.add.text(400, 80, 'INSTRUCTIONS', {
      fontSize: '48px',
      fill: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(400, 200, 'How to Play:', {
      fontSize: '28px',
      fill: '#ff0',
    }).setOrigin(0.5);

    this.add.text(400, 260, '• Use WASD to move in the dungeon', {
      fontSize: '20px',
      fill: '#fff',
    }).setOrigin(0.5);

    this.add.text(400, 300, '• Press E to interact with stairs and exits', {
      fontSize: '20px',
      fill: '#fff',
    }).setOrigin(0.5);

    this.add.text(400, 340, '• Press Q to leave dungeon at entrance', {
      fontSize: '20px',
      fill: '#fff',
    }).setOrigin(0.5);

    this.add.text(400, 380, '• Collect items and fight monsters', {
      fontSize: '20px',
      fill: '#fff',
    }).setOrigin(0.5);

    this.add.text(400, 420, '• Upgrade your gear in the Upgrades menu', {
      fontSize: '20px',
      fill: '#fff',
    }).setOrigin(0.5);

    this.add.text(400, 480, 'Change Controls? (Coming Soon)', {
      fontSize: '24px',
      fill: '#aaa',
      fontStyle: 'italic',
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
