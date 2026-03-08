class Menu extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  preload() {
    this.load.image('background', 'assets/images/menu_background.png');
  }

  create() {
    // menu background
    this.background = this.add.image(0, 0, 800, 600, 'background').setOrigin(
      0,
      0,
    );

    // title
    this.add.text(400, 80, 'DUNGEON ESCAPE', {
      fontsize: '48px',
      fill: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // interactive play button
    let playButton = this.add.text(400, 200, 'PLAY', {
      fontsize: '32px',
      fill: '#0f0',
      backgroundColor: '#333',
      padding: { x: 30, y: 15 },
    }).setOrigin(0.5).setInteractive();

    // instructions button
    let instructionsButton = this.add.text(400, 300, 'INSTRUCTIONS', {
      fontsize: '32px',
      fill: '#ff0',
      backgroundColor: '#333',
      padding: { x: 30, y: 15 },
    }).setOrigin(0.5).setInteractive();

    // load saves button
    let loadSavesButton = this.add.text(250, 400, 'LOAD SAVES', {
      fontsize: '32px',
      fill: '#00f',
      backgroundColor: '#333',
      padding: { x: 30, y: 15 },
    }).setOrigin(0.5).setInteractive();

    // credits button
    let creditsButton = this.add.text(550, 400, 'CREDITS', {
      fontsize: '32px',
      fill: '#f0f',
      backgroundColor: '#333',
      padding: { x: 30, y: 15 },
    }).setOrigin(0.5).setInteractive();
  }
}
