/**
 * Achievements System - Phase 8: Engagement
 * One-time achievements for MVP (no backend, no streaks)
 */

/**
 * Achievement definitions - One-time accomplishments
 */
export const ACHIEVEMENTS = {
    // ===== Progress Achievements =====
    FIRST_STEPS: {
        id: 'FIRST_STEPS',
        name: 'First Steps',
        description: 'Complete your first level',
        icon: '👶',
        condition: (stats) => stats.levelsCompleted >= 1
    },
    HALFWAY: {
        id: 'HALFWAY',
        name: 'Halfway There',
        description: 'Complete 7 levels',
        icon: '🚶',
        condition: (stats) => stats.levelsCompleted >= 7
    },
    ALL_LEVELS: {
        id: 'ALL_LEVELS',
        name: 'Master Coder',
        description: 'Complete all 14 levels',
        icon: '🏆',
        condition: (stats) => stats.levelsCompleted >= 14
    },
    
    // ===== Star Achievements =====
    FIRST_STAR: {
        id: 'FIRST_STAR',
        name: 'Shining Bright',
        description: 'Earn your first 3-star rating',
        icon: '⭐',
        condition: (stats) => stats.threeStarLevels >= 1
    },
    STAR_COLLECTOR: {
        id: 'STAR_COLLECTOR',
        name: 'Star Collector',
        description: 'Earn 20 total stars',
        icon: '🌟',
        condition: (stats) => stats.totalStars >= 20
    },
    PERFECTIONIST: {
        id: 'PERFECTIONIST',
        name: 'Perfectionist',
        description: '3-star rating on all 14 levels',
        icon: '💎',
        condition: (stats) => stats.threeStarLevels >= 14
    },
    
    // ===== Speed Achievements (Time-based) =====
    QUICK_THINKER: {
        id: 'QUICK_THINKER',
        name: 'Quick Thinker',
        description: 'Complete a level in under 30 seconds',
        icon: '⚡',
        condition: (stats) => stats.fastestLevelTime <= 30
    },
    SPEED_RUNNER: {
        id: 'SPEED_RUNNER',
        name: 'Speed Runner',
        description: 'Complete 5 levels in under 10 minutes total',
        icon: '🏃',
        condition: (stats) => stats.fiveLevelsUnder10Min
    },
    MARATHON: {
        id: 'MARATHON',
        name: 'Marathon',
        description: 'Complete all 14 levels in one session',
        icon: '🎯',
        condition: (stats) => stats.allLevelsOneSession
    },
    SPEEDMASTER: {
        id: 'SPEEDMASTER',
        name: 'Speed Master',
        description: 'Complete all levels in under 30 minutes',
        icon: '🚀',
        condition: (stats) => stats.allLevelsUnder30Min
    },
    
    // ===== Efficiency Achievements =====
    MINIMALIST: {
        id: 'MINIMALIST',
        name: 'Minimalist',
        description: 'Complete a level using only 2 actions',
        icon: '✂️',
        condition: (stats) => stats.minActionsUsed <= 2 && stats.minActionsUsed > 0
    },
    EFFICIENT: {
        id: 'EFFICIENT',
        name: 'Efficient Coder',
        description: 'Complete 5 levels with optimal actions',
        icon: '🎯',
        condition: (stats) => stats.optimalCompletions >= 5
    },
    
    // ===== Feature Usage Achievements =====
    BLOCK_BUILDER: {
        id: 'BLOCK_BUILDER',
        name: 'Block Builder',
        description: 'Create your first action block',
        icon: '📦',
        condition: (stats) => stats.blocksCreated >= 1
    },
    BLOCK_MASTER: {
        id: 'BLOCK_MASTER',
        name: 'Block Master',
        description: 'Create 10 action blocks',
        icon: '🧱',
        condition: (stats) => stats.blocksCreated >= 10
    },
    LOOP_LEARNER: {
        id: 'LOOP_LEARNER',
        name: 'Loop Learner',
        description: 'Use your first repeat block',
        icon: '🔁',
        condition: (stats) => stats.loopsUsed >= 1
    },
    LOOP_MASTER: {
        id: 'LOOP_MASTER',
        name: 'Loop Master',
        description: 'Use repeat blocks 20 times',
        icon: '♾️',
        condition: (stats) => stats.loopsUsed >= 20
    },
    RECURSION_LEARNER: {
        id: 'RECURSION_LEARNER',
        name: 'Recursion Learner',
        description: 'Use recursion for the first time',
        icon: '🔄',
        condition: (stats) => stats.recursionUsed >= 1
    },
    RECURSION_GURU: {
        id: 'RECURSION_GURU',
        name: 'Recursion Guru',
        description: 'Use recursion 10 times',
        icon: '🧙',
        condition: (stats) => stats.recursionUsed >= 10
    },
    
    // ===== Challenge Achievements =====
    SHAPE_COLLECTOR: {
        id: 'SHAPE_COLLECTOR',
        name: 'Shape Collector',
        description: 'Complete Heart, Star, and Bear levels',
        icon: '🎨',
        condition: (stats) => {
            const shapes = [3, 4, 8]; // Heart, Star, Bear level IDs
            return shapes.every(id => stats.completedLevelIds?.includes(id));
        }
    },
    FLAWLESS: {
        id: 'FLAWLESS',
        name: 'Flawless',
        description: 'Complete a level without hitting any obstacles',
        icon: '✨',
        condition: (stats) => stats.flawlessCompletions >= 1
    },
    PERSEVERANCE: {
        id: 'PERSEVERANCE',
        name: 'Perseverance',
        description: 'Complete a level after 10+ attempts',
        icon: '💪',
        condition: (stats) => stats.comebackVictories >= 1
    },
    EXPLORER: {
        id: 'EXPLORER',
        name: 'Explorer',
        description: 'Try all 14 levels (even without completing)',
        icon: '🗺️',
        condition: (stats) => stats.levelsAttemptedCount >= 14
    }
};

/**
 * Player statistics for achievement tracking
 */
export class PlayerStats {
    constructor() {
        // Progress
        this.levelsCompleted = 0;
        this.completedLevelIds = [];
        this.levelsAttemptedCount = 0;
        this.levelsAttempted = {};
        
        // Stars
        this.totalStars = 0;
        this.threeStarLevels = 0;
        
        // Time tracking
        this.sessionStartTime = Date.now();
        this.fastestLevelTime = Infinity;
        this.totalSessionTime = 0;
        this.fiveLevelsUnder10Min = false;
        this.allLevelsOneSession = false;
        this.allLevelsUnder30Min = false;
        this.levelsThisSession = 0;
        this.sessionLevelTimes = [];
        
        // Efficiency
        this.minActionsUsed = Infinity;
        this.optimalCompletions = 0;
        
        // Features
        this.blocksCreated = 0;
        this.loopsUsed = 0;
        this.recursionUsed = 0;
        
        // Challenges
        this.flawlessCompletions = 0;
        this.comebackVictories = 0;
    }

    /**
     * Update from saved data
     */
    loadFrom(data) {
        Object.assign(this, data);
        // Handle Infinity serialization
        if (this.minActionsUsed === null) this.minActionsUsed = Infinity;
        if (this.fastestLevelTime === null) this.fastestLevelTime = Infinity;
        // Reset session tracking on load
        this.sessionStartTime = Date.now();
        this.levelsThisSession = 0;
        this.sessionLevelTimes = [];
    }

    /**
     * Get serializable object
     */
    toJSON() {
        return {
            ...this,
            minActionsUsed: this.minActionsUsed === Infinity ? null : this.minActionsUsed,
            fastestLevelTime: this.fastestLevelTime === Infinity ? null : this.fastestLevelTime,
            // Don't save session-specific data
            sessionStartTime: undefined,
            levelsThisSession: undefined,
            sessionLevelTimes: undefined
        };
    }
}

/**
 * Achievements Manager - Tracks and awards achievements
 */
export class AchievementsManager {
    constructor() {
        this.stats = new PlayerStats();
        this.unlockedAchievements = new Set();
        this.newlyUnlocked = [];
        this.levelStartTime = null;
        this.loadProgress();
    }

    /**
     * Load progress from localStorage
     */
    loadProgress() {
        try {
            const data = localStorage.getItem('startschool_achievements');
            if (data) {
                const parsed = JSON.parse(data);
                this.stats.loadFrom(parsed.stats || {});
                this.unlockedAchievements = new Set(parsed.unlocked || []);
            }
        } catch (e) {
            console.warn('Failed to load achievements:', e);
        }
    }

    /**
     * Save progress to localStorage
     */
    saveProgress() {
        try {
            const data = {
                stats: this.stats.toJSON(),
                unlocked: [...this.unlockedAchievements]
            };
            localStorage.setItem('startschool_achievements', JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save achievements:', e);
        }
    }

    /**
     * Start timing a level attempt
     */
    startLevelTimer() {
        this.levelStartTime = Date.now();
    }

    /**
     * Record level attempt (even if not completed)
     */
    recordLevelAttempt(levelId) {
        if (!this.stats.levelsAttempted[levelId]) {
            this.stats.levelsAttempted[levelId] = { attempts: 0, completed: false };
            this.stats.levelsAttemptedCount++;
        }
        this.stats.levelsAttempted[levelId].attempts++;
        this.saveProgress();
    }

    /**
     * Record level completion
     */
    recordLevelComplete(levelId, stars, actionsUsed, hitObstacle, attempts) {
        const levelTime = this.levelStartTime ? (Date.now() - this.levelStartTime) / 1000 : 999;
        
        // Track completion
        if (!this.stats.completedLevelIds.includes(levelId)) {
            this.stats.levelsCompleted++;
            this.stats.completedLevelIds.push(levelId);
        }

        // Track attempts
        if (!this.stats.levelsAttempted[levelId]) {
            this.stats.levelsAttempted[levelId] = { attempts: 0, completed: false };
        }
        this.stats.levelsAttempted[levelId].completed = true;

        // Comeback victory (completed after 10+ attempts)
        if (attempts >= 10 && !this.stats.levelsAttempted[levelId].comebackCounted) {
            this.stats.comebackVictories++;
            this.stats.levelsAttempted[levelId].comebackCounted = true;
        }

        // Stars
        this.stats.totalStars += stars;
        if (stars === 3) {
            this.stats.threeStarLevels++;
        }

        // Time tracking
        if (levelTime < this.stats.fastestLevelTime) {
            this.stats.fastestLevelTime = levelTime;
        }
        
        // Session tracking
        this.stats.levelsThisSession++;
        this.stats.sessionLevelTimes.push(levelTime);
        
        // Check 5 levels under 10 min
        if (this.stats.sessionLevelTimes.length >= 5) {
            const firstFiveTime = this.stats.sessionLevelTimes.slice(0, 5).reduce((a, b) => a + b, 0);
            if (firstFiveTime < 600) { // 10 minutes in seconds
                this.stats.fiveLevelsUnder10Min = true;
            }
        }
        
        // Check all levels in one session
        if (this.stats.levelsThisSession >= 14) {
            this.stats.allLevelsOneSession = true;
            const totalTime = this.stats.sessionLevelTimes.reduce((a, b) => a + b, 0);
            if (totalTime < 1800) { // 30 minutes
                this.stats.allLevelsUnder30Min = true;
            }
        }

        // Actions efficiency
        if (actionsUsed < this.stats.minActionsUsed) {
            this.stats.minActionsUsed = actionsUsed;
        }

        // Flawless (no obstacles hit)
        if (!hitObstacle) {
            this.stats.flawlessCompletions++;
        }

        this.saveProgress();
        return this.checkAchievements();
    }

    /**
     * Record block created
     */
    recordBlockCreated() {
        this.stats.blocksCreated++;
        this.saveProgress();
        return this.checkAchievements();
    }

    /**
     * Record loop used
     */
    recordLoopUsed() {
        this.stats.loopsUsed++;
        this.saveProgress();
        return this.checkAchievements();
    }

    /**
     * Record recursion used
     */
    recordRecursionUsed() {
        this.stats.recursionUsed++;
        this.saveProgress();
        return this.checkAchievements();
    }

    /**
     * Record optimal completion
     */
    recordOptimalCompletion() {
        this.stats.optimalCompletions++;
        this.saveProgress();
        return this.checkAchievements();
    }

    /**
     * Check and unlock achievements
     * @returns {Array} Newly unlocked achievements
     */
    checkAchievements() {
        this.newlyUnlocked = [];

        for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
            if (!this.unlockedAchievements.has(id) && achievement.condition(this.stats)) {
                this.unlockedAchievements.add(id);
                this.newlyUnlocked.push(achievement);
            }
        }

        if (this.newlyUnlocked.length > 0) {
            this.saveProgress();
        }

        return this.newlyUnlocked;
    }

    /**
     * Get all achievements with unlock status
     */
    getAllAchievements() {
        return Object.values(ACHIEVEMENTS).map(a => ({
            ...a,
            unlocked: this.unlockedAchievements.has(a.id)
        }));
    }

    /**
     * Get player stats
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Get progress percentage
     */
    getProgressPercent() {
        return Math.round((this.unlockedAchievements.size / Object.keys(ACHIEVEMENTS).length) * 100);
    }

    /**
     * Reset all achievements (for testing)
     */
    reset() {
        this.stats = new PlayerStats();
        this.unlockedAchievements.clear();
        this.newlyUnlocked = [];
        localStorage.removeItem('startschool_achievements');
    }
}
