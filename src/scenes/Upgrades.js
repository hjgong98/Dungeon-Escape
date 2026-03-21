class Upgrades extends Phaser.Scene {
  constructor() {
    super('Upgrades');
    this.currentTab = 'equip'; // 'equip', 'enhance', 'purchase'
    this.equipPage = 0;
    this.selectedItem = null;
    this.selectedLocation = null;
    this.contentGroup = null;
  }

  init(data = {}) {
    this.currentTab = data.currentTab || this.currentTab || 'equip';
    this.equipPage = Number.isInteger(data.equipPage) && data.equipPage >= 0
      ? data.equipPage
      : (this.currentTab === 'equip' ? this.equipPage : 0);
    this.selectedItem = null;
    this.selectedLocation = null;
    this.contentGroup = null;
  }

  preload() {
    globalThis.registerSharedSfx?.(this);
    this.load.image('upgradesBackground', './assets/forest1.png');
  }

  create() {
    globalThis.enableSceneUiClickSfx?.(this);
    const player = this.getPlayerState();
    if (!player) {
      console.warn('[Upgrades] Missing player state; returning to Play scene.');
      this.scene.start('Play');
      return;
    }

    // Background
    const { width, height } = this.scale;
    const bgKey = 'upgradesBackground';
    if (this.textures.exists(bgKey)) {
      const bgImage = this.textures.get(bgKey).getSourceImage();
      const bgScale = height / bgImage.height;

      this.background = this.add.image(width / 2, 0, bgKey).setOrigin(0.5, 0);
      this.background.setScale(bgScale);
    } else {
      this.cameras.main.setBackgroundColor('#131722');
    }

    // Title and gold
    this.add.text(400, 40, 'UPGRADES STATION', {
      fontSize: '36px',
      fill: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const gold = player.gold || 0;
    this.add.text(680, 40, `💰 ${gold}`, {
      fontSize: '24px',
      fill: '#ff0',
      backgroundColor: '#333',
      padding: { x: 10, y: 5 },
    });

    // Create tabs
    this.createTabs();

    // Create content based on current tab
    if (this.currentTab === 'equip') {
      this.createEquipTab();
    } else if (this.currentTab === 'enhance') {
      this.createEnhanceTab();
    } else {
      this.createPurchaseTab();
    }

    // Back button
    const backButton = this.add.text(100, 550, '← BACK TO PLAY', {
      fontSize: '24px',
      fill: '#fff',
      backgroundColor: '#333',
      padding: { x: 15, y: 8 },
    }).setInteractive();

    backButton.on('pointerdown', () => {
      this.scene.start('Play');
    });
  }

  createTabs() {
    const tabWidth = 120;
    const tabs = ['EQUIP', 'ENHANCE', 'PURCHASE'];

    tabs.forEach((tab, index) => {
      const x = 280 + index * 140;
      const isActive = (index === 0 && this.currentTab === 'equip') ||
        (index === 1 && this.currentTab === 'enhance') ||
        (index === 2 && this.currentTab === 'purchase');

      const tabBg = this.add.rectangle(x, 90, tabWidth, 40, 0x333333, 0.9)
        .setInteractive();

      if (isActive) {
        tabBg.setStrokeStyle(3, 0xff0);
      }

      this.add.text(x, 90, tab, {
        fontSize: '22px',
        fill: isActive ? '#ff0' : '#fff',
        fontStyle: isActive ? 'bold' : 'normal',
      }).setOrigin(0.5);

      tabBg.on('pointerdown', () => {
        const nextTab = index === 0
          ? 'equip'
          : (index === 1 ? 'enhance' : 'purchase');

        // Refresh scene
        this.scene.restart({ currentTab: nextTab });
      });
    });
  }

  createEquipTab() {
    if (this.contentGroup) this.contentGroup.clear(true, true);
    this.contentGroup = this.add.group();
    const itemsPerPage = 3;

    const overlay = this.add.rectangle(400, 315, 700, 380, 0x000000, 0.72);
    this.contentGroup.add(overlay);

    const equipColumnX = 120;
    const equipColumnRightX = 450;
    const statsColumnX = 535;
    const itemNameX = 190;
    const itemStatsX = 410;
    const itemButtonX = 590;

    const player = this.getPlayerState();
    if (!player) {
      return;
    }
    const eq = player.equipment ||
      { weapon: null, armor: null, accessory: null };

    const equipTitleStyle = {
      fontSize: '22px',
      fill: '#0ff',
      fontStyle: 'bold',
    };
    const statsTitleStyle = {
      fontSize: '22px',
      fill: '#ff0',
      fontStyle: 'bold',
    };

    // Current Equipment Section
    const equipTitle = this.add.text(
      equipColumnX,
      156,
      'CURRENT EQUIPMENT',
      equipTitleStyle,
    ).setOrigin(0, 0.5);
    this.contentGroup.add(equipTitle);

    // Weapon slot
    this.createEquipmentSlot(
      equipColumnX,
      210,
      'weapon',
      eq.weapon,
      'weapon',
      equipColumnRightX,
    );

    // Armor slot
    this.createEquipmentSlot(
      equipColumnX,
      258,
      'armor',
      eq.armor,
      'armor',
      equipColumnRightX,
    );

    // Accessory slot
    this.createEquipmentSlot(
      equipColumnX,
      306,
      'accessory',
      eq.accessory,
      'accessory',
      equipColumnRightX,
    );

    // Stats Panel
    const statsTitle = this.add.text(
      statsColumnX,
      156,
      'TOTAL STATS',
      statsTitleStyle,
    ).setOrigin(0, 0.5);
    this.contentGroup.add(statsTitle);

    const stats = this.calculateTotalStats(player);

    const atkStat = this.add.text(statsColumnX, 206, `ATK: ${stats.atk}`, {
      fontSize: '18px',
      fill: '#ff0',
    });
    const defStat = this.add.text(statsColumnX, 240, `DEF: ${stats.def}`, {
      fontSize: '18px',
      fill: '#0ff',
    });
    const hpStat = this.add.text(
      statsColumnX,
      274,
      `HP: ${player.hp || 100}/${stats.maxHP || 100}`,
      { fontSize: '18px', fill: '#f88' },
    );
    const luckStat = this.add.text(
      statsColumnX,
      308,
      `LUCK: ${Math.floor(stats.luck * 100)}%`,
      { fontSize: '18px', fill: '#f0f' },
    );

    this.contentGroup.addMultiple([atkStat, defStat, hpStat, luckStat]);

    // Available Items Section
    const availTitle = this.add.text(400, 352, 'AVAILABLE TO EQUIP', {
      fontSize: '20px',
      fill: '#ff0',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.contentGroup.add(availTitle);

    // Show items from bag and storage
    const bag = player.inventory || [];
    const storage = player.storage || [];
    const allItems = [
      ...bag.map((i) => ({ ...i, location: 'bag' })),
      ...storage.map((i) => ({ ...i, location: 'storage' })),
    ];

    const equippable = allItems.filter((i) =>
      ['weapon', 'armor', 'accessory'].includes(i.type)
    );

    const totalPages = Math.max(1, Math.ceil(equippable.length / itemsPerPage));
    this.equipPage = Phaser.Math.Clamp(this.equipPage || 0, 0, totalPages - 1);
    const pageStart = this.equipPage * itemsPerPage;
    const pageItems = equippable.slice(pageStart, pageStart + itemsPerPage);

    let y = 388;
    pageItems.forEach((item) => {
      const tierColors = ['#888', '#8f8', '#88f', '#f8f', '#ff8', '#f88'];
      const color = tierColors[(item.tier || 1) - 1] || '#fff';

      const upgradeText = item.upgradeLevel > 0 ? ` +${item.upgradeLevel}` : '';
      const itemName = this.add.text(
        itemNameX,
        y,
        `[${item.location}] ${item.name}${upgradeText}`,
        {
          fontSize: '16px',
          fill: color,
        },
      );
      this.contentGroup.add(itemName);

      const itemStats = this.add.text(
        itemStatsX,
        y,
        this.getItemStatsPreview(item),
        {
          fontSize: '14px',
          fill: '#aaa',
        },
      );
      this.contentGroup.add(itemStats);

      const equipBtn = this.add.text(itemButtonX, y - 5, 'EQUIP', {
        fontSize: '14px',
        fill: '#0f0',
        backgroundColor: '#444',
        padding: { x: 8, y: 3 },
      }).setInteractive();
      this.contentGroup.add(equipBtn);

      equipBtn.on('pointerdown', () => {
        this.equipItem(item);
      });

      y += 30;
    });

    if (equippable.length === 0) {
      const emptyList = this.add.text(
        400,
        y,
        'No equippable items in bag/storage.',
        {
          fontSize: '15px',
          fill: '#888',
          fontStyle: 'italic',
        },
      ).setOrigin(0.5, 0);
      this.contentGroup.add(emptyList);
      return;
    }

    if (totalPages > 1) {
      const pageLabel = this.add.text(
        400,
        478,
        `Page ${this.equipPage + 1}/${totalPages}`,
        {
          fontSize: '14px',
          fill: '#fff',
        },
      ).setOrigin(0.5);
      this.contentGroup.add(pageLabel);

      const prevBtn = this.add.text(320, 478, '◀ PREV', {
        fontSize: '14px',
        fill: this.equipPage > 0 ? '#0ff' : '#666',
        backgroundColor: '#333',
        padding: { x: 8, y: 4 },
      }).setOrigin(0.5);
      this.contentGroup.add(prevBtn);

      if (this.equipPage > 0) {
        prevBtn.setInteractive();
        prevBtn.on('pointerdown', () => {
          this.scene.restart({
            currentTab: 'equip',
            equipPage: this.equipPage - 1,
          });
        });
      }

      const nextBtn = this.add.text(480, 478, 'NEXT ▶', {
        fontSize: '14px',
        fill: this.equipPage < totalPages - 1 ? '#0ff' : '#666',
        backgroundColor: '#333',
        padding: { x: 8, y: 4 },
      }).setOrigin(0.5);
      this.contentGroup.add(nextBtn);

      if (this.equipPage < totalPages - 1) {
        nextBtn.setInteractive();
        nextBtn.on('pointerdown', () => {
          this.scene.restart({
            currentTab: 'equip',
            equipPage: this.equipPage + 1,
          });
        });
      }
    }
  }

  createEquipmentSlot(x, y, label, item, type, rightEdgeX = x + 330) {
    const panelWidth = rightEdgeX - x;
    const panel = this.add.rectangle(
      x + (panelWidth / 2),
      y,
      panelWidth,
      40,
      0x333333,
      0.8,
    ).setStrokeStyle(2, 0x555555);
    this.contentGroup.add(panel);

    if (item) {
      const upgradeText = item.upgradeLevel > 0 ? ` +${item.upgradeLevel}` : '';
      const rowY = y;
      const itemName = this.add.text(
        x + 10,
        rowY,
        `${item.name}${upgradeText}`,
        {
          fontSize: '14px',
          fill: '#fff',
          fixedWidth: Math.max(110, panelWidth - 220),
        },
      ).setOrigin(0, 0.5);

      const itemStats = this.add.text(
        x + (panelWidth * 0.53),
        rowY,
        this.getItemStatsPreview(item),
        {
          fontSize: '12px',
          fill: '#aaa',
          align: 'center',
          fixedWidth: 115,
        },
      ).setOrigin(0.5, 0.5);

      const unequipBtn = this.add.text(rightEdgeX - 10, rowY, 'UNEQUIP', {
        fontSize: '13px',
        fill: '#f88',
        backgroundColor: '#444',
        padding: { x: 7, y: 2 },
      }).setOrigin(1, 0.5).setInteractive();

      unequipBtn.on('pointerdown', () => {
        this.unequipItem(type);
      });

      this.contentGroup.addMultiple([itemName, itemStats, unequipBtn]);
    } else {
      const emptyText = this.add.text(x + 10, y, `${label} [empty]`, {
        fontSize: '14px',
        fill: '#666',
        fontStyle: 'italic',
      }).setOrigin(0, 0.5);
      this.contentGroup.add(emptyText);
    }
  }

  createEnhanceTab() {
    if (this.contentGroup) this.contentGroup.clear(true, true);
    this.contentGroup = this.add.group();

    const overlay = this.add.rectangle(400, 315, 700, 380, 0x000000, 0.72);
    this.contentGroup.add(overlay);

    const player = this.getPlayerState();
    if (!player) {
      return;
    }

    // Show equipped items first
    const eq = player.equipment || {};
    const equipItems = [
      { item: eq.weapon, slotLabel: 'weapon', location: 'equipped' },
      { item: eq.armor, slotLabel: 'armor', location: 'equipped' },
      { item: eq.accessory, slotLabel: 'accessory', location: 'equipped' },
    ].filter((entry) => entry.item && entry.item.id);

    let y = 214;

    if (equipItems.length > 0) {
      const equippedTitle = this.add.text(400, 156, 'EQUIPPED ITEMS', {
        fontSize: '22px',
        fill: '#0ff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.contentGroup.add(equippedTitle);
    } else {
      y = 186;
    }

    equipItems.forEach((entry) => {
      this.createEnhanceItemRow(entry.item, y, entry.location, entry.slotLabel);
      y += 82;
    });
  }

  createEnhanceItemRow(item, y, location, slotLabel) {
    const tierColors = ['#888', '#8f8', '#88f', '#f8f', '#ff8', '#f88'];
    const color = tierColors[(item.tier || 1) - 1] || '#fff';

    // Item background
    const bg = this.add.rectangle(400, y, 640, 62, 0x333333, 0.8);
    this.contentGroup.add(bg);

    // Item label
    const typeLabel = (slotLabel || item.type || 'item').toUpperCase();
    const itemName = this.add.text(
      108,
      y - 10,
      `[${typeLabel}] ${item.name}`,
      {
        fontSize: '16px',
        fill: color,
        fontStyle: 'bold',
      },
    ).setOrigin(0, 0.5);
    this.contentGroup.add(itemName);

    const currentLevel = item.upgradeLevel || 0;
    const maxLevel = item.maxUpgradeLevel || 5;
    const upgradeInfo = this.add.text(
      108,
      y + 10,
      `Upgrade ${currentLevel}/${maxLevel}`,
      {
        fontSize: '14px',
        fill: '#aaa',
      },
    ).setOrigin(0, 0.5);
    this.contentGroup.add(upgradeInfo);

    const canUpgrade = currentLevel < maxLevel;

    if (canUpgrade) {
      const cost = this.getEnhanceCost(item);
      const costText = this.add.text(
        390,
        y + 10,
        `+1 (${cost.coins}g${
          cost.materialAmount > 0
            ? ` + ${cost.materialAmount}x T${cost.materialTier} mats`
            : ''
        })`,
        {
          fontSize: '14px',
          fill: '#f0f',
        },
      ).setOrigin(0, 0.5);
      this.contentGroup.add(costText);

      const upgradeBtn = this.add.text(640, y, 'UPGRADE', {
        fontSize: '14px',
        fill: '#0f0',
        backgroundColor: '#444',
        padding: { x: 10, y: 6 },
      }).setOrigin(0.5).setInteractive();
      this.contentGroup.add(upgradeBtn);

      upgradeBtn.on('pointerdown', () => {
        this.upgradeItem(item, location);
      });
    } else {
      const maxText = this.add.text(640, y, 'MAX LEVEL', {
        fontSize: '14px',
        fill: '#f88',
        fontStyle: 'bold',
        backgroundColor: '#444',
        padding: { x: 10, y: 6 },
      }).setOrigin(0.5);
      this.contentGroup.add(maxText);
    }
  }

  getEnhanceCost(item) {
    const tier = Math.max(1, item.tier || 1);
    const nextLevel = (item.upgradeLevel || 0) + 1;
    const currentLevel = item.upgradeLevel || 0;

    return {
      coins: Math.floor(10 * tier + (5 * currentLevel)),
      materialTier: nextLevel === 5 ? tier : Math.max(0, tier - 1),
      materialAmount: nextLevel === 5 ? tier : Math.max(0, tier - 1),
    };
  }

  countMaterialsByTier(player, tier) {
    if (!tier) return 999;
    const allItems = [...(player.inventory || []), ...(player.storage || [])];
    return allItems.filter((item) =>
      item.type === 'crafting_material' && item.tier === tier
    )
      .length;
  }

  consumeMaterialsByTier(player, tier, amount) {
    if (!tier || amount <= 0) return;

    const consumeFrom = (containerName) => {
      const container = player[containerName] || [];
      for (let i = container.length - 1; i >= 0 && amount > 0; i--) {
        const item = container[i];
        if (item.type === 'crafting_material' && item.tier === tier) {
          container.splice(i, 1);
          amount--;
        }
      }
    };

    consumeFrom('storage');
    if (amount > 0) consumeFrom('inventory');
  }

  createPurchaseTab() {
    if (this.contentGroup) this.contentGroup.clear(true, true);
    this.contentGroup = this.add.group();

    const player = this.getPlayerState();
    if (!player) {
      return;
    }
    const stats = this.calculateTotalStats(player);
    const potionCost = 10;
    const isFullyHealed = (player.hp || 0) >= (stats.maxHP || 100);
    const canAffordPotion = (player.gold || 0) >= potionCost;

    const overlay = this.add.rectangle(400, 315, 700, 380, 0x000000, 0.72);
    this.contentGroup.add(overlay);

    const title = this.add.text(400, 156, 'PURCHASE SUPPLIES', {
      fontSize: '22px',
      fill: '#ff0',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.contentGroup.add(title);

    const potionPanel = this.add.rectangle(400, 224, 620, 92, 0x1f1f1f, 0.95)
      .setStrokeStyle(2, 0x666666);
    this.contentGroup.add(potionPanel);

    const potionTitle = this.add.text(136, 203, 'HEALTH POTION', {
      fontSize: '20px',
      fill: '#ff6b6b',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.contentGroup.add(potionTitle);

    const potionDesc = this.add.text(
      136,
      228,
      `Fully restores HP to ${stats.maxHP || 100}`,
      {
        fontSize: '15px',
        fill: '#fff',
        fixedWidth: 280,
      },
    ).setOrigin(0, 0.5);
    this.contentGroup.add(potionDesc);

    const hpStatus = this.add.text(
      136,
      250,
      `Current HP: ${player.hp || 0}/${stats.maxHP || 100}`,
      {
        fontSize: '13px',
        fill: '#aaa',
        fixedWidth: 280,
      },
    ).setOrigin(0, 0.5);
    this.contentGroup.add(hpStatus);

    const potionCostText = this.add.text(468, 206, `Cost: ${potionCost} gold`, {
      fontSize: '15px',
      fill: '#ffd54a',
    }).setOrigin(0.5);
    this.contentGroup.add(potionCostText);

    const buttonFill = canAffordPotion && !isFullyHealed ? '#0f0' : '#777';
    const buyPotionBtn = this.add.text(555, 228, 'BUY POTION', {
      fontSize: '15px',
      fill: buttonFill,
      backgroundColor: '#333',
      padding: { x: 12, y: 5 },
    }).setOrigin(0.5);
    this.contentGroup.add(buyPotionBtn);

    if (canAffordPotion && !isFullyHealed) {
      buyPotionBtn.setInteractive();
      buyPotionBtn.on('pointerdown', () => {
        this.purchaseHealthPotion();
      });
    }

    const statusMessage = isFullyHealed
      ? 'You are already at full health.'
      : (canAffordPotion
        ? 'Restore to full before your next dungeon run.'
        : 'Not enough gold.');
    const statusColor = isFullyHealed
      ? '#8f8'
      : (canAffordPotion ? '#aaa' : '#f88');
    const statusText = this.add.text(405, 250, statusMessage, {
      fontSize: '12px',
      fill: statusColor,
      fixedWidth: 250,
      align: 'left',
      wordWrap: { width: 250 },
    }).setOrigin(0, 0.5);
    this.contentGroup.add(statusText);

    const materialsTitle = this.add.text(
      400,
      294,
      'ALL EQUIPMENT UPGRADE MATERIALS',
      {
        fontSize: '18px',
        fill: '#0ff',
        fontStyle: 'bold',
      },
    ).setOrigin(0.5);
    this.contentGroup.add(materialsTitle);

    const materialsHint = this.add.text(
      400,
      316,
      'These crafting materials are used for weapon, armor, and accessory upgrades.',
      {
        fontSize: '12px',
        fill: '#aaa',
      },
    ).setOrigin(0.5);
    this.contentGroup.add(materialsHint);

    for (let tier = 1; tier <= 6; tier++) {
      const column = (tier - 1) % 3;
      const row = Math.floor((tier - 1) / 3);
      const panelX = 190 + column * 210;
      const panelY = 372 + row * 78;
      const materialCost = 10 * tier;
      const canAffordMaterial = (player.gold || 0) >= materialCost;
      const tierColors = ['#888', '#8f8', '#88f', '#f8f', '#ff8', '#f88'];
      const tierColor = tierColors[tier - 1] || '#fff';

      const materialPanel = this.add.rectangle(
        panelX,
        panelY,
        180,
        72,
        0x1f1f1f,
        0.95,
      )
        .setStrokeStyle(2, 0x555555);
      this.contentGroup.add(materialPanel);

      const materialName = this.add.text(
        panelX,
        panelY - 22,
        `T${tier} MATERIAL`,
        {
          fontSize: '14px',
          fill: tierColor,
          fontStyle: 'bold',
        },
      ).setOrigin(0.5);
      this.contentGroup.add(materialName);

      const materialCostText = this.add.text(
        panelX,
        panelY,
        `${materialCost} gold`,
        {
          fontSize: '12px',
          fill: '#ffd54a',
        },
      ).setOrigin(0.5);
      this.contentGroup.add(materialCostText);

      const materialBtn = this.add.text(panelX, panelY + 22, 'BUY 1', {
        fontSize: '11px',
        fill: canAffordMaterial ? '#0f0' : '#777',
        backgroundColor: '#333',
        padding: { x: 7, y: 3 },
      }).setOrigin(0.5);
      this.contentGroup.add(materialBtn);

      if (canAffordMaterial) {
        materialBtn.setInteractive();
        materialBtn.on('pointerdown', () => {
          this.purchaseUpgradeMaterial(tier);
        });
      }
    }
  }

  purchaseUpgradeMaterial(tier) {
    const player = this.getPlayerState();
    if (!player) {
      return;
    }
    const cost = 10 * tier;

    if ((player.gold || 0) < cost) {
      return;
    }

    const material = globalThis.GameItem?.generateCraftingMaterial
      ? globalThis.GameItem.generateCraftingMaterial(tier)
      : {
        id: `craft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: `Crafting Material T${tier}`,
        type: 'crafting_material',
        tier,
        value: Math.max(1, Math.floor(8 * tier)),
        sellable: true,
        stats: {},
        use: 'crafting',
        upgradeLevel: 0,
        maxUpgradeLevel: 0,
      };

    player.gold -= cost;
    if (!player.storage) player.storage = [];
    player.storage.push(material);

    this.scene.restart({ currentTab: 'purchase' });
  }

  purchaseHealthPotion() {
    const player = this.getPlayerState();
    if (!player) {
      return;
    }
    const potionCost = 10;
    const stats = this.calculateTotalStats(player);
    const maxHP = stats.maxHP || 100;

    if ((player.gold || 0) < potionCost) {
      return;
    }

    player.gold -= potionCost;
    player.hp = maxHP;

    this.scene.restart({ currentTab: 'purchase' });
  }

  calculateTotalStats(player) {
    const base = {
      atk: player.atk || 10,
      def: player.def || 5,
      luck: player.luck || 0,
      maxHP: player.maxHP || 100,
    };

    const eq = player.equipment || {};

    if (eq.weapon?.stats) {
      const weaponBaseAtk = Number(eq.weapon.stats.atkBonus) || 0;
      const weaponAtkPct = Number(eq.weapon.stats.atkPctBonus) || 0;

      if (weaponAtkPct > 0) {
        base.atk = Math.floor((base.atk + weaponBaseAtk) * (1 + weaponAtkPct));
      } else {
        base.atk += weaponBaseAtk;
      }

      base.luck += eq.weapon.stats.luckBonus || 0;
    }

    if (eq.armor?.stats) {
      const armorBaseDef = Number(eq.armor.stats.defBonus) || 0;
      const armorBaseHp = Number(eq.armor.stats.hpBonus) || 0;
      const armorDefPct = Number(eq.armor.stats.defPctBonus) || 0;
      const armorHpPct = Number(eq.armor.stats.hpPctBonus) || 0;

      if (armorDefPct > 0) {
        base.def = Math.floor((base.def + armorBaseDef) * (1 + armorDefPct));
      } else {
        base.def += armorBaseDef;
      }

      if (armorHpPct > 0) {
        base.maxHP = Math.floor(
          (base.maxHP + armorBaseHp) * (1 + armorHpPct),
        );
      } else {
        base.maxHP += armorBaseHp;
      }

      base.luck += eq.armor.stats.luckBonus || 0;
    }

    if (eq.accessory?.stats) {
      base.luck += eq.accessory.stats.luckBonus || 0;
    }

    return base;
  }

  getItemStatsPreview(item) {
    if (!item || !item.stats) return 'No stats';

    const parts = [];
    if (item.stats.atkBonus) parts.push(`ATK+${item.stats.atkBonus}`);
    if (item.stats.atkPctBonus) {
      parts.push(`ATK+${Math.floor(item.stats.atkPctBonus * 100)}%`);
    }
    if (item.stats.defBonus) parts.push(`DEF+${item.stats.defBonus}`);
    if (item.stats.hpBonus) parts.push(`HP+${item.stats.hpBonus}`);
    if (item.stats.defPctBonus) {
      parts.push(`DEF+${Math.floor(item.stats.defPctBonus * 100)}%`);
    }
    if (item.stats.hpPctBonus) {
      parts.push(`HP+${Math.floor(item.stats.hpPctBonus * 100)}%`);
    }
    if (item.stats.luckBonus) {
      parts.push(`LCK+${Math.floor(item.stats.luckBonus * 100)}%`);
    }
    if (item.stats.expBonus) {
      parts.push(`EXP+${Math.floor(item.stats.expBonus * 100)}%`);
    }
    if (item.stats.goldBonus) {
      parts.push(`GLD+${Math.floor(item.stats.goldBonus * 100)}%`);
    }
    return parts.join(' ') || 'No stats';
  }

  equipItem(item) {
    const player = this.getPlayerState();
    if (!player) {
      return;
    }
    const type = item.type;

    // Auto-unequip current item of same type
    if (player.equipment[type]) {
      // Move current equipped item to bag
      if (!player.inventory) player.inventory = [];
      player.inventory.push(player.equipment[type]);
    }

    // Equip new item
    player.equipment[type] = item;

    // Remove from original location
    if (item.location === 'bag') {
      player.inventory = player.inventory.filter((i) => i.id !== item.id);
    } else if (item.location === 'storage') {
      player.storage = player.storage.filter((i) => i.id !== item.id);
    }

    // Refresh scene
    this.scene.restart();
  }

  unequipItem(slot) {
    const player = this.getPlayerState();
    if (!player) {
      return;
    }

    if (player.equipment[slot]) {
      if (!player.inventory) player.inventory = [];
      player.inventory.push(player.equipment[slot]);
      player.equipment[slot] = null;
    }

    this.scene.restart();
  }

  upgradeItem(item, _location) {
    // Check if can upgrade
    if (item.upgradeLevel >= (item.maxUpgradeLevel || 5)) {
      console.log('Item already at max level');
      return;
    }

    const player = this.getPlayerState();
    if (!player) {
      return;
    }
    const cost = this.getEnhanceCost(item);

    if ((player.gold || 0) < cost.coins) {
      console.log('Not enough gold for upgrade');
      return;
    }

    if (cost.materialAmount > 0) {
      const available = this.countMaterialsByTier(player, cost.materialTier);
      if (available < cost.materialAmount) {
        console.log('Not enough materials for upgrade');
        return;
      }
    }

    player.gold -= cost.coins;
    this.consumeMaterialsByTier(player, cost.materialTier, cost.materialAmount);

    // Increment upgrade level
    item.upgradeLevel = (item.upgradeLevel || 0) + 1;

    if (item.type === 'armor') {
      const inferredRollType = item.armorRollType ||
        (item.stats?.defPctBonus
          ? 'defPct'
          : (item.stats?.hpPctBonus ? 'hpPct' : 'luck'));

      if (globalThis.Armor?.buildStats) {
        item.stats = globalThis.Armor.buildStats(
          item.tier || 1,
          item.upgradeLevel,
          inferredRollType,
        );
        item.armorRollType = inferredRollType;
      }
    }

    if (item.type === 'weapon') {
      const inferredRollType = item.weaponRollType ||
        (item.stats?.atkPctBonus ? 'atkPct' : 'luck');

      if (globalThis.Weapon?.buildStats) {
        item.stats = globalThis.Weapon.buildStats(
          item.tier || 1,
          item.upgradeLevel,
          inferredRollType,
        );
        item.weaponRollType = inferredRollType;
      }
    }

    if (item.type === 'accessory') {
      const inferredRollType = item.accessoryRollType ||
        (item.stats?.expBonus
          ? 'exp'
          : (item.stats?.goldBonus ? 'gold' : 'luck'));

      if (globalThis.Accessory?.buildStats) {
        item.stats = globalThis.Accessory.buildStats(
          item.tier || 1,
          item.upgradeLevel,
          inferredRollType,
        );
        item.accessoryRollType = inferredRollType;
      }
    }

    // Update stats based on new upgrade level
    // This would need proper stat recalculation based on your formula
    // For now, just a simple boost
    if (
      !['armor', 'weapon', 'accessory'].includes(item.type) &&
      item.stats.atkBonus
    ) {
      item.stats.atkBonus = Math.floor(item.stats.atkBonus * 1.1);
    }
    if (
      !['armor', 'weapon', 'accessory'].includes(item.type) &&
      item.stats.defBonus
    ) {
      item.stats.defBonus = Math.floor(item.stats.defBonus * 1.1);
    }
    if (
      !['armor', 'weapon', 'accessory'].includes(item.type) &&
      item.stats.hpBonus
    ) {
      item.stats.hpBonus = Math.floor(item.stats.hpBonus * 1.1);
    }
    if (
      !['armor', 'weapon', 'accessory'].includes(item.type) &&
      item.stats.luckBonus
    ) {
      item.stats.luckBonus = item.stats.luckBonus * 1.1;
    }

    // Update item sell value to reflect base + invested upgrade coins.
    item.value = globalThis.GameItem?.getSellValueFor
      ? globalThis.GameItem.getSellValueFor(
        item.tier || 1,
        item.upgradeLevel || 0,
      )
      : Math.max(1, Number(item.value) || 1);

    console.log('Item upgraded:', item);

    // Refresh scene
    this.scene.restart();
  }

  getPlayerState() {
    return globalThis.gameState?.player || null;
  }
}

globalThis.Upgrades = Upgrades;
