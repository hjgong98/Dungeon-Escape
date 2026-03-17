class Credits extends Phaser.Scene {
  constructor() {
    super('Credits');
  }

  preload() {
    globalThis.registerSharedSfx?.(this);
    this.load.image('background', './assets/game_background_3.1.png');
  }

  create() {
    globalThis.enableSceneUiClickSfx?.(this);
    const { width, height } = this.scale;
    if (this.textures.exists('background')) {
      const bgImage = this.textures.get('background').getSourceImage();
      const bgScale = height / bgImage.height;

      this.background = this.add.image(width / 2, 0, 'background').setOrigin(
        0.5,
        0,
      );
      this.background.setScale(bgScale);
    } else {
      this.cameras.main.setBackgroundColor('#0f172a');
    }

    this.add.text(400, 80, 'CREDITS', {
      fontSize: '48px',
      fill: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(400, 160, 'Used Assets:', {
      fontSize: '28px',
      fill: '#ff0',
    }).setOrigin(0.5);

    this.add.text(
      400,
      205,
      '• FREE RPG Pixel Art Chests w/Animation - Asset Pack',
      {
        fontSize: '18px',
        fill: '#fff',
      },
    ).setOrigin(0.5);

    this.add.text(
      400,
      240,
      '• Free Pixel Art Tiny Hero Sprites',
      {
        fontSize: '18px',
        fill: '#fff',
      },
    ).setOrigin(0.5);

    this.add.text(
      400,
      268,
      'craftpix.net/freebies/free-pixel-art-tiny-hero-sprites/',
      {
        fontSize: '18px',
        fill: '#fff',
      },
    ).setOrigin(0.5);

    this.add.text(
      400,
      305,
      '• Free Slime Mobs Pixel Art Top-Down Sprite Pack',
      {
        fontSize: '18px',
        fill: '#fff',
      },
    ).setOrigin(0.5);

    this.add.text(
      400,
      333,
      'craftpix.net/freebies/free-slime-mobs-pixel-art-top-down-sprite-pack/',
      {
        fontSize: '18px',
        fill: '#fff',
      },
    ).setOrigin(0.5);

    this.add.text(400, 390, 'Sound Effects:', {
      fontSize: '28px',
      fill: '#ff0',
    }).setOrigin(0.5);

    this.add.text(400, 430, '• 400-sounds-pack', {
      fontSize: '18px',
      fill: '#fff',
    }).setOrigin(0.5);

    this.add.text(
      400,
      458,
      'ci.itch.io/400-sounds-pack',
      {
        fontSize: '18px',
        fill: '#fff',
      },
    ).setOrigin(0.5);

    this.add.text(
      400,
      490,
      '• freesound_community-short-success-sound',
      {
        fontSize: '18px',
        fill: '#fff',
      },
    ).setOrigin(0.5);

    this.add.text(
      400,
      518,
      'glockenspiel-treasure-video-game-6346',
      {
        fontSize: '18px',
        fill: '#fff',
      },
    ).setOrigin(0.5);

    const backButton = this.add.text(400, 555, '← BACK TO MENU', {
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
