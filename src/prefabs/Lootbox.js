// Lootbox.js - Lootbox prefab
class Lootbox extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, boxData) {
    super(scene, x, y, scene.lootboxSpriteKey, 2);
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

    scene.add.existing(this);
  }

  open() {
    if (this.opened || this.isOpening) return;
    this.isOpening = true;
    this.play(this.scene.lootboxOpenAnimKey);
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.isOpening = false;
      this.opened = true;
      this.setFrame(29);
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

    const items = this.generateItems();
    const player = globalThis.gameState?.player;
    const addItem = player?.addItem;

    if (typeof addItem !== 'function') {
      console.warn('Lootbox opened without a valid player.addItem handler.');
      this.showLootResults(items);
      this.emit('lootboxOpened', items);
      return;
    }

    const bagCap = typeof player.bagSlots === 'number'
      ? player.bagSlots
      : (typeof player.maxInventory === 'number' ? player.maxInventory : 20);
    const currentCount = Array.isArray(player.inventory)
      ? player.inventory.length
      : 0;
    const freeSlots = Math.max(0, bagCap - currentCount);

    const fittingItems = items.slice(0, freeSlots);
    const overflowItems = items.slice(freeSlots);

    fittingItems.forEach((item) => addItem.call(player, item));
    this.showLootResults(fittingItems);
    this.emit('lootboxOpened', fittingItems);

    if (overflowItems.length > 0) {
      this.emit('lootboxOverflow', overflowItems);
    }
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
    const camera = this.scene.cameras.main;
    const screenX = Phaser.Math.Clamp(
      (this.x - camera.worldView.x) * camera.zoom,
      120,
      this.scene.scale.width - 120,
    );
    const startY = Phaser.Math.Clamp(
      (this.y - camera.worldView.y) * camera.zoom - 40,
      100,
      this.scene.scale.height - 140,
    );

    items.forEach((item, index) => {
      const yOffset = index * 14;
      const text = this.scene.add.text(
        screenX,
        startY - yOffset,
        `+ ${item.name}`,
        {
          fontSize: '9px',
          fill: '#0f0',
          stroke: '#000',
          strokeThickness: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          padding: { x: 3, y: 1 },
        },
      ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

      this.scene.tweens.add({
        targets: text,
        y: text.y - 20,
        alpha: 0,
        duration: 1500,
        onComplete: () => text.destroy(),
      });
    });
  }
}

globalThis.Lootbox = Lootbox;
