// Lootbox.js - Lootbox prefab
class Lootbox extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, boxData) {
    const chestCol = Phaser.Math.Between(0, 8);
    super(scene, x, y, scene.lootboxSpriteKey, chestCol);
    this.chestCol = chestCol;
    this.openAnimKey = `lootbox-open-${chestCol}`;
    this.openedFrame = chestCol + 27;
    this.setDisplaySize(20, 20);

    this.boxData = boxData || {
      box_tier: 1,
      size: 1,
      luck: 0,
      total_items: 3,
      loot: { 'Tier 1': 3 },
    };

    this.opened = false;
    this.isOpening = false;
    this.pendingItems = null;

    scene.add.existing(this);
  }

  open() {
    if (this.opened || this.isOpening) return;

    if (!this.boxData.isTrap) {
      const items = this.generateItems();
      const player = globalThis.gameState?.player;
      const bagCap = typeof player?.bagSlots === 'number'
        ? player.bagSlots
        : (typeof player?.maxInventory === 'number' ? player.maxInventory : 20);

      if (!this.canFitAllItems(player, bagCap, items)) {
        this.showBagFullMessage();
        return;
      }

      this.pendingItems = items;
    }

    this.isOpening = true;
    if (this.scene.cache.audio.exists('lootbox-open-sfx')) {
      this.scene.sound.play('lootbox-open-sfx', { volume: 0.35 });
    }
    this.play(this.openAnimKey);
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.isOpening = false;
      this.opened = true;
      this.setFrame(this.openedFrame);
      this.finishOpening();
    });
  }

  finishOpening() {
    this.opened = true;

    if (this.boxData.isTrap) {
      this.showTrapMessage();
      this.emit('lootboxOpened', []);
      return;
    }

    const items = this.pendingItems || this.generateItems();
    this.pendingItems = null;
    const player = globalThis.gameState?.player;
    const addItem = player?.addItem;

    if (typeof addItem !== 'function') {
      console.warn('Lootbox opened without a valid player.addItem handler.');
      this.showLootResults(items);
      this.emit('lootboxOpened', items);
      return;
    }

    items.forEach((item) => addItem.call(player, item));
    this.showLootResults(items);
    this.emit('lootboxOpened', items);
  }

  canFitAllItems(player, bagCap, items) {
    const inventory = Array.isArray(player?.inventory) ? player.inventory : [];
    const stackCounts = new Map();

    inventory.forEach((item) => {
      const key = item?.name || 'Unknown';
      stackCounts.set(key, (stackCounts.get(key) || 0) + 1);
    });

    let usedSlots = stackCounts.size;

    for (const item of items) {
      const key = item?.name || 'Unknown';
      if (!stackCounts.has(key)) {
        usedSlots += 1;
        if (usedSlots > bagCap) {
          return false;
        }
        stackCounts.set(key, 1);
      } else {
        stackCounts.set(key, stackCounts.get(key) + 1);
      }
    }

    return true;
  }

  showBagFullMessage() {
    const text = this.scene.add.text(
      this.x,
      this.y - 30,
      'Bag full\nOpen Inventory first',
      {
        fontSize: '14px',
        fill: '#ffcc66',
        stroke: '#000',
        strokeThickness: 3,
        align: 'center',
      },
    ).setOrigin(0.5).setDepth(1100);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      duration: 1400,
      onComplete: () => text.destroy(),
    });
  }

  showTrapMessage() {
    const text = this.scene.add.text(
      this.x,
      this.y - 30,
      'trap chest opened!\nget out now lol',
      {
        fontSize: '16px',
        fill: '#ff4444',
        stroke: '#000',
        strokeThickness: 3,
        align: 'center',
      },
    ).setOrigin(0.5).setDepth(1100);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 60,
      alpha: 0,
      duration: 3000,
      onComplete: () => text.destroy(),
    });
  }

  generateItems() {
    const items = [];

    const weaponGen = globalThis.Weapon?.generate;
    const armorGen = globalThis.Armor?.generate;
    const accessoryGen = globalThis.Accessory?.generate;
    const craftGen = globalThis.GameItem?.generateCraftingMaterial;
    const sellGen = globalThis.GameItem?.generateSellingMaterial;

    const fallbackMaterial = (tier) => ({
      id: `fallback_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `material(${tier})`,
      type: 'material',
      tier,
      value: Math.max(1, Math.floor(8 * tier)),
      sellable: true,
      stats: {},
    });

    const safeGenerate = (generator, tier, fallback) => {
      if (typeof generator !== 'function') {
        return fallback(tier);
      }

      try {
        const generated = generator(tier);
        return generated || fallback(tier);
      } catch (_error) {
        return fallback(tier);
      }
    };

    for (const [tierStr, count] of Object.entries(this.boxData.loot)) {
      const tier = parseInt(tierStr.split(' ')[1]);
      if (isNaN(tier)) continue;

      for (let i = 0; i < count; i++) {
        const rand = Math.random();
        let itemData;

        if (rand < 0.2) {
          itemData = safeGenerate(weaponGen, tier, fallbackMaterial);
        } else if (rand < 0.4) {
          itemData = safeGenerate(armorGen, tier, fallbackMaterial);
        } else if (rand < 0.6) {
          itemData = safeGenerate(accessoryGen, tier, fallbackMaterial);
        } else if (rand < 0.8) {
          itemData = safeGenerate(craftGen, tier, fallbackMaterial);
        } else {
          itemData = safeGenerate(sellGen, tier, fallbackMaterial);
        }

        items.push(itemData);
      }
    }

    return items;
  }

  showLootResults(items) {
    const hudScene = this.scene.scene.get('DungeonHud');
    if (hudScene?.scene?.isActive()) {
      hudScene.showLootResults(
        items,
        this.x,
        this.y,
        this.chestId || this.name || 'lootbox',
      );
      return;
    }
  }
}

globalThis.Lootbox = Lootbox;
