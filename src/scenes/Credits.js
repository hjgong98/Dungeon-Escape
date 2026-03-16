class Credits extends Phaser.Scene {
  constructor() {
    super('Credits');
  }

  preload() {
    this.load.image('background', './assets/game_background_3.1.png');
  }

  create() {
    // menu background
    const { width, height } = this.scale;
    const bgImage = this.textures.get('background').getSourceImage();
    const bgScale = height / bgImage.height;

    this.background = this.add.image(width / 2, 0, 'background').setOrigin(
      0.5,
      0,
    );
    this.background.setScale(bgScale);

    // Scene title
    this.add.text(400, 80, 'CREDITS', {
      fontSize: '48px',
      fill: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // character.png and download.gif from mini-moss.tumblr.com/
    // lootbox.py from https://github.com/TristanChenUCSC/Lootbox-Generator
    // sounds from https://pixabay.com/
    // chest png from https://pixelserial.itch.io/rpg-pixel-art-chests
    // background pngs from : https://craftpix.net/freebies/free-autumn-pixel-backgrounds-for-game/
    //                        https://craftpix.net/freebies/free-sky-with-clouds-background-pixel-art-set/
    //                        https://craftpix.net/freebies/forest-and-trees-free-pixel-backgrounds/
    //                        https://craftpix.net/freebies/free-horizontal-2d-game-backgrounds/
    // hero sprites from https://craftpix.net/freebies/free-pixel-art-tiny-hero-sprites/
    // monster sprites from https://craftpix.net/freebies/free-slime-mobs-pixel-art-top-down-sprite-pack/

    // Back button to menu
    const backButton = this.add.text(100, 550, '← BACK TO MENU', {
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

globalThis.Credits = Credits;
