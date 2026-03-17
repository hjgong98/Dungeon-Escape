class DungeonHud extends Phaser.Scene {
  shutdown() {
    // Hide or destroy all persistent UI elements
    if (this.hpBarBg) this.hpBarBg.destroy();
    if (this.hpBarFill) this.hpBarFill.destroy();
    if (this.hpText) this.hpText.destroy();
    if (this.interactionPrompt) this.interactionPrompt.destroy();
    (this.activeLootMessages || []).forEach((msg) => msg.text?.destroy());
    this.activeLootMessages = [];
    this._closeBagStackDetail();
    if (this.bagPopupGroup) {
      this.bagPopupGroup.clear(true, true);
      this.bagPopupGroup = null;
    }
    this.bagPopupSelectedItems = new Set();
  }

  constructor() {
    super('DungeonHud');

    this.hpBarBg = null;
    this.hpBarFill = null;
    this.hpText = null;
    this.interactionPrompt = null;
    this.activeLootMessages = [];
    this.bagPopupGroup = null;
    this.bagPopupDetailGroup = null;
    this.bagPopupSelectedItems = new Set();
    this.bagPopupPage = 0;
  }

  create() {
    const { width } = this.scale;

    this.hpBarBg = this.add.rectangle(16, 22, 108, 14, 0x111111, 0.95);
    this.hpBarBg.setOrigin(0, 0.5);
    this.hpBarBg.setStrokeStyle(1, 0xffffff, 0.35);

    this.hpBarFill = this.add.rectangle(18, 22, 104, 10, 0xd94b4b, 1);
    this.hpBarFill.setOrigin(0, 0.5);

    this.hpText = this.add.text(16, 38, 'HP 0/0', {
      fontSize: '14px',
      fill: '#fff',
    });

    this.interactionPrompt = this.add.text(width / 2, 24, '', {
      fontSize: '12px',
      fill: '#ff0',
      backgroundColor: '#000',
      padding: { x: 5, y: 3 },
      align: 'center',
    }).setOrigin(0.5);
    this.interactionPrompt.setVisible(false);

    this.bagHint = this.add.text(width - 10, 15, '[R] BAG', {
      fontSize: '12px',
      fill: '#ff0',
      backgroundColor: '#000',
      padding: { x: 5, y: 3 },
    }).setOrigin(1, 0.5);

    this.refreshHp();
  }

  update() {
    // HUD must only exist while the Dungeons scene is actively running.
    if (!this.scene.isActive('Dungeons') || this.scene.isSleeping('Dungeons')) {
      this.scene.stop();
      return;
    }

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

  showFloatingGoldGain(
    amount,
    worldX,
    worldY,
    anchorKey = 'gold',
    stackIndex = 0,
  ) {
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

  showFloatingExpGain(
    amount,
    worldX,
    worldY,
    anchorKey = 'exp',
    stackIndex = 0,
  ) {
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

  // Phaser lifecycle: called when scene is stopped
  onShutdown() {
    this.shutdown();
  }
  onDestroy() {
    this.shutdown();
  }

  // ── Bag popup (R key in dungeon) ────────────────────────────────────────

  openBagPopup() {
    if (this.bagPopupGroup) return;
    if (!globalThis.gameState?.player) return;
    this.bagPopupSelectedItems = new Set();
    this.bagPopupPage = 0;
    this._buildBagPopup();
    const dungeons = this.scene.get('Dungeons');
    if (dungeons) dungeons.bagPopupActive = true;
  }

  closeBagPopup() {
    this._closeBagStackDetail();
    if (this.bagPopupGroup) {
      this.bagPopupGroup.clear(true, true);
      this.bagPopupGroup = null;
    }
    this.bagPopupSelectedItems = new Set();
    this.bagPopupPage = 0;
    const dungeons = this.scene.get('Dungeons');
    if (dungeons) dungeons.bagPopupActive = false;
  }

  _getBagStacks() {
    const stacks = [];
    const byName = new Map();
    const inventory = globalThis.gameState?.player?.inventory || [];
    inventory.forEach((item) => {
      const key = item?.name || 'Unknown';
      const existing = byName.get(key);
      if (existing) {
        existing.count++;
        existing.items.push(item);
      } else {
        const stack = { item, count: 1, items: [item] };
        byName.set(key, stack);
        stacks.push(stack);
      }
    });
    return stacks;
  }

  _buildBagPopup() {
    if (this.bagPopupGroup) this.bagPopupGroup.clear(true, true);
    this.bagPopupGroup = this.add.group();

    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    const panelWidth = Math.min(460, width - 40);
    const panelHeight = Math.min(430, height - 40);
    const panelLeft = centerX - panelWidth / 2;
    const panelRight = centerX + panelWidth / 2;
    const panelTop = centerY - panelHeight / 2;
    const panelBottom = centerY + panelHeight / 2;

    const player = globalThis.gameState?.player;
    if (!player) {
      this.closeBagPopup();
      return;
    }
    const bag = player.inventory || [];
    const bagCap = typeof player.bagSlots === 'number'
      ? player.bagSlots
      : (typeof player.maxInventory === 'number' ? player.maxInventory : 20);
    const stacks = this._getBagStacks();
    const selected = this.bagPopupSelectedItems;
    const tierColors = ['#888', '#8f8', '#88f', '#f8f', '#ff8', '#f88'];
    const rowH = 31;

    const titleY = panelTop + 26;
    const subtitleY = panelTop + 48;
    const controlY = panelTop + 68;
    const closeY = titleY;
    const listStartY = panelTop + 108;
    const listEndY = panelBottom - 52;
    const maxRows = Math.max(3, Math.floor((listEndY - listStartY) / rowH));
    const totalPages = Math.max(1, Math.ceil(stacks.length / maxRows));
    this.bagPopupPage = Phaser.Math.Clamp(this.bagPopupPage, 0, totalPages - 1);
    const pageStart = this.bagPopupPage * maxRows;
    const pageStacks = stacks.slice(pageStart, pageStart + maxRows);
    const rowWidth = panelWidth - 30;
    const textLeft = panelLeft + 18;
    const textWidth = Math.max(120, rowWidth - 20);

    // Dim overlay — clicking outside closes popup
    const overlay = this.add.rectangle(
      centerX,
      centerY,
      width,
      height,
      0x000000,
      0.65,
    )
      .setInteractive();
    this.bagPopupGroup.add(overlay);
    overlay.on('pointerdown', () => this.closeBagPopup());

    // Panel
    const panel = this.add.rectangle(
      centerX,
      centerY,
      panelWidth,
      panelHeight,
      0x1a1a1a,
      0.97,
    );
    panel.setStrokeStyle(2, 0x666666);
    this.bagPopupGroup.add(panel);

    // Stop overlay clicks leaking through the panel
    const panelHitBlock = this.add.rectangle(
      centerX,
      centerY,
      panelWidth,
      panelHeight,
      0x000000,
      0,
    )
      .setInteractive();
    this.bagPopupGroup.add(panelHitBlock);

    // Title
    this.bagPopupGroup.add(
      this.add.text(centerX, titleY, `BAG  ${bag.length}/${bagCap}`, {
        fontSize: '20px',
        fill: '#ff0',
        fontStyle: 'bold',
      }).setOrigin(0.5),
    );

    this.bagPopupGroup.add(
      this.add.text(centerX, subtitleY, 'Select items to discard', {
        fontSize: '12px',
        fill: '#aaa',
      }).setOrigin(0.5),
    );

    // Select All / Deselect All (conditional)
    const selectedCount = bag.filter((i) => selected.has(i)).length;
    const showSelectAll = bag.length > 0 && selectedCount < bag.length;
    const showDeselectAll = selectedCount > 0;

    if (showSelectAll) {
      const saBtn = this.add.text(panelLeft + 14, controlY, 'SELECT ALL', {
        fontSize: '11px',
        fill: '#fff',
        backgroundColor: '#2f5f2f',
        padding: { x: 6, y: 3 },
      }).setOrigin(0, 0.5).setInteractive();
      this.bagPopupGroup.add(saBtn);
      saBtn.on('pointerdown', () => {
        bag.forEach((i) => selected.add(i));
        this._buildBagPopup();
      });
    }

    if (showDeselectAll) {
      const daBtn = this.add.text(panelRight - 14, controlY, 'DESELECT ALL', {
        fontSize: '11px',
        fill: '#fff',
        backgroundColor: '#5f2f2f',
        padding: { x: 6, y: 3 },
      }).setOrigin(1, 0.5).setInteractive();
      this.bagPopupGroup.add(daBtn);
      daBtn.on('pointerdown', () => {
        bag.forEach((i) => selected.delete(i));
        this._buildBagPopup();
      });
    }

    // Close button (top-right of panel)
    const closeBtn = this.add.text(panelRight - 14, closeY, 'CLOSE', {
      fontSize: '13px',
      fill: '#f88',
      backgroundColor: '#333',
      padding: { x: 8, y: 4 },
    }).setOrigin(1, 0.5).setInteractive();
    this.bagPopupGroup.add(closeBtn);
    closeBtn.on('pointerdown', () => this.closeBagPopup());

    // Item rows
    pageStacks.forEach((stack, idx) => {
      const y = listStartY + idx * rowH;
      const color = tierColors[(stack.item.tier || 1) - 1] || '#fff';
      const anySelected = stack.items.some((i) => selected.has(i));

      const rowBg = this.add.rectangle(
        centerX,
        y,
        rowWidth,
        26,
        anySelected ? 0x3a1515 : 0x2a2a2a,
        0.95,
      ).setInteractive();
      if (anySelected) rowBg.setStrokeStyle(1, 0xff4444);
      this.bagPopupGroup.add(rowBg);

      const stackText = stack.count > 1 ? ` (${stack.count})` : '';
      this.bagPopupGroup.add(
        this.add.text(textLeft, y, `${stack.item.name}${stackText}`, {
          fontSize: '13px',
          fill: color,
          fixedWidth: textWidth,
          align: 'left',
        }).setOrigin(0, 0.5),
      );

      rowBg.on('pointerdown', () => {
        if (
          stack.count > 1 ||
          ['weapon', 'armor', 'accessory'].includes(stack.item?.type)
        ) {
          this._openBagStackDetail(stack);
        } else {
          if (selected.has(stack.item)) selected.delete(stack.item);
          else selected.add(stack.item);
          this._buildBagPopup();
        }
      });
    });

    if (totalPages > 1) {
      const pageY = panelBottom - 44;
      const prevBtn = this.add.text(panelLeft + 86, pageY, '← PREV', {
        fontSize: '11px',
        fill: this.bagPopupPage > 0 ? '#ddd' : '#666',
        backgroundColor: '#222',
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setInteractive();
      this.bagPopupGroup.add(prevBtn);
      if (this.bagPopupPage > 0) {
        prevBtn.on('pointerdown', () => {
          this.bagPopupPage--;
          this._buildBagPopup();
        });
      }

      this.bagPopupGroup.add(
        this.add.text(
          centerX,
          pageY,
          `${this.bagPopupPage + 1}/${totalPages}`,
          {
            fontSize: '11px',
            fill: '#aaa',
          },
        ).setOrigin(0.5),
      );

      const nextBtn = this.add.text(panelRight - 86, pageY, 'NEXT →', {
        fontSize: '11px',
        fill: this.bagPopupPage < totalPages - 1 ? '#ddd' : '#666',
        backgroundColor: '#222',
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setInteractive();
      this.bagPopupGroup.add(nextBtn);
      if (this.bagPopupPage < totalPages - 1) {
        nextBtn.on('pointerdown', () => {
          this.bagPopupPage++;
          this._buildBagPopup();
        });
      }
    }

    // Discard button (only when something is selected)
    const discardCount = bag.filter((i) => selected.has(i)).length;
    if (discardCount > 0) {
      const label = `DISCARD ${discardCount} ITEM${
        discardCount !== 1 ? 'S' : ''
      }`;
      const discardBtn = this.add.text(centerX, panelBottom - 22, label, {
        fontSize: '14px',
        fill: '#ff4444',
        backgroundColor: '#2a0000',
        padding: { x: 16, y: 7 },
      }).setOrigin(0.5).setInteractive();
      this.bagPopupGroup.add(discardBtn);
      discardBtn.on('pointerdown', () => {
        const activePlayer = globalThis.gameState?.player;
        if (!activePlayer) {
          this.closeBagPopup();
          return;
        }
        const inv = activePlayer.inventory || [];
        activePlayer.inventory = inv.filter((i) =>
          !selected.has(i)
        );
        selected.clear();
        this._buildBagPopup();
      });
    }
  }

  _openBagStackDetail(stack, page = 0) {
    this._closeBagStackDetail();
    this.bagPopupDetailGroup = this.add.group();
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    const panelWidth = Math.min(500, width - 60);
    const panelHeight = Math.min(340, height - 80);
    const panelLeft = centerX - panelWidth / 2;
    const panelRight = centerX + panelWidth / 2;
    const panelTop = centerY - panelHeight / 2;
    const panelBottom = centerY + panelHeight / 2;
    const selected = this.bagPopupSelectedItems;
    const tierColors = ['#888', '#8f8', '#88f', '#f8f', '#ff8', '#f88'];
    const rowH = 30;
    const titleY = panelTop + 24;
    const controlsY = panelTop + 44;
    const listStartY = panelTop + 80;
    const listEndY = panelBottom - 34;
    const maxLines = Math.max(3, Math.floor((listEndY - listStartY) / rowH));
    const totalPages = Math.max(1, Math.ceil(stack.items.length / maxLines));
    const currentPage = Phaser.Math.Clamp(page, 0, totalPages - 1);
    const pageStart = currentPage * maxLines;
    const pageItems = stack.items.slice(pageStart, pageStart + maxLines);
    const rowWidth = panelWidth - 40;
    const textLeft = panelLeft + 24;
    const textWidth = Math.max(100, rowWidth - 24);

    const panel = this.add.rectangle(
      centerX,
      centerY,
      panelWidth,
      panelHeight,
      0x101010,
      0.98,
    );
    panel.setStrokeStyle(2, 0x888888);
    this.bagPopupDetailGroup.add(panel);

    // Block clicks from passing through to the bag popup
    const hitBlock = this.add.rectangle(
      centerX,
      centerY,
      panelWidth,
      panelHeight,
      0x000000,
      0,
    )
      .setInteractive();
    this.bagPopupDetailGroup.add(hitBlock);

    this.bagPopupDetailGroup.add(
      this.add.text(centerX, titleY, `${stack.item.name} (${stack.count})`, {
        fontSize: '18px',
        fill: '#fff',
        fontStyle: 'bold',
      }).setOrigin(0.5),
    );

    // Conditional Select All / Deselect All for this stack
    const stackSelectedCount =
      stack.items.filter((i) => selected.has(i)).length;
    const showSA = stackSelectedCount < stack.items.length;
    const showDA = stackSelectedCount > 0;

    if (showSA) {
      const saBtn = this.add.text(panelLeft + 14, controlsY, 'SELECT ALL', {
        fontSize: '11px',
        fill: '#fff',
        backgroundColor: '#2f5f2f',
        padding: { x: 6, y: 3 },
      }).setOrigin(0, 0.5).setInteractive();
      this.bagPopupDetailGroup.add(saBtn);
      saBtn.on('pointerdown', () => {
        stack.items.forEach((i) => selected.add(i));
        this._openBagStackDetail(stack, currentPage);
        this._buildBagPopup();
      });
    }

    if (showDA) {
      const daBtn = this.add.text(panelRight - 14, controlsY, 'DESELECT ALL', {
        fontSize: '11px',
        fill: '#fff',
        backgroundColor: '#5f2f2f',
        padding: { x: 6, y: 3 },
      }).setOrigin(1, 0.5).setInteractive();
      this.bagPopupDetailGroup.add(daBtn);
      daBtn.on('pointerdown', () => {
        stack.items.forEach((i) => selected.delete(i));
        this._openBagStackDetail(stack, currentPage);
        this._buildBagPopup();
      });
    }

    // Item rows
    pageItems.forEach((entry, idx) => {
      const y = listStartY + idx * rowH;
      const isSelected = selected.has(entry);
      const rowBg = this.add.rectangle(
        centerX,
        y,
        rowWidth,
        25,
        isSelected ? 0x3a1515 : 0x2a2a2a,
        0.95,
      ).setInteractive();
      if (isSelected) rowBg.setStrokeStyle(1, 0xff4444);
      this.bagPopupDetailGroup.add(rowBg);

      const color = tierColors[(entry.tier || 1) - 1] || '#ddd';
      this.bagPopupDetailGroup.add(
        this.add.text(textLeft, y, entry.name, {
          fontSize: '13px',
          fill: color,
          fixedWidth: textWidth,
          align: 'left',
        }).setOrigin(0, 0.5),
      );

      rowBg.on('pointerdown', () => {
        if (selected.has(entry)) selected.delete(entry);
        else selected.add(entry);
        this._openBagStackDetail(stack, currentPage);
        this._buildBagPopup();
      });
    });

    if (totalPages > 1) {
      const pageY = Math.min(panelBottom - 14, listStartY + maxLines * rowH);
      const prevBtn = this.add.text(centerX - 90, pageY, '← PREV', {
        fontSize: '11px',
        fill: currentPage > 0 ? '#ddd' : '#666',
        backgroundColor: '#222',
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setInteractive();
      this.bagPopupDetailGroup.add(prevBtn);
      if (currentPage > 0) {
        prevBtn.on(
          'pointerdown',
          () => this._openBagStackDetail(stack, currentPage - 1),
        );
      }

      this.bagPopupDetailGroup.add(
        this.add.text(centerX, pageY, `${currentPage + 1}/${totalPages}`, {
          fontSize: '11px',
          fill: '#aaa',
        }).setOrigin(0.5),
      );

      const nextBtn = this.add.text(centerX + 90, pageY, 'NEXT →', {
        fontSize: '11px',
        fill: currentPage < totalPages - 1 ? '#ddd' : '#666',
        backgroundColor: '#222',
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setInteractive();
      this.bagPopupDetailGroup.add(nextBtn);
      if (currentPage < totalPages - 1) {
        nextBtn.on(
          'pointerdown',
          () => this._openBagStackDetail(stack, currentPage + 1),
        );
      }
    }

    // Back button
    const backBtn = this.add.text(panelRight - 14, titleY, 'BACK', {
      fontSize: '13px',
      fill: '#f88',
      backgroundColor: '#333',
      padding: { x: 8, y: 4 },
    }).setOrigin(1, 0.5).setInteractive();
    this.bagPopupDetailGroup.add(backBtn);
    backBtn.on('pointerdown', () => {
      this._closeBagStackDetail();
      this._buildBagPopup();
    });
  }

  _closeBagStackDetail() {
    if (this.bagPopupDetailGroup) {
      this.bagPopupDetailGroup.clear(true, true);
      this.bagPopupDetailGroup = null;
    }
  }

  // Phaser v3 event hooks
  init() {
    this.events.on('shutdown', this.onShutdown, this);
    this.events.on('destroy', this.onDestroy, this);
  }
}

globalThis.DungeonHud = DungeonHud;
