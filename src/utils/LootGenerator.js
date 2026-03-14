// LootGenerator.js - Pure JavaScript version of the Python loot tool
class LootGenerator {
  constructor() {
    console.log('LootGenerator initialized');
    this.baseTierWeights = [50, 25, 13, 6, 3, 1];
  }

  getRarityProfiles() {
    return {
      1: { size: 2, luck: 0.3, count: 8 },
      2: { size: 3, luck: 0.25, count: 8 },
      3: { size: 4, luck: 0.2, count: 7 },
      4: { size: 5, luck: 0.15, count: 6 },
      5: { size: 6, luck: 0.1, count: 5 },
      6: { size: 7, luck: 0.05, count: 4 },
    };
  }

  normalizeLuck(luck) {
    if (!Number.isFinite(luck)) {
      return 0;
    }
    return Math.min(1, Math.max(0, luck));
  }

  normalizeWeights(weights) {
    const safeWeights = weights.map((weight) =>
      Number.isFinite(weight) ? Math.max(0, weight) : 0
    );
    const total = safeWeights.reduce((a, b) => a + b, 0);

    if (total > 0) {
      return safeWeights;
    }

    return safeWeights.map(() => 1);
  }

  // Generate lootboxes based on parameters
  generate(rarity, size, luck, count) {
    const safeLuck = this.normalizeLuck(luck);
    const output_batch = [];

    for (let i = 0; i < count; i++) {
      const items_dict = {};
      const box_tier = rarity;
      items_dict[box_tier + 1] = 0;
      items_dict[box_tier] = 0;
      if (box_tier - 1 > 0) {
        items_dict[box_tier - 1] = 0;
      }
      if (box_tier - 2 > 0) {
        items_dict[box_tier - 2] = 0;
      }

      const min_items = 2 * size;
      const max_items = Math.floor(2 * size + 2 * Math.sqrt(size));
      const total_items = Math.floor(
        Math.random() * (max_items - min_items + 1) + min_items,
      );

      const guaranteed_num_of_matching_rarity = size;

      let num_items = 0;
      let tiers = [];
      let weights = [];

      // Tiers 1 and 2 are unique cases
      if (box_tier === 1) {
        items_dict[box_tier] += guaranteed_num_of_matching_rarity;
        num_items = guaranteed_num_of_matching_rarity;

        tiers = [box_tier + 1, box_tier];
        weights = this.normalizeWeights([
          25 + 75 * safeLuck,
          75 - 75 * safeLuck,
        ]);

        while (num_items < total_items) {
          const chosen_tier = this.weightedRandom(tiers, weights);
          items_dict[chosen_tier] += 1;
          num_items += 1;
        }
      } else if (box_tier === 2) {
        items_dict[box_tier] += guaranteed_num_of_matching_rarity;
        num_items = guaranteed_num_of_matching_rarity;

        tiers = [box_tier + 1, box_tier, box_tier - 1];
        weights = this.normalizeWeights([
          10 + 90 * safeLuck,
          40 - 40 * safeLuck,
          50 - 50 * safeLuck,
        ]);

        while (num_items < total_items) {
          const chosen_tier = this.weightedRandom(tiers, weights);
          items_dict[chosen_tier] += 1;
          num_items += 1;
        }
      } else {
        items_dict[box_tier] += guaranteed_num_of_matching_rarity;
        num_items = guaranteed_num_of_matching_rarity;

        tiers = [box_tier + 1, box_tier, box_tier - 1, box_tier - 2];
        weights = this.normalizeWeights([
          5 + 95 * safeLuck,
          40 - 40 * safeLuck,
          45 - 45 * safeLuck,
          10 - 10 * safeLuck,
        ]);

        while (num_items < total_items) {
          const chosen_tier = this.weightedRandom(tiers, weights);
          items_dict[chosen_tier] += 1;
          num_items += 1;
        }
      }

      const output = {
        box_tier: box_tier,
        size: size,
        luck: safeLuck,
        total_items: total_items,
        loot: {},
      };

      for (const [key, value] of Object.entries(items_dict)) {
        if (value > 0) {
          output.loot[`Tier ${key}`] = value;
        }
      }

      output_batch.push(output);
    }

    return output_batch;
  }

  weightedRandom(items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) {
      return items[Math.floor(Math.random() * items.length)];
    }

    let rand = Math.random() * total;

    for (let i = 0; i < items.length; i++) {
      if (rand < weights[i]) return items[i];
      rand -= weights[i];
    }
    return items[items.length - 1];
  }

  generateAllRarities() {
    const rarityProfiles = this.getRarityProfiles();
    const rarityTables = {};

    for (let rarity = 1; rarity <= 6; rarity++) {
      const profile = rarityProfiles[rarity] || { size: 3, luck: 0, count: 6 };
      rarityTables[`rarity_${rarity}`] = this.generate(
        rarity,
        profile.size,
        profile.luck,
        profile.count,
      );
    }

    return rarityTables;
  }

  // Generate loot for a specific save
  generateForSave(saveId) {
    console.log(`Generating rarity loot tables for ${saveId}`);
    return this.generateAllRarities();
  }
}

// Make sure it's available globally
globalThis.lootGenerator = new LootGenerator();
console.log('LootGenerator attached to global');
