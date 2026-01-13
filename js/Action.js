/**
 * Action Class
 * Represents atomic actions that the ball can perform
 */

import { CONFIG, EASING } from './config.js';

/**
 * Action Types Enum
 */
export const ActionType = {
    MOVE_UP: 'MOVE_UP',
    MOVE_DOWN: 'MOVE_DOWN',
    MOVE_LEFT: 'MOVE_LEFT',
    MOVE_RIGHT: 'MOVE_RIGHT',
    WAIT: 'WAIT'
};

/**
 * Direction vectors for each movement action
 */
export const DirectionVectors = {
    [ActionType.MOVE_UP]: { dx: 0, dy: -1 },
    [ActionType.MOVE_DOWN]: { dx: 0, dy: 1 },
    [ActionType.MOVE_LEFT]: { dx: -1, dy: 0 },
    [ActionType.MOVE_RIGHT]: { dx: 1, dy: 0 },
    [ActionType.WAIT]: { dx: 0, dy: 0 }
};

/**
 * Action icons for UI display
 */
export const ActionIcons = {
    [ActionType.MOVE_UP]: '↑',
    [ActionType.MOVE_DOWN]: '↓',
    [ActionType.MOVE_LEFT]: '←',
    [ActionType.MOVE_RIGHT]: '→',
    [ActionType.WAIT]: '◇'
};

/**
 * Action class representing a single atomic action
 */
export class Action {
    /**
     * Create a new Action
     * @param {string} type - Action type from ActionType enum
     * @param {number} duration - Duration in milliseconds
     */
    constructor(type, duration = CONFIG.animation.actionDuration) {
        this.type = type;
        this.duration = duration;
        this.id = Action.generateId();
        
        // Execution state
        this.isExecuting = false;
        this.isComplete = false;
        this.progress = 0;
    }

    /**
     * Generate unique ID for action
     * @returns {string} Unique ID
     */
    static generateId() {
        return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get direction vector for this action
     * @returns {{dx: number, dy: number}} Direction vector
     */
    getDirection() {
        return DirectionVectors[this.type] || { dx: 0, dy: 0 };
    }

    /**
     * Get icon for this action
     * @returns {string} Icon character
     */
    getIcon() {
        return ActionIcons[this.type] || '?';
    }

    /**
     * Check if this is a movement action
     * @returns {boolean} True if movement action
     */
    isMovement() {
        return this.type !== ActionType.WAIT;
    }

    /**
     * Start executing this action
     */
    start() {
        this.isExecuting = true;
        this.isComplete = false;
        this.progress = 0;
    }

    /**
     * Update action progress
     * @param {number} deltaTime - Time since last update in ms
     * @returns {number} Eased progress (0-1)
     */
    update(deltaTime) {
        if (!this.isExecuting || this.isComplete) {
            return this.progress;
        }

        this.progress += deltaTime / this.duration;
        
        if (this.progress >= 1) {
            this.progress = 1;
            this.isComplete = true;
            this.isExecuting = false;
        }

        // Return eased progress for smooth animation
        return EASING.easeInOutCubic(this.progress);
    }

    /**
     * Reset action state
     */
    reset() {
        this.isExecuting = false;
        this.isComplete = false;
        this.progress = 0;
    }

    /**
     * Clone this action
     * @returns {Action} New action with same type
     */
    clone() {
        return new Action(this.type, this.duration);
    }

    /**
     * Serialize action for storage
     * @returns {Object} Serialized action
     */
    toJSON() {
        return {
            type: this.type,
            duration: this.duration
        };
    }

    /**
     * Create action from serialized data
     * @param {Object} data - Serialized action data
     * @returns {Action} New action instance
     */
    static fromJSON(data) {
        return new Action(data.type, data.duration);
    }
}
