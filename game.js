// Game State
let isResetting = false; // Flag to prevent saves during reset

const gameState = {
    gold: 0,
    clickPower: 1,
    clickPowerPrice: 50,
    
    // Auto-clicker (single, upgradable)
    autoClickerLevel: 0, // 0 = not purchased, 1+ = active
    autoClickerSpeed: 1000, // Base interval (ms) - 1 click per second
    autoClickerSpeedUpgrades: 0, // Number of speed upgrades purchased
    autoClickerSpeedPrice: 150,
    autoClickerLastClick: 0, // Last click time
    
    // Dwarves
    dwarves: 0,
    dwarfPrice: 25,
    dwarfSpeed: 1.5, // Base speed (reduced from 2)
    dwarfSpeedPrice: 150,
    dwarfMiningSpeed: 2000, // Base mining interval (ms)
    dwarfMiningSpeedPrice: 200,
    dwarfEntities: [], // Track individual dwarf states
    
    // Ores - individual ore types
    ores: [],
    unlockedOres: {}, // { oreId: { unlocked: true, spawnRate: 5000, spawnChance: 0.5, lastSpawn: 0, valueMultiplier: 1, valuePrice: X } }
    oreValueMultiplier: 1,
    oreValuePrice: 300,
    oreSpawnEfficiency: 0, // Chance for double spawns (0-1)
    oreSpawnEfficiencyPrice: 500,
    
    // Minecart system
    minecarts: [],
    minecartCapacity: 20, // Start at 20, cap at 50
    minecartPrice: 500,
    minecartCapacityPrice: 5000, // High starting price
    minecartDeliveryCooldown: 8000, // Base cooldown in ms (increased from 5000)
    minecartDeliverySpeed: 8000, // Current cooldown (decreases with upgrades, increased from 5000)
    minecartDeliverySpeedPrice: 800,
    minecartTurrets: false, // Turret upgrade unlocked
    minecartTurretPrice: 5000000, // 5 million for turrets
    
    // Stats
    coinsPerMinute: 0,
    totalClicks: 0,
    totalGoldEarned: 0, // Track total gold earned for prestige
    
    // Real-time gold tracking for accurate GPM
    goldHistory: [], // Array of { time: timestamp, gold: amount }
    lastGoldCheck: Date.now(),
    
    // Prestige system
    prestigeCurrency: 0, // Current prestige currency
    prestigeNodes: {}, // { nodeId: level } - tracks purchased node levels
    prestigeCount: 0, // Number of times prestiged
    prestigeGoldMultiplier: 1, // Permanent gold multiplier from prestige (stacks with temporary multiplier)
    prestigeSpawnEfficiencyBonus: 0, // Spawn efficiency bonus from prestige upgrades (0-0.6)
    prestigeOreValueMultiplier: 1, // Ore value multiplier from prestige upgrades (1.0 = base, 2.0 = 100% bonus)
    prestigeClickPowerBonus: 0, // Click power bonus from prestige upgrades (0-50)
    prestigeAutoClickerSpeedBonus: 0, // Auto-clicker speed bonus from prestige upgrades (clicks/sec, 0-19)
    
    // Gambling
    gamblePrice: 15000, // Cost to spin the wheel (increased for balance)
    slotMachineLuck: 0, // Luck level (increases rare reward chances)
    slotMachineLuckPrice: 10000,
    
    // Gold multiplier (temporary boost from slot machine)
    goldMultiplier: 1,
    goldMultiplierEndTime: 0, // Timestamp when multiplier expires
    
    // Money bag spawns
    moneyBagSpawnTime: 0, // Next spawn time (random)
    moneyBagElement: null, // Current money bag element
    
    // Multiplier effects
    fallingMoneyInterval: null, // Interval for falling money animation
    
    // Combat system
    soldiers: 0,
    soldierPrice: 1000, // Much more expensive
    soldierAttackPower: 20, // Increased base damage
    soldierAttackPowerPrice: 500,
    soldierAttackSpeed: 500, // Faster base attack (500ms)
    soldierAttackSpeedPrice: 400,
    soldierSpeed: 2.5, // Soldier movement speed (reduced from 4)
    soldierSpeedPrice: 600, // Price for movement speed upgrade
    soldierEntities: [], // Track individual soldier states
    
    enemies: [], // Array of enemy objects
    lastRandomEnemySpawn: 0, // Last time a random enemy spawned
    randomEnemySpawnInterval: 12000, // Random enemy spawn interval (ms) - increased from 8000 to 12000 (50% slower spawns)
    
    // Horde wave system
    nextHordeWaveTime: 0, // Timestamp of next horde wave
    hordeWaveCooldown: 300000, // 5 minutes minimum cooldown after horde (ms)
    lastHordeWaveTime: 0, // Last horde wave timestamp
    hordeWaveActive: false, // Whether a horde wave is currently active
    
    // Audio settings
    volume: 0.5, // Volume level (0.0 to 1.0)
    
};

// Enemy types
const ENEMY_TYPES = [
    { id: 'goblin', name: 'Goblin', emoji: '🗡️', health: 18, speed: 1.5, damage: 0.7, spawnWeight: 50 }, // Reduced damage from 1 to 0.7 (30% nerf)
    { id: 'orc', name: 'Orc', emoji: '🪓', health: 40, speed: 1.2, damage: 1.4, spawnWeight: 30 }, // Reduced damage from 2 to 1.4 (30% nerf)
    { id: 'troll', name: 'Troll', emoji: '🛡️', health: 80, speed: 0.8, damage: 3.5, spawnWeight: 10 } // Reduced damage from 5 to 3.5 (30% nerf)
];

// Performance: Maximum ores on screen at once
const MAX_ORES_ON_SCREEN = 100;

// Prestige Node Definitions - Simplified and consolidated for casual play
const PRESTIGE_NODES = {
    // Tier 1 - Root: Gold Multiplier (up to 100%)
    'gold-multiplier': {
        id: 'gold-multiplier',
        name: 'Gold Multiplier',
        description: '+10% gold from all sources',
        maxLevel: 10, // Increased to 10 levels = 100%
        costPerLevel: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // All cost 1 point
        effect: (level) => ({ type: 'goldMultiplier', value: 0.1 * level }), // +10% per level, max 100%
        unlocks: ['all-ore-spawn-rate', 'all-ore-spawn-chance', 'start-bonuses', 'prestige-currency-bonus', 'spawn-efficiency-bonus', 'ore-value-bonus', 'click-power-bonus', 'auto-clicker-speed-bonus']
    },
    // Tier 2 - Consolidated Ore Upgrades (affects ALL ores)
    'all-ore-spawn-rate': {
        id: 'all-ore-spawn-rate',
        name: 'All Ore Spawn Rate',
        description: '+10% spawn rate for ALL ores',
        maxLevel: 5,
        costPerLevel: [1, 1, 1, 1, 1], // All cost 1 point
        effect: (level) => ({ type: 'allOreSpawnRate', value: 0.1 * level }),
        requires: ['gold-multiplier'],
        unlocks: ['all-ore-spawn-chance']
    },
    'all-ore-spawn-chance': {
        id: 'all-ore-spawn-chance',
        name: 'All Ore Spawn Chance',
        description: '+10% spawn chance for ALL ores',
        maxLevel: 5,
        costPerLevel: [1, 1, 1, 1, 1], // All cost 1 point
        effect: (level) => ({ type: 'allOreSpawnChance', value: 0.1 * level }),
        requires: ['all-ore-spawn-rate']
    },
    // Tier 2 - Gameplay Boosts (consolidated)
    'start-bonuses': {
        id: 'start-bonuses',
        name: 'Starting Bonuses',
        description: 'Start with auto-clicker, 1 dwarf, 1 soldier, 10% spawn efficiency, 1 minecart',
        maxLevel: 1,
        costPerLevel: [1], // Cost 1 point
        effect: () => ({ type: 'startBonus', bonus: 'all' }),
        requires: ['gold-multiplier'],
    },
    // Tier 2 - Prestige Currency Bonus
    'prestige-currency-bonus': {
        id: 'prestige-currency-bonus',
        name: 'Prestige Currency Bonus',
        description: '+1 prestige token per level (max +3 at 3/3)',
        maxLevel: 3,
        costPerLevel: [1, 1, 1], // All cost 1 point
        effect: (level) => ({ type: 'prestigeCurrencyBonus', value: level }), // +1 per level, max +3
        requires: ['gold-multiplier']
    },
    // Tier 2 - Spawn Efficiency Bonus
    'spawn-efficiency-bonus': {
        id: 'spawn-efficiency-bonus',
        name: 'Spawn Efficiency Bonus',
        description: '+12% spawn efficiency per level (max 60% at 5/5)',
        maxLevel: 5,
        costPerLevel: [1, 1, 1, 1, 1], // All cost 1 point
        effect: (level) => ({ type: 'spawnEfficiencyBonus', value: 0.12 * level }), // +12% per level, max 60%
        requires: ['gold-multiplier']
    },
    // Tier 2 - Ore Value Bonus
    'ore-value-bonus': {
        id: 'ore-value-bonus',
        name: 'Ore Value Bonus',
        description: '+10% ore value per level (max 100% at 10/10)',
        maxLevel: 10,
        costPerLevel: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // All cost 1 point
        effect: (level) => ({ type: 'oreValueBonus', value: 0.1 * level }), // +10% per level, max 100%
        requires: ['gold-multiplier']
    },
    // Tier 2 - Click Power Bonus
    'click-power-bonus': {
        id: 'click-power-bonus',
        name: 'Click Power Bonus',
        description: '+10 click power per level (max +50 at 5/5)',
        maxLevel: 5,
        costPerLevel: [1, 1, 1, 1, 1], // All cost 1 point
        effect: (level) => ({ type: 'clickPowerBonus', value: 10 * level }), // +10 per level, max +50
        requires: ['gold-multiplier']
    },
    // Tier 2 - Auto-Clicker Speed Bonus
    'auto-clicker-speed-bonus': {
        id: 'auto-clicker-speed-bonus',
        name: 'Auto-Clicker Speed Bonus',
        description: '+3.8 clicks/sec per level (max 20/sec at 5/5)',
        maxLevel: 5,
        costPerLevel: [1, 1, 1, 1, 1], // All cost 1 point
        effect: (level) => ({ type: 'autoClickerSpeedBonus', value: 3.8 * level }), // +3.8 per level, max +19 (total 20/sec)
        requires: ['gold-multiplier']
    }
};

// Ore types - balanced for frequent spawning and satisfying gameplay
const ORE_TYPES = [
    { id: 'coal', emoji: '⚫', name: 'Coal', baseValue: 1, baseSpawnRate: 5000, baseSpawnChance: 0.65, unlockPrice: 100 },
    { id: 'copper', emoji: '🟫', name: 'Copper', baseValue: 2, baseSpawnRate: 7000, baseSpawnChance: 0.55, unlockPrice: 250 },
    { id: 'iron', emoji: '⚙️', name: 'Iron', baseValue: 5, baseSpawnRate: 10000, baseSpawnChance: 0.45, unlockPrice: 500 },
    { id: 'gold', emoji: '🟨', name: 'Gold', baseValue: 15, baseSpawnRate: 14000, baseSpawnChance: 0.35, unlockPrice: 2000 },
    { id: 'platinum', emoji: '⬜', name: 'Platinum', baseValue: 40, baseSpawnRate: 20000, baseSpawnChance: 0.3, unlockPrice: 5000 },
    { id: 'emerald', emoji: '💚', name: 'Emerald', baseValue: 100, baseSpawnRate: 28000, baseSpawnChance: 0.225, unlockPrice: 15000 },
    { id: 'diamond', emoji: '💎', name: 'Diamond', baseValue: 250, baseSpawnRate: 35000, baseSpawnChance: 0.2, unlockPrice: 50000 }
];

// Initialize game
function initGame() {
    // Check if this is a reset - if so, clear localStorage first
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('reset')) {
        try {
            localStorage.clear();
            // Remove the reset parameter from URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
            // Failed to clear localStorage on reset
        }
    }
    
    loadGame();
    
    // Initialize ore types
    ORE_TYPES.forEach(oreType => {
        if (!gameState.unlockedOres[oreType.id]) {
            // Value price scales with ore tier (coal cheapest, diamond most expensive)
            const oreIndex = ORE_TYPES.findIndex(o => o.id === oreType.id);
            const baseValuePrice = 100 + (oreIndex * 200); // Coal: 100, Diamond: 1300
            
            // All ores start locked and are unlocked via purchase in the shop
            let isUnlocked = false; // Will be unlocked normally via purchase
            
            // Upgrade prices scale with ore tier (higher tier = more expensive)
            const baseSpawnRatePrice = 200 + (oreIndex * 150); // Coal: 200, Diamond: 1100
            const baseSpawnChancePrice = 250 + (oreIndex * 200); // Coal: 250, Diamond: 1450
            
            gameState.unlockedOres[oreType.id] = {
                unlocked: isUnlocked,
                spawnRate: oreType.baseSpawnRate,
                spawnChance: oreType.baseSpawnChance,
                lastSpawn: Date.now(),
                spawnRatePrice: baseSpawnRatePrice,
                spawnChancePrice: baseSpawnChancePrice,
                valueMultiplier: 1,
                valuePrice: baseValuePrice
            };
        } else {
            // Ensure existing ores have valueMultiplier and valuePrice
            if (!gameState.unlockedOres[oreType.id].valueMultiplier) {
                const oreIndex = ORE_TYPES.findIndex(o => o.id === oreType.id);
                const baseValuePrice = 100 + (oreIndex * 200);
                gameState.unlockedOres[oreType.id].valueMultiplier = 1;
                gameState.unlockedOres[oreType.id].valuePrice = baseValuePrice;
            }
        }
    });
    
    // Initialize gold tracking
    gameState.goldHistory = [{ time: Date.now(), gold: gameState.gold }];
    gameState.lastGoldCheck = Date.now();
    
    // Ensure at least one minecart exists
    if (gameState.minecarts.length === 0) {
        gameState.minecarts.push({
            id: 0,
            items: 0,
            totalValue: 0,
            capacity: gameState.minecartCapacity,
            element: null
        });
    }
    
    setupEventListeners();
    initDOMCache(); // Initialize DOM cache for performance
    
    // Apply prestige bonuses (must be before rendering)
    applyPrestigeBonuses();
    applyStartingBonuses();
    
    renderOreShop();
    renderAutoClickers();
    renderMinecarts();
    renderDwarves();
    renderSoldiers(); // Render soldiers on init
    
    // Auto-clicker indicators removed - using single clicker now
    
    startGameLoop();
    updateUI();
}

// Setup event listeners
function setupEventListeners() {
    // Central rock click
    const rock = document.getElementById('central-rock');
    rock.addEventListener('click', handleRockClick);
    
    // Sidebar toggle
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('collapsed');
        const toggle = document.getElementById('sidebar-toggle');
        toggle.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
    });
    
    // Upgrades
    document.getElementById('upgrade-click-power').addEventListener('click', () => {
        if (gameState.gold >= gameState.clickPowerPrice) {
            gameState.gold -= gameState.clickPowerPrice;
            gameState.clickPower += 1;
            gameState.clickPowerPrice = Math.floor(gameState.clickPowerPrice * 1.5);
            playUpgradeSound();
            updateUI();
            saveGame();
        }
    });
    
    document.getElementById('buy-auto-clicker').addEventListener('click', () => {
        const price = 100; // Fixed price for first purchase
        if (gameState.gold >= price && gameState.autoClickerLevel === 0) {
            gameState.gold -= price;
            gameState.autoClickerLevel = 1;
            gameState.autoClickerLastClick = Date.now();
            playUpgradeSound();
            updateUI();
            saveGame();
        }
    });
    
    document.getElementById('upgrade-auto-clicker-speed').addEventListener('click', () => {
        if (gameState.gold >= gameState.autoClickerSpeedPrice) {
            gameState.gold -= gameState.autoClickerSpeedPrice;
            // Each upgrade adds 0.5 clicks per second
            gameState.autoClickerSpeedUpgrades++;
            // Recalculate speed including prestige bonus
            recalculateAutoClickerSpeed();
            gameState.autoClickerSpeedPrice = Math.floor(gameState.autoClickerSpeedPrice * 1.3);
            playUpgradeSound();
            renderAutoClickers(); // Update the display with new speed
            updateUI();
            saveGame();
        }
    });
    
    document.getElementById('hire-dwarf').addEventListener('click', () => {
        if (gameState.gold >= gameState.dwarfPrice) {
            gameState.gold -= gameState.dwarfPrice;
            gameState.dwarves++;
            gameState.dwarfPrice = Math.floor(gameState.dwarfPrice * 1.3);
            playUpgradeSound();
            renderDwarves();
            updateUI();
            saveGame();
        }
    });
    
    document.getElementById('upgrade-dwarf-speed').addEventListener('click', () => {
        if (gameState.gold >= gameState.dwarfSpeedPrice) {
            gameState.gold -= gameState.dwarfSpeedPrice;
            gameState.dwarfSpeed += 0.3; // Reduced from 0.5
            gameState.dwarfSpeedPrice = Math.floor(gameState.dwarfSpeedPrice * 1.5);
            playUpgradeSound();
            updateUI();
            saveGame();
        }
    });
    
    // Soldier event listeners
    document.getElementById('hire-soldier').addEventListener('click', () => {
        if (gameState.gold >= gameState.soldierPrice) {
            gameState.gold -= gameState.soldierPrice;
            gameState.soldiers++;
            gameState.soldierPrice = Math.floor(gameState.soldierPrice * 1.4);
            playUpgradeSound();
            renderSoldiers();
            updateUI();
            saveGame();
        }
    });
    
    document.getElementById('upgrade-soldier-attack-power').addEventListener('click', () => {
        if (gameState.gold >= gameState.soldierAttackPowerPrice) {
            gameState.gold -= gameState.soldierAttackPowerPrice;
            gameState.soldierAttackPower += 2;
            gameState.soldierAttackPowerPrice = Math.floor(gameState.soldierAttackPowerPrice * 1.5);
            playUpgradeSound();
            updateUI();
            saveGame();
        }
    });
    
    document.getElementById('upgrade-soldier-attack-speed').addEventListener('click', () => {
        if (gameState.gold >= gameState.soldierAttackSpeedPrice) {
            gameState.gold -= gameState.soldierAttackSpeedPrice;
            gameState.soldierAttackSpeed = Math.max(200, gameState.soldierAttackSpeed - 100); // Decrease by 100ms, min 200ms
            gameState.soldierAttackSpeedPrice = Math.floor(gameState.soldierAttackSpeedPrice * 1.5);
            playUpgradeSound();
            updateUI();
            saveGame();
        }
    });
    
    document.getElementById('upgrade-soldier-speed').addEventListener('click', () => {
        if (gameState.gold >= gameState.soldierSpeedPrice) {
            gameState.gold -= gameState.soldierSpeedPrice;
            gameState.soldierSpeed += 0.3; // Increase movement speed by 0.3 (reduced from 0.5)
            gameState.soldierSpeedPrice = Math.floor(gameState.soldierSpeedPrice * 1.5);
            playUpgradeSound();
            updateUI();
            saveGame();
        }
    });
    
    document.getElementById('upgrade-ore-value').addEventListener('click', () => {
        if (gameState.gold >= gameState.oreValuePrice) {
            gameState.gold -= gameState.oreValuePrice;
            gameState.oreValueMultiplier += 0.5;
            gameState.oreValuePrice = Math.floor(gameState.oreValuePrice * 1.5);
            playUpgradeSound();
            updateUI();
            saveGame();
        }
    });
    
    // Ore unlock/upgrade handlers are set up in renderOreShop
    
    document.getElementById('upgrade-ore-spawn-efficiency').addEventListener('click', () => {
        // Calculate total spawn efficiency (purchased + prestige bonus)
        const totalEfficiency = gameState.oreSpawnEfficiency + gameState.prestigeSpawnEfficiencyBonus;
        // Max is 100% total, so purchased can go up to (1.0 - prestige bonus)
        const maxPurchasable = 1.0 - gameState.prestigeSpawnEfficiencyBonus;
        
        if (gameState.gold >= gameState.oreSpawnEfficiencyPrice && totalEfficiency < 1.0) {
            gameState.gold -= gameState.oreSpawnEfficiencyPrice;
            // Cap purchased efficiency at max purchasable
            gameState.oreSpawnEfficiency = Math.min(maxPurchasable, gameState.oreSpawnEfficiency + 0.05);
            gameState.oreSpawnEfficiencyPrice = Math.floor(gameState.oreSpawnEfficiencyPrice * 1.5);
            playUpgradeSound();
            updateUI();
            saveGame();
        }
    });
    
    // Luck upgrade button (in modal, so we need to check if it exists)
    const luckButton = document.getElementById('upgrade-slot-machine-luck');
    if (luckButton) {
        luckButton.addEventListener('click', () => {
            if (gameState.gold >= gameState.slotMachineLuckPrice) {
                gameState.gold -= gameState.slotMachineLuckPrice;
                gameState.slotMachineLuck += 1;
                gameState.slotMachineLuckPrice = Math.floor(gameState.slotMachineLuckPrice * 2.0);
                playUpgradeSound();
                updateUI();
                updateSlotMachineOdds(); // Update odds display in modal
                // Update luck level and price in modal
                const luckLevelEl = document.getElementById('luck-level');
                const luckPriceEl = document.getElementById('slot-machine-luck-price');
                if (luckLevelEl) luckLevelEl.textContent = gameState.slotMachineLuck;
                if (luckPriceEl) luckPriceEl.textContent = formatNumber(gameState.slotMachineLuckPrice);
                luckButton.disabled = gameState.gold < gameState.slotMachineLuckPrice;
                saveGame();
            }
        });
    }
    
    // Minecart system
    document.getElementById('buy-minecart').addEventListener('click', () => {
        const MAX_MINECARTS = 10;
        if (gameState.minecarts.length >= MAX_MINECARTS) return; // Max limit reached
        if (gameState.gold >= gameState.minecartPrice) {
            gameState.gold -= gameState.minecartPrice;
            gameState.minecarts.push({
                id: gameState.minecarts.length,
                items: 0,
                totalValue: 0,
                capacity: gameState.minecartCapacity,
                element: null,
                deliveryCooldownEnd: null
            });
            gameState.minecartPrice = Math.floor(gameState.minecartPrice * 2.0); // More aggressive price increase
            playUpgradeSound();
            renderMinecarts();
            updateUI();
            saveGame();
        }
    });
    
    document.getElementById('upgrade-minecart-capacity').addEventListener('click', () => {
        if (gameState.gold >= gameState.minecartCapacityPrice) {
            // Cap at 50
            if (gameState.minecartCapacity >= 50) {
                alert('Minecart capacity is already at maximum (50)!');
                return;
            }
            
            gameState.gold -= gameState.minecartCapacityPrice;
            // Increase capacity by 5 each time, cap at 50
            gameState.minecartCapacity = Math.min(50, gameState.minecartCapacity + 5);
            // Update all existing minecarts
            gameState.minecarts.forEach(minecart => {
                minecart.capacity = gameState.minecartCapacity;
            });
            // Increase price by 2000 each time
            gameState.minecartCapacityPrice = gameState.minecartCapacityPrice + 2000;
            playUpgradeSound();
            renderMinecarts();
            updateUI();
            saveGame();
        }
    });
    
    document.getElementById('upgrade-minecart-delivery-speed').addEventListener('click', () => {
        if (gameState.gold >= gameState.minecartDeliverySpeedPrice) {
            gameState.gold -= gameState.minecartDeliverySpeedPrice;
            // Decrease cooldown by 300ms (faster delivery), minimum 2000ms (increased from 1000ms)
            gameState.minecartDeliverySpeed = Math.max(2000, gameState.minecartDeliverySpeed - 300);
            gameState.minecartDeliverySpeedPrice = Math.floor(gameState.minecartDeliverySpeedPrice * 1.5);
            playUpgradeSound();
            updateUI();
            saveGame();
        }
    });
    
    const turretBtn = document.getElementById('upgrade-minecart-turrets');
    if (turretBtn) {
        turretBtn.addEventListener('click', () => {
            if (gameState.gold >= gameState.minecartTurretPrice && !gameState.minecartTurrets) {
                gameState.gold -= gameState.minecartTurretPrice;
                gameState.minecartTurrets = true;
                renderMinecarts();
                updateUI();
                saveGame();
            }
        });
    }
    
    // Reset button
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('Reset game? This will delete all progress!')) {
                try {
                    // Set flag to prevent any saves during reset
                    isResetting = true;
                    
                    // Clear localStorage synchronously
                    const keys = Object.keys(localStorage);
                    for (let i = 0; i < keys.length; i++) {
                        localStorage.removeItem(keys[i]);
                    }
                    
                    // Also try clear() as backup
                    try {
                        localStorage.clear();
                    } catch (e) {
                        // Ignore if clear() fails
                    }
                    
                    // Use location.replace() which is more reliable than reload()
                    // This prevents the page from being in history
                    location.replace(location.href.split('?')[0] + '?reset=' + Date.now());
                } catch (error) {
                    isResetting = false; // Reset flag on error
                    alert('Error resetting game: ' + error.message);
                }
            }
        });
    } else {
    }
    
    // Gambling wheel - just open modal, don't deduct gold yet
    document.getElementById('gamble-wheel').addEventListener('click', () => {
        openGambleWheel();
    });
    
    document.getElementById('close-gamble-modal').addEventListener('click', () => {
        closeGambleModal();
    });
    
    document.getElementById('pull-handle')?.addEventListener('click', () => {
        spinSlotMachine();
    });
    
    // Close modal when clicking outside
    document.getElementById('gamble-modal').addEventListener('click', (e) => {
        if (e.target.id === 'gamble-modal') {
            closeGambleModal();
        }
    });
    
    // Prestige system
    document.getElementById('open-prestige')?.addEventListener('click', () => {
        openPrestigeModal();
    });
    
    // Volume slider
    const volumeSlider = document.getElementById('volume-slider');
    const volumeValue = document.getElementById('volume-value');
    if (volumeSlider && volumeValue) {
        // Initialize volume from saved state or default to 50%
        volumeSlider.value = (gameState.volume * 100).toString();
        volumeValue.textContent = Math.round(gameState.volume * 100) + '%';
        
        volumeSlider.addEventListener('input', (e) => {
            gameState.volume = parseFloat(e.target.value) / 100;
            volumeValue.textContent = Math.round(gameState.volume * 100) + '%';
            saveGame();
        });
    }
    
    document.getElementById('close-prestige-modal')?.addEventListener('click', () => {
        closePrestigeModal();
    });
    
    document.getElementById('prestige-button')?.addEventListener('click', () => {
        performPrestige();
    });
    
    // Close prestige modal when clicking outside
    document.getElementById('prestige-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'prestige-modal') {
            closePrestigeModal();
        }
    });
}

// Handle rock click
function handleRockClick(e) {
    const rock = document.getElementById('central-rock');
    const container = document.getElementById('mining-container');
    const rockRect = rock.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Calculate position relative to container
    const clickX = e.clientX - containerRect.left;
    const clickY = e.clientY - containerRect.top;
    
    // Add gold with multipliers if active
    const now = Date.now();
    let baseValue = gameState.clickPower + gameState.prestigeClickPowerBonus;
    
    // Calculate actual gold earned (with multipliers)
    let goldEarned = baseValue;
    
    // Apply temporary multiplier (slot machine)
    if (gameState.goldMultiplierEndTime > now) {
        goldEarned = Math.floor(goldEarned * gameState.goldMultiplier);
    } else if (gameState.goldMultiplierEndTime > 0) {
        // Multiplier expired, reset it
        gameState.goldMultiplier = 1;
        gameState.goldMultiplierEndTime = 0;
    }
    
    // Apply prestige gold multiplier (permanent)
    goldEarned = Math.floor(goldEarned * gameState.prestigeGoldMultiplier);
    
    gameState.gold += goldEarned;
    gameState.totalGoldEarned += goldEarned; // Track for prestige
    gameState.totalClicks++;
    
    // Show click effect at click position (show actual gold earned with multipliers)
    showClickEffect(clickX, clickY, '+' + goldEarned);
    
    // Play click sound
    playClickSound();
    
    updateUI();
    saveGame();
}

// Show click effect - create new element each time for instant feedback
function showClickEffect(x, y, text = null) {
    const container = document.getElementById('mining-container');
    const effect = document.createElement('div');
    effect.className = 'click-effect';
    effect.style.left = x + 'px';
    effect.style.top = y + 'px';
    effect.textContent = text || '+' + gameState.clickPower;
    container.appendChild(effect);
    
    // Trigger animation
    setTimeout(() => {
        effect.classList.add('active');
    }, 10);
    
    // Remove after animation
    setTimeout(() => {
        effect.remove();
    }, 300);
}

// Calculate scattered position around rock for auto-clicker
function getScatteredPosition(index, centerX, centerY) {
    // Use a spiral pattern to distribute clickers around the rock
    // Each clicker gets a unique angle and radius
    const angleStep = (2 * Math.PI) / 7; // 7 clickers per ring
    const ring = Math.floor(index / 7);
    const positionInRing = index % 7;
    const angle = angleStep * positionInRing + (ring * 0.3); // Slight rotation per ring
    const baseRadius = 15 + (ring * 10); // Smaller radius, tighter clustering on rock
    const radius = baseRadius + (Math.random() * 6 - 3); // Less randomness
    
    const offsetX = Math.cos(angle) * radius;
    const offsetY = Math.sin(angle) * radius;
    
    return {
        x: centerX + offsetX,
        y: centerY + offsetY
    };
}

// Recalculate auto-clicker speed including prestige bonus
function recalculateAutoClickerSpeed() {
    // Base speed: 1 click/sec, each upgrade adds 0.5 clicks/sec, prestige adds bonus
    const clicksPerSec = 1 + (0.5 * gameState.autoClickerSpeedUpgrades) + gameState.prestigeAutoClickerSpeedBonus;
    gameState.autoClickerSpeed = 1000 / clicksPerSec; // Convert to interval in ms
}

// Update auto-clicker (single)
function updateAutoClickers() {
    if (gameState.autoClickerLevel === 0) return; // No auto-clicker purchased
    
    const now = Date.now();
    const rock = document.getElementById('central-rock');
    const rockRect = rock.getBoundingClientRect();
    const containerRect = document.getElementById('mining-container').getBoundingClientRect();
    const rockX = rockRect.left - containerRect.left + rockRect.width / 2;
    const rockY = rockRect.top - containerRect.top + rockRect.height / 2;
    
    // Check if gold multiplier expired
    if (gameState.goldMultiplierEndTime > 0 && now >= gameState.goldMultiplierEndTime) {
        gameState.goldMultiplier = 1;
        gameState.goldMultiplierEndTime = 0;
        stopMultiplierEffects();
    }
    
    if (now - gameState.autoClickerLastClick >= gameState.autoClickerSpeed) {
        // Calculate base value and actual gold earned
        let baseValue = gameState.clickPower + gameState.prestigeClickPowerBonus;
        let goldEarned = baseValue;
        
        // Apply temporary multiplier if active
        if (gameState.goldMultiplierEndTime > now) {
            goldEarned = Math.floor(goldEarned * gameState.goldMultiplier);
        }
        // Apply prestige gold multiplier (permanent)
        goldEarned = Math.floor(goldEarned * gameState.prestigeGoldMultiplier);
        
        gameState.gold += goldEarned;
        gameState.totalGoldEarned += goldEarned; // Track for prestige
        gameState.autoClickerLastClick = now;
        
        // Track gold change
        trackGoldChange();
        
        // Show click effect at rock center (show actual gold earned with multipliers)
        showClickEffect(rockX, rockY, '+' + goldEarned);
        
        updateUI();
        saveGame();
    }
}

// Create auto-clicker indicator (mouse pointer) - called when clicker is added
function createAutoClickerIndicator(clicker, index) {
    const container = document.getElementById('auto-clickers-container') || document.getElementById('mining-container');
    if (!container) return;
    
    const rock = document.getElementById('central-rock');
    if (!rock) return;
    
    const miningContainer = document.getElementById('mining-container');
    if (!miningContainer) return;
    
    const rockRect = rock.getBoundingClientRect();
    const containerRect = miningContainer.getBoundingClientRect();
    const rockX = rockRect.left - containerRect.left + rockRect.width / 2;
    const rockY = rockRect.top - containerRect.top + rockRect.height / 2;
    
    // Get scattered position for this clicker
    const pos = getScatteredPosition(index, rockX, rockY);
    
    // Remove existing indicator if it exists but isn't in DOM
    if (clicker.indicatorElement && !clicker.indicatorElement.parentNode) {
        clicker.indicatorElement = null;
    }
    
    // Only create if it doesn't exist
    if (!clicker.indicatorElement) {
        const indicator = document.createElement('div');
        indicator.className = 'auto-clicker-indicator';
        indicator.textContent = '👆';
        indicator.style.position = 'absolute';
        indicator.style.left = (pos.x - 15) + 'px';
        indicator.style.top = (pos.y - 15) + 'px';
        indicator.style.zIndex = '25';
        container.appendChild(indicator);
        clicker.indicatorElement = indicator;
    } else {
        // Update position of existing indicator
        if (clicker.indicatorElement.style) {
            clicker.indicatorElement.style.left = (pos.x - 15) + 'px';
            clicker.indicatorElement.style.top = (pos.y - 15) + 'px';
        }
    }
}

// Show auto-clicker indicator animation (when clicking)
function showAutoClickerIndicator(clicker, x, y) {
    const indicator = clicker.indicatorElement;
    if (!indicator || !indicator.parentNode) return;
    
    // Update position (in case rock moved)
    if (indicator.style) {
        indicator.style.left = (x - 15) + 'px';
        indicator.style.top = (y - 15) + 'px';
    }
    
    // Animate
    indicator.classList.add('clicking');
    
    setTimeout(() => {
        if (indicator && indicator.parentNode) {
            indicator.classList.remove('clicking');
        }
    }, 200);
}

// Spawn ore
function spawnOre(oreType, x = null, y = null) {
    // Performance: Don't spawn if we've reached the maximum
    if (gameState.ores.length >= MAX_ORES_ON_SCREEN) {
        return; // Skip spawning if limit reached
    }
    
    const container = document.getElementById('ores-container');
    const miningContainer = document.getElementById('mining-container');
    const containerRect = miningContainer.getBoundingClientRect();
    
    // Use provided position or random position within playable area (with padding to avoid edges)
    const padding = 40;
    const oreX = x !== null ? x : Math.random() * (containerRect.width - padding * 2) + padding;
    const oreY = y !== null ? y : Math.random() * (containerRect.height - padding * 2) + padding;
    
    const ore = document.createElement('div');
    ore.className = 'ore';
    ore.dataset.oreId = gameState.ores.length;
    ore.style.left = oreX + 'px';
    ore.style.top = oreY + 'px';
    ore.textContent = oreType.emoji;
    
    // Calculate value with individual ore multiplier, global multiplier, and prestige bonus
    const oreData = gameState.unlockedOres[oreType.id];
    const individualMultiplier = oreData ? oreData.valueMultiplier : 1;
    const value = oreType.baseValue * gameState.prestigeOreValueMultiplier * gameState.oreValueMultiplier * individualMultiplier;
    
    const oreDataObj = {
        element: ore,
        type: oreType,
        x: oreX,
        y: oreY,
        value: value,
        id: gameState.ores.length
    };
    
    gameState.ores.push(oreDataObj);
    container.appendChild(ore);
}

// Drop ore when enemy is killed
function dropOreFromEnemy(enemyX, enemyY) {
    // Get all unlocked ore types
    const unlockedOreTypes = ORE_TYPES.filter(oreType => {
        const oreData = gameState.unlockedOres[oreType.id];
        return oreData && oreData.unlocked;
    });
    
    if (unlockedOreTypes.length === 0) {
        // If no ores unlocked, drop coal as default
        spawnOre(ORE_TYPES[0], enemyX, enemyY);
        return;
    }
    
    // Drop a random unlocked ore at the enemy's death location
    const randomOre = unlockedOreTypes[Math.floor(Math.random() * unlockedOreTypes.length)];
    spawnOre(randomOre, enemyX, enemyY);
}

// Update ore spawning - check each unlocked ore type
function updateOreSpawning() {
    // Performance: Skip spawning if we've reached the maximum
    if (gameState.ores.length >= MAX_ORES_ON_SCREEN) {
        return; // Don't check spawn timers if limit reached
    }
    
    const now = Date.now();
    
    ORE_TYPES.forEach(oreType => {
        const oreData = gameState.unlockedOres[oreType.id];
        if (!oreData || !oreData.unlocked) return;
        
        if (now - oreData.lastSpawn >= oreData.spawnRate) {
            // Check spawn chance
            if (Math.random() <= oreData.spawnChance) {
                spawnOre(oreType);
                
                // Check for double spawn (ore spawn efficiency) - only if under limit
                // Use total efficiency (purchased + prestige bonus)
                const totalEfficiency = gameState.oreSpawnEfficiency + gameState.prestigeSpawnEfficiencyBonus;
                if (totalEfficiency > 0 && Math.random() <= totalEfficiency && gameState.ores.length < MAX_ORES_ON_SCREEN) {
                    spawnOre(oreType); // Spawn a second one!
                }
            }
            oreData.lastSpawn = now;
        }
    });
}

// Update dwarves
function updateDwarves() {
    if (gameState.dwarves === 0) return;
    
    const container = domCache.miningContainer || document.getElementById('mining-container');
    if (!container) return;
    const containerRect = getCachedContainerRect('mining') || container.getBoundingClientRect();
    const now = Date.now();
    
    // Assign ores to dwarves - each dwarf gets a different ore
    const availableOres = [...gameState.ores];
    const assignedOres = new Set();
    
    gameState.dwarfEntities.forEach((dwarf, index) => {
        if (!dwarf.element) return;
        
        // Get current position from stored values or element
        let dwarfX = dwarf.x;
        let dwarfY = dwarf.y;
        
        // If position not set, get from element
        if (dwarfX === undefined || dwarfY === undefined) {
            const dwarfRect = dwarf.element.getBoundingClientRect();
            dwarfX = dwarfRect.left - containerRect.left + dwarfRect.width / 2;
            dwarfY = dwarfRect.top - containerRect.top + dwarfRect.height / 2;
            dwarf.x = dwarfX;
            dwarf.y = dwarfY;
        }
        
        // If carrying ore, go to nearest minecart (even if on cooldown) and wait if needed
        if (dwarf.carryingOre) {
            // Gather minecarts with positions (include those on cooldown/full so dwarves wait instead of dumping)
            const candidates = gameState.minecarts
                .filter(m => m.element)
                .map(m => {
                    const rect = m.element.getBoundingClientRect();
                    const mx = rect.left - containerRect.left + rect.width / 2;
                    const my = rect.top - containerRect.top + rect.height / 2;
                    const dx = mx - dwarfX;
                    const dy = my - dwarfY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const isOnCooldown = m.deliveryCooldownEnd && now < m.deliveryCooldownEnd;
                    const isFull = m.items >= m.capacity;
                    return { minecart: m, mx, my, dist, isOnCooldown, isFull };
                });
            
            // Pick nearest minecart
            candidates.sort((a, b) => a.dist - b.dist);
            const target = candidates.length > 0 ? candidates[0] : null;
            
            // If no minecart elements exist (shouldn't happen), deposit directly to gold to avoid stalling
            if (!target) {
                addToMinecart(dwarf.carryingOre.value, null);
                dwarf.carryingOre = null;
                dwarf.element.textContent = '⛏️';
                dwarf.element.classList.remove('carrying');
                dwarf.targetOre = null;
                dwarf.miningOre = null;
                dwarf.oreMiningStartTime = null;
                return;
            }
            
            const dx = target.mx - dwarfX;
            const dy = target.my - dwarfY;
            const dist = target.dist;
            
            // Only deposit if the cart is ready (not on cooldown and not full)
            const cartReady = !target.isOnCooldown && !target.isFull;
            if (dist < 30 && cartReady) {
                // Reached minecart - deposit ore
                addToMinecart(dwarf.carryingOre.value, null);
                dwarf.carryingOre = null;
                dwarf.element.textContent = '⛏️';
                dwarf.element.classList.remove('carrying');
            } else {
                // Move towards minecart and wait nearby if it's not ready yet
                const speed = gameState.dwarfSpeed;
                if (dist > 0 && dwarf.element) {
                    dwarf.x += (dx / dist) * speed;
                    dwarf.y += (dy / dist) * speed;
                    dwarf.element.style.left = (dwarf.x - 15) + 'px';
                    dwarf.element.style.top = (dwarf.y - 15) + 'px';
                }
            }
        } else {
            // Get rock position for mining
            const rock = document.getElementById('central-rock');
            const rockRect = rock ? rock.getBoundingClientRect() : null;
            const rockX = rockRect ? rockRect.left - containerRect.left + rockRect.width / 2 : containerRect.width / 2;
            const rockY = rockRect ? rockRect.top - containerRect.top + rockRect.height / 2 : containerRect.height / 2;
            
            // Check if dwarf already has a target ore
            let targetOre = dwarf.targetOre;
            
            // Verify existing target is still valid
            if (targetOre) {
                const oreStillExists = gameState.ores.some(o => o.id === targetOre.id && 
                    o.element && o.element.parentNode && o.element.style.opacity !== '0');
                const isCarried = gameState.dwarfEntities.some(d => 
                    d.carryingOre && d.carryingOre.id === targetOre.id
                );
                
                if (!oreStillExists || isCarried || !targetOre.element || !targetOre.element.parentNode) {
                    // Target ore is invalid, clear it
                    targetOre = null;
                    dwarf.targetOre = null;
                } else {
                    // Target is valid, mark it as assigned so other dwarves don't take it
                    assignedOres.add(targetOre.id);
                }
            }
            
            // If no valid target, find a new one
            if (!targetOre && availableOres.length > 0) {
                // Filter out ores that are already being carried, mined, targeted, or are invalid
                const validOres = availableOres.filter(ore => {
                    // Check if ore is already being carried by another dwarf
                    const isCarried = gameState.dwarfEntities.some(d => 
                        d.carryingOre && d.carryingOre.id === ore.id
                    );
                    // Check if ore is already being mined by another dwarf
                    const isMining = gameState.dwarfEntities.some(d => 
                        d.miningOre && d.miningOre.id === ore.id
                    );
                    // Check if ore is already targeted by another dwarf
                    const isTargeted = gameState.dwarfEntities.some(d => 
                        d.targetOre && d.targetOre.id === ore.id && d !== dwarf
                    );
                    // Check if ore element still exists and is visible
                    const oreExists = ore.element && ore.element.parentNode && 
                        ore.element.style.opacity !== '0';
                    // Check if ore is still in gameState.ores (not removed)
                    const stillInList = gameState.ores.some(o => o.id === ore.id);
                    return !isCarried && !isMining && !isTargeted && oreExists && stillInList && !assignedOres.has(ore.id);
                });
                
                if (validOres.length > 0) {
                    // Calculate squared distances (faster than sqrt)
                    const oreDistances = validOres
                        .map(ore => {
                            const dx = ore.x - dwarfX;
                            const dy = ore.y - dwarfY;
                            return {
                                ore: ore,
                                distSq: dx * dx + dy * dy
                            };
                        })
                        .sort((a, b) => a.distSq - b.distSq);
                    
                    // Assign the closest unassigned ore to this dwarf
                    if (oreDistances.length > 0) {
                        targetOre = oreDistances[0].ore;
                        dwarf.targetOre = targetOre; // Store persistent target
                        assignedOres.add(targetOre.id);
                    }
                }
            }
            
            // Fallback: if still no target but visible ores exist, pick the nearest visible ore (ignore targeting filters)
            if (!targetOre && availableOres.length > 0) {
                const visibleOres = availableOres.filter(ore => {
                    return ore.element && ore.element.parentNode && ore.element.style.opacity !== '0';
                });
                if (visibleOres.length > 0) {
                    const nearest = visibleOres
                        .map(ore => {
                            const dx = ore.x - dwarfX;
                            const dy = ore.y - dwarfY;
                            return { ore, distSq: dx * dx + dy * dy };
                        })
                        .sort((a, b) => a.distSq - b.distSq);
                    if (nearest.length > 0) {
                        targetOre = nearest[0].ore;
                        dwarf.targetOre = targetOre;
                        assignedOres.add(targetOre.id);
                    }
                }
            }
            
            if (targetOre) {
                // Verify ore still exists and is valid before moving
                const oreStillExists = gameState.ores.some(o => o.id === targetOre.id && 
                    o.element && o.element.parentNode && o.element.style.opacity !== '0');
                
                if (!oreStillExists || !targetOre.element || !targetOre.element.parentNode) {
                    // Ore was removed or invalid, clear all state
                    dwarf.targetOre = null;
                    if (dwarf.miningOre && dwarf.miningOre.id === targetOre.id) {
                        dwarf.miningOre = null;
                        dwarf.oreMiningStartTime = null;
                        if (dwarf.element) {
                            dwarf.element.classList.remove('mining');
                        }
                    }
                    targetOre = null;
                }
                
                if (targetOre && oreStillExists) {
                    const dx = targetOre.x - dwarfX;
                    const dy = targetOre.y - dwarfY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < 40) {
                        // Reached ore - pick it up immediately
                        if (targetOre.element && targetOre.element.parentNode) {
                            dwarf.carryingOre = targetOre;
                            dwarf.targetOre = null; // Clear target since we picked it up
                            dwarf.miningOre = null;
                            dwarf.oreMiningStartTime = null;
                            dwarf.x = targetOre.x;
                            dwarf.y = targetOre.y;
                            if (dwarf.element) {
                                dwarf.element.textContent = targetOre.type.emoji;
                                dwarf.element.style.left = (dwarf.x - 15) + 'px';
                                dwarf.element.style.top = (dwarf.y - 15) + 'px';
                                dwarf.element.classList.remove('mining');
                                dwarf.element.classList.add('carrying');
                            }
                            // Remove ore from available list
                            targetOre.element.style.opacity = '0';
                            targetOre.element.style.pointerEvents = 'none';
                            dwarf.miningRock = false;
                        }
                    } else {
                        // Move towards ore
                        // If we were mining a different ore, stop
                        if (dwarf.miningOre && dwarf.miningOre.id !== targetOre.id) {
                            dwarf.miningOre = null;
                            dwarf.oreMiningStartTime = null;
                            if (dwarf.element) {
                                dwarf.element.classList.remove('mining');
                            }
                        }
                        
                        const speed = gameState.dwarfSpeed;
                        if (dist > 0 && dwarf.element) {
                            dwarf.x += (dx / dist) * speed;
                            dwarf.y += (dy / dist) * speed;
                            dwarf.element.style.left = (dwarf.x - 15) + 'px';
                            dwarf.element.style.top = (dwarf.y - 15) + 'px';
                        }
                        dwarf.miningRock = false;
                    }
                }
            } else {
                // No ores available - mine the rock
                const dx = rockX - dwarfX;
                const dy = rockY - dwarfY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 60) {
                    // At rock - mine it
                    if (!dwarf.miningRock) {
                        // Just reached the rock - start mining
                        dwarf.miningRock = true;
                        dwarf.lastMineTime = Date.now();
                    }
                    
                    const now = Date.now();
                    
                    // Check if it's time to mine again
                    if (now - dwarf.lastMineTime >= gameState.dwarfMiningSpeed) {
                        // Mine the rock - generate gold
                        let baseGold = Math.floor(gameState.clickPower * 0.5);
                        // Apply temporary multiplier (slot machine)
                        if (gameState.goldMultiplierEndTime > now) {
                            baseGold = Math.floor(baseGold * gameState.goldMultiplier);
                        }
                        // Apply prestige gold multiplier (permanent)
                        baseGold = Math.floor(baseGold * gameState.prestigeGoldMultiplier);
                        gameState.gold += baseGold;
                        trackGoldChange();
                        showClickEffect(rockX, rockY - 30, '+' + baseGold);
                        dwarf.lastMineTime = now; // Update last mine time
                        updateUI();
                        saveGame();
                    }
                    
                    // Add mining animation
                    if (dwarf.element) {
                        dwarf.element.classList.add('mining');
                    }
                } else {
                    // Move towards rock
                    if (dwarf.miningRock) {
                        // Left the rock area, reset mining state
                        dwarf.miningRock = false;
                        dwarf.lastMineTime = null;
                    }
                    
                    const speed = gameState.dwarfSpeed;
                    if (dist > 0 && dwarf.element) {
                        dwarf.x += (dx / dist) * speed;
                        dwarf.y += (dy / dist) * speed;
                        dwarf.element.style.left = (dwarf.x - 15) + 'px';
                        dwarf.element.style.top = (dwarf.y - 15) + 'px';
                    }
                    if (dwarf.element) {
                        dwarf.element.classList.remove('mining');
                    }
                }
            }
        }
    });
    
    // Clean up picked up ores
    gameState.ores = gameState.ores.filter(ore => {
        if (ore.element && ore.element.style.opacity === '0') {
            // Check if any dwarf is still carrying this ore
            const stillCarrying = gameState.dwarfEntities.some(d => d.carryingOre && d.carryingOre.id === ore.id);
            if (!stillCarrying) {
                ore.element.remove();
                return false;
            }
        }
        return true;
    });
}

// Add to minecart
function addToMinecart(value, source) {
    const now = Date.now();
    
    // Apply temporary multiplier (slot machine)
    if (gameState.goldMultiplierEndTime > now) {
        value = Math.floor(value * gameState.goldMultiplier);
    }
    // Apply prestige gold multiplier (permanent)
    value = Math.floor(value * gameState.prestigeGoldMultiplier);
    
    // Find available minecarts (not on cooldown and not full)
    const availableMinecarts = gameState.minecarts.filter(m => {
        const isOnCooldown = m.deliveryCooldownEnd && now < m.deliveryCooldownEnd;
        return !isOnCooldown && m.items < m.capacity;
    });
    
    if (availableMinecarts.length === 0) {
        // No minecart available, add directly to gold
        gameState.gold += value;
        gameState.totalGoldEarned += value; // Track for prestige
        return;
    }
    
    // Sort by items (descending) - prioritize minecart with most ores
    availableMinecarts.sort((a, b) => b.items - a.items);
    const minecart = availableMinecarts[0];
    
    const isOnCooldown = minecart.deliveryCooldownEnd && now < minecart.deliveryCooldownEnd;
    if (isOnCooldown || minecart.items >= minecart.capacity) {
        // Minecart became unavailable, add directly to gold instead
        gameState.gold += value;
        gameState.totalGoldEarned += value; // Track for prestige
        return;
    }
    
    minecart.items++;
    minecart.totalValue += value;
    renderMinecarts();
    
    if (minecart.items >= minecart.capacity) {
        sendMinecartAway(minecart);
    }
}

// Send minecart away
function sendMinecartAway(minecart) {
    const now = Date.now();
    
    // Check if minecart is on cooldown
    if (minecart.deliveryCooldownEnd && now < minecart.deliveryCooldownEnd) {
        return; // Still on cooldown, can't deliver yet
    }
    
    // Apply prestige gold multiplier to minecart delivery
    const deliveryValue = Math.floor(minecart.totalValue * gameState.prestigeGoldMultiplier);
    gameState.gold += deliveryValue;
    gameState.totalGoldEarned += deliveryValue; // Track for prestige
    trackGoldChange();
    minecart.items = 0;
    minecart.totalValue = 0;
    minecart.deliveryCooldownEnd = now + gameState.minecartDeliverySpeed; // Set cooldown
    
    // Play minecart delivery sound
    playMinecartSound();
    
    renderMinecarts();
    updateUI();
    saveGame();
}

// Render ore shop
function renderOreShop() {
    const container = document.getElementById('ore-shop');
    container.innerHTML = '';
    
    ORE_TYPES.forEach(oreType => {
        const oreData = gameState.unlockedOres[oreType.id];
        if (!oreData) return;
        
        // All ores are now visible in the shop (Platinum, Emerald, Diamond can be unlocked with gold)
        // Prestige upgrades make them stronger (spawn rate, spawn chance)
        
        if (!oreData.unlocked) {
            // Show unlock button
            const unlockBtn = document.createElement('button');
            unlockBtn.className = 'shop-button';
            unlockBtn.innerHTML = `
                <span class="button-text">${oreType.emoji} ${oreType.name}</span>
                <span class="price">${formatNumber(oreType.unlockPrice)}</span>
            `;
            unlockBtn.disabled = gameState.gold < oreType.unlockPrice;
            unlockBtn.addEventListener('click', () => unlockOre(oreType.id));
            container.appendChild(unlockBtn);
        } else {
            // Show upgrade options
            const oreItem = document.createElement('div');
            oreItem.className = 'ore-item';
            oreItem.innerHTML = `
                <div class="ore-header">
                    <span>${oreType.emoji} ${oreType.name}</span>
                </div>
                <button class="shop-button upgrade-ore-rate" data-ore="${oreType.id}">
                    <span class="button-text">Spawn Rate ${oreData.spawnRate <= 1000 ? '(MAX)' : ''}</span>
                    <span class="price">${oreData.spawnRate <= 1000 ? 'MAX' : formatNumber(oreData.spawnRatePrice)}</span>
                </button>
                <button class="shop-button upgrade-ore-chance" data-ore="${oreType.id}">
                    <span class="button-text">Spawn Chance</span>
                    <span class="price">${oreData.spawnChance >= 1.0 ? 'MAX' : formatNumber(oreData.spawnChancePrice)}</span>
                </button>
                <button class="shop-button upgrade-ore-value" data-ore="${oreType.id}">
                    <span class="button-text">${oreType.name} Value</span>
                    <span class="price">${formatNumber(oreData.valuePrice)}</span>
                </button>
            `;
            
            const rateBtn = oreItem.querySelector('.upgrade-ore-rate');
            const chanceBtn = oreItem.querySelector('.upgrade-ore-chance');
            const valueBtn = oreItem.querySelector('.upgrade-ore-value');
            
            rateBtn.addEventListener('click', () => upgradeOreRate(oreType.id));
            chanceBtn.addEventListener('click', () => upgradeOreChance(oreType.id));
            valueBtn.addEventListener('click', () => upgradeOreValue(oreType.id));
            
            rateBtn.disabled = gameState.gold < oreData.spawnRatePrice || oreData.spawnRate <= 1000;
            // Disable spawn chance button if already at 100% or can't afford
            chanceBtn.disabled = oreData.spawnChance >= 1.0 || gameState.gold < oreData.spawnChancePrice;
            valueBtn.disabled = gameState.gold < oreData.valuePrice;
            
            container.appendChild(oreItem);
        }
    });
}

// Unlock ore
function unlockOre(oreId) {
    const oreType = ORE_TYPES.find(o => o.id === oreId);
    const oreData = gameState.unlockedOres[oreId];
    if (!oreType || !oreData || oreData.unlocked || gameState.gold < oreType.unlockPrice) return;
    
    gameState.gold -= oreType.unlockPrice;
    oreData.unlocked = true;
    oreData.lastSpawn = Date.now();
    
    playUpgradeSound();
    renderOreShop();
    updateUI();
    saveGame();
}

// Upgrade ore spawn rate
function upgradeOreRate(oreId) {
    const oreData = gameState.unlockedOres[oreId];
    if (!oreData || !oreData.unlocked || gameState.gold < oreData.spawnRatePrice) return;
    
    // Prevent upgrading if already at minimum (1 second)
    if (oreData.spawnRate <= 1000) return;
    
    gameState.gold -= oreData.spawnRatePrice;
    oreData.spawnRate = Math.max(1000, oreData.spawnRate - 500); // Reduce by 0.5 seconds, minimum 1 second
    oreData.spawnRatePrice = Math.floor(oreData.spawnRatePrice * 1.5);
    
    playUpgradeSound();
    renderOreShop();
    updateUI();
    saveGame();
}

// Upgrade ore spawn chance
function upgradeOreChance(oreId) {
    const oreData = gameState.unlockedOres[oreId];
    if (!oreData || !oreData.unlocked || gameState.gold < oreData.spawnChancePrice) return;
    if (oreData.spawnChance >= 1.0) return; // Already at max
    
    gameState.gold -= oreData.spawnChancePrice;
    oreData.spawnChance = Math.min(1.0, oreData.spawnChance + 0.05); // Increase by 5% instead of 10%
    oreData.spawnChancePrice = Math.floor(oreData.spawnChancePrice * 1.5);
    
    playUpgradeSound();
    renderOreShop();
    updateUI();
    saveGame();
}

// Upgrade individual ore value
function upgradeOreValue(oreId) {
    const oreData = gameState.unlockedOres[oreId];
    if (!oreData || !oreData.unlocked || gameState.gold < oreData.valuePrice) return;
    
    gameState.gold -= oreData.valuePrice;
    oreData.valueMultiplier += 0.5;
    oreData.valuePrice = Math.floor(oreData.valuePrice * 1.5);
    
    playUpgradeSound();
    renderOreShop();
    updateUI();
    saveGame();
}

// Render ore breakdown in header
function renderOreBreakdown() {
    const breakdown = document.getElementById('ore-breakdown');
    const list = document.getElementById('ore-breakdown-list');
    list.innerHTML = '';
    
    let hasUnlockedOres = false;
    const unlockedOreList = [];
    
    ORE_TYPES.forEach(oreType => {
        const oreData = gameState.unlockedOres[oreType.id];
        if (oreData && oreData.unlocked) {
            hasUnlockedOres = true;
            const value = oreType.baseValue * gameState.prestigeOreValueMultiplier * gameState.oreValueMultiplier;
            unlockedOreList.push({
                type: oreType,
                data: oreData,
                value: value
            });
        }
    });
    
    if (hasUnlockedOres) {
        breakdown.style.display = 'block';
        
        // Add spawn efficiency info at the top
        if (gameState.oreSpawnEfficiency > 0) {
            const efficiencyItem = document.createElement('div');
            efficiencyItem.className = 'ore-breakdown-item ore-breakdown-efficiency';
            efficiencyItem.innerHTML = `
                <span class="ore-breakdown-emoji">⚡</span>
                <span class="ore-breakdown-name">Spawn Efficiency</span>
                <span class="ore-breakdown-chance"></span>
                <span class="ore-breakdown-chance-percent">${((gameState.oreSpawnEfficiency + gameState.prestigeSpawnEfficiencyBonus) * 100).toFixed(0)}%</span>
                <span class="ore-breakdown-value">Double Spawn Chance</span>
                <span class="ore-breakdown-gps"></span>
            `;
            list.appendChild(efficiencyItem);
        }
        
        unlockedOreList.forEach(({ type, data }) => {
            // Re-apply prestige bonuses to ensure they're current
            // (This ensures bonuses are applied even if ore was just unlocked)
            const oreId = type.id;
            Object.keys(PRESTIGE_NODES).forEach(nodeId => {
                const node = PRESTIGE_NODES[nodeId];
                const level = gameState.prestigeNodes[nodeId] || 0;
                if (level === 0) return;
                
                const effect = node.effect(level);
                if (effect.type === 'oreSpawnRate' && effect.oreId === oreId) {
                    const baseRate = type.baseSpawnRate;
                    const rateWithPrestige = Math.max(1000, baseRate * (1 - effect.value));
                    data.spawnRate = Math.min(data.spawnRate, rateWithPrestige);
                } else if (effect.type === 'spawnChance' && effect.oreId === oreId) {
                    const baseChance = type.baseSpawnChance;
                    const shopUpgradeAmount = data.spawnChance - baseChance;
                    data.spawnChance = Math.min(1.0, baseChance + Math.max(0, shopUpgradeAmount) + effect.value);
                }
            });
            
            // Calculate value with individual multiplier, global multiplier, and prestige bonus
            const value = type.baseValue * gameState.prestigeOreValueMultiplier * gameState.oreValueMultiplier * data.valueMultiplier;
            
            // Calculate expected gold per second
            // Formula: (value * spawnChance) / (spawnRate in seconds)
            const spawnRateSeconds = data.spawnRate / 1000;
            const goldPerSecond = (value * data.spawnChance) / spawnRateSeconds;
            
            const item = document.createElement('div');
            item.className = 'ore-breakdown-item';
            item.innerHTML = `
                <span class="ore-breakdown-emoji">${type.emoji}</span>
                <span class="ore-breakdown-name">${type.name}</span>
                <span class="ore-breakdown-chance">Every ${spawnRateSeconds.toFixed(1)}s</span>
                <span class="ore-breakdown-chance-percent">${(data.spawnChance * 100).toFixed(0)}%</span>
                <span class="ore-breakdown-value">${formatNumber(value)}</span>
                <span class="ore-breakdown-gps">${goldPerSecond.toFixed(2)}/s</span>
            `;
            list.appendChild(item);
        });
    } else {
        breakdown.style.display = 'none';
    }
}

// Render auto-clickers
function renderAutoClickers() {
    const container = document.getElementById('auto-clickers-list');
    container.innerHTML = '';
    
    if (gameState.autoClickerLevel === 0) {
        container.innerHTML = '<div style="color: #888; font-size: 0.5em; padding: 10px;">No auto-clicker yet</div>';
        return;
    }
    
    const clicksPerSec = (1000 / gameState.autoClickerSpeed).toFixed(1);
    
    const item = document.createElement('div');
    item.className = 'auto-clicker-item';
    item.innerHTML = `
        <div class="clicker-info">
            <span>Auto-Clicker Active</span>
            <span class="clicker-speed">${clicksPerSec} clicks/sec</span>
        </div>
    `;
    container.appendChild(item);
}

// Render minecarts
function renderMinecarts() {
    const container = domCache.minecartsContainer || document.getElementById('minecarts-container');
    if (!container) return;
    
    // Instead of clearing everything, update existing elements or create new ones
    gameState.minecarts.forEach((minecart, index) => {
        // Try to find existing minecart element
        let minecartEl = container.querySelector(`[data-minecart-id="${minecart.id}"]`);
        
        // If element doesn't exist, create it
        if (!minecartEl) {
            minecartEl = document.createElement('div');
            minecartEl.className = 'minecart';
            minecartEl.dataset.minecartId = minecart.id;
            minecartEl.style.left = '20px';
            minecartEl.style.top = (20 + index * 95) + 'px'; // Increased spacing to prevent button overlap
            container.appendChild(minecartEl);
        } else {
            // Update position in case index changed
            minecartEl.style.top = (20 + index * 95) + 'px';
        }
        
        // Simple minecart rendering - no health/repair system
        const percentage = (minecart.items / minecart.capacity) * 100;
        const now = Date.now();
        const isOnCooldown = minecart.deliveryCooldownEnd && now < minecart.deliveryCooldownEnd;
        
        let deliveryProgress = 0;
        if (isOnCooldown) {
            const cooldownStart = minecart.deliveryCooldownEnd - gameState.minecartDeliverySpeed;
            const elapsed = now - cooldownStart;
            deliveryProgress = Math.min(100, Math.max(0, (elapsed / gameState.minecartDeliverySpeed) * 100));
        }
        
        // Set class for grayed-out effect
        minecartEl.className = 'minecart' + (isOnCooldown ? ' minecart-delivering' : '');
        
        // Turret indicator
        const turretIndicator = gameState.minecartTurrets ? '🔫' : '';
        
        minecartEl.innerHTML = `
            <div class="minecart-icon">🚃${turretIndicator}</div>
            <div class="minecart-info">
                <div class="minecart-counter">${minecart.items}/${minecart.capacity}${isOnCooldown ? ' - Delivering' : ''}</div>
                ${isOnCooldown ? `
                    <div class="minecart-delivery-bar" style="margin-top: 3px;">
                        <div class="minecart-delivery-bar-fill" style="width: ${deliveryProgress}%"></div>
                    </div>
                ` : `
                    <div class="minecart-bar" style="margin-top: 3px;">
                        <div class="minecart-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                `}
            </div>
        `;
        
        minecart.element = minecartEl;
        container.appendChild(minecartEl);
    });
}

// Update minecart delivery progress bars smoothly
function updateMinecartDeliveryBars() {
    const container = domCache.minecartsContainer || document.getElementById('minecarts-container');
    if (!container) return;
    
    const now = Date.now();
    
    gameState.minecarts.forEach(minecart => {
        const minecartEl = container.querySelector(`[data-minecart-id="${minecart.id}"]`);
        if (!minecartEl) return;
        
        const isOnCooldown = minecart.deliveryCooldownEnd && now < minecart.deliveryCooldownEnd;
        
        if (isOnCooldown) {
            const cooldownStart = minecart.deliveryCooldownEnd - gameState.minecartDeliverySpeed;
            const elapsed = now - cooldownStart;
            const deliveryProgress = Math.min(100, Math.max(0, (elapsed / gameState.minecartDeliverySpeed) * 100));
            
            // Update only the progress bar fill width
            const progressBarFill = minecartEl.querySelector('.minecart-delivery-bar-fill');
            if (progressBarFill) {
                progressBarFill.style.width = deliveryProgress + '%';
            }
        }
    });
}

// Render dwarves
function renderDwarves() {
    const container = document.getElementById('dwarves-container');
    const containerRect = container.getBoundingClientRect();
    
    // Get minecart position for spawning new dwarves
    const minecart = gameState.minecarts[0];
    const minecartX = minecart && minecart.element ? 
        minecart.element.getBoundingClientRect().left - containerRect.left + minecart.element.getBoundingClientRect().width / 2 : 50;
    const minecartY = minecart && minecart.element ? 
        minecart.element.getBoundingClientRect().top - containerRect.top + minecart.element.getBoundingClientRect().height / 2 : 50;
    
    // Only add new dwarves, don't reset existing ones
    while (gameState.dwarfEntities.length < gameState.dwarves) {
        const dwarf = document.createElement('div');
        dwarf.className = 'dwarf';
        dwarf.textContent = '⛏️';
        
        const dwarfData = {
            element: dwarf,
            x: minecartX,
            y: minecartY,
            carryingOre: null,
            miningRock: false,
            lastMineTime: null,
            miningOre: null,
            oreMiningStartTime: null,
            targetOre: null // Persistent target ore assignment
        };
        
        // Position dwarf centered on coordinates
        dwarf.style.left = (dwarfData.x - 15) + 'px';
        dwarf.style.top = (dwarfData.y - 15) + 'px';
        dwarf.style.position = 'absolute';
        
        gameState.dwarfEntities.push(dwarfData);
        container.appendChild(dwarf);
    }
    
    // Ensure all dwarves have mining properties
    gameState.dwarfEntities.forEach(dwarf => {
        if (dwarf.miningRock === undefined) {
            dwarf.miningRock = false;
        }
        if (dwarf.lastMineTime === undefined) {
            dwarf.lastMineTime = null;
        }
        if (dwarf.miningOre === undefined) {
            dwarf.miningOre = null;
        }
        if (dwarf.oreMiningStartTime === undefined) {
            dwarf.oreMiningStartTime = null;
        }
    });
    
    // Remove excess dwarves if count decreased
    while (gameState.dwarfEntities.length > gameState.dwarves) {
        const removed = gameState.dwarfEntities.pop();
        if (removed.element) {
            removed.element.remove();
        }
    }
}

// Track gold changes for real-time GPM calculation
function trackGoldChange() {
    const now = Date.now();
    gameState.goldHistory.push({ time: now, gold: gameState.gold });
    
    // Keep only last 30 seconds of history
    const cutoff = now - 30000;
    gameState.goldHistory = gameState.goldHistory.filter(entry => entry.time > cutoff);
}

// Calculate coins per minute based on actual gold changes
function calculateCoinsPerMinute() {
    const now = Date.now();
    const history = gameState.goldHistory;
    
    if (history.length < 2) {
        gameState.coinsPerMinute = 0;
        return;
    }
    
    // Get oldest and newest entries
    const oldest = history[0];
    const newest = history[history.length - 1];
    
    const timeDiff = (newest.time - oldest.time) / 1000; // seconds
    const goldDiff = newest.gold - oldest.gold;
    
    if (timeDiff > 0) {
        // Calculate gold per second, then convert to per minute
        const goldPerSecond = goldDiff / timeDiff;
        gameState.coinsPerMinute = Math.max(0, goldPerSecond * 60);
    } else {
        gameState.coinsPerMinute = 0;
    }
}

// Update UI
function updateUI() {
    // Check if gold multiplier expired
    const now = Date.now();
    if (gameState.goldMultiplierEndTime > 0 && now >= gameState.goldMultiplierEndTime) {
        gameState.goldMultiplier = 1;
        gameState.goldMultiplierEndTime = 0;
        stopMultiplierEffects();
    }
    
    calculateCoinsPerMinute();
    
    const coinsEl = document.getElementById('coins');
    if (coinsEl) coinsEl.textContent = formatNumber(gameState.gold);
    
    const coinsPerMinEl = document.getElementById('coins-per-minute');
    if (coinsPerMinEl) coinsPerMinEl.textContent = formatNumber(gameState.coinsPerMinute);
    
    const dwarfCountEl = document.getElementById('dwarf-count');
    if (dwarfCountEl) dwarfCountEl.textContent = gameState.dwarves;
    
    const minecartCountEl = document.getElementById('minecart-count');
    if (minecartCountEl) minecartCountEl.textContent = gameState.minecarts.length;
    
    const soldierCountEl = document.getElementById('soldier-count');
    if (soldierCountEl) soldierCountEl.textContent = gameState.soldiers;
    
    const enemyCountEl = document.getElementById('enemy-count');
    if (enemyCountEl) enemyCountEl.textContent = gameState.enemies.length;
    
    // Update horde timer
    updateHordeTimer();
    
    const clickPowerPriceEl = document.getElementById('click-power-price');
    if (clickPowerPriceEl) clickPowerPriceEl.textContent = formatNumber(gameState.clickPowerPrice);
    
    // Update click power value display (shows base click power + prestige bonus, NOT multiplied by gold multiplier)
    // The gold multiplier applies to gold earned, but the display should show the base value
    const totalClickPower = gameState.clickPower + gameState.prestigeClickPowerBonus;
    const clickPowerValueEl = document.getElementById('click-power-value');
    if (clickPowerValueEl) clickPowerValueEl.textContent = `(${totalClickPower})`;
    
    // Auto-clicker UI updates
    const autoClickerPrice = gameState.autoClickerLevel === 0 ? 100 : 0;
    const buyAutoClickerBtn = document.getElementById('buy-auto-clicker');
    const autoClickerPriceEl = document.getElementById('auto-clicker-price');
    
    if (gameState.autoClickerLevel > 0) {
        autoClickerPriceEl.textContent = 'Owned';
        buyAutoClickerBtn.disabled = true;
        buyAutoClickerBtn.classList.add('owned');
    } else {
        autoClickerPriceEl.textContent = formatNumber(autoClickerPrice);
        buyAutoClickerBtn.disabled = gameState.gold < autoClickerPrice;
        buyAutoClickerBtn.classList.remove('owned');
    }
    const autoClickerSpeedPriceEl = document.getElementById('auto-clicker-speed-price');
    if (autoClickerSpeedPriceEl) autoClickerSpeedPriceEl.textContent = formatNumber(gameState.autoClickerSpeedPrice);
    
    // Update auto-clicker speed display (includes prestige bonus)
    const autoClickerSpeedDisplayEl = document.getElementById('auto-clicker-speed-display');
    if (autoClickerSpeedDisplayEl) {
        if (gameState.autoClickerLevel > 0) {
            // Calculate total speed including prestige bonus
            const totalClicksPerSec = 1 + (0.5 * gameState.autoClickerSpeedUpgrades) + gameState.prestigeAutoClickerSpeedBonus;
            const speed = totalClicksPerSec.toFixed(1);
            autoClickerSpeedDisplayEl.textContent = `(${speed}/sec)`;
        } else {
            autoClickerSpeedDisplayEl.textContent = '(Locked)';
        }
    }
    
    const dwarfPriceEl = document.getElementById('dwarf-price');
    if (dwarfPriceEl) dwarfPriceEl.textContent = formatNumber(gameState.dwarfPrice);
    
    const dwarfSpeedPriceEl = document.getElementById('dwarf-speed-price');
    if (dwarfSpeedPriceEl) dwarfSpeedPriceEl.textContent = formatNumber(gameState.dwarfSpeedPrice);
    
    const oreValuePriceEl = document.getElementById('ore-value-price');
    if (oreValuePriceEl) oreValuePriceEl.textContent = formatNumber(gameState.oreValuePrice);
    
    const oreSpawnEfficiencyPriceEl = document.getElementById('ore-spawn-efficiency-price');
    if (oreSpawnEfficiencyPriceEl) oreSpawnEfficiencyPriceEl.textContent = formatNumber(gameState.oreSpawnEfficiencyPrice);
    
    const minecartPriceEl = document.getElementById('minecart-price');
    if (minecartPriceEl) minecartPriceEl.textContent = formatNumber(gameState.minecartPrice);
    const capacityBtn = document.getElementById('upgrade-minecart-capacity');
    if (capacityBtn) {
        const buttonText = capacityBtn.querySelector('.button-text');
        if (buttonText) {
            if (gameState.minecartCapacity >= 50) {
                buttonText.textContent = `Minecart Capacity (MAX: ${gameState.minecartCapacity})`;
            } else {
                buttonText.textContent = `Minecart Capacity (${gameState.minecartCapacity} → ${Math.min(50, gameState.minecartCapacity + 5)})`;
            }
        }
    }
    const capacityPriceEl = document.getElementById('minecart-capacity-price');
    if (capacityPriceEl) capacityPriceEl.textContent = gameState.minecartCapacity >= 50 ? 'MAX' : formatNumber(gameState.minecartCapacityPrice);
    
    const deliverySpeedPriceEl = document.getElementById('minecart-delivery-speed-price');
    if (deliverySpeedPriceEl) deliverySpeedPriceEl.textContent = formatNumber(gameState.minecartDeliverySpeedPrice);
    
    const healthPriceEl = document.getElementById('minecart-health-price');
    if (healthPriceEl) healthPriceEl.textContent = formatNumber(gameState.minecartHealthPrice);
    
    const turretPriceEl = document.getElementById('minecart-turret-price');
    if (turretPriceEl) turretPriceEl.textContent = formatNumber(gameState.minecartTurretPrice);
    
    const gamblePriceEl = document.getElementById('gamble-price');
    if (gamblePriceEl) gamblePriceEl.textContent = formatNumber(gameState.gamblePrice);
    
    // Soldier prices
    const soldierPriceEl = document.getElementById('soldier-price');
    if (soldierPriceEl) soldierPriceEl.textContent = formatNumber(gameState.soldierPrice);
    
    const soldierAttackPowerPriceEl = document.getElementById('soldier-attack-power-price');
    if (soldierAttackPowerPriceEl) soldierAttackPowerPriceEl.textContent = formatNumber(gameState.soldierAttackPowerPrice);
    
    const soldierAttackSpeedPriceEl = document.getElementById('soldier-attack-speed-price');
    if (soldierAttackSpeedPriceEl) soldierAttackSpeedPriceEl.textContent = formatNumber(gameState.soldierAttackSpeedPrice);
    
    const soldierSpeedPriceEl = document.getElementById('soldier-speed-price');
    if (soldierSpeedPriceEl) soldierSpeedPriceEl.textContent = formatNumber(gameState.soldierSpeedPrice);
    
    // Update luck display (only if element exists - it's in the modal)
    const luckPriceEl = document.getElementById('slot-machine-luck-price');
    const luckLevelEl = document.getElementById('luck-level');
    if (luckPriceEl) {
        luckPriceEl.textContent = formatNumber(gameState.slotMachineLuckPrice);
    }
    if (luckLevelEl) {
        luckLevelEl.textContent = gameState.slotMachineLuck;
    }
    
    // Update button states
    const upgradeClickPowerBtn = document.getElementById('upgrade-click-power');
    if (upgradeClickPowerBtn) upgradeClickPowerBtn.disabled = gameState.gold < gameState.clickPowerPrice;
    
    const buyAutoClickerBtn2 = document.getElementById('buy-auto-clicker');
    if (buyAutoClickerBtn2) buyAutoClickerBtn2.disabled = gameState.gold < autoClickerPrice;
    
    const upgradeAutoClickerSpeedBtn = document.getElementById('upgrade-auto-clicker-speed');
    if (upgradeAutoClickerSpeedBtn) upgradeAutoClickerSpeedBtn.disabled = gameState.gold < gameState.autoClickerSpeedPrice;
    
    const hireDwarfBtn = document.getElementById('hire-dwarf');
    if (hireDwarfBtn) hireDwarfBtn.disabled = gameState.gold < gameState.dwarfPrice;
    
    const upgradeDwarfSpeedBtn = document.getElementById('upgrade-dwarf-speed');
    if (upgradeDwarfSpeedBtn) upgradeDwarfSpeedBtn.disabled = gameState.gold < gameState.dwarfSpeedPrice || gameState.dwarves === 0;
    
    const upgradeOreValueBtn = document.getElementById('upgrade-ore-value');
    if (upgradeOreValueBtn) upgradeOreValueBtn.disabled = gameState.gold < gameState.oreValuePrice;
    
    const upgradeOreSpawnEfficiencyBtn = document.getElementById('upgrade-ore-spawn-efficiency');
    if (upgradeOreSpawnEfficiencyBtn) {
        // Check if total efficiency (purchased + prestige) is at max
        const totalEfficiency = gameState.oreSpawnEfficiency + gameState.prestigeSpawnEfficiencyBonus;
        const isMaxed = totalEfficiency >= 1.0;
        upgradeOreSpawnEfficiencyBtn.disabled = isMaxed || gameState.gold < gameState.oreSpawnEfficiencyPrice;
        
        // Update button text to show "MAX" when at 100%
        const buttonText = upgradeOreSpawnEfficiencyBtn.querySelector('.button-text');
        if (buttonText) {
            if (isMaxed) {
                buttonText.textContent = 'Spawn Efficiency (MAX)';
            } else {
                buttonText.textContent = 'Spawn Efficiency';
            }
        }
    }
    
    const buyMinecartBtn = document.getElementById('buy-minecart');
    if (buyMinecartBtn) {
        const MAX_MINECARTS = 10;
        const isMaxed = gameState.minecarts.length >= MAX_MINECARTS;
        buyMinecartBtn.disabled = isMaxed || gameState.gold < gameState.minecartPrice;
        
        // Update button text to show "MAX" when limit reached
        const buttonText = buyMinecartBtn.querySelector('.button-text');
        if (buttonText) {
            if (isMaxed) {
                buttonText.textContent = 'Buy Minecart (MAX)';
            } else {
                buttonText.textContent = 'Buy Minecart';
            }
        }
    }
    
    const upgradeMinecartCapacityBtn = document.getElementById('upgrade-minecart-capacity');
    if (upgradeMinecartCapacityBtn) upgradeMinecartCapacityBtn.disabled = gameState.gold < gameState.minecartCapacityPrice || gameState.minecartCapacity >= 50;
    
    const upgradeMinecartDeliverySpeedBtn = document.getElementById('upgrade-minecart-delivery-speed');
    if (upgradeMinecartDeliverySpeedBtn) upgradeMinecartDeliverySpeedBtn.disabled = gameState.gold < gameState.minecartDeliverySpeedPrice;
    const healthBtnEl = document.getElementById('upgrade-minecart-health');
    if (healthBtnEl) {
        healthBtnEl.disabled = gameState.gold < gameState.minecartHealthPrice;
    }
    const turretBtnEl = document.getElementById('upgrade-minecart-turrets');
    if (turretBtnEl) {
        turretBtnEl.disabled = gameState.gold < gameState.minecartTurretPrice || gameState.minecartTurrets;
    }
    
    const autoRepairBtnEl = document.getElementById('upgrade-auto-repair-bot');
    if (autoRepairBtnEl) {
        autoRepairBtnEl.disabled = gameState.gold < gameState.autoRepairBotPrice || gameState.autoRepairBot;
        if (gameState.autoRepairBot) {
            const buttonText = autoRepairBtnEl.querySelector('.button-text');
            if (buttonText) buttonText.textContent = '🤖 Auto-Repair Bot (Owned)';
        }
    }
    
    const autoRepairPriceEl = document.getElementById('auto-repair-bot-price');
    if (autoRepairPriceEl) {
        autoRepairPriceEl.textContent = formatNumber(gameState.autoRepairBotPrice);
    }
    document.getElementById('gamble-wheel').disabled = gameState.gold < gameState.gamblePrice;
    document.getElementById('upgrade-slot-machine-luck').disabled = gameState.gold < gameState.slotMachineLuckPrice;
    
    // Soldier button states
    const hireSoldierBtn2 = document.getElementById('hire-soldier');
    if (hireSoldierBtn2) hireSoldierBtn2.disabled = gameState.gold < gameState.soldierPrice;
    
    const upgradeSoldierAttackPowerBtn2 = document.getElementById('upgrade-soldier-attack-power');
    if (upgradeSoldierAttackPowerBtn2) upgradeSoldierAttackPowerBtn2.disabled = gameState.gold < gameState.soldierAttackPowerPrice || gameState.soldiers === 0;
    
    const upgradeSoldierAttackSpeedBtn2 = document.getElementById('upgrade-soldier-attack-speed');
    if (upgradeSoldierAttackSpeedBtn2) upgradeSoldierAttackSpeedBtn2.disabled = gameState.gold < gameState.soldierAttackSpeedPrice || gameState.soldiers === 0;
    
    const upgradeSoldierSpeedBtn2 = document.getElementById('upgrade-soldier-speed');
    if (upgradeSoldierSpeedBtn2) upgradeSoldierSpeedBtn2.disabled = gameState.gold < gameState.soldierSpeedPrice || gameState.soldiers === 0;
    
    // Update ore shop button states without re-rendering (prevents losing event listeners)
    ORE_TYPES.forEach(oreType => {
        const oreData = gameState.unlockedOres[oreType.id];
        if (!oreData) return;
        
        if (!oreData.unlocked) {
            // Update unlock button state
            const unlockBtn = document.querySelector(`[data-ore="${oreType.id}"]`) || 
                Array.from(document.querySelectorAll('.shop-button')).find(btn => 
                    btn.textContent.includes(oreType.name) && !oreData.unlocked
                );
            if (unlockBtn) {
                unlockBtn.disabled = gameState.gold < oreType.unlockPrice;
            }
        } else {
            // Update upgrade button states
            const rateBtn = document.querySelector(`.upgrade-ore-rate[data-ore="${oreType.id}"]`);
            const chanceBtn = document.querySelector(`.upgrade-ore-chance[data-ore="${oreType.id}"]`);
            const valueBtn = document.querySelector(`.upgrade-ore-value[data-ore="${oreType.id}"]`);
            if (rateBtn) {
                rateBtn.disabled = gameState.gold < oreData.spawnRatePrice || oreData.spawnRate <= 1000;
                // Update button text to show MAX if at minimum
                const buttonText = rateBtn.querySelector('.button-text');
                const priceSpan = rateBtn.querySelector('.price');
                if (buttonText && priceSpan) {
                    if (oreData.spawnRate <= 1000) {
                        buttonText.textContent = 'Spawn Rate (MAX)';
                        priceSpan.textContent = 'MAX';
                    } else {
                        buttonText.textContent = 'Spawn Rate';
                        priceSpan.textContent = formatNumber(oreData.spawnRatePrice);
                    }
                }
            }
            if (chanceBtn) {
                // Disable if at max (100%) or can't afford
                chanceBtn.disabled = oreData.spawnChance >= 1.0 || gameState.gold < oreData.spawnChancePrice;
                // Update price display to show MAX if at 100%
                const priceSpan = chanceBtn.querySelector('.price');
                if (priceSpan) {
                    priceSpan.textContent = oreData.spawnChance >= 1.0 ? 'MAX' : formatNumber(oreData.spawnChancePrice);
                }
            }
            if (valueBtn) {
                valueBtn.disabled = gameState.gold < oreData.valuePrice;
                const priceSpan = valueBtn.querySelector('.price');
                if (priceSpan) {
                    priceSpan.textContent = formatNumber(oreData.valuePrice);
                }
            }
        }
    });
    
    // Re-apply prestige bonuses before showing breakdown (ensures bonuses are current)
    applyPrestigeBonuses();
    
    // Update ore breakdown display
    renderOreBreakdown();
}

// Slot machine functions
function generateReelItems(reel) {
    // Clear existing items
    reel.innerHTML = '';
    
    // Define all possible rewards with their background colors
    // IMPORTANT: Text must match exactly what's in spinSlotMachine rewards array
    const rewards = [
        { text: '💰 1K', color: 'blue' },      // Lower tier - blue
        { text: '💰 5K', color: 'green' },     // Lower tier - green
        { text: '💰 25K', color: 'red' },     // Higher tier - red (increased from 10K)
        { text: '💎⬜💚 x30', color: 'red' },  // Higher tier - red (reduced from x50)
        { text: '💎⬜💚 x100', color: 'purple' }, // Super rare - purple
        { text: '⚡ 2x Gold', color: 'yellow' } // Multiplier - yellow (special)
    ];
    
    // Create enough items for seamless looping (at least 4 full sets)
    const sets = 5; // 5 full sets for smooth scrolling and looping
    for (let i = 0; i < sets; i++) {
        rewards.forEach(reward => {
            const item = document.createElement('div');
            item.className = `reel-item reel-item-${reward.color}`;
            item.textContent = reward.text;
            reel.appendChild(item);
        });
    }
    
}

// Update slot machine odds display based on current luck
function updateSlotMachineOdds() {
    const luckBonus = gameState.slotMachineLuck;
    
    // Calculate current odds with luck (same formula as in spinSlotMachine)
    const odds1K = Math.max(30, 45 - luckBonus * 2);
    const odds5K = Math.max(25, 35 - luckBonus * 1.5);
    const odds25K = Math.max(20, 25 - luckBonus * 1); // Updated from 10K to 25K
    const odds30Ores = Math.min(15, 8 + luckBonus * 0.7); // Increased scaling - base 8%, +0.7% per level, max 15%
    const odds100Ores = Math.min(6, 1.5 + luckBonus * 0.5); // Increased scaling - base 1.5%, +0.5% per level, max 6%
    const oddsMultiplier = Math.min(7, 1.5 + luckBonus * 0.6); // Increased scaling - base 1.5%, +0.6% per level, max 7%
    
    // Calculate total weight for percentage calculation
    const totalWeight = odds1K + odds5K + odds25K + odds30Ores + odds100Ores + oddsMultiplier;
    
    // Update odds display
    const odds1KEl = document.getElementById('odds-1k');
    const odds5KEl = document.getElementById('odds-5k');
    const odds25KEl = document.getElementById('odds-10k'); // Keep same ID (it's the 25K reward now)
    const odds30OresEl = document.getElementById('odds-ores-50'); // Keep same ID for now, but update text
    const odds100OresEl = document.getElementById('odds-ores-100');
    const oddsMultiplierEl = document.getElementById('odds-multiplier');
    
    if (odds1KEl) odds1KEl.textContent = ((odds1K / totalWeight) * 100).toFixed(1) + '%';
    if (odds5KEl) odds5KEl.textContent = ((odds5K / totalWeight) * 100).toFixed(1) + '%';
    if (odds25KEl) odds25KEl.textContent = ((odds25K / totalWeight) * 100).toFixed(1) + '%';
    if (odds30OresEl) odds30OresEl.textContent = ((odds30Ores / totalWeight) * 100).toFixed(1) + '%';
    if (odds100OresEl) odds100OresEl.textContent = ((odds100Ores / totalWeight) * 100).toFixed(1) + '%';
    if (oddsMultiplierEl) oddsMultiplierEl.textContent = ((oddsMultiplier / totalWeight) * 100).toFixed(1) + '%';
}

function openGambleWheel() {
    if (gameState.gold < gameState.gamblePrice) {
        alert(`Not enough gold! Need ${formatNumber(gameState.gamblePrice)} gold.`);
        return;
    }
    
    const modal = document.getElementById('gamble-modal');
    if (modal) {
        modal.style.display = 'flex';
        resetSlotMachine();
        // Ensure reel items are generated when modal opens
        const reel = document.getElementById('reel-1');
        if (reel && reel.children.length === 0) {
            generateReelItems(reel);
        }
        
        // Update luck display when modal opens
        const luckLevelEl = document.getElementById('luck-level');
        const luckPriceEl = document.getElementById('slot-machine-luck-price');
        const luckButton = document.getElementById('upgrade-slot-machine-luck');
        if (luckLevelEl) {
            luckLevelEl.textContent = gameState.slotMachineLuck;
        }
        if (luckPriceEl) {
            luckPriceEl.textContent = formatNumber(gameState.slotMachineLuckPrice);
        }
        if (luckButton) {
            luckButton.disabled = gameState.gold < gameState.slotMachineLuckPrice;
        }
        
        // Update odds display based on current luck
        updateSlotMachineOdds();
    }
}

function resetSlotMachine() {
    const reel = document.getElementById('reel-1');
    const resultDiv = document.getElementById('gamble-result');
    const handle = document.getElementById('pull-handle');
    
    if (reel) {
        reel.style.transform = 'translateY(0)';
        reel.style.transition = 'none';
        // Remove all highlights
        const items = reel.querySelectorAll('.reel-item');
        items.forEach(item => {
            item.classList.remove('highlighted', 'spinning');
        });
        
        // Ensure reel items are generated
        if (reel.children.length === 0) {
            generateReelItems(reel);
        }
    }
    
    if (resultDiv) {
        resultDiv.textContent = '';
    }
    
    if (handle) {
        handle.disabled = false;
        // Don't set textContent - we want the visual handle divs to show
    }
}

function spinSlotMachine() {
    if (gameState.gold < gameState.gamblePrice) {
        alert(`Not enough gold! Need ${formatNumber(gameState.gamblePrice)} gold.`);
        return;
    }
    
    // Deduct cost immediately
    gameState.gold -= gameState.gamblePrice;
    playSlotSpinSound();
    saveGame();
    updateUI();
    
    const reel = document.getElementById('reel-1');
    const handle = document.getElementById('pull-handle');
    if (!reel || !handle) return;
    
    // Disable handle during spin
    handle.disabled = true;
    
    // Animate handle pull
    handle.classList.add('pulling');
    setTimeout(() => {
        handle.classList.remove('pulling');
    }, 300);
    
    // Define rewards with weights (odds) - IMPORTANT: text must match exactly what's in generateReelItems
    // Luck increases rare reward weights
    const luckBonus = gameState.slotMachineLuck;
    const rewards = [
        { type: 'gold', amount: 1000, weight: Math.max(30, 45 - luckBonus * 2), text: '💰 1K' },   // Decreases with luck
        { type: 'gold', amount: 5000, weight: Math.max(25, 35 - luckBonus * 1.5), text: '💰 5K' },   // Decreases with luck
        { type: 'gold', amount: 25000, weight: Math.max(20, 25 - luckBonus * 1), text: '💰 25K' }, // Decreases with luck (increased from 10K)
        { type: 'ores', count: 30, weight: Math.min(15, 8 + luckBonus * 0.7), text: '💎⬜💚 x30' }, // Increased scaling - base 8%, +0.7% per level, max 15%
        { type: 'ores', count: 100, weight: Math.min(6, 1.5 + luckBonus * 0.5), text: '💎⬜💚 x100' }, // Increased scaling - base 1.5%, +0.5% per level, max 6%
        { type: 'multiplier', multiplier: 2, duration: 60000, weight: Math.min(7, 1.5 + luckBonus * 0.6), text: '⚡ 2x Gold' } // Increased scaling - base 1.5%, +0.6% per level, max 7%
    ];
    
    
    // Select reward based on weights
    const totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedReward = rewards[0];
    
    for (const reward of rewards) {
        random -= reward.weight;
        if (random <= 0) {
            selectedReward = reward;
            break;
        }
    }
    
    // Ensure reel items are generated
    if (reel.children.length === 0) {
        generateReelItems(reel);
    }
    
    // Get all reel items
    const items = reel.querySelectorAll('.reel-item');
    const itemHeight = 120; // Height of each item
    const uniqueRewards = 6; // Number of unique reward types (1K, 5K, 10K, 50 ores, 100 ores, 2x Gold)
    const totalItems = items.length;
    
    if (totalItems === 0) {
        handle.disabled = false;
        return;
    }
    
    // Find the first occurrence of our target reward in the first set (first 6 items)
    let targetIndex = -1;
    for (let i = 0; i < uniqueRewards; i++) {
        if (items[i] && items[i].textContent.trim() === selectedReward.text) {
            targetIndex = i;
            break;
        }
    }
    
    // Fallback: if not found in first set, search all items
    if (targetIndex === -1) {
        for (let i = 0; i < totalItems; i++) {
            if (items[i] && items[i].textContent.trim() === selectedReward.text) {
                targetIndex = i % uniqueRewards; // Get position in first set
                break;
            }
        }
    }
    
    // Safety check
    if (targetIndex === -1) {
        handle.disabled = false;
        return;
    }
    
    // Calculate final position for seamless looping
    // We want to scroll through multiple full cycles, then land EXACTLY on the target item
    // Since we have 5 sets, we can scroll through 2-3 full sets, then land on target
    const spinCycles = 2 + Math.random() * 1.5; // 2-3.5 full cycles
    // Calculate position: scroll through cycles, then position target item EXACTLY in viewport center
    // Viewport shows 120px height, center is at 60px from top
    // Each item is 120px tall, so item center is at 60px from item top
    // We need: target item's center (at itemTop + 60px) = viewport center (at 60px)
    // So: itemTop = 0, meaning we need the target item's top at viewport position 0
    // IMPORTANT: Use Math.floor to ensure we land exactly on item boundaries, not between items
    const viewportCenter = itemHeight / 2; // 60px - center of viewport
    const fullCycles = Math.floor(spinCycles * uniqueRewards); // Number of complete item cycles
    // Calculate the exact item position we want to land on
    // targetIndex is 0-5 (position in first set of 6 items)
    // After fullCycles (e.g., 15), we want to land on an item where (itemIndex % 6) == targetIndex
    // So we want item at position: fullCycles + targetIndex (which will be item 15+0=15, but 15%6=3, WRONG!)
    // Actually, we need: find the first item >= fullCycles where (itemIndex % 6) == targetIndex
    // This is: Math.ceil(fullCycles / uniqueRewards) * uniqueRewards + targetIndex
    // Or simpler: we want item at position that is targetIndex mod 6, and >= fullCycles
    // Let's use: targetItemPosition = fullCycles - (fullCycles % uniqueRewards) + targetIndex
    // This ensures we land on an item that matches targetIndex in the pattern
    const targetItemPosition = fullCycles - (fullCycles % uniqueRewards) + targetIndex;
    // Item's top position: targetItemPosition * itemHeight
    // Item's center position: targetItemPosition * itemHeight + viewportCenter (60px)
    // Viewport center is at 60px from top
    // We want: item's center (at targetItemPosition * itemHeight + 60px) to be at viewport center (60px)
    // After scrolling by -position: (targetItemPosition * itemHeight + 60px) - position = 60px
    // So: position = targetItemPosition * itemHeight + 60px - 60px = targetItemPosition * itemHeight
    // Since we're using translateY (negative moves up), we need the negative:
    const finalPosition = -(targetItemPosition * itemHeight);
    
    
    // Reset position and clear any highlights
    reel.style.transition = 'none';
    reel.style.transform = 'translateY(0)';
    items.forEach(item => {
        item.classList.remove('highlighted', 'spinning');
    });
    
    // Force reflow
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // Start spinning animation (10% longer)
            const spinDuration = (2 + Math.random()) * 1.1;
            reel.style.transition = `transform ${spinDuration}s cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
            reel.style.transform = `translateY(${finalPosition}px)`;
            
            // After animation completes, handle looping and highlighting
            setTimeout(() => {
                
                // Remove all highlights first
                items.forEach(item => {
                    item.classList.remove('highlighted');
                });
                
                // Always force the UI to show the selected reward (targetIndex)
                // This ensures the visual always matches what was awarded
                // Calculate the EXACT position needed to center the target item
                // Use the same calculation as finalPosition to ensure consistency
                const targetItemPosition = fullCycles - (fullCycles % uniqueRewards) + targetIndex;
                const correctPosition = -(targetItemPosition * itemHeight);
                
                // Get the actual item at the target position (the one that will be visible)
                const targetItem = items[targetItemPosition];
                if (targetItem) {
                    // Use requestAnimationFrame to ensure we apply the correction after any pending transitions
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            // Force the position immediately (no transition)
                            reel.style.transition = 'none';
                            reel.style.transform = `translateY(${correctPosition}px)`;
                            
                            // Force a reflow to ensure the transform is applied
                            void reel.offsetHeight;
                            
                            // Highlight the target item (the one actually visible) and all matching items
                            targetItem.classList.add('highlighted');
                            items.forEach((item, index) => {
                                if (item && item.textContent && item.textContent.trim() === selectedReward.text) {
                                    item.classList.add('highlighted');
                                }
                            });
                            
                        });
                    });
                }
                
                // Apply reward
                setTimeout(() => {
                    applyGambleReward(selectedReward);
                    handle.disabled = false;
                }, 500);
            }, spinDuration * 1000);
        });
    });
}

function applyGambleReward(reward) {
    const resultDiv = document.getElementById('gamble-result');
    
    if (reward.type === 'gold') {
        gameState.gold += reward.amount;
        gameState.totalGoldEarned += reward.amount; // Track for prestige
        resultDiv.innerHTML = `<div class="gamble-success">🎉 You won ${formatNumber(reward.amount)} gold!</div>`;
        trackGoldChange();
        saveGame();
        updateUI();
    } else if (reward.type === 'ores') {
        // Spawn random ores
        const oreCount = reward.count || reward.amount;
        spawnGambleOres(oreCount);
        resultDiv.innerHTML = `<div class="gamble-success">🎉 You won ${oreCount} ores spawning on the map!</div>`;
    } else if (reward.type === 'multiplier') {
        // Apply gold multiplier for duration
        gameState.goldMultiplier = reward.multiplier;
        gameState.goldMultiplierEndTime = Date.now() + reward.duration;
        resultDiv.innerHTML = `<div class="gamble-success">🎉 You won ${reward.multiplier}x Gold Multiplier for ${reward.duration / 1000} seconds!</div>`;
        
        // Start multiplier visual effects
        startMultiplierEffects();
        
        saveGame();
        updateUI();
    }
    
    updateUI();
    saveGame();
}

function spawnGambleOres(count) {
    // Get all unlocked ore types
    const unlockedOreTypes = ORE_TYPES.filter(oreType => {
        const oreData = gameState.unlockedOres[oreType.id];
        return oreData && oreData.unlocked;
    });
    
    // Limit the count to respect MAX_ORES_ON_SCREEN
    const currentOres = gameState.ores.length;
    const maxCanSpawn = Math.max(0, MAX_ORES_ON_SCREEN - currentOres);
    const actualCount = Math.min(count, maxCanSpawn);
    
    if (actualCount === 0) return; // Can't spawn any more
    
    if (unlockedOreTypes.length === 0) {
        // If no ores unlocked, spawn coal as default
        for (let i = 0; i < actualCount; i++) {
            setTimeout(() => {
                spawnOre(ORE_TYPES[0]);
            }, i * 30); // Stagger spawns slightly
        }
        return;
    }
    
    // Spawn random ores from unlocked types
    for (let i = 0; i < actualCount; i++) {
        setTimeout(() => {
            const randomOre = unlockedOreTypes[Math.floor(Math.random() * unlockedOreTypes.length)];
            spawnOre(randomOre);
        }, i * 30); // Stagger spawns slightly (30ms between each)
    }
}

function closeGambleModal() {
    const modal = document.getElementById('gamble-modal');
    modal.style.display = 'none';
}

// ========== PRESTIGE SYSTEM ==========

// Calculate prestige currency from total gold earned
function calculatePrestigeCurrency() {
    // Formula: sqrt(totalGoldEarned / 100000) - much easier to earn
    // 100k gold = 1 prestige, 400k = 2, 900k = 3, 1.6M = 4, etc.
    const baseCurrency = Math.floor(Math.sqrt(gameState.totalGoldEarned / 100000));
    
    // Add bonus from prestige currency bonus upgrade
    const currencyBonusNode = gameState.prestigeNodes['prestige-currency-bonus'] || 0;
    const bonus = currencyBonusNode; // +1 per level
    
    return baseCurrency + bonus;
}

// Get next prestige threshold
function getNextPrestigeThreshold() {
    const currentPrestige = calculatePrestigeCurrency();
    const nextPrestige = currentPrestige + 1;
    return nextPrestige * nextPrestige * 100000; // (n+1)^2 * 100k (much easier)
}

// Check if node requirements are met
function isNodeUnlocked(nodeId) {
    const node = PRESTIGE_NODES[nodeId];
    if (!node) return false;
    
    if (!node.requires || node.requires.length === 0) {
        return true; // Root node
    }
    
    // Check if all required nodes are at least level 1
    return node.requires.every(reqId => {
        const reqLevel = gameState.prestigeNodes[reqId] || 0;
        return reqLevel > 0;
    });
}

// Check if node can be purchased
function canPurchaseNode(nodeId) {
    const node = PRESTIGE_NODES[nodeId];
    if (!node) return false;
    
    const currentLevel = gameState.prestigeNodes[nodeId] || 0;
    if (currentLevel >= node.maxLevel) return false; // Already maxed
    
    if (!isNodeUnlocked(nodeId)) return false; // Requirements not met
    
    const cost = node.costPerLevel[currentLevel];
    return gameState.prestigeCurrency >= cost;
}

// Purchase prestige node
function purchasePrestigeNode(nodeId) {
    if (!canPurchaseNode(nodeId)) return false;
    
    const node = PRESTIGE_NODES[nodeId];
    const currentLevel = gameState.prestigeNodes[nodeId] || 0;
    const cost = node.costPerLevel[currentLevel];
    
    gameState.prestigeCurrency -= cost;
    gameState.prestigeNodes[nodeId] = (gameState.prestigeNodes[nodeId] || 0) + 1;
    
    renderPrestigeTree();
    updatePrestigeUI();
    saveGame();
    return true;
}

// Apply prestige bonuses to game state
function applyPrestigeBonuses() {
    // Reset gold multiplier from prestige (will be recalculated)
    gameState.prestigeGoldMultiplier = 1;
    
    // Reset spawn efficiency bonus from prestige (will be recalculated)
    gameState.prestigeSpawnEfficiencyBonus = 0;
    
    // Reset ore value multiplier from prestige (will be recalculated)
    gameState.prestigeOreValueMultiplier = 1;
    
    // Reset click power bonus from prestige (will be recalculated)
    gameState.prestigeClickPowerBonus = 0;
    
    // Reset auto-clicker speed bonus from prestige (will be recalculated)
    gameState.prestigeAutoClickerSpeedBonus = 0;
    
    // First pass: collect all prestige bonuses
    const prestigeBonuses = {};
    let allOreSpawnRateBonus = 0;
    let allOreSpawnChanceBonus = 0;
    
    Object.keys(PRESTIGE_NODES).forEach(nodeId => {
        const node = PRESTIGE_NODES[nodeId];
        const level = gameState.prestigeNodes[nodeId] || 0;
        if (level === 0) return;
        
        const effect = node.effect(level);
        
        if (effect.type === 'goldMultiplier') {
            // Apply gold multiplier (additive, max 100% at level 10)
            gameState.prestigeGoldMultiplier += effect.value;
        } else if (effect.type === 'spawnEfficiencyBonus') {
            // Track spawn efficiency bonus from prestige
            gameState.prestigeSpawnEfficiencyBonus += effect.value;
        } else if (effect.type === 'oreValueBonus') {
            // Apply ore value multiplier (additive, max 100% at level 10)
            // Convert percentage to multiplier: 10% = 0.1, so 1.0 + 0.1 = 1.1x
            gameState.prestigeOreValueMultiplier += effect.value;
        } else if (effect.type === 'clickPowerBonus') {
            // Apply click power bonus (additive, max +50 at level 5)
            gameState.prestigeClickPowerBonus += effect.value;
        } else if (effect.type === 'autoClickerSpeedBonus') {
            // Apply auto-clicker speed bonus (additive, max +19 clicks/sec at level 5, total 20/sec)
            gameState.prestigeAutoClickerSpeedBonus += effect.value;
        } else if (effect.type === 'allOreSpawnRate') {
            // Track total bonus for ALL ores
            allOreSpawnRateBonus += effect.value;
        } else if (effect.type === 'allOreSpawnChance') {
            // Track total bonus for ALL ores
            allOreSpawnChanceBonus += effect.value;
        } else if (effect.type === 'oreSpawnRate') {
            // Track total spawn rate bonus for this ore
            if (!prestigeBonuses[effect.oreId]) {
                prestigeBonuses[effect.oreId] = { spawnRate: 0, spawnChance: 0 };
            }
            prestigeBonuses[effect.oreId].spawnRate += effect.value;
        } else if (effect.type === 'spawnChance') {
            // Track total spawn chance bonus for this ore
            if (!prestigeBonuses[effect.oreId]) {
                prestigeBonuses[effect.oreId] = { spawnRate: 0, spawnChance: 0 };
            }
            prestigeBonuses[effect.oreId].spawnChance += effect.value;
        }
    });
    
    // Apply "all ore" bonuses to each ore (add them to the prestigeBonuses object)
    if (allOreSpawnRateBonus > 0 || allOreSpawnChanceBonus > 0) {
        Object.keys(gameState.unlockedOres).forEach(oreId => {
            const oreData = gameState.unlockedOres[oreId];
            if (oreData && oreData.unlocked) {
                if (!prestigeBonuses[oreId]) {
                    prestigeBonuses[oreId] = { spawnRate: 0, spawnChance: 0 };
                }
                prestigeBonuses[oreId].spawnRate += allOreSpawnRateBonus;
                prestigeBonuses[oreId].spawnChance += allOreSpawnChanceBonus;
            }
        });
    }
    
    // Now apply bonuses to each ore
    // IMPORTANT: Saved values already include prestige bonuses, so we need to reverse them first
    Object.keys(prestigeBonuses).forEach(oreId => {
        const oreData = gameState.unlockedOres[oreId];
        if (!oreData || !oreData.unlocked) return;
        
        const oreType = ORE_TYPES.find(o => o.id === oreId);
        if (!oreType) return;
        
        const bonus = prestigeBonuses[oreId];
        
        // For spawn rate: Reverse prestige to get shop-only rate, then reapply prestige
        // Saved: finalRate = shopRate * (1 - prestigeBonus)
        // Reverse: shopRate = finalRate / (1 - prestigeBonus)
        // Reapply: newFinalRate = shopRate * (1 - prestigeBonus)
        if (bonus.spawnRate > 0) {
            const savedRate = oreData.spawnRate;
            // Reverse prestige to get shop-only rate
            const shopOnlyRate = savedRate / (1 - bonus.spawnRate);
            // Clamp to base (shop can't make it worse than base)
            const baseRate = oreType.baseSpawnRate;
            const clampedShopRate = Math.min(shopOnlyRate, baseRate);
            // Reapply prestige
            oreData.spawnRate = Math.max(1000, clampedShopRate * (1 - bonus.spawnRate));
        }
        
        // For spawn chance: Reverse prestige to get shop-only chance, then reapply prestige
        // Saved: finalChance = baseChance + shopUpgrades + prestigeBonus
        // Reverse: shopUpgrades = finalChance - baseChance - prestigeBonus
        // Reapply: newFinalChance = baseChance + shopUpgrades + prestigeBonus
        if (bonus.spawnChance > 0) {
            const savedChance = oreData.spawnChance;
            const baseChance = oreType.baseSpawnChance;
            // Reverse prestige to get shop upgrade amount
            let shopUpgradeAmount = savedChance - baseChance - bonus.spawnChance;
            
            // If negative, saved value doesn't include prestige (shop-only)
            if (shopUpgradeAmount < 0) {
                shopUpgradeAmount = savedChance - baseChance;
            }
            
            // Reapply: base + shop upgrades + prestige
            oreData.spawnChance = Math.min(1.0, baseChance + Math.max(0, shopUpgradeAmount) + bonus.spawnChance);
        }
    });
    
    // Recalculate auto-clicker speed with prestige bonus
    recalculateAutoClickerSpeed();
}

// Apply starting bonuses
function applyStartingBonuses() {
    // Check for consolidated starting bonuses (new system)
    const startBonusesNode = gameState.prestigeNodes['start-bonuses'] || 0;
    if (startBonusesNode > 0) {
        // Apply all starting bonuses at once, but only if they're at 0 (don't override existing values)
        if (gameState.autoClickerLevel === 0) {
            gameState.autoClickerLevel = 1;
        }
        if (gameState.dwarves === 0) {
            gameState.dwarves = 1;
        }
        if (gameState.soldiers === 0) {
            gameState.soldiers = 1;
        }
        // Spawn efficiency from start-bonuses gives 10%
        // This is applied on top of any prestige spawn efficiency bonus
        gameState.oreSpawnEfficiency = Math.max(gameState.oreSpawnEfficiency || 0, 0.1);
    }
    
    // Apply spawn efficiency bonus from prestige node (separate from start-bonuses)
    // This is handled in applyPrestigeBonuses() which sets gameState.prestigeSpawnEfficiencyBonus
    
    // Legacy support for old individual nodes (for existing saves)
    const autoClickerNode = gameState.prestigeNodes['start-auto-clicker'] || 0;
    if (autoClickerNode > 0 && gameState.autoClickerLevel === 0) {
        gameState.autoClickerLevel = 1;
    }
    
    const dwarvesNode = gameState.prestigeNodes['start-dwarves'] || 0;
    if (dwarvesNode > 0) {
        // Only apply if current count is less than the node value
        gameState.dwarves = Math.max(gameState.dwarves, dwarvesNode);
        renderDwarves();
    }
    
    const soldiersNode = gameState.prestigeNodes['start-soldiers'] || 0;
    if (soldiersNode > 0) {
        // Only apply if current count is less than the node value
        gameState.soldiers = Math.max(gameState.soldiers, soldiersNode);
        renderSoldiers();
    }
    
    const efficiencyNode = gameState.prestigeNodes['start-spawn-efficiency'] || 0;
    if (efficiencyNode > 0) {
        gameState.oreSpawnEfficiency = Math.max(gameState.oreSpawnEfficiency, efficiencyNode * 0.1);
    }
    
    const minecartNode = gameState.prestigeNodes['start-minecart'] || 0;
    if (minecartNode > 0 && gameState.minecarts.length === 0) {
        gameState.minecarts.push({
            id: 0,
            items: 0,
            totalValue: 0,
            capacity: gameState.minecartCapacity,
            element: null,
            deliveryCooldownEnd: null
        });
        renderMinecarts();
    }
}

// Render prestige tree
function renderPrestigeTree() {
    const container = document.getElementById('prestige-tree');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Track which nodes we've rendered to avoid duplicates
    const renderedIds = new Set();
    
    function renderNode(nodeId) {
        // Skip if already rendered
        if (renderedIds.has(nodeId)) return;
        
        const node = PRESTIGE_NODES[nodeId];
        if (!node) return;
        
        // Check if node should be shown (root or requirements met)
        const isRoot = !node.requires || node.requires.length === 0;
        const isUnlocked = isRoot || isNodeUnlocked(nodeId);
        
        // Only render if unlocked
        if (!isUnlocked) return;
        
        // Mark as rendered immediately to prevent duplicates
        renderedIds.add(nodeId);
        
        const currentLevel = gameState.prestigeNodes[nodeId] || 0;
        const canBuy = canPurchaseNode(nodeId);
        const isMaxed = currentLevel >= node.maxLevel;
        
        const nodeEl = document.createElement('div');
        nodeEl.className = 'prestige-node';
        nodeEl.style.cssText = `
            padding: 15px;
            background: ${isMaxed ? '#2a5a2a' : '#2a2a2a'};
            border: 2px solid ${isMaxed ? '#4CAF50' : '#555'};
            border-radius: 5px;
            margin-left: 0px;
            margin-bottom: 10px;
            opacity: 1;
        `;
        
        const cost = isMaxed ? 'MAX' : (node.costPerLevel[currentLevel] || 0);
        const levelText = isMaxed ? `MAX (${currentLevel}/${node.maxLevel})` : `Level ${currentLevel}/${node.maxLevel}`;
        
        nodeEl.innerHTML = `
            <div style="margin-bottom: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                    <strong style="color: #ffd700">${node.name}</strong>
                    <div style="color: #ffd700; font-weight: bold;">${levelText}</div>
                </div>
                <div style="font-size: 0.85em; color: #aaa; margin-bottom: 3px; text-align: left;">${node.description}</div>
                ${!isMaxed ? `<div style="color: ${canBuy ? '#4CAF50' : '#888'}; font-size: 0.9em; text-align: left;">Cost: ${cost}</div>` : ''}
            </div>
            ${!isMaxed ? `
                <button class="shop-button prestige-node-buy" data-node-id="${nodeId}" 
                    style="width: 100%; margin-top: 5px;" ${canBuy ? '' : 'disabled'}>
                    ${canBuy ? 'Purchase' : 'Insufficient Currency'}
                </button>
            ` : ''}
        `;
        
        container.appendChild(nodeEl);
        
        // Add click handler for purchase button
        if (!isMaxed) {
            const buyBtn = nodeEl.querySelector('.prestige-node-buy');
            if (buyBtn) {
                buyBtn.addEventListener('click', () => {
                    if (purchasePrestigeNode(nodeId)) {
                        // Re-render tree to show updates
                        renderPrestigeTree();
                    }
                });
            }
        }
        
        // Render unlocked child nodes (only if parent is purchased)
        if (node.unlocks && currentLevel > 0) {
            node.unlocks.forEach(childId => {
                renderNode(childId);
            });
        }
    }
    
    // Find and render root nodes first
    const rootNodes = Object.keys(PRESTIGE_NODES).filter(id => {
        const node = PRESTIGE_NODES[id];
        return !node.requires || node.requires.length === 0;
    });
    
    // Render all root nodes (this will recursively render children)
    rootNodes.forEach(nodeId => {
        renderNode(nodeId);
    });
}

// Update prestige UI
function updatePrestigeUI() {
    const totalGoldEl = document.getElementById('total-gold-earned');
    const prestigeCurrencyEl = document.getElementById('prestige-currency');
    const prestigeCountEl = document.getElementById('prestige-count');
    const nextPrestigeEl = document.getElementById('next-prestige-gold');
    const remainingEl = document.getElementById('prestige-remaining');
    const prestigeBtn = document.getElementById('prestige-button');
    
    if (totalGoldEl) totalGoldEl.textContent = formatNumber(gameState.totalGoldEarned);
    if (prestigeCurrencyEl) prestigeCurrencyEl.textContent = gameState.prestigeCurrency;
    if (prestigeCountEl) prestigeCountEl.textContent = gameState.prestigeCount;
    
    const nextThreshold = getNextPrestigeThreshold();
    const remaining = Math.max(0, nextThreshold - gameState.totalGoldEarned);
    
    if (nextPrestigeEl) nextPrestigeEl.textContent = `Requires ${formatNumber(nextThreshold)} Gold`;
    
    if (nextPrestigeEl) nextPrestigeEl.textContent = formatNumber(nextThreshold);
    if (remainingEl) remainingEl.textContent = formatNumber(remaining);
    
    if (prestigeBtn) {
        const canPrestige = gameState.totalGoldEarned >= 100000; // 100k minimum (much easier)
        prestigeBtn.disabled = !canPrestige;
        const currencyGain = calculatePrestigeCurrency();
        prestigeBtn.textContent = canPrestige 
            ? `Prestige (Gain ${currencyGain} Currency)`
            : 'Prestige (Requires 100K Gold)';
    }
}

// Open prestige modal
function openPrestigeModal() {
    const modal = document.getElementById('prestige-modal');
    if (modal) {
        modal.style.display = 'flex';
        updatePrestigeUI();
        renderPrestigeTree();
    }
}

// Close prestige modal
function closePrestigeModal() {
    const modal = document.getElementById('prestige-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Perform prestige (reset game)
function performPrestige() {
    if (gameState.totalGoldEarned < 100000) {
        alert('You need at least 100K total gold earned to prestige!');
        return;
    }
    
    if (!confirm('Are you sure you want to prestige? This will reset your game but keep your prestige upgrades.')) {
        return;
    }
    
    // Calculate and add prestige currency
    const earnedCurrency = calculatePrestigeCurrency();
    gameState.prestigeCurrency += earnedCurrency;
    gameState.prestigeCount++;
    
    // Save prestige data before reset
    const savedPrestigeCurrency = gameState.prestigeCurrency;
    const savedPrestigeNodes = JSON.parse(JSON.stringify(gameState.prestigeNodes));
    const savedPrestigeCount = gameState.prestigeCount;
    
    // Reset everything except prestige
    gameState.gold = 0;
    gameState.totalGoldEarned = 0; // Reset for next prestige
    gameState.clickPower = 1;
    gameState.clickPowerPrice = 50;
    gameState.autoClickerLevel = 0;
    gameState.autoClickerSpeed = 1000; // 1 click per second
    gameState.autoClickerSpeedUpgrades = 0;
    gameState.autoClickerSpeedPrice = 150;
    gameState.autoClickerLastClick = 0;
    gameState.dwarves = 0;
    gameState.dwarfPrice = 25;
    gameState.dwarfSpeed = 1.5;
    gameState.dwarfSpeedPrice = 150;
    gameState.dwarfMiningSpeed = 2000;
    gameState.dwarfMiningSpeedPrice = 200;
    gameState.dwarfEntities = [];
    gameState.ores = [];
    gameState.unlockedOres = {};
    gameState.oreValueMultiplier = 1;
    gameState.oreValuePrice = 300;
    gameState.oreSpawnEfficiency = 0;
    gameState.oreSpawnEfficiencyPrice = 500;
    gameState.minecarts = [];
    gameState.minecartCapacity = 20;
    gameState.minecartPrice = 500;
    gameState.minecartCapacityPrice = 5000;
    gameState.minecartDeliverySpeed = 8000;
    gameState.minecartDeliverySpeedPrice = 800;
    gameState.minecartMaxHealth = 50;
    gameState.minecartTurrets = false;
    gameState.minecartTurretPrice = 5000000;
    gameState.coinsPerMinute = 0;
    gameState.totalClicks = 0;
    gameState.goldHistory = [];
    gameState.lastGoldCheck = Date.now();
    gameState.gamblePrice = 15000;
    gameState.slotMachineLuck = 0;
    gameState.slotMachineLuckPrice = 10000;
    gameState.goldMultiplier = 1;
    gameState.goldMultiplierEndTime = 0;
    gameState.moneyBagSpawnTime = 0;
    gameState.moneyBagElement = null;
    gameState.soldiers = 0;
    gameState.soldierPrice = 1000;
    gameState.soldierAttackPower = 20;
    gameState.soldierAttackPowerPrice = 500;
    gameState.soldierAttackSpeed = 500;
    gameState.soldierAttackSpeedPrice = 400;
    gameState.soldierSpeed = 2.5;
    gameState.soldierSpeedPrice = 600;
    gameState.soldierEntities = [];
    gameState.enemies = [];
    gameState.lastRandomEnemySpawn = 0;
    gameState.randomEnemySpawnInterval = 12000;
    gameState.nextHordeWaveTime = 0;
    gameState.lastHordeWaveTime = 0;
    gameState.hordeWaveActive = false;
    
    // Restore prestige data
    gameState.prestigeCurrency = savedPrestigeCurrency;
    gameState.prestigeNodes = savedPrestigeNodes;
    gameState.prestigeCount = savedPrestigeCount;
    
    // Reset prestige gold multiplier (will be recalculated by applyPrestigeBonuses)
    gameState.prestigeGoldMultiplier = 1;
    
    // Save the reset state BEFORE reinitializing
    saveGame();
    
    // Reinitialize ores (needed for applyPrestigeBonuses)
    ORE_TYPES.forEach(oreType => {
        if (!gameState.unlockedOres[oreType.id]) {
            const oreIndex = ORE_TYPES.findIndex(o => o.id === oreType.id);
            const baseValuePrice = 100 + (oreIndex * 200);
            const baseSpawnRatePrice = 200 + (oreIndex * 150);
            const baseSpawnChancePrice = 250 + (oreIndex * 200);
            
            gameState.unlockedOres[oreType.id] = {
                unlocked: false,
                spawnRate: oreType.baseSpawnRate,
                spawnChance: oreType.baseSpawnChance,
                lastSpawn: Date.now(),
                spawnRatePrice: baseSpawnRatePrice,
                spawnChancePrice: baseSpawnChancePrice,
                valueMultiplier: 1,
                valuePrice: baseValuePrice
            };
        }
    });
    
    // Only add starting minecart if prestige node says so, otherwise ensure at least one exists
    // (applyStartingBonuses will handle the prestige minecart)
    if (gameState.minecarts.length === 0) {
        gameState.minecarts.push({
            id: 0,
            items: 0,
            totalValue: 0,
            capacity: gameState.minecartCapacity,
            element: null,
            deliveryCooldownEnd: null
        });
    }
    
    // Initialize gold tracking
    gameState.goldHistory = [{ time: Date.now(), gold: gameState.gold }];
    gameState.lastGoldCheck = Date.now();
    
    // Schedule money bag spawn
    scheduleNextMoneyBag();
    
    // Initialize DOM cache
    initDOMCache();
    
    // Clear any existing enemies/soldiers from DOM first
    const enemiesContainer = document.getElementById('enemies-container');
    if (enemiesContainer) enemiesContainer.innerHTML = '';
    const soldiersContainer = document.getElementById('soldiers-container');
    if (soldiersContainer) soldiersContainer.innerHTML = '';
    
    // Clear ores from DOM
    const oresContainer = document.getElementById('ores-container');
    if (oresContainer) oresContainer.innerHTML = '';
    
    // Apply prestige bonuses (must be before rendering)
    applyPrestigeBonuses();
    applyStartingBonuses();
    
    // Re-render everything
    renderOreShop();
    renderAutoClickers();
    renderMinecarts();
    renderDwarves();
    renderSoldiers();
    
    // Close modal
    closePrestigeModal();
    
    // Update UI
    updateUI();
    updatePrestigeUI();
    
    // Schedule horde wave if enemies can spawn (soldiers or additional minecarts)
    const activeMinecarts = gameState.minecarts;
    const additionalMinecarts = activeMinecarts.filter(m => m.id !== 0);
    const canEnemiesSpawn = gameState.soldiers > 0 || additionalMinecarts.length >= 1;
    if (canEnemiesSpawn && gameState.nextHordeWaveTime === 0) {
        scheduleNextHordeWave();
    }
    
    saveGame();
    
    // Play prestige sound before alert
    playPrestigeSound();
    
    // Wait a moment for the sound to play, then show alert and reload
    setTimeout(() => {
        alert(`Prestiged! Gained ${earnedCurrency} prestige currency.`);
        window.location.reload(); // Refresh the page to ensure a clean state
    }, 500);
    
    // Refresh the page to ensure clean state after prestige
    location.reload();
}

// Format numbers
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    }
    return Math.floor(num).toString();
}

// Schedule next money bag spawn (random between 30 seconds and 5 minutes)
function scheduleNextMoneyBag() {
    const minDelay = 30000; // 30 seconds
    const maxDelay = 300000; // 5 minutes
    const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;
    gameState.moneyBagSpawnTime = Date.now() + randomDelay;
}

// Spawn money bag
function spawnMoneyBag() {
    // Remove existing money bag if any
    if (gameState.moneyBagElement) {
        gameState.moneyBagElement.remove();
        gameState.moneyBagElement = null;
    }
    
    const container = document.getElementById('mining-container');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    
    // Random position within playable area (with padding to avoid edges)
    const padding = 40;
    const x = Math.random() * (containerRect.width - padding * 2) + padding;
    const y = Math.random() * (containerRect.height - padding * 2) + padding;
    
    const moneyBag = document.createElement('div');
    moneyBag.className = 'money-bag';
    moneyBag.textContent = '💰';
    moneyBag.style.left = x + 'px';
    moneyBag.style.top = y + 'px';
    moneyBag.style.position = 'absolute';
    moneyBag.style.cursor = 'pointer';
    moneyBag.style.zIndex = '30';
    moneyBag.style.fontSize = '48px';
    moneyBag.style.transition = 'transform 0.2s';
    
    // Add click handler
    moneyBag.addEventListener('click', () => {
        // Apply prestige gold multiplier to money bag
        const moneyBagValue = Math.floor(10000 * gameState.prestigeGoldMultiplier);
        gameState.gold += moneyBagValue;
        gameState.totalGoldEarned += moneyBagValue; // Track for prestige
        trackGoldChange();
        showClickEffect(x, y, '+10K');
        moneyBag.remove();
        gameState.moneyBagElement = null;
        scheduleNextMoneyBag();
        updateUI();
        saveGame();
    });
    
    // Add hover effect
    moneyBag.addEventListener('mouseenter', () => {
        moneyBag.style.transform = 'scale(1.2)';
    });
    moneyBag.addEventListener('mouseleave', () => {
        moneyBag.style.transform = 'scale(1)';
    });
    
    container.appendChild(moneyBag);
    gameState.moneyBagElement = moneyBag;
}

// Update money bag spawning
function updateMoneyBagSpawning() {
    const now = Date.now();
    
    // Check if it's time to spawn a money bag
    if (gameState.moneyBagSpawnTime > 0 && now >= gameState.moneyBagSpawnTime) {
        // Only spawn if there isn't already one on screen
        if (!gameState.moneyBagElement || !gameState.moneyBagElement.parentNode) {
            spawnMoneyBag();
        }
        // Schedule next spawn
        scheduleNextMoneyBag();
    }
}

// Start multiplier visual effects (falling money and timer)
function startMultiplierEffects() {
    const container = document.getElementById('multiplier-effect-container');
    if (!container) return;
    
    container.style.display = 'block';
    
    // Start falling money animation
    startFallingMoney();
    
    // Update timer display
    updateMultiplierTimer();
}

// Stop multiplier visual effects
function stopMultiplierEffects() {
    const container = document.getElementById('multiplier-effect-container');
    if (container) {
        container.style.display = 'none';
    }
    
    // Clear any existing falling money intervals
    if (gameState.fallingMoneyInterval) {
        clearInterval(gameState.fallingMoneyInterval);
        gameState.fallingMoneyInterval = null;
    }
}

// Start falling money animation
function startFallingMoney() {
    const container = document.getElementById('mining-container');
    if (!container) return;
    
    // Clear any existing interval
    if (gameState.fallingMoneyInterval) {
        clearInterval(gameState.fallingMoneyInterval);
    }
    
    // Spawn falling money every 200ms
    gameState.fallingMoneyInterval = setInterval(() => {
        if (gameState.goldMultiplierEndTime <= Date.now()) {
            // Multiplier expired, stop spawning
            stopMultiplierEffects();
            return;
        }
        
        createFallingMoney(container);
    }, 200);
}

// Create a single falling money particle
function createFallingMoney(container) {
    const money = document.createElement('div');
    money.className = 'falling-money';
    money.textContent = '💰';
    
    // Random horizontal position
    const containerRect = container.getBoundingClientRect();
    const x = Math.random() * containerRect.width;
    money.style.left = x + 'px';
    money.style.top = '-50px';
    money.style.position = 'absolute';
    money.style.fontSize = (20 + Math.random() * 15) + 'px';
    money.style.zIndex = '35';
    money.style.pointerEvents = 'none';
    money.style.opacity = '0.8';
    
    // Random fall speed
    const fallSpeed = 2 + Math.random() * 3; // 2-5 seconds
    const finalY = containerRect.height + 50;
    
    money.style.transition = `top ${fallSpeed}s linear, opacity ${fallSpeed * 0.8}s ease-out`;
    
    container.appendChild(money);
    
    // Trigger animation
    requestAnimationFrame(() => {
        money.style.top = finalY + 'px';
        money.style.opacity = '0';
    });
    
    // Remove after animation
    setTimeout(() => {
        if (money.parentNode) {
            money.remove();
        }
    }, fallSpeed * 1000);
}

// Update multiplier timer display
function updateMultiplierTimer() {
    const timerEl = document.getElementById('multiplier-time');
    if (!timerEl) return;
    
    const now = Date.now();
    if (gameState.goldMultiplierEndTime > now) {
        const remaining = Math.ceil((gameState.goldMultiplierEndTime - now) / 1000);
        timerEl.textContent = remaining + 's';
    } else {
        timerEl.textContent = '0s';
        stopMultiplierEffects();
    }
}

// Calculate player progress for enemy scaling
function getPlayerProgress() {
    // Scale based on total gold earned, dwarves, minecarts, and soldiers
    const baseProgress = Math.log10(Math.max(1, gameState.gold + 1)) * 0.5;
    const dwarfProgress = gameState.dwarves * 0.1;
    const minecartProgress = gameState.minecarts.length * 0.2;
    const soldierProgress = gameState.soldiers * 0.15;
    return Math.max(0.5, baseProgress + dwarfProgress + minecartProgress + soldierProgress); // Min 0.5x scaling
}

// Schedule next horde wave
function scheduleNextHordeWave() {
    const now = Date.now();
    // First wait 5 minutes (cooldown), then roll random 1-7 minutes
    const cooldownDelay = gameState.hordeWaveCooldown; // 5 minutes
    const randomDelay = 60000 + Math.random() * 360000; // 1-7 minutes (in ms: 60k to 420k)
    gameState.nextHordeWaveTime = now + cooldownDelay + randomDelay;
    gameState.lastHordeWaveTime = now;
}

// Update horde timer display
function updateHordeTimer() {
    const timerEl = document.getElementById('horde-timer');
    const timeEl = document.getElementById('horde-time');
    if (!timerEl || !timeEl) return;
    
    // Check if enemies should spawn (player needs at least 1 soldier OR 2+ minecarts - first minecart doesn't count)
    const activeMinecarts = gameState.minecarts;
    // Only count minecarts beyond the first one (id !== 0)
    const additionalMinecarts = activeMinecarts.filter(m => m.id !== 0);
    const canEnemiesSpawn = gameState.soldiers > 0 || additionalMinecarts.length >= 1; // At least 1 soldier OR 1 minecart beyond the first
    
    // Hide timer if enemies can't spawn yet
    if (!canEnemiesSpawn) {
        timerEl.style.display = 'none';
        return;
    }
    
    const now = Date.now();
    
    // Check if we're in cooldown period (5 minutes after last horde)
    const timeSinceLastHorde = now - gameState.lastHordeWaveTime;
    const isInCooldown = gameState.lastHordeWaveTime > 0 && timeSinceLastHorde < gameState.hordeWaveCooldown;
    
    // Hide timer during cooldown - only show when horde is actually scheduled
    if (isInCooldown) {
        timerEl.style.display = 'none';
        return;
    }
    
    // Show countdown to next horde (only after cooldown)
    if (gameState.nextHordeWaveTime > now) {
        const timeLeft = gameState.nextHordeWaveTime - now;
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        timerEl.style.display = 'flex';
    } else if (gameState.nextHordeWaveTime > 0 && now >= gameState.nextHordeWaveTime) {
        // Timer hit 0 - show "Horde wave coming!" message
        timeEl.textContent = 'Horde wave coming!';
        timerEl.style.display = 'flex';
    } else {
        timerEl.style.display = 'none';
    }
}

// Spawn a random enemy
function spawnRandomEnemy() {
    const progress = getPlayerProgress();
    const totalWeight = ENEMY_TYPES.reduce((sum, type) => sum + type.spawnWeight, 0);
    let random = Math.random() * totalWeight;
    
    let selectedType = ENEMY_TYPES[0];
    for (const type of ENEMY_TYPES) {
        random -= type.spawnWeight;
        if (random <= 0) {
            selectedType = type;
            break;
        }
    }
    
    // Scale enemy stats based on progress
    const scaledHealth = Math.floor(selectedType.health * progress);
    const scaledSpeed = selectedType.speed * (0.8 + progress * 0.2); // Slight speed increase
    const scaledDamage = Math.floor(selectedType.damage * progress);
    
    spawnEnemy(selectedType, scaledHealth, scaledSpeed, scaledDamage);
}

// Spawn a horde enemy (with boosted stats)
function spawnHordeEnemy() {
    const progress = getPlayerProgress();
    const totalWeight = ENEMY_TYPES.reduce((sum, type) => sum + type.spawnWeight, 0);
    let random = Math.random() * totalWeight;
    
    let selectedType = ENEMY_TYPES[0];
    for (const type of ENEMY_TYPES) {
        random -= type.spawnWeight;
        if (random <= 0) {
            selectedType = type;
            break;
        }
    }
    
    // Horde enemies get 1.3x multiplier to health and damage
    const hordeMultiplier = 1.3;
    const scaledHealth = Math.floor(selectedType.health * progress * hordeMultiplier);
    const scaledSpeed = selectedType.speed * (0.8 + progress * 0.2); // Same speed scaling
    const scaledDamage = Math.floor(selectedType.damage * progress * hordeMultiplier);
    
    spawnEnemy(selectedType, scaledHealth, scaledSpeed, scaledDamage);
}

// Spawn an enemy
function spawnEnemy(type, health, speed, damage) {
    const container = document.getElementById('enemies-container');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    
    // Get all minecart positions to avoid spawning too close
    const minecartPositions = [];
    gameState.minecarts.forEach(minecart => {
        if (minecart.element) {
            const minecartRect = minecart.element.getBoundingClientRect();
            const mx = minecartRect.left - containerRect.left + minecartRect.width / 2;
            const my = minecartRect.top - containerRect.top + minecartRect.height / 2;
            minecartPositions.push({ x: mx, y: my });
        }
    });
    
    // Try to find a good spawn position (avoid minecarts, favor right/bottom-right)
    let x, y;
    let attempts = 0;
    const minDistanceFromMinecart = 150; // Minimum distance from minecarts
    
    do {
        // Favor right side (60% chance) and bottom-right (40% chance right, 30% chance bottom-right)
        const rand = Math.random();
        if (rand < 0.6) {
            // Right side (60% chance)
            x = containerRect.width + 30;
            y = Math.random() * containerRect.height;
        } else if (rand < 0.8) {
            // Bottom-right corner (20% chance)
            x = containerRect.width * 0.7 + Math.random() * containerRect.width * 0.3 + 30;
            y = containerRect.height + 30;
        } else if (rand < 0.9) {
            // Bottom edge (10% chance)
            x = containerRect.width * 0.5 + Math.random() * containerRect.width * 0.5;
            y = containerRect.height + 30;
        } else {
            // Top or left (10% chance, less preferred)
            const edge = Math.random() < 0.5 ? 0 : 3; // 0=top, 3=left
            if (edge === 0) {
                x = containerRect.width * 0.5 + Math.random() * containerRect.width * 0.5; // Favor right side of top
                y = -30;
            } else {
                x = -30;
                y = Math.random() * containerRect.height;
            }
        }
        
        // Check if position is far enough from all minecarts
        let tooClose = false;
        for (const minecartPos of minecartPositions) {
            const dist = Math.sqrt((x - minecartPos.x) ** 2 + (y - minecartPos.y) ** 2);
            if (dist < minDistanceFromMinecart) {
                tooClose = true;
                break;
            }
        }
        
        if (!tooClose) break;
        attempts++;
    } while (attempts < 20); // Try up to 20 times to find a good position
    
    // If we couldn't find a good position after 20 attempts, use the last one anyway
    
    const enemy = document.createElement('div');
    enemy.className = 'enemy';
    enemy.textContent = type.emoji;
    enemy.style.left = x + 'px';
    enemy.style.top = y + 'px';
    enemy.style.position = 'absolute';
    
    const enemyData = {
        id: Date.now() + Math.random(),
        element: enemy,
        type: type,
        x: x,
        y: y,
        health: health,
        maxHealth: health,
        speed: speed,
        damage: damage,
        targetMinecart: null,
        lastAttackTime: 0,
        attackCooldown: 2000 // Attack every 2 seconds
    };
    
    gameState.enemies.push(enemyData);
    container.appendChild(enemy);
}

// Spawn horde wave
function spawnHordeWave() {
    const progress = getPlayerProgress();
    const baseWaveSize = Math.floor(4 + progress * 2.5); // 4-10 enemies based on progress (increased from 3-8)
    // Scale wave size with soldiers (more soldiers = bigger waves)
    const soldierWaveBonus = Math.floor(gameState.soldiers / 1.5); // +1 enemy per 1.5 soldiers (increased from per 2)
    const waveSize = baseWaveSize + soldierWaveBonus;
    
    gameState.hordeWaveActive = true;
    gameState.lastHordeWaveTime = Date.now();
    // Clear the next horde time to prevent re-triggering
    gameState.nextHordeWaveTime = 0;
    
    // Show message briefly before spawning
    const timerEl = document.getElementById('horde-timer');
    const timeEl = document.getElementById('horde-time');
    if (timerEl && timeEl) {
        timeEl.textContent = 'Horde wave incoming!';
    }
    
    // Spawn enemies with slight delay after message
    setTimeout(() => {
        // Actually spawn the enemies
        for (let i = 0; i < waveSize; i++) {
            setTimeout(() => {
                // Spawn horde enemies with boosted stats
                spawnHordeEnemy();
            }, i * 500); // Stagger spawns
        }
        
        // Mark horde as complete after all enemies spawn and clear message
        setTimeout(() => {
            gameState.hordeWaveActive = false;
            // Clear the "Horde wave coming!" message
            const timeElAfter = document.getElementById('horde-time');
            if (timeElAfter) {
                timeElAfter.textContent = '';
            }
            // Schedule next horde after cooldown
            scheduleNextHordeWave();
        }, waveSize * 500 + 100); // Add small buffer
    }, 2000); // 2 second delay to show message
}

// Update horde wave system
function updateHordeWave() {
    const now = Date.now();
    
    // Check if enemies should spawn (player needs at least 1 soldier OR 2+ minecarts - first minecart doesn't count)
    // This must match updateHordeTimer() logic exactly!
    const activeMinecarts = gameState.minecarts;
    // Only count minecarts beyond the first one (id !== 0)
    const additionalMinecarts = activeMinecarts.filter(m => m.id !== 0);
    const canEnemiesSpawn = gameState.soldiers > 0 || additionalMinecarts.length >= 1; // At least 1 soldier OR 1 minecart beyond the first
    
    // Check if horde wave should spawn (only if not in cooldown and not already active)
    const timeSinceLastHorde = now - gameState.lastHordeWaveTime;
    const isInCooldown = gameState.lastHordeWaveTime > 0 && timeSinceLastHorde < gameState.hordeWaveCooldown;
    
    if (canEnemiesSpawn && !isInCooldown && !gameState.hordeWaveActive && gameState.nextHordeWaveTime > 0 && now >= gameState.nextHordeWaveTime) {
        spawnHordeWave();
    }
    
    // Spawn random enemies - scale spawn rate based on soldiers (slightly increased)
    // More soldiers = more frequent enemy spawns
    const soldierMultiplier = 1 + (gameState.soldiers * 0.15); // Each soldier adds 15% more spawn rate
    const baseInterval = 12000 + Math.random() * 15000; // 12-27 seconds base (increased from 10-22 for slower spawns)
    const adjustedInterval = baseInterval / soldierMultiplier; // Faster spawns with more soldiers
    
    if (canEnemiesSpawn && now - gameState.lastRandomEnemySpawn >= gameState.randomEnemySpawnInterval) {
        // Spawn enemies based on soldiers (aggressive)
        const enemyCount = Math.max(1, Math.floor(gameState.soldiers * 1.2)); // 1.2 enemies per 1 soldier (reduced from 1.5), min 1
        
        for (let i = 0; i < enemyCount; i++) {
            setTimeout(() => {
                spawnRandomEnemy();
            }, i * 300); // Stagger spawns slightly
        }
        
        gameState.lastRandomEnemySpawn = now;
        gameState.randomEnemySpawnInterval = adjustedInterval;
    }
}

// Update enemies
function updateEnemies() {
    const container = document.getElementById('enemies-container');
    if (!container) return;
    
    // Check if enemies should be active (player needs at least 1 soldier OR 2+ minecarts)
    const activeMinecarts = gameState.minecarts;
    const canEnemiesAttack = gameState.soldiers > 0 || activeMinecarts.length >= 2;
    
    // If enemies shouldn't attack yet, remove all existing enemies
    if (!canEnemiesAttack) {
        gameState.enemies.forEach(enemy => {
            if (enemy.element && enemy.element.parentNode) {
                enemy.element.remove();
            }
        });
        gameState.enemies = [];
        return;
    }
    
    const containerRect = container.getBoundingClientRect();
    
    gameState.enemies.forEach((enemy, index) => {
        if (!enemy.element || !enemy.element.parentNode) return;
        
        // Find nearest minecart - prioritize destroyable ones (not index 0)
        let nearestMinecart = null;
        let nearestDist = Infinity;
        let nearestDestroyableMinecart = null;
        let nearestDestroyableDist = Infinity;
        
        gameState.minecarts.forEach(minecart => {
            if (!minecart.element) return;
            
            const minecartRect = minecart.element.getBoundingClientRect();
            const minecartX = minecartRect.left - containerRect.left + minecartRect.width / 2;
            const minecartY = minecartRect.top - containerRect.top + minecartRect.height / 2;
            
            const dx = minecartX - enemy.x;
            const dy = minecartY - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Prioritize destroyable minecarts (id !== 0)
            if (minecart.id !== 0) {
                if (dist < nearestDestroyableDist) {
                    nearestDestroyableDist = dist;
                    nearestDestroyableMinecart = minecart;
                }
            }
            
            // Also track nearest overall (for fallback)
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestMinecart = minecart;
            }
        });
        
        // Prefer destroyable minecart, fall back to index 0 only if no others exist
        if (nearestDestroyableMinecart) {
            nearestMinecart = nearestDestroyableMinecart;
        }
        
        if (!nearestMinecart) return;
        
        // Recalculate minecart position for movement
        const minecartRect = nearestMinecart.element.getBoundingClientRect();
        const minecartX = minecartRect.left - containerRect.left + minecartRect.width / 2;
        const minecartY = minecartRect.top - containerRect.top + minecartRect.height / 2;
        
        const dx = minecartX - enemy.x;
        const dy = minecartY - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Move towards minecart
        if (dist > 30) {
            enemy.x += (dx / dist) * enemy.speed;
            enemy.y += (dy / dist) * enemy.speed;
            enemy.element.style.left = (enemy.x - 15) + 'px';
            enemy.element.style.top = (enemy.y - 15) + 'px';
        } else {
            // Attack minecart
            const now = Date.now();
            if (now - enemy.lastAttackTime >= enemy.attackCooldown) {
                enemy.lastAttackTime = now;
                
                // Steal 1-3 items from the minecart
                if (nearestMinecart.items > 0) {
                    const stealAmount = Math.min(nearestMinecart.items, 1 + Math.floor(Math.random() * 3));
                    nearestMinecart.items -= stealAmount;
                    
                    // Recalculate total value proportionally
                    if (nearestMinecart.items > 0) {
                        const valuePerItem = nearestMinecart.totalValue / (nearestMinecart.items + stealAmount);
                        nearestMinecart.totalValue = Math.floor(nearestMinecart.items * valuePerItem);
                    } else {
                        nearestMinecart.totalValue = 0;
                    }
                    
                    // Show steal notification
                    showDamageNumber(minecartX, minecartY, `-${stealAmount} items`, '#ffaa00');
                    minecartNeedsUpdate = true;
                }
            }
        }
    });
    
    // Clean up dead enemies
    gameState.enemies = gameState.enemies.filter(enemy => {
        if (enemy.health <= 0) {
            // Drop ore at enemy death location (if not already dropped by soldier/turret)
            // This handles cases where enemies die from other sources
            dropOreFromEnemy(enemy.x, enemy.y);
            
            if (enemy.element && enemy.element.parentNode) {
                enemy.element.remove();
            }
            return false;
        }
        return true;
    });
}

// Render soldiers
function renderSoldiers() {
    const container = document.getElementById('soldiers-container');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    
    // Get all active minecarts for scattering soldiers around them
    const activeMinecarts = gameState.minecarts.filter(m => m.element);
    
    // Only add new soldiers, don't reset existing ones
    while (gameState.soldierEntities.length < gameState.soldiers) {
        const soldier = document.createElement('div');
        soldier.className = 'soldier';
        soldier.textContent = '⚔️';
        
        // Scatter soldiers around minecarts
        let spawnX, spawnY;
        if (activeMinecarts.length > 0) {
            // Pick a random minecart
            const randomMinecart = activeMinecarts[Math.floor(Math.random() * activeMinecarts.length)];
            const minecartRect = randomMinecart.element.getBoundingClientRect();
            const minecartX = minecartRect.left - containerRect.left + minecartRect.width / 2;
            const minecartY = minecartRect.top - containerRect.top + minecartRect.height / 2;
            
            // Spawn in a circle around the minecart (radius 60-120px, random angle)
            const angle = Math.random() * Math.PI * 2;
            const radius = 60 + Math.random() * 60; // 60-120px from minecart
            spawnX = minecartX + Math.cos(angle) * radius;
            spawnY = minecartY + Math.sin(angle) * radius;
        } else {
            // Fallback if no minecarts
            spawnX = 50 + Math.random() * 100;
            spawnY = 50 + Math.random() * 100;
        }
        
        const soldierData = {
            element: soldier,
            x: spawnX,
            y: spawnY,
            targetEnemy: null,
            targetEnemyId: null, // Track which enemy this soldier is assigned to
            lastAttackTime: 0,
            homeX: spawnX, // Remember home position
            homeY: spawnY
        };
        
        soldier.style.left = (soldierData.x - 15) + 'px';
        soldier.style.top = (soldierData.y - 15) + 'px';
        soldier.style.position = 'absolute';
        
        gameState.soldierEntities.push(soldierData);
        container.appendChild(soldier);
    }
    
    // Remove excess soldiers if count decreased
    while (gameState.soldierEntities.length > gameState.soldiers) {
        const removed = gameState.soldierEntities.pop();
        if (removed.element) {
            removed.element.remove();
        }
    }
}

// Update soldiers
function updateSoldiers() {
    if (gameState.soldiers === 0) return;
    
    const container = document.getElementById('soldiers-container');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    
    // Get all alive enemies
    const aliveEnemies = gameState.enemies.filter(e => e.element && e.health > 0);
    const aliveSoldiers = gameState.soldierEntities.filter(s => s.element);
    
    // If no enemies, return all soldiers to home
    if (aliveEnemies.length === 0) {
        aliveSoldiers.forEach(soldier => {
            if (!soldier.element) return;
            
            let soldierX = soldier.x;
            let soldierY = soldier.y;
            
            if (soldierX === undefined || soldierY === undefined) {
                const soldierRect = soldier.element.getBoundingClientRect();
                soldierX = soldierRect.left - containerRect.left + soldierRect.width / 2;
                soldierY = soldierRect.top - containerRect.top + soldierRect.height / 2;
                soldier.x = soldierX;
                soldier.y = soldierY;
            }
            
            const homeX = soldier.homeX || soldierX;
            const homeY = soldier.homeY || soldierY;
            
            const dx = homeX - soldierX;
            const dy = homeY - soldierY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 30) {
                const speed = gameState.soldierSpeed * 0.7;
                soldier.x += (dx / dist) * speed;
                soldier.y += (dy / dist) * speed;
                soldier.element.style.left = (soldier.x - 15) + 'px';
                soldier.element.style.top = (soldier.y - 15) + 'px';
            }
            
            soldier.targetEnemy = null;
            soldier.targetEnemyId = null;
        });
        return;
    }
    
    // Split soldiers: some stay at base to defend, some go out to attack
    // 40% stay at base, 60% go out to attack
    const baseDefendersRatio = 0.4;
    const baseDefenderCount = Math.max(1, Math.floor(aliveSoldiers.length * baseDefendersRatio));
    const attackingSoldiers = aliveSoldiers.slice(0, aliveSoldiers.length - baseDefenderCount);
    const defendingSoldiers = aliveSoldiers.slice(aliveSoldiers.length - baseDefenderCount);
    
    // Get minecart positions for base defenders
    const activeMinecarts = gameState.minecarts.filter(m => m.element);
    
    // Assign attacking soldiers to enemies (evenly distribute)
    if (attackingSoldiers.length > 0 && aliveEnemies.length > 0) {
        const soldiersPerEnemy = Math.floor(attackingSoldiers.length / aliveEnemies.length);
        const extraSoldiers = attackingSoldiers.length % aliveEnemies.length;
        
        const enemySoldierCounts = new Map();
        aliveEnemies.forEach(enemy => {
            enemySoldierCounts.set(enemy.id, soldiersPerEnemy + (enemySoldierCounts.size < extraSoldiers ? 1 : 0));
        });
        
        const enemyAssignments = new Map();
        aliveEnemies.forEach(enemy => {
            enemyAssignments.set(enemy.id, []);
        });
        
        // Validate existing assignments for attacking soldiers
        attackingSoldiers.forEach(soldier => {
            if (soldier.targetEnemyId) {
                const targetEnemy = aliveEnemies.find(e => e.id === soldier.targetEnemyId);
                if (targetEnemy) {
                    const assigned = enemyAssignments.get(targetEnemy.id);
                    if (assigned && assigned.length < enemySoldierCounts.get(targetEnemy.id)) {
                        assigned.push(soldier);
                        return;
                    }
                }
                soldier.targetEnemy = null;
                soldier.targetEnemyId = null;
            }
        });
        
        // Assign unassigned attacking soldiers
        const unassignedAttackers = attackingSoldiers.filter(s => !s.targetEnemyId);
        unassignedAttackers.forEach(soldier => {
            let bestEnemy = null;
            let minAssigned = Infinity;
            
            aliveEnemies.forEach(enemy => {
                const assigned = enemyAssignments.get(enemy.id);
                const assignedCount = assigned ? assigned.length : 0;
                const maxAllowed = enemySoldierCounts.get(enemy.id);
                
                if (assignedCount < maxAllowed && assignedCount < minAssigned) {
                    minAssigned = assignedCount;
                    bestEnemy = enemy;
                }
            });
            
            if (bestEnemy) {
                const assigned = enemyAssignments.get(bestEnemy.id);
                if (!assigned) {
                    enemyAssignments.set(bestEnemy.id, [soldier]);
                } else {
                    assigned.push(soldier);
                }
                soldier.targetEnemy = bestEnemy;
                soldier.targetEnemyId = bestEnemy.id;
            }
        });
    }
    
    // Base defenders: clear enemy assignments, they'll defend nearby
    defendingSoldiers.forEach(soldier => {
        soldier.targetEnemy = null;
        soldier.targetEnemyId = null;
    });
    
    // Now update each soldier's behavior
    aliveSoldiers.forEach(soldier => {
        if (!soldier.element) return;
        
        // Get current position
        let soldierX = soldier.x;
        let soldierY = soldier.y;
        
        if (soldierX === undefined || soldierY === undefined) {
            const soldierRect = soldier.element.getBoundingClientRect();
            soldierX = soldierRect.left - containerRect.left + soldierRect.width / 2;
            soldierY = soldierRect.top - containerRect.top + soldierRect.height / 2;
            soldier.x = soldierX;
            soldier.y = soldierY;
        }
        
        if (soldier.targetEnemyId) {
            const targetEnemy = aliveEnemies.find(e => e.id === soldier.targetEnemyId);
            
            if (targetEnemy && targetEnemy.element && targetEnemy.health > 0) {
                const dx = targetEnemy.x - soldierX;
                const dy = targetEnemy.y - soldierY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 40) {
                    // Move towards enemy
                    const speed = gameState.soldierSpeed;
                    soldier.x += (dx / dist) * speed;
                    soldier.y += (dy / dist) * speed;
                    soldier.element.style.left = (soldier.x - 15) + 'px';
                    soldier.element.style.top = (soldier.y - 15) + 'px';
                } else {
                    // Attack enemy
                    const now = Date.now();
                    if (now - soldier.lastAttackTime >= gameState.soldierAttackSpeed) {
                        soldier.lastAttackTime = now;
                        
                        targetEnemy.health -= gameState.soldierAttackPower;
                        
                        // Show damage number
                        showDamageNumber(targetEnemy.x, targetEnemy.y, `-${gameState.soldierAttackPower}`, '#4CAF50');
                        
                        // Check if enemy is dead (will be handled in next update cycle)
                        if (targetEnemy.health <= 0) {
                            // Drop ore at enemy death location
                            dropOreFromEnemy(targetEnemy.x, targetEnemy.y);
                            
                            // Play enemy kill sound
                            playEnemyKillSound();
                            
                            if (targetEnemy.element && targetEnemy.element.parentNode) {
                                targetEnemy.element.remove();
                            }
                            gameState.enemies = gameState.enemies.filter(e => e.id !== targetEnemy.id);
                            soldier.targetEnemy = null;
                            soldier.targetEnemyId = null;
                        }
                    }
                }
            } else {
                // Target is dead or invalid, clear assignment (will be reassigned next cycle)
                soldier.targetEnemy = null;
                soldier.targetEnemyId = null;
            }
        } else {
            // No target - this is a base defender or returning attacker
            // Base defenders patrol near minecarts and attack enemies that get close
            const isBaseDefender = defendingSoldiers.includes(soldier);
            
            if (isBaseDefender && activeMinecarts.length > 0) {
                // Base defender: patrol near minecarts and attack nearby enemies
                // Find nearest enemy within defense range (200px)
                let nearestEnemy = null;
                let nearestDist = 200; // Defense range
                
                aliveEnemies.forEach(enemy => {
                    if (!enemy.element) return;
                    const dx = enemy.x - soldierX;
                    const dy = enemy.y - soldierY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestEnemy = enemy;
                    }
                });
                
                if (nearestEnemy) {
                    // Attack nearby enemy
                    const dx = nearestEnemy.x - soldierX;
                    const dy = nearestEnemy.y - soldierY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist > 40) {
                        // Move towards nearby enemy
                        const speed = gameState.soldierSpeed;
                        soldier.x += (dx / dist) * speed;
                        soldier.y += (dy / dist) * speed;
                        soldier.element.style.left = (soldier.x - 15) + 'px';
                        soldier.element.style.top = (soldier.y - 15) + 'px';
                    } else {
                        // Attack
                        const now = Date.now();
                        if (now - soldier.lastAttackTime >= gameState.soldierAttackSpeed) {
                            soldier.lastAttackTime = now;
                            nearestEnemy.health -= gameState.soldierAttackPower;
                            showDamageNumber(nearestEnemy.x, nearestEnemy.y, `-${gameState.soldierAttackPower}`, '#4CAF50');
                            
                            if (nearestEnemy.health <= 0) {
                                // Drop ore at enemy death location
                                dropOreFromEnemy(nearestEnemy.x, nearestEnemy.y);
                                
                                if (nearestEnemy.element && nearestEnemy.element.parentNode) {
                                    nearestEnemy.element.remove();
                                }
                                gameState.enemies = gameState.enemies.filter(e => e.id !== nearestEnemy.id);
                            }
                        }
                    }
                } else {
                    // No nearby enemies, patrol near minecarts
                    const nearestMinecart = activeMinecarts.reduce((nearest, minecart) => {
                        const minecartRect = minecart.element.getBoundingClientRect();
                        const mx = minecartRect.left - containerRect.left + minecartRect.width / 2;
                        const my = minecartRect.top - containerRect.top + minecartRect.height / 2;
                        const dist = Math.sqrt(Math.pow(mx - soldierX, 2) + Math.pow(my - soldierY, 2));
                        if (!nearest || dist < nearest.dist) {
                            return { minecart, x: mx, y: my, dist };
                        }
                        return nearest;
                    }, null);
                    
                    if (nearestMinecart && Math.sqrt(nearestMinecart.distSq) > 80) {
                        // Move towards nearest minecart
                        const dx = nearestMinecart.x - soldierX;
                        const dy = nearestMinecart.y - soldierY;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const speed = gameState.soldierSpeed * 0.5; // Slower patrol speed
                        soldier.x += (dx / dist) * speed;
                        soldier.y += (dy / dist) * speed;
                        soldier.element.style.left = (soldier.x - 15) + 'px';
                        soldier.element.style.top = (soldier.y - 15) + 'px';
                    }
                }
            } else {
                // Returning attacker: go back to home position
                const homeX = soldier.homeX || soldierX;
                const homeY = soldier.homeY || soldierY;
                
                const dx = homeX - soldierX;
                const dy = homeY - soldierY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 30) {
                    const speed = gameState.soldierSpeed * 0.7;
                    soldier.x += (dx / dist) * speed;
                    soldier.y += (dy / dist) * speed;
                    soldier.element.style.left = (soldier.x - 15) + 'px';
                    soldier.element.style.top = (soldier.y - 15) + 'px';
                }
            }
        }
    });
}

// Update auto-repair bot

// Update minecart turrets
function updateMinecartTurrets() {
    if (!gameState.minecartTurrets) return;
    
    const container = domCache.miningContainer || document.getElementById('mining-container');
    if (!container) return;
    
    const containerRect = getCachedContainerRect('mining') || container.getBoundingClientRect();
    const now = Date.now();
    
    gameState.minecarts.forEach(minecart => {
        if (!minecart.element) return;
        
        // Initialize last turret shot time
        if (!minecart.lastTurretShot) {
            minecart.lastTurretShot = 0;
        }
        
        const minecartRect = minecart.element.getBoundingClientRect();
        const minecartX = minecartRect.left - containerRect.left + minecartRect.width / 2;
        const minecartY = minecartRect.top - containerRect.top + minecartRect.height / 2;
        
        // Find nearest enemy within turret range (200px)
        let nearestEnemy = null;
        let nearestDist = 200;
        
        gameState.enemies.forEach(enemy => {
            if (!enemy.element || enemy.health <= 0) return;
            
            const dx = enemy.x - minecartX;
            const dy = enemy.y - minecartY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = enemy;
            }
        });
        
        // Shoot at enemy if in range and cooldown ready
        if (nearestEnemy && now - minecart.lastTurretShot >= 1000) { // 1 second cooldown
            minecart.lastTurretShot = now;
            
            // Create projectile
            createTurretProjectile(minecartX, minecartY, nearestEnemy.x, nearestEnemy.y, nearestEnemy);
        }
    });
}

// Create turret projectile
function createTurretProjectile(startX, startY, targetX, targetY, targetEnemy) {
    const container = document.getElementById('mining-container');
    if (!container) return;
    
    const projectile = document.createElement('div');
    projectile.textContent = '⚡';
    projectile.style.position = 'absolute';
    projectile.style.left = startX + 'px';
    projectile.style.top = startY + 'px';
    projectile.style.fontSize = '20px';
    projectile.style.pointerEvents = 'none';
    projectile.style.zIndex = '50';
    projectile.style.filter = 'drop-shadow(2px 2px 4px rgba(255, 255, 0, 0.8))';
    
    container.appendChild(projectile);
    
    // Animate projectile
    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.min(500, dist / 2); // Speed based on distance, max 500ms
    
    let startTime = Date.now();
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        
        const currentX = startX + (dx * progress);
        const currentY = startY + (dy * progress);
        projectile.style.left = currentX + 'px';
        projectile.style.top = currentY + 'px';
        
        if (progress < 1 && targetEnemy.element && targetEnemy.health > 0) {
            requestAnimationFrame(animate);
        } else {
            // Hit enemy
            if (targetEnemy.element && targetEnemy.health > 0) {
                const turretDamage = 10; // Base turret damage
                targetEnemy.health -= turretDamage;
                showDamageNumber(targetEnemy.x, targetEnemy.y, `-${turretDamage}`, '#FFD700');
                
                if (targetEnemy.health <= 0) {
                    // Drop ore at enemy death location
                    dropOreFromEnemy(targetEnemy.x, targetEnemy.y);
                    
                    if (targetEnemy.element && targetEnemy.element.parentNode) {
                        targetEnemy.element.remove();
                    }
                    gameState.enemies = gameState.enemies.filter(e => e.id !== targetEnemy.id);
                }
            }
            
            projectile.remove();
        }
    };
    requestAnimationFrame(animate);
}

// Show damage number
function showDamageNumber(x, y, text, color) {
    const container = document.getElementById('mining-container');
    if (!container) return;
    
    const damage = document.createElement('div');
    damage.textContent = text;
    damage.style.position = 'absolute';
    damage.style.left = x + 'px';
    damage.style.top = y + 'px';
    damage.style.color = color;
    damage.style.fontSize = '20px';
    damage.style.fontWeight = 'bold';
    damage.style.pointerEvents = 'none';
    damage.style.zIndex = '100';
    damage.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
    
    container.appendChild(damage);
    
    // Animate
    let startY = y;
    let opacity = 1;
    const animate = () => {
        startY -= 2;
        opacity -= 0.02;
        damage.style.top = startY + 'px';
        damage.style.opacity = opacity;
        
        if (opacity > 0) {
            requestAnimationFrame(animate);
        } else {
            if (damage.parentNode) {
                damage.remove();
            }
        }
    };
    requestAnimationFrame(animate);
}

// Performance optimization: Cache DOM references
const domCache = {
    miningContainer: null,
    enemiesContainer: null,
    soldiersContainer: null,
    minecartsContainer: null,
    dwarvesContainer: null
};

// Initialize DOM cache
function initDOMCache() {
    domCache.miningContainer = document.getElementById('mining-container');
    domCache.enemiesContainer = document.getElementById('enemies-container');
    domCache.soldiersContainer = document.getElementById('soldiers-container');
    domCache.minecartsContainer = document.getElementById('minecarts-container');
    domCache.dwarvesContainer = document.getElementById('dwarves-container');
}

// Cache for container rects (updated less frequently)
let cachedContainerRects = {
    mining: null,
    enemies: null,
    soldiers: null,
    minecarts: null,
    dwarves: null,
    lastUpdate: 0
};

// Update cached rects (only every 100ms to avoid layout thrashing)
function getCachedContainerRect(containerName) {
    const now = Date.now();
    if (now - cachedContainerRects.lastUpdate > 100) {
        if (domCache.miningContainer) cachedContainerRects.mining = domCache.miningContainer.getBoundingClientRect();
        if (domCache.enemiesContainer) cachedContainerRects.enemies = domCache.enemiesContainer.getBoundingClientRect();
        if (domCache.soldiersContainer) cachedContainerRects.soldiers = domCache.soldiersContainer.getBoundingClientRect();
        if (domCache.minecartsContainer) cachedContainerRects.minecarts = domCache.minecartsContainer.getBoundingClientRect();
        if (domCache.dwarvesContainer) cachedContainerRects.dwarves = domCache.dwarvesContainer.getBoundingClientRect();
        cachedContainerRects.lastUpdate = now;
    }
    return cachedContainerRects[containerName];
}

// Throttle updateUI to reduce DOM manipulation
let lastUIUpdate = 0;
const UI_UPDATE_INTERVAL = 100; // Update UI every 100ms instead of every frame

// Throttle renderMinecarts - only update when needed
let lastMinecartRender = 0;
let minecartNeedsUpdate = false;
const MINECART_RENDER_INTERVAL = 3000; // Update minecarts every 3000ms (3 seconds) to prevent button flashing

// Helper: squared distance (faster than Math.sqrt)
function distSquared(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
}

// Game loop - optimized
function startGameLoop() {
    let lastFrameTime = performance.now();
    
    function gameLoop(currentTime) {
        const deltaTime = currentTime - lastFrameTime;
        lastFrameTime = currentTime;
        
        // Core game logic (every frame for smooth movement)
        updateAutoClickers();
        updateOreSpawning();
        updateDwarves();
        updateMoneyBagSpawning();
        updateMultiplierTimer();
        updateEnemies();
        updateSoldiers();
        updateMinecartTurrets();
        updateHordeWave();
        
        // Update delivery progress bars smoothly (every frame when on cooldown)
        updateMinecartDeliveryBars();
        
        // Throttled updates (less frequent)
        if (currentTime - lastMinecartRender >= MINECART_RENDER_INTERVAL || minecartNeedsUpdate) {
            renderMinecarts();
            lastMinecartRender = currentTime;
            minecartNeedsUpdate = false;
        }
        
        if (currentTime - lastUIUpdate >= UI_UPDATE_INTERVAL) {
            updateUI();
            // Live update prestige modal if it's open
            const prestigeModal = document.getElementById('prestige-modal');
            if (prestigeModal && prestigeModal.style.display === 'flex') {
                updatePrestigeUI();
            }
            lastUIUpdate = currentTime;
        }
        
        requestAnimationFrame(gameLoop);
    }
    
    requestAnimationFrame(gameLoop);
}

// Save/Load
function saveGame() {
    const saveData = {
        gold: gameState.gold,
        clickPower: gameState.clickPower,
        clickPowerPrice: gameState.clickPowerPrice,
        autoClickerLevel: gameState.autoClickerLevel,
        autoClickerLastClick: gameState.autoClickerLastClick,
        autoClickerSpeed: gameState.autoClickerSpeed,
        autoClickerSpeedUpgrades: gameState.autoClickerSpeedUpgrades,
        autoClickerSpeedPrice: gameState.autoClickerSpeedPrice,
        dwarves: gameState.dwarves,
        dwarfPrice: gameState.dwarfPrice,
        dwarfSpeed: gameState.dwarfSpeed,
        dwarfSpeedPrice: gameState.dwarfSpeedPrice,
        dwarfMiningSpeed: gameState.dwarfMiningSpeed,
        dwarfMiningSpeedPrice: gameState.dwarfMiningSpeedPrice,
        unlockedOres: gameState.unlockedOres,
        oreValueMultiplier: gameState.oreValueMultiplier,
        oreValuePrice: gameState.oreValuePrice,
        oreSpawnEfficiency: gameState.oreSpawnEfficiency,
        oreSpawnEfficiencyPrice: gameState.oreSpawnEfficiencyPrice,
        minecarts: gameState.minecarts.length,
        minecartData: gameState.minecarts.map(m => ({
            items: m.items,
            totalValue: m.totalValue,
            capacity: m.capacity,
            deliveryCooldownEnd: m.deliveryCooldownEnd
        })),
        minecartCapacity: gameState.minecartCapacity,
        minecartPrice: gameState.minecartPrice,
        minecartCapacityPrice: gameState.minecartCapacityPrice,
        minecartDeliverySpeed: gameState.minecartDeliverySpeed,
        minecartDeliverySpeedPrice: gameState.minecartDeliverySpeedPrice,
        minecartTurrets: gameState.minecartTurrets,
        minecartTurretPrice: gameState.minecartTurretPrice,
        gamblePrice: gameState.gamblePrice,
        slotMachineLuck: gameState.slotMachineLuck,
        slotMachineLuckPrice: gameState.slotMachineLuckPrice,
        goldMultiplier: gameState.goldMultiplier,
        goldMultiplierEndTime: gameState.goldMultiplierEndTime,
        moneyBagSpawnTime: gameState.moneyBagSpawnTime,
        soldiers: gameState.soldiers,
        soldierPrice: gameState.soldierPrice,
        soldierAttackPower: gameState.soldierAttackPower,
        soldierAttackPowerPrice: gameState.soldierAttackPowerPrice,
        soldierAttackSpeed: gameState.soldierAttackSpeed,
        soldierAttackSpeedPrice: gameState.soldierAttackSpeedPrice,
        soldierSpeed: gameState.soldierSpeed,
        soldierSpeedPrice: gameState.soldierSpeedPrice,
        nextHordeWaveTime: gameState.nextHordeWaveTime,
        lastHordeWaveTime: gameState.lastHordeWaveTime,
        hordeWaveActive: gameState.hordeWaveActive,
        lastRandomEnemySpawn: gameState.lastRandomEnemySpawn,
        randomEnemySpawnInterval: gameState.randomEnemySpawnInterval,
        totalGoldEarned: gameState.totalGoldEarned,
        prestigeCurrency: gameState.prestigeCurrency,
        prestigeNodes: gameState.prestigeNodes,
        prestigeCount: gameState.prestigeCount,
        prestigeGoldMultiplier: gameState.prestigeGoldMultiplier,
        volume: gameState.volume
    };
    localStorage.setItem('miningGame', JSON.stringify(saveData));
}

function loadGame() {
    const saved = localStorage.getItem('miningGame');
    if (saved) {
        const savedState = JSON.parse(saved);
        gameState.gold = savedState.gold || 0;
        gameState.clickPower = savedState.clickPower || 1;
        gameState.clickPowerPrice = savedState.clickPowerPrice || 50;
        // Migrate from old auto-clicker system if needed
        if (savedState.autoClickers && savedState.autoClickers.length > 0) {
            // Old system had multiple clickers, migrate to new single clicker
            gameState.autoClickerLevel = 1;
            gameState.autoClickerLastClick = Date.now();
        } else {
            gameState.autoClickerLevel = savedState.autoClickerLevel || 0;
            gameState.autoClickerLastClick = savedState.autoClickerLastClick || 0;
        }
        // Load speed upgrades count, or calculate from old speed value
        if (savedState.autoClickerSpeedUpgrades !== undefined) {
            gameState.autoClickerSpeedUpgrades = savedState.autoClickerSpeedUpgrades;
        } else {
            // Migration: calculate upgrade count from old speed value
            // Old system: 2000ms base, -100ms per upgrade
            // New system: 1000ms base, +0.5 clicks/sec per upgrade
            const oldSpeed = savedState.autoClickerSpeed || 2000;
            if (oldSpeed < 2000) {
                // Had upgrades in old system, estimate upgrade count
                const oldUpgrades = Math.floor((2000 - oldSpeed) / 100);
                gameState.autoClickerSpeedUpgrades = oldUpgrades;
            } else {
                gameState.autoClickerSpeedUpgrades = 0;
            }
        }
        // Recalculate speed (prestige bonus will be applied after applyPrestigeBonuses)
        recalculateAutoClickerSpeed();
        gameState.autoClickerSpeedPrice = savedState.autoClickerSpeedPrice || 150;
        gameState.dwarves = savedState.dwarves || 0;
        gameState.dwarfPrice = savedState.dwarfPrice || 25;
        gameState.dwarfSpeed = savedState.dwarfSpeed || 1.5;
        gameState.dwarfSpeedPrice = savedState.dwarfSpeedPrice || 150;
        gameState.dwarfMiningSpeed = savedState.dwarfMiningSpeed || 2000;
        gameState.dwarfMiningSpeedPrice = savedState.dwarfMiningSpeedPrice || 200;
        // Reset dwarf entities on load (they'll be recreated)
        gameState.dwarfEntities = [];
        gameState.unlockedOres = savedState.unlockedOres || {};
        gameState.oreValueMultiplier = savedState.oreValueMultiplier || 1;
        gameState.oreValuePrice = savedState.oreValuePrice || 300;
        // Migrate old truck data to minecart
        gameState.minecartCapacity = savedState.minecartCapacity || savedState.truckCapacity || 20;
        gameState.minecartPrice = savedState.minecartPrice || savedState.truckPrice || 500;
        gameState.minecartCapacityPrice = savedState.minecartCapacityPrice || savedState.truckCapacityPrice || 5000;
        gameState.minecartDeliverySpeed = savedState.minecartDeliverySpeed || savedState.minecartDeliveryCooldown || 8000;
        gameState.minecartDeliverySpeedPrice = savedState.minecartDeliverySpeedPrice || 800;
        gameState.minecartTurrets = savedState.minecartTurrets || false;
        gameState.minecartTurretPrice = savedState.minecartTurretPrice || 5000000;
        gameState.oreSpawnEfficiency = savedState.oreSpawnEfficiency || 0;
        gameState.oreSpawnEfficiencyPrice = savedState.oreSpawnEfficiencyPrice || 500;
        gameState.gamblePrice = savedState.gamblePrice || 15000;
        gameState.slotMachineLuck = savedState.slotMachineLuck || 0;
        gameState.slotMachineLuckPrice = savedState.slotMachineLuckPrice || 10000;
        gameState.goldMultiplier = savedState.goldMultiplier || 1;
        gameState.goldMultiplierEndTime = savedState.goldMultiplierEndTime || 0;
        gameState.moneyBagSpawnTime = savedState.moneyBagSpawnTime || 0;
        
        // Check if multiplier expired on load
        if (gameState.goldMultiplierEndTime > 0 && Date.now() >= gameState.goldMultiplierEndTime) {
            gameState.goldMultiplier = 1;
            gameState.goldMultiplierEndTime = 0;
            stopMultiplierEffects();
        } else if (gameState.goldMultiplierEndTime > 0 && gameState.goldMultiplier > 1) {
            // Multiplier is still active, restart effects
            startMultiplierEffects();
        }
        
        // If money bag spawn time is in the past or 0, schedule a new one
        if (gameState.moneyBagSpawnTime === 0 || Date.now() >= gameState.moneyBagSpawnTime) {
            scheduleNextMoneyBag();
        }
        
        // Load minecarts (migrate from trucks if needed)
        const minecartCount = savedState.minecarts || savedState.trucks || 0;
        if (savedState.minecartData && savedState.minecartData.length > 0) {
            // Load saved minecart data
            savedState.minecartData.forEach((data, i) => {
                gameState.minecarts.push({
                    id: i,
                    items: data.items || 0,
                    totalValue: data.totalValue || 0,
                    capacity: data.capacity || gameState.minecartCapacity,
                    element: null,
                    deliveryCooldownEnd: data.deliveryCooldownEnd || null,
                });
            });
        } else {
            // Legacy loading - create new minecarts
            for (let i = 0; i < minecartCount; i++) {
                gameState.minecarts.push({
                    id: i,
                    items: 0,
                    totalValue: 0,
                    capacity: gameState.minecartCapacity,
                    element: null,
                    deliveryCooldownEnd: null
                });
            }
        }
        
        // Update all existing minecarts to use the current capacity (in case it was upgraded)
        gameState.minecarts.forEach(minecart => {
            minecart.capacity = gameState.minecartCapacity;
        });
        
        // Combat system
        gameState.soldiers = savedState.soldiers || 0;
        gameState.soldierPrice = savedState.soldierPrice || 1000;
        gameState.soldierAttackPower = savedState.soldierAttackPower || 5;
        gameState.soldierAttackPowerPrice = savedState.soldierAttackPowerPrice || 200;
        gameState.soldierAttackSpeed = savedState.soldierAttackSpeed || 500;
        gameState.soldierAttackSpeedPrice = savedState.soldierAttackSpeedPrice || 400;
        gameState.soldierSpeed = savedState.soldierSpeed || 2.5;
        gameState.soldierSpeedPrice = savedState.soldierSpeedPrice || 600;
        gameState.soldierEntities = [];
        gameState.enemies = [];
        gameState.nextHordeWaveTime = savedState.nextHordeWaveTime || 0;
        gameState.lastHordeWaveTime = savedState.lastHordeWaveTime || 0;
        gameState.hordeWaveActive = savedState.hordeWaveActive || false;
        gameState.lastRandomEnemySpawn = savedState.lastRandomEnemySpawn || 0;
        gameState.randomEnemySpawnInterval = savedState.randomEnemySpawnInterval || 12000;
        
        // Prestige system
        // Always load totalGoldEarned from save if it exists, otherwise keep 0 (fresh start)
        gameState.totalGoldEarned = savedState.totalGoldEarned !== undefined ? savedState.totalGoldEarned : gameState.totalGoldEarned;
        gameState.prestigeCurrency = savedState.prestigeCurrency || 0;
        gameState.volume = savedState.volume !== undefined ? savedState.volume : 0.5;
        gameState.prestigeNodes = savedState.prestigeNodes || {};
        gameState.prestigeCount = savedState.prestigeCount || 0;
        gameState.prestigeGoldMultiplier = savedState.prestigeGoldMultiplier || 1;
        gameState.volume = savedState.volume !== undefined ? savedState.volume : 0.5;
        
        // Update volume slider if it exists
        const volumeSlider = document.getElementById('volume-slider');
        const volumeValue = document.getElementById('volume-value');
        if (volumeSlider && volumeValue) {
            volumeSlider.value = (gameState.volume * 100).toString();
            volumeValue.textContent = Math.round(gameState.volume * 100) + '%';
        }
        
        // Schedule horde wave if needed (only if enemies can spawn)
        const activeMinecarts = gameState.minecarts;
        // Only count minecarts beyond the first one (id !== 0)
        const additionalMinecarts = activeMinecarts.filter(m => m.id !== 0);
        const canEnemiesSpawn = gameState.soldiers > 0 || additionalMinecarts.length >= 1; // At least 1 soldier OR 1 minecart beyond the first
        if (gameState.nextHordeWaveTime === 0 && canEnemiesSpawn) {
            scheduleNextHordeWave();
        }
    }
}

// ========== AUDIO SYSTEM ==========

// Audio context for generating sounds
let audioContext = null;

// Initialize audio context (must be triggered by user interaction)
function initAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            // Audio not supported
            return false;
        }
    }
    return true;
}

// Generate a click sound - modern, subtle click
function playClickSound() {
    if (!initAudioContext() || gameState.volume === 0) return;
    
    const now = audioContext.currentTime;
    const volume = gameState.volume * 0.15;
    
    // Modern click: subtle, short, with a slight low-end thump
    const clickOsc = audioContext.createOscillator();
    const clickGain = audioContext.createGain();
    
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(800, now);
    clickOsc.frequency.exponentialRampToValueAtTime(600, now + 0.008);
    
    clickGain.gain.setValueAtTime(0, now);
    clickGain.gain.linearRampToValueAtTime(volume, now + 0.001);
    clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.008);
    
    clickOsc.connect(clickGain);
    clickGain.connect(audioContext.destination);
    
    clickOsc.start(now);
    clickOsc.stop(now + 0.008);
}

// Generate an ore collection sound - modern chime
function playOreCollectSound() {
    if (!initAudioContext() || gameState.volume === 0) return;
    
    const now = audioContext.currentTime;
    const volume = gameState.volume * 0.18;
    
    // Modern chime: smooth, pleasant, with gentle attack
    const chimeOsc = audioContext.createOscillator();
    const chimeGain = audioContext.createGain();
    
    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(880, now); // A5
    chimeOsc.frequency.exponentialRampToValueAtTime(1108, now + 0.12); // C#6
    
    chimeGain.gain.setValueAtTime(0, now);
    chimeGain.gain.linearRampToValueAtTime(volume, now + 0.02);
    chimeGain.gain.setValueAtTime(volume, now + 0.08);
    chimeGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    
    chimeOsc.connect(chimeGain);
    chimeGain.connect(audioContext.destination);
    
    chimeOsc.start(now);
    chimeOsc.stop(now + 0.12);
}

// Generate an upgrade purchase sound - modern success sound
function playUpgradeSound() {
    if (!initAudioContext() || gameState.volume === 0) return;
    
    const now = audioContext.currentTime;
    const volume = gameState.volume * 0.22;
    
    // Modern success sound: smooth ascending notes
    const notes = [
        { freq: 523.25, time: 0 },    // C5
        { freq: 659.25, time: 0.08 },  // E5
        { freq: 783.99, time: 0.16 }   // G5
    ];
    
    notes.forEach((note, index) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, now + note.time);
        
        gain.gain.setValueAtTime(0, now + note.time);
        gain.gain.linearRampToValueAtTime(volume, now + note.time + 0.01);
        gain.gain.setValueAtTime(volume, now + note.time + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, now + note.time + 0.25);
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.start(now + note.time);
        osc.stop(now + note.time + 0.25);
    });
}

// Generate a minecart delivery sound - modern whoosh/chime
function playMinecartSound() {
    if (!initAudioContext() || gameState.volume === 0) return;
    
    const now = audioContext.currentTime;
    const volume = gameState.volume * 0.2;
    
    // Modern delivery sound: pleasant chime with slight whoosh
    const chimeOsc = audioContext.createOscillator();
    const chimeGain = audioContext.createGain();
    
    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(440, now); // A4
    chimeOsc.frequency.exponentialRampToValueAtTime(554, now + 0.15); // C#5
    
    chimeGain.gain.setValueAtTime(0, now);
    chimeGain.gain.linearRampToValueAtTime(volume, now + 0.02);
    chimeGain.gain.setValueAtTime(volume, now + 0.1);
    chimeGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    chimeOsc.connect(chimeGain);
    chimeGain.connect(audioContext.destination);
    
    chimeOsc.start(now);
    chimeOsc.stop(now + 0.15);
}

// Generate an enemy kill sound - modern impact
function playEnemyKillSound() {
    if (!initAudioContext() || gameState.volume === 0) return;
    
    const now = audioContext.currentTime;
    const volume = gameState.volume * 0.2;
    
    // Modern impact: subtle thud with slight pitch drop
    const impactOsc = audioContext.createOscillator();
    const impactGain = audioContext.createGain();
    
    impactOsc.type = 'sine';
    impactOsc.frequency.setValueAtTime(400, now);
    impactOsc.frequency.exponentialRampToValueAtTime(250, now + 0.06);
    
    impactGain.gain.setValueAtTime(0, now);
    impactGain.gain.linearRampToValueAtTime(volume, now + 0.002);
    impactGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
    
    impactOsc.connect(impactGain);
    impactGain.connect(audioContext.destination);
    
    impactOsc.start(now);
    impactOsc.stop(now + 0.06);
}

// Generate a prestige sound - modern triumphant sound
function playPrestigeSound() {
    if (!initAudioContext() || gameState.volume === 0) return;
    
    const now = audioContext.currentTime;
    const volume = gameState.volume * 0.25;
    
    // Modern triumphant sound: smooth major chord with staggered start
    const chord = [
        { freq: 523.25, delay: 0 },    // C5
        { freq: 659.25, delay: 0.03 },  // E5
        { freq: 783.99, delay: 0.06 }   // G5
    ];
    
    chord.forEach((note) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, now + note.delay);
        
        gain.gain.setValueAtTime(0, now + note.delay);
        gain.gain.linearRampToValueAtTime(volume, now + note.delay + 0.02);
        gain.gain.setValueAtTime(volume, now + note.delay + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.01, now + note.delay + 0.5);
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.start(now + note.delay);
        osc.stop(now + note.delay + 0.5);
    });
}

// Generate a slot machine spin sound - modern whoosh
function playSlotSpinSound() {
    if (!initAudioContext() || gameState.volume === 0) return;
    
    const now = audioContext.currentTime;
    const volume = gameState.volume * 0.18;
    
    // Modern spin sound: smooth ascending whoosh
    const spinOsc = audioContext.createOscillator();
    const spinGain = audioContext.createGain();
    
    spinOsc.type = 'sine';
    spinOsc.frequency.setValueAtTime(350, now);
    spinOsc.frequency.exponentialRampToValueAtTime(500, now + 0.12);
    
    spinGain.gain.setValueAtTime(0, now);
    spinGain.gain.linearRampToValueAtTime(volume, now + 0.02);
    spinGain.gain.setValueAtTime(volume, now + 0.08);
    spinGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    
    spinOsc.connect(spinGain);
    spinGain.connect(audioContext.destination);
    
    spinOsc.start(now);
    spinOsc.stop(now + 0.12);
}

// Start game when page loads
window.addEventListener('DOMContentLoaded', initGame);
