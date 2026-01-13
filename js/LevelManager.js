/**
 * LevelManager Class - Phase 6
 * Manages level progression, unlocks, and persistence
 */

import { Level, LEVELS, Difficulty, UnlockedFeatures, TargetType } from './Level.js';

/**
 * Storage key for save data
 */
const STORAGE_KEY = 'startschool_progress';

/**
 * LevelManager - Handles level loading, progression, and saves
 */
export class LevelManager {
    constructor() {
        // All available levels
        this.levels = LEVELS.map(config => new Level(config));
        
        // Current level
        this.currentLevelIndex = 0;
        this.currentLevel = null;
        
        // Progress data
        this.progress = {
            currentLevel: 1,
            completedLevels: [],
            stars: {},      // { levelId: stars }
            bestActions: {} // { levelId: actionCount }
        };
        
        // Load saved progress
        this.loadProgress();
        
        // Initialize current level
        this.loadLevel(this.progress.currentLevel);
    }

    /**
     * Load a specific level
     * @param {number} levelId - Level ID to load
     * @returns {Level|null}
     */
    loadLevel(levelId) {
        const index = this.levels.findIndex(l => l.id === levelId);
        if (index === -1) {
            console.warn(`Level ${levelId} not found`);
            return null;
        }
        
        this.currentLevelIndex = index;
        this.currentLevel = this.levels[index].clone();
        this.currentLevel.reset();
        
        console.log(`Loaded level ${levelId}: ${this.currentLevel.name}`);
        return this.currentLevel;
    }

    /**
     * Get current level
     * @returns {Level}
     */
    getCurrentLevel() {
        return this.currentLevel;
    }

    /**
     * Check if a feature is unlocked at current level
     * @param {string} feature - Feature name from UnlockedFeatures
     * @returns {boolean}
     */
    isFeatureUnlocked(feature) {
        const requiredLevel = UnlockedFeatures[feature];
        return requiredLevel !== undefined && this.progress.currentLevel >= requiredLevel;
    }

    /**
     * Get all unlocked features
     * @returns {Array<string>}
     */
    getUnlockedFeatures() {
        const unlocked = [];
        for (const [feature, level] of Object.entries(UnlockedFeatures)) {
            if (this.progress.currentLevel >= level) {
                unlocked.push(feature);
            }
        }
        return unlocked;
    }

    /**
     * Get next feature to unlock
     * @returns {Object|null} { feature, level }
     */
    getNextUnlock() {
        for (const [feature, level] of Object.entries(UnlockedFeatures)) {
            if (this.progress.currentLevel < level) {
                return { feature, level, remaining: level - this.progress.currentLevel };
            }
        }
        return null;
    }

    /**
     * Complete current level
     * @param {number} actionsUsed - Number of actions used
     * @returns {Object} { stars, isNewBest, unlockedFeature }
     */
    completeLevel(actionsUsed) {
        const level = this.currentLevel;
        const levelId = level.id;
        
        // Calculate stars
        const stars = level.calculateStars(actionsUsed);
        
        // Track best performance
        const previousBest = this.progress.bestActions[levelId] || Infinity;
        const isNewBest = actionsUsed < previousBest;
        
        if (isNewBest) {
            this.progress.bestActions[levelId] = actionsUsed;
        }
        
        // Update stars (keep best)
        const previousStars = this.progress.stars[levelId] || 0;
        if (stars > previousStars) {
            this.progress.stars[levelId] = stars;
        }
        
        // Mark as completed
        if (!this.progress.completedLevels.includes(levelId)) {
            this.progress.completedLevels.push(levelId);
        }
        
        // Unlock next level
        let unlockedFeature = null;
        if (levelId >= this.progress.currentLevel && levelId < this.levels.length) {
            this.progress.currentLevel = levelId + 1;
            
            // Check if new feature unlocked
            for (const [feature, requiredLevel] of Object.entries(UnlockedFeatures)) {
                if (requiredLevel === this.progress.currentLevel) {
                    unlockedFeature = feature;
                    break;
                }
            }
        }
        
        // Save progress
        this.saveProgress();
        
        level.isComplete = true;
        level.stars = Math.max(stars, previousStars);
        
        return {
            stars,
            totalStars: Math.max(stars, previousStars),
            isNewBest,
            bestActions: this.progress.bestActions[levelId],
            unlockedFeature
        };
    }

    /**
     * Go to next level
     * @returns {Level|null}
     */
    nextLevel() {
        const nextId = this.currentLevel.id + 1;
        if (nextId <= this.levels.length) {
            return this.loadLevel(nextId);
        }
        return null;
    }

    /**
     * Go to previous level
     * @returns {Level|null}
     */
    previousLevel() {
        const prevId = this.currentLevel.id - 1;
        if (prevId >= 1) {
            return this.loadLevel(prevId);
        }
        return null;
    }

    /**
     * Go to specific level by ID
     * @param {number} levelId - Level ID to go to
     * @returns {Level|null}
     */
    goToLevel(levelId) {
        if (this.isLevelUnlocked(levelId)) {
            return this.loadLevel(levelId);
        }
        return null;
    }

    /**
     * Check if level is unlocked
     * @param {number} levelId - Level ID
     * @returns {boolean}
     */
    isLevelUnlocked(levelId) {
        return levelId <= this.progress.currentLevel;
    }

    /**
     * Get total stars collected
     * @returns {number}
     */
    getTotalStars() {
        return Object.values(this.progress.stars).reduce((sum, s) => sum + s, 0);
    }

    /**
     * Get max possible stars
     * @returns {number}
     */
    getMaxStars() {
        return this.levels.length * 3;
    }

    /**
     * Get progress percentage
     * @returns {number} 0-100
     */
    getProgressPercentage() {
        return Math.round((this.progress.completedLevels.length / this.levels.length) * 100);
    }

    /**
     * Get level summary for selection screen
     * @returns {Array}
     */
    getLevelSummaries() {
        return this.levels.map(level => ({
            id: level.id,
            name: level.name,
            difficulty: level.difficulty,
            unlocked: this.isLevelUnlocked(level.id),
            completed: this.progress.completedLevels.includes(level.id),
            stars: this.progress.stars[level.id] || 0,
            bestActions: this.progress.bestActions[level.id] || null
        }));
    }

    /**
     * Save progress to localStorage
     */
    saveProgress() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
            console.log('Progress saved');
        } catch (e) {
            console.warn('Could not save progress:', e);
        }
    }

    /**
     * Load progress from localStorage
     */
    loadProgress() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                this.progress = {
                    currentLevel: data.currentLevel || 1,
                    completedLevels: data.completedLevels || [],
                    stars: data.stars || {},
                    bestActions: data.bestActions || {}
                };
                console.log('Progress loaded:', this.progress);
            }
        } catch (e) {
            console.warn('Could not load progress:', e);
        }
    }

    /**
     * Reset all progress
     */
    resetProgress() {
        this.progress = {
            currentLevel: 1,
            completedLevels: [],
            stars: {},
            bestActions: {}
        };
        this.saveProgress();
        this.loadLevel(1);
        console.log('Progress reset');
    }
}
