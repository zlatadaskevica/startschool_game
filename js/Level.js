
import { CONFIG } from './config.js';

/**
 * Target types for different gameplay elements
 */
export const TargetType = {
    COLLECT: 'COLLECT',      // Must pass through
    FINISH: 'FINISH',        // Must end here
    AVOID: 'AVOID'           // Must not touch
};

/**
 * Level difficulty tiers
 */
export const Difficulty = {
    TUTORIAL: 'TUTORIAL',
    EASY: 'EASY',
    MEDIUM: 'MEDIUM',
    HARD: 'HARD',
    EXPERT: 'EXPERT'
};

/**
 * Features unlocked at different levels
 */
export const UnlockedFeatures = {
    BASIC_MOVES: 1,      // ↑↓←→
    BLOCKS: 3,           // Save as block (●)
    REPEAT: 5,           // Repeat loops (🔁)
    RECURSION: 8         // Recursive functions (🔄)
};

/**
 * Target - A point on the grid the ball must interact with
 */
export class Target {
    /**
     * Create a target
     * @param {number} x - Grid X position
     * @param {number} y - Grid Y position
     * @param {string} type - TargetType enum value
     * @param {number} order - Collection order (0 = any order)
     */
    constructor(x, y, type = TargetType.COLLECT, order = 0) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.order = order;
        this.collected = false;
        this.pulsePhase = Math.random() * Math.PI * 2; // Random start phase for animation
    }

    /**
     * Check if ball is at this target
     * @param {number} ballX - Ball X position
     * @param {number} ballY - Ball Y position
     * @returns {boolean}
     */
    isAtPosition(ballX, ballY) {
        return this.x === ballX && this.y === ballY;
    }

    /**
     * Mark as collected
     */
    collect() {
        if (this.type !== TargetType.AVOID) {
            this.collected = true;
        }
    }

    /**
     * Reset target state
     */
    reset() {
        this.collected = false;
    }

    /**
     * Clone target
     * @returns {Target}
     */
    clone() {
        const cloned = new Target(this.x, this.y, this.type, this.order);
        cloned.collected = this.collected;
        return cloned;
    }
}

/**
 * Level - A complete level definition
 */
export class Level {
    /**
     * Create a level
     * @param {Object} config - Level configuration
     */
    constructor(config) {
        this.id = config.id || 1;
        this.name = config.name || `Level ${this.id}`;
        this.difficulty = config.difficulty || Difficulty.EASY;
        
        // Grid size (can vary per level)
        this.gridCols = config.gridCols || CONFIG.grid.cols;
        this.gridRows = config.gridRows || CONFIG.grid.rows;
        
        // Start position
        this.startX = config.startX ?? Math.floor(this.gridCols / 2);
        this.startY = config.startY ?? Math.floor(this.gridRows / 2);
        
        // Targets
        this.targets = [];
        if (config.targets) {
            config.targets.forEach(t => {
                this.targets.push(new Target(t.x, t.y, t.type || TargetType.COLLECT, t.order || 0));
            });
        }
        
        // Win condition
        this.requireOrder = config.requireOrder || false;
        this.maxActions = config.maxActions || 0; // 0 = unlimited (base actions)
        this.maxQueueSize = config.maxQueueSize || 0; // 0 = unlimited (queue items)
        
        // Required features for this level
        this.requiredFeatures = config.requiredFeatures || [];
        
        // Hints and tutorial
        this.hint = config.hint || '';
        this.tutorial = config.tutorial || null;
        
        // State
        this.isComplete = false;
        this.stars = 0; // 1-3 stars based on performance
    }

    /**
     * Get all targets of a specific type
     * @param {string} type - TargetType
     * @returns {Array<Target>}
     */
    getTargetsByType(type) {
        return this.targets.filter(t => t.type === type);
    }

    /**
     * Check if all collectible targets are collected
     * @returns {boolean}
     */
    areAllCollected() {
        const collectibles = this.targets.filter(t => t.type === TargetType.COLLECT);
        return collectibles.every(t => t.collected);
    }

    /**
     * Get finish target (if any)
     * @returns {Target|null}
     */
    getFinishTarget() {
        return this.targets.find(t => t.type === TargetType.FINISH) || null;
    }

    /**
     * Check win condition
     * @param {number} ballX - Final ball X
     * @param {number} ballY - Final ball Y
     * @param {number} actionsUsed - Number of actions used
     * @returns {Object} { won: boolean, reason: string }
     */
    checkWinCondition(ballX, ballY, actionsUsed) {
        // Check if hit any AVOID targets
        const avoided = this.targets.filter(t => t.type === TargetType.AVOID);
        const hitAvoid = avoided.some(t => t.collected);
        if (hitAvoid) {
            return { won: false, reason: 'Hit obstacle!' };
        }

        // Check if all collectibles are collected
        if (!this.areAllCollected()) {
            return { won: false, reason: 'Collect all targets!' };
        }

        // Check finish position if required
        const finish = this.getFinishTarget();
        if (finish && !finish.isAtPosition(ballX, ballY)) {
            return { won: false, reason: 'Reach the finish!' };
        }

        // Check action limit
        if (this.maxActions > 0 && actionsUsed > this.maxActions) {
            return { won: false, reason: `Too many actions! (max: ${this.maxActions})` };
        }

        return { won: true, reason: 'Level complete!' };
    }

    /**
     * Calculate stars based on performance
     * @param {number} actionsUsed - Actions used to complete
     * @returns {number} 1-3 stars
     */
    calculateStars(actionsUsed) {
        if (this.maxActions === 0) {
            return 3; // No limit = 3 stars
        }

        const efficiency = this.maxActions / actionsUsed;
        if (efficiency >= 1) return 3;
        if (efficiency >= 0.7) return 2;
        return 1;
    }

    /**
     * Reset level state
     */
    reset() {
        this.isComplete = false;
        this.targets.forEach(t => t.reset());
    }

    /**
     * Clone level
     * @returns {Level}
     */
    clone() {
        const config = {
            id: this.id,
            name: this.name,
            difficulty: this.difficulty,
            gridCols: this.gridCols,
            gridRows: this.gridRows,
            startX: this.startX,
            startY: this.startY,
            targets: this.targets.map(t => ({ x: t.x, y: t.y, type: t.type, order: t.order })),
            requireOrder: this.requireOrder,
            maxActions: this.maxActions,
            maxQueueSize: this.maxQueueSize,
            requiredFeatures: this.requiredFeatures,
            hint: this.hint,
            tutorial: this.tutorial
        };
        return new Level(config);
    }
}

/**
 * Helper function to center a shape in an 8x8 grid
 * @param {Object} levelConfig - Level configuration
 * @returns {Object} - Centered level configuration
 */
function centerShape(levelConfig) {
    const gridSize = 8;
    
    // Get all points (targets + start)
    const allPoints = [
        { x: levelConfig.startX, y: levelConfig.startY },
        ...levelConfig.targets.map(t => ({ x: t.x, y: t.y }))
    ];
    
    // Find bounding box
    const minX = Math.min(...allPoints.map(p => p.x));
    const maxX = Math.max(...allPoints.map(p => p.x));
    const minY = Math.min(...allPoints.map(p => p.y));
    const maxY = Math.max(...allPoints.map(p => p.y));
    
    // Calculate shape size
    const shapeWidth = maxX - minX + 1;
    const shapeHeight = maxY - minY + 1;
    
    // Calculate offset to center
    const offsetX = Math.floor((gridSize - shapeWidth) / 2) - minX;
    const offsetY = Math.floor((gridSize - shapeHeight) / 2) - minY;
    
    // Apply offset
    return {
        ...levelConfig,
        startX: levelConfig.startX + offsetX,
        startY: levelConfig.startY + offsetY,
        targets: levelConfig.targets.map(t => ({
            ...t,
            x: t.x + offsetX,
            y: t.y + offsetY
        }))
    };
}

/**
 * Predefined levels - 14 levels with fun shapes!
 * All levels solvable in 5-10 actions with programming concepts
 */
export const LEVELS = [
    // ===== TUTORIAL (1-2) - Basic moves =====
    centerShape({
        id: 1,
        name: '➡️ Line',
        difficulty: Difficulty.TUTORIAL,
        startX: 2,
        startY: 3,
        targets: [
            // Simple horizontal line: S → ● → 🏁
            { x: 3, y: 3, type: TargetType.COLLECT },
            { x: 4, y: 3, type: TargetType.FINISH }
        ],
        hint: 'Move right! → →',
        requiredFeatures: []
    }),
    centerShape({
        id: 2,
        name: '↱ Corner',
        difficulty: Difficulty.TUTORIAL,
        startX: 2,
        startY: 2,
        targets: [
            // L-shape: S → ● → ● ↓ 🏁
            { x: 3, y: 2, type: TargetType.COLLECT },
            { x: 4, y: 2, type: TargetType.COLLECT },
            { x: 4, y: 3, type: TargetType.COLLECT },
            { x: 4, y: 4, type: TargetType.FINISH }
        ],
        hint: 'Right, then down! → → ↓ ↓',
        requiredFeatures: []
    }),
    
    // ===== EASY - Blocks unlock (3-4) =====
    centerShape({
        id: 3,
        name: '🔺 Steps Down',
        difficulty: Difficulty.EASY,
        startX: 2,
        startY: 2,
        targets: [
            // S           (2,2)
            //   ●         (3,3)
            //     ●       (4,4)
            //       🏁    (5,5)
            { x: 3, y: 3, type: TargetType.COLLECT },
            { x: 4, y: 4, type: TargetType.COLLECT },
            { x: 5, y: 5, type: TargetType.FINISH }
        ],
        hint: 'Block A=[→↓], then: [A] [A] [A]',
        tutorial: 'blocks',
        maxQueueSize: 4,
        requiredFeatures: ['BLOCKS']
    }),
    centerShape({
        id: 4,
        name: '◆ Stairs Left',
        difficulty: Difficulty.EASY,
        startX: 3,
        startY: 2,
        targets: [
            //       S       (3,2)
            //     ●         (2,3)
            //   ●           (1,4)
            //     🏁        (2,5)
            { x: 2, y: 3, type: TargetType.COLLECT },
            { x: 1, y: 4, type: TargetType.COLLECT },
            { x: 2, y: 5, type: TargetType.FINISH }
        ],
        hint: 'Block A=[↓←], use: [A] [A] → ↓',
        maxQueueSize: 5,
        requiredFeatures: ['BLOCKS']
    }),
    
    // ===== MEDIUM - Loops unlock (5-7) =====
    centerShape({
        id: 5,
        name: '⬜ Square',
        difficulty: Difficulty.MEDIUM,
        startX: 2,
        startY: 2,
        targets: [
            // □ Square outline - clockwise, finish at end
            // S → → ●
            //       ↓
            // 🏁← ● ●
            { x: 4, y: 2, type: TargetType.COLLECT },
            { x: 4, y: 4, type: TargetType.COLLECT },
            { x: 3, y: 4, type: TargetType.COLLECT },
            { x: 2, y: 4, type: TargetType.FINISH }
        ],
        hint: '🔁 Repeat: [→→] [↓↓] [←←]',
        tutorial: 'repeat',
        maxQueueSize: 4,
        requiredFeatures: ['BLOCKS', 'REPEAT']
    }),
    centerShape({
        id: 6,
        name: '➡️ Long Line',
        difficulty: Difficulty.MEDIUM,
        startX: 1,
        startY: 3,
        targets: [
            // Long horizontal line - needs repeat!
            // S → ● → ● → ● → 🏁
            { x: 2, y: 3, type: TargetType.COLLECT },
            { x: 3, y: 3, type: TargetType.COLLECT },
            { x: 4, y: 3, type: TargetType.COLLECT },
            { x: 5, y: 3, type: TargetType.FINISH }
        ],
        hint: '🔁 Repeat 4x [→] = only 1 queue item!',
        maxQueueSize: 1,
        requiredFeatures: ['BLOCKS', 'REPEAT']
    }),
    centerShape({
        id: 7,
        name: '⚡ Zigzag',
        difficulty: Difficulty.MEDIUM,
        startX: 2,
        startY: 2,
        targets: [
            // Zigzag pattern - finish at end
            // S → ●
            //     ↓
            //     ● → 🏁
            { x: 3, y: 2, type: TargetType.COLLECT },
            { x: 3, y: 3, type: TargetType.COLLECT },
            { x: 4, y: 3, type: TargetType.FINISH }
        ],
        hint: '🔁 Repeat 2x [→↓] fits in 1 slot!',
        maxQueueSize: 2,
        requiredFeatures: ['BLOCKS', 'REPEAT']
    }),
    
    // ===== HARD - Recursion unlock (8-11) =====
    centerShape({
        id: 8,
        name: '� Right Angle',
        difficulty: Difficulty.HARD,
        startX: 2,
        startY: 2,
        targets: [
            // L-shape that needs →→→ then ↓↓↓ pattern
            // S → ● → ● → ●
            //             ↓
            //             ●
            //             ↓
            //             ●
            //             ↓
            //             🏁
            { x: 3, y: 2, type: TargetType.COLLECT },
            { x: 4, y: 2, type: TargetType.COLLECT },
            { x: 5, y: 2, type: TargetType.COLLECT },
            { x: 5, y: 3, type: TargetType.COLLECT },
            { x: 5, y: 4, type: TargetType.COLLECT },
            { x: 5, y: 5, type: TargetType.FINISH }
        ],
        hint: '🌀 Nest: IN=[→] OUT=[↓] ×3 gives →→→↓↓↓!',
        tutorial: 'recursion',
        maxQueueSize: 1,
        requiredFeatures: ['BLOCKS', 'RECURSION']
    }),
    centerShape({
        id: 9,
        name: '🔼 Triangle',
        difficulty: Difficulty.HARD,
        startX: 2,
        startY: 4,
        targets: [
            // Треугольник - нужна рекурсия для IN:↑→ OUT:↓ ×2
            //       ●         (4,2)
            //     ● ●         (3,3)(4,3)  
            //   S ● ● 🏁      (2,4)(3,4)(4,4)(5,4)
            { x: 3, y: 4, type: TargetType.COLLECT },
            { x: 3, y: 3, type: TargetType.COLLECT },
            { x: 4, y: 4, type: TargetType.COLLECT },
            { x: 4, y: 3, type: TargetType.COLLECT },
            { x: 4, y: 2, type: TargetType.COLLECT },
            { x: 5, y: 4, type: TargetType.FINISH }
        ],
        hint: '🌀 IN:[→↑] OUT:[↓] ×2 then →🏁',
        maxQueueSize: 2,
        requiredFeatures: ['BLOCKS', 'RECURSION']
    }),
    centerShape({
        id: 10,
        name: '🌀 Spiral In',
        difficulty: Difficulty.HARD,
        startX: 2,
        startY: 2,
        targets: [
            // Спираль внутрь - IN идёт вперёд, OUT поворачивает
            // S → ● → ●  
            //         ↓
            //     ● ← ●  
            //     ↓
            // 🏁← ●     
            { x: 3, y: 2, type: TargetType.COLLECT },
            { x: 4, y: 2, type: TargetType.COLLECT },
            { x: 4, y: 3, type: TargetType.COLLECT },
            { x: 3, y: 3, type: TargetType.COLLECT },
            { x: 3, y: 4, type: TargetType.COLLECT },
            { x: 2, y: 4, type: TargetType.FINISH }
        ],
        hint: '🌀 IN:[→] OUT:[↓←] ×2 = →→↓←↓←',
        maxQueueSize: 1,
        requiredFeatures: ['BLOCKS', 'RECURSION']
    }),
    centerShape({
        id: 11,
        name: '📶 Staircase',
        difficulty: Difficulty.HARD,
        startX: 2,
        startY: 2,
        targets: [
            // Лестница вниз и возврат
            // S → ●               (3,2)
            //     ↓
            //     ● → ●           (3,3)(4,3)
            //         ↓
            //         ● → ●       (4,4)(5,4)
            //             ↓
            // 🏁← ● ← ● ← ●       (2,5)(3,5)(4,5)(5,5)
            // Решение: IN:[→↓] OUT:[←] ×3 = →↓→↓→↓←←←
            { x: 3, y: 2, type: TargetType.COLLECT },
            { x: 3, y: 3, type: TargetType.COLLECT },
            { x: 4, y: 3, type: TargetType.COLLECT },
            { x: 4, y: 4, type: TargetType.COLLECT },
            { x: 5, y: 4, type: TargetType.COLLECT },
            { x: 5, y: 5, type: TargetType.COLLECT },
            { x: 4, y: 5, type: TargetType.COLLECT },
            { x: 3, y: 5, type: TargetType.COLLECT },
            { x: 2, y: 5, type: TargetType.FINISH }
        ],
        hint: '🌀 IN:[→↓] OUT:[←] ×3 = →↓→↓→↓←←←',
        maxQueueSize: 1,
        requiredFeatures: ['BLOCKS', 'RECURSION']
    }),
    
    // ===== EXPERT (12-14) - All skills =====
    centerShape({
        id: 12,
        name: '� Wave',
        difficulty: Difficulty.EXPERT,
        startX: 2,
        startY: 2,
        targets: [
            // Волна - нужны ДВЕ рекурсии
            // S → ●                 
            //     ↓
            //     ● → ●             
            //         ↓
            //         ● → ●         
            //             ↓
            // 🏁← ← ← ← ← ●         
            // Решение: 🌀₁ IN:[→↓] OUT:[] ×3, 🌀₂ IN:[←] OUT:[] ×5
            { x: 3, y: 2, type: TargetType.COLLECT },
            { x: 3, y: 3, type: TargetType.COLLECT },
            { x: 4, y: 3, type: TargetType.COLLECT },
            { x: 4, y: 4, type: TargetType.COLLECT },
            { x: 5, y: 4, type: TargetType.COLLECT },
            { x: 5, y: 5, type: TargetType.COLLECT },
            { x: 4, y: 5, type: TargetType.COLLECT },
            { x: 3, y: 5, type: TargetType.COLLECT },
            { x: 2, y: 5, type: TargetType.FINISH }
        ],
        hint: '🌀₁ IN:[→↓] OUT:[] ×3, 🌀₂ IN:[←] OUT:[] ×3',
        maxQueueSize: 2,
        requiredFeatures: ['BLOCKS', 'RECURSION']
    }),
    centerShape({
        id: 13,
        name: '🌀 Maze',
        difficulty: Difficulty.EXPERT,
        startX: 2,
        startY: 2,
        targets: [
            // Лабиринт - спираль к центру с препятствиями
            // S → → → → ●
            //           ↓
            // ⚠   ● ← ● ●
            //     ↓   ↑  
            // ⚠   ● → 🏁
            //
            // Путь: →→→→↓↓←←↓→
            { x: 3, y: 2, type: TargetType.COLLECT },
            { x: 4, y: 2, type: TargetType.COLLECT },
            { x: 5, y: 2, type: TargetType.COLLECT },
            { x: 6, y: 2, type: TargetType.COLLECT },
            { x: 6, y: 3, type: TargetType.COLLECT },
            { x: 6, y: 4, type: TargetType.COLLECT },
            { x: 5, y: 4, type: TargetType.COLLECT },
            { x: 4, y: 4, type: TargetType.COLLECT },
            { x: 2, y: 3, type: TargetType.AVOID },
            { x: 2, y: 4, type: TargetType.AVOID },
            { x: 4, y: 5, type: TargetType.COLLECT },
            { x: 5, y: 5, type: TargetType.FINISH }
        ],
        hint: '🌀₁ IN:[→] OUT:[] ×4, 🌀₂ IN:[↓] OUT:[←] ×2, ↓→🏁',
        maxQueueSize: 3,
        requiredFeatures: ['BLOCKS', 'RECURSION']
    }),
    centerShape({
        id: 14,
        name: '👑 Castle',
        difficulty: Difficulty.EXPERT,
        startX: 2,
        startY: 1,
        targets: [
            // Большой замок - 2 сложные рекурсии + блок из 3 стрелок
            //
            // S → ● → ●               row 1: (3,1)(4,1)
            //         ↓
            //     ● ← ●               row 2: (3,2)(4,2)
            //     ↓   
            //     ● → ●               row 3: (3,3)(4,3)
            //         ↓
            // ⚠       ●               row 4: (4,4)
            // ⚠       ↓
            //     ● ← ●               row 5: (3,5)(4,5)
            //     ↓
            // 🏁← ●                   row 6: (2,6)(3,6)
            //
            // 🌀₁ IN:[→] OUT:[↓←] ×2 = →→↓←↓← (6 шагов)
            // От (2,1): (3,1)(4,1)(4,2)(3,2)(3,3)(2,3)
            //
            // 🌀₂ IN:[→] OUT:[↓] ×2 = →→↓↓ (4 шага)  
            // От (2,3): (3,3)(4,3)(4,4)(4,5)
            //
            // Блок ←↓← (3 стрелки)
            // От (4,5): (3,5)(3,6)(2,6)
            
            // 🌀₁ targets
            { x: 3, y: 1, type: TargetType.COLLECT },
            { x: 4, y: 1, type: TargetType.COLLECT },
            { x: 4, y: 2, type: TargetType.COLLECT },
            { x: 3, y: 2, type: TargetType.COLLECT },
            { x: 3, y: 3, type: TargetType.COLLECT },
            { x: 2, y: 3, type: TargetType.COLLECT },
            
            // 🌀₂ targets (3,3 already collected)
            { x: 4, y: 3, type: TargetType.COLLECT },
            { x: 4, y: 4, type: TargetType.COLLECT },
            { x: 4, y: 5, type: TargetType.COLLECT },
            
            // Block targets
            { x: 3, y: 5, type: TargetType.COLLECT },
            { x: 3, y: 6, type: TargetType.COLLECT },
            { x: 2, y: 6, type: TargetType.FINISH },
            
            // Obstacles - block shortcut on left
            { x: 2, y: 4, type: TargetType.AVOID },
            { x: 2, y: 5, type: TargetType.AVOID }
        ],
        hint: '🌀₁ IN:[→] OUT:[↓←] ×2, 🌀₂ IN:[→] OUT:[↓] ×2, ←↓←🏁',
        maxQueueSize: 4,
        requiredFeatures: ['BLOCKS', 'RECURSION']
    })
];
