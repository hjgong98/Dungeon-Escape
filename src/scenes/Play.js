class Play extends Phaser.Scene {
  constructor() {
    super('Play');

    this.playerName = 'Adventurer';
    this.editingName = false;
    this.nameInput = '';
    this.playerPreview = null;
    this.spritePickerElements = [];
  }

  preload() {
    this.load.image('playBackground', './assets/character.png');

    this.getPlayerSpriteOptions().forEach((option) => {
      const textureKey = this.getIdleTextureKey(option.id);
      if (!this.textures.exists(textureKey)) {
        this.load.spritesheet(textureKey, option.idlePath, {
          frameWidth: option.frameWidth,
          frameHeight: option.frameHeight,
        });
      }
    });
  }

  create() {
    this.ensurePlayerIdleAnimations();

    // Background
    this.background = this.add.image(0, 0, 'playBackground').setOrigin(0, 0);
    this.background.setDisplaySize(800, 600);

    // vertical divider line
    const divider = this.add.line(400, 0, 0, 0, 0, 600, 0xffffff, 0.5);
    divider.setLineWidth(2);

    // left half 0 - 400px
    this.createLeftHalf();

    // right half 400 - 800px
    this.createRightHalf();
  }

  createLeftHalf() {
    const player = globalThis.gameState.player;

    // player name - click to edit
    this.playerNameText = this.add.text(200, 80, player.name || 'Adventurer', {
      fontSize: '28px',
      fill: '#fff',
      backgroundColor: '#333',
      padding: { x: 15, y: 8 },
      fixedWidth: 250,
      align: 'center',
    }).setOrigin(0.5).setInteractive();

    this.playerNameText.on('pointerdown', () => {
      this.startNameEditing();
    });

    const selectedOption = this.getSelectedPlayerSpriteOption();
    const playerPreview = this.add.sprite(
      200,
      220,
      this.getIdleTextureKey(selectedOption.id),
      0,
    );
    playerPreview.setDisplaySize(96, 96);
    playerPreview.setInteractive({ useHandCursor: true });
    playerPreview.on('pointerdown', () => {
      this.openSpritePicker();
    });
    this.playerPreview = playerPreview;
    this.refreshPlayerPreview();

    this.add.text(200, 275, 'Click sprite to change', {
      fontSize: '11px',
      fill: '#bbb',
    }).setOrigin(0.5);

    // back to menu
    const backButton = this.add.text(100, 550, '← BACK TO MENU', {
      fontSize: '20px',
      fill: '#fff',
      backgroundColor: '#333',
      padding: { x: 10, y: 5 },
    }).setInteractive();

    backButton.on('pointerdown', () => {
      this.scene.start('Menu');
    });

    // save button
    const saveButton = this.add.text(300, 550, '💾 SAVE', {
      fontSize: '20px',
      fill: '#0f0',
      backgroundColor: '#333',
      padding: { x: 15, y: 5 },
    }).setInteractive();

    saveButton.on('pointerdown', () => {
      if (this.scene.isActive('Saves')) {
        return;
      }

      this.scene.launch('Saves', {
        mode: 'save',
        playerName: player.name,
        playerStats: player,
        returnScene: 'Play',
      });
      this.scene.pause('Play');
    });

    // Player stats display
    this.add.text(100, 320, 'STATS:', {
      fontSize: '18px',
      fill: '#fff',
      fontStyle: 'bold',
    });

    this.add.text(100, 350, `Level: ${player.level}`, {
      fontSize: '16px',
      fill: '#fff',
    });

    this.add.text(100, 375, `HP: ${player.hp}/${player.maxHP}`, {
      fontSize: '16px',
      fill: '#f00',
    });

    this.add.text(100, 400, `ATK: ${player.atk}`, {
      fontSize: '16px',
      fill: '#ff0',
    });

    this.add.text(100, 425, `DEF: ${player.def}`, {
      fontSize: '16px',
      fill: '#0ff',
    });

    // EXP bar
    const expPercent = Phaser.Math.Clamp(player.exp / player.expToNext, 0, 1);
    this.add.rectangle(100, 480, expPercent * 200, 15, 0x00ff00).setOrigin(
      0,
      0.5,
    );
    this.add.text(200, 505, `${player.exp}/${player.expToNext} EXP`, {
      fontSize: '12px',
      fill: '#aaa',
    }).setOrigin(0.5);
  }

  getPlayerSpriteOptions() {
    return globalThis.PLAYER_SPRITE_OPTIONS || [
      {
        id: 'owlet',
        name: 'Owlet',
        idlePath: './assets/player/Owlet_Monster_Idle_4.png',
        frameWidth: 32,
        frameHeight: 32,
        idleFrameCount: 4,
      },
    ];
  }

  getSelectedPlayerSpriteOption() {
    const selectedId = globalThis.gameState?.player?.selectedSpriteId;
    return globalThis.getPlayerSpriteOption?.(selectedId) ||
      this.getPlayerSpriteOptions()[0];
  }

  getIdleTextureKey(optionId) {
    return `play-player-idle-${optionId}`;
  }

  getIdleAnimKey(optionId) {
    return `play-player-idle-anim-${optionId}`;
  }

  ensurePlayerIdleAnimations() {
    this.getPlayerSpriteOptions().forEach((option) => {
      const animKey = this.getIdleAnimKey(option.id);
      if (this.anims.exists(animKey)) {
        return;
      }

      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers(
          this.getIdleTextureKey(option.id),
          {
            start: 0,
            end: Math.max(0, (option.idleFrameCount || 4) - 1),
          },
        ),
        frameRate: 6,
        repeat: -1,
      });
    });
  }

  refreshPlayerPreview() {
    if (!this.playerPreview) {
      return;
    }

    const option = this.getSelectedPlayerSpriteOption();
    this.playerPreview.setTexture(this.getIdleTextureKey(option.id), 0);
    this.playerPreview.play(this.getIdleAnimKey(option.id), true);
  }

  openSpritePicker() {
    if ((this.spritePickerElements || []).length > 0) {
      return;
    }

    const options = this.getPlayerSpriteOptions();
    const columns = 2;
    const cardWidth = 140;
    const cardHeight = 130;
    const gap = 22;
    const rows = Math.max(1, Math.ceil(options.length / columns));
    const panelWidth = 360;
    const panelHeight = 120 + rows * cardHeight + Math.max(0, rows - 1) * gap;

    const reg = (element, depth = 3000) => {
      element.setDepth(depth);
      this.spritePickerElements.push(element);
      return element;
    };

    const overlay = reg(
      this.add.rectangle(400, 300, 800, 600, 0x000000, 0.75).setInteractive(),
      3000,
    );
    overlay.on('pointerdown', () => this.closeSpritePicker());

    reg(
      this.add.rectangle(400, 300, panelWidth, panelHeight, 0x111111, 0.96)
        .setStrokeStyle(2, 0x666666),
      3001,
    );
    reg(
      this.add.text(400, 150, 'Choose Player Sprite', {
        fontSize: '22px',
        fill: '#fff',
      }).setOrigin(0.5),
      3002,
    );
    const startX = 400 - ((columns - 1) * (cardWidth + gap)) / 2;
    const startY = 255;
    const selectedId = this.getSelectedPlayerSpriteOption().id;

    options.forEach((option, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + column * (cardWidth + gap);
      const y = startY + row * (cardHeight + gap);
      const isSelected = option.id === selectedId;

      const card = reg(
        this.add.rectangle(x, y, cardWidth, cardHeight, 0x1f1f1f, 1)
          .setStrokeStyle(2, isSelected ? 0xf5d742 : 0x555555)
          .setInteractive({ useHandCursor: true }),
        3002,
      );
      card.on('pointerdown', () => {
        this.selectPlayerSprite(option.id);
      });

      reg(
        this.add.sprite(x, y - 15, this.getIdleTextureKey(option.id), 0)
          .setDisplaySize(72, 72)
          .play(this.getIdleAnimKey(option.id)),
        3003,
      );
      reg(
        this.add.text(x, y + 42, option.name, {
          fontSize: '13px',
          fill: isSelected ? '#f5d742' : '#fff',
        }).setOrigin(0.5),
        3003,
      );
    });
  }

  closeSpritePicker() {
    (this.spritePickerElements || []).forEach((element) => element.destroy());
    this.spritePickerElements = [];
  }

  selectPlayerSprite(optionId) {
    const player = globalThis.gameState?.player;
    if (!player) {
      return;
    }

    if (typeof player.setSelectedSprite === 'function') {
      player.setSelectedSprite(optionId);
    } else {
      player.selectedSpriteId =
        globalThis.getPlayerSpriteOption?.(optionId)?.id || optionId;
    }

    this.refreshPlayerPreview();
    this.closeSpritePicker();
  }

  createRightHalf() {
    // title
    this.add.text(600, 80, 'ACTIONS', {
      fontSize: '32px',
      fill: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // inventory button
    const inventoryBtn = this.add.text(600, 200, 'INVENTORY', {
      fontSize: '28px',
      fill: '#ff0',
      backgroundColor: '#444',
      padding: { x: 25, y: 12 },
      fixedWidth: 200,
      align: 'center',
    }).setOrigin(0.5).setInteractive();

    inventoryBtn.on('pointerdown', () => {
      this.scene.start('Inventory');
    });

    // upgrades button
    const upgradesBtn = this.add.text(600, 300, 'UPGRADES', {
      fontSize: '28px',
      fill: '#0ff',
      backgroundColor: '#444',
      padding: { x: 25, y: 12 },
      fixedWidth: 200,
      align: 'center',
    }).setOrigin(0.5).setInteractive();

    upgradesBtn.on('pointerdown', () => {
      this.scene.start('Upgrades');
    });

    // dungeon button
    const dungeonBtn = this.add.text(600, 400, 'DUNGEON', {
      fontSize: '28px',
      fill: '#f0f',
      backgroundColor: '#444',
      padding: { x: 25, y: 12 },
      fixedWidth: 200,
      align: 'center',
    }).setOrigin(0.5).setInteractive();

    dungeonBtn.on('pointerdown', () => {
      this.scene.start('Dungeons');
    });
  }

  startNameEditing() {
    const player = globalThis.gameState.player;
    this.editingName = true;
    this.nameInput = player.name;

    const promptBg = this.add.rectangle(400, 300, 400, 200, 0x000000, 0.9);
    const promptText = this.add.text(400, 250, 'Enter new name:', {
      fontSize: '24px',
      fill: '#fff',
    }).setOrigin(0.5);

    const inputBg = this.add.rectangle(400, 320, 300, 40, 0x333333);
    this.nameInputText = this.add.text(400, 320, player.name, {
      fontSize: '20px',
      fill: '#0f0',
    }).setOrigin(0.5);

    const saveNameBtn = this.add.text(350, 380, 'SAVE', {
      fontSize: '20px',
      fill: '#0f0',
      backgroundColor: '#333',
      padding: { x: 15, y: 5 },
    }).setInteractive();

    const cancelBtn = this.add.text(450, 380, 'CANCEL', {
      fontSize: '20px',
      fill: '#f00',
      backgroundColor: '#333',
      padding: { x: 15, y: 5 },
    }).setInteractive();

    this.nameEditElements = [
      promptBg,
      promptText,
      inputBg,
      this.nameInputText,
      saveNameBtn,
      cancelBtn,
    ];

    this.input.keyboard.on('keydown', this.handleNameInput, this);

    saveNameBtn.on('pointerdown', () => {
      this.saveNewName();
    });

    cancelBtn.on('pointerdown', () => {
      this.cancelNameEditing();
    });
  }

  handleNameInput(event) {
    if (!this.editingName) return;

    if (event.key === 'Enter') {
      this.saveNewName();
    } else if (event.key === 'Escape') {
      this.cancelNameEditing();
    } else if (event.key === 'Backspace') {
      this.nameInput = this.nameInput.slice(0, -1);
    } else if (event.key.length === 1 && this.nameInput.length < 20) {
      this.nameInput += event.key;
    }

    if (this.nameInputText) {
      this.nameInputText.setText(this.nameInput || ' ');
    }
  }

  saveNewName() {
    if (this.nameInput.trim()) {
      globalThis.gameState.player.name = this.nameInput.trim();
      this.playerNameText.setText(globalThis.gameState.player.name);
    }
    this.cancelNameEditing();
  }

  cancelNameEditing() {
    this.editingName = false;
    this.input.keyboard.off('keydown', this.handleNameInput, this);

    if (this.nameEditElements) {
      this.nameEditElements.forEach((el) => el.destroy());
    }
    this.nameEditElements = null;
    this.nameInputText = null;
  }
}

globalThis.Play = Play;
