class DungeonHud extends Phaser.Scene {
  constructor() {
    super('DungeonHud');

    this.hpBarBg = null;
    this.hpBarFill = null;
    this.hpText = null;
    this.interactionPrompt = null;
    this.activeLootMessages = [];
  }

  create() {
    this.hpBarBg = this.add.rectangle(16, 22, 108, 14, 0x111111, 0.95);
    this.hpBarBg.setOrigin(0, 0.5);
    this.hpBarBg.setStrokeStyle(1, 0xffffff, 0.35);

    this.hpBarFill = this.add.rectangle(18, 22, 104, 10, 0xd94b4b, 1);
    this.hpBarFill.setOrigin(0, 0.5);

    this.hpText = this.add.text(16, 38, 'HP 0/0', {
      fontSize: '14px',
      fill: '#fff',
    });

    this.interactionPrompt = this.add.text(400, 24, '', {
      fontSize: '12px',
      fill: '#ff0',
      backgroundColor: '#000',
      padding: { x: 5, y: 3 },
      align: 'center',
    }).setOrigin(0.5);
    this.interactionPrompt.setVisible(false);

    this.refreshHp();
  }

  update() {
    this.refreshHp();
    this.updateLootMessages();
  }

  refreshHp() {
    if (!this.hpBarBg || !this.hpBarFill || !this.hpText) {
      return;
    }

    const playerData = globalThis.gameState?.player || {};
    const maxHp = Math.max(
      1,
      Number(playerData.maxHP ?? playerData.maxHp) || 1,
    );
    const hp = Phaser.Math.Clamp(Number(playerData.hp) || 0, 0, maxHp);
    const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);

    this.hpBarFill.width = 104 * ratio;
    this.hpBarFill.fillColor = ratio > 0.5
      ? 0xd94b4b
      : (ratio > 0.25 ? 0xe08a3a : 0xc73737);
    this.hpText.setText(`HP ${hp}/${maxHp}`);
  }

  showInteractionPrompt(message, color = '#ff0') {
    if (!this.interactionPrompt) {
      return;
    }

    this.interactionPrompt.setText(message || '');
    this.interactionPrompt.setColor(color);
    this.interactionPrompt.setVisible(Boolean(message));
  }

  hideInteractionPrompt() {
    if (!this.interactionPrompt) {
      return;
    }

    this.interactionPrompt.setText('');
    this.interactionPrompt.setVisible(false);
  }

  showLootResults(items = [], worldX = 0, worldY = 0, chestId = 'loot') {
    const cleanDisplayName = (name) =>
      String(name || 'Unknown')
        .replace(/\s*\(\s*T\d+\s*\)$/i, '')
        .replace(/\s+T\d+$/i, '')
        .replace(/\s+Tier\s*\d+$/i, '')
        .trim();

    items.forEach((item, index) => {
      this.showWorldMessage(
        `+ ${cleanDisplayName(item.name)}`,
        '#0f0',
        worldX,
        worldY,
        chestId,
        index + 2,
        index * 70,
      );
    });
  }

  showFloatingGoldGain(amount, worldX, worldY, anchorKey = 'gold', stackIndex = 0) {
    this.showWorldMessage(
      `+${amount} gold`,
      '#ffd44d',
      worldX,
      worldY,
      anchorKey,
      stackIndex,
      0,
    );
  }

  showFloatingExpGain(amount, worldX, worldY, anchorKey = 'exp', stackIndex = 0) {
    this.showWorldMessage(
      `+${amount} exp`,
      '#7dd3fc',
      worldX,
      worldY,
      anchorKey,
      stackIndex,
      0,
    );
  }

  showWorldMessage(
    label,
    color,
    worldX,
    worldY,
    anchorKey,
    stackIndex = 0,
    delay = 0,
  ) {
    const text = this.add.text(
      0,
      0,
      label,
      {
        fontSize: '11px',
        fill: color,
        stroke: '#000',
        strokeThickness: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        padding: { x: 3, y: 1 },
      },
    ).setOrigin(0.5, 0.5);

    const message = {
      anchorKey,
      worldX,
      worldY,
      stackIndex,
      text,
      driftY: 0,
      alpha: 1,
    };
    this.activeLootMessages.push(message);
    this.positionLootMessage(message);

    this.tweens.add({
      targets: message,
      driftY: -24,
      alpha: 0,
      duration: 1500,
      delay,
      onUpdate: () => {
        if (typeof message.alpha === 'number') {
          message.text.alpha = message.alpha;
        }
        this.positionLootMessage(message);
      },
      onComplete: () => {
        message.text.destroy();
        this.activeLootMessages = this.activeLootMessages.filter((entry) =>
          entry !== message
        );
      },
    });
  }

  updateLootMessages() {
    this.activeLootMessages.forEach((message) => {
      this.positionLootMessage(message);
    });
  }

  positionLootMessage(message) {
    if (!message?.text?.active) {
      return;
    }

    const dungeonScene = this.scene.get('Dungeons');
    const camera = dungeonScene?.cameras?.main;
    if (!camera) {
      return;
    }

    const screenX = (message.worldX - camera.worldView.x) * camera.zoom;
    const screenY = (message.worldY - camera.worldView.y) * camera.zoom;
    message.text.setPosition(
      screenX,
      screenY - 42 - message.stackIndex * 16 + (message.driftY || 0),
    );
  }
}

globalThis.DungeonHud = DungeonHud;
