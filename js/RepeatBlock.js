/**
 * RepeatBlock Class
 * Represents a repeatable wrapper around actions or groups
 * Implements the concept of loops without explicit programming
 */

import { Action } from './Action.js';
import { ActionGroup, GroupReference } from './ActionGroup.js';
import { CONFIG } from './config.js';

/**
 * Maximum allowed repetitions to prevent infinite loops
 */
export const MAX_REPETITIONS = 99;
export const DEFAULT_REPETITIONS = 2;
export const MAX_ITEMS_IN_REPEAT = 2; // Limit items to differentiate from recursion

export class RepeatBlock {
    /**
     * Create a new RepeatBlock
     * @param {number} count - Number of times to repeat
     */
    constructor(count = DEFAULT_REPETITIONS) {
        this.id = RepeatBlock.generateId();
        this.count = Math.min(Math.max(1, count), MAX_REPETITIONS);
        this.items = []; // Actions or GroupReferences to repeat
        
        // Execution state
        this.isExecuting = false;
        this.isComplete = false;
        this.currentIteration = 0;
        this.currentItemIndex = 0;
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    static generateId() {
        return `repeat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add item to repeat block (max 2 items to differentiate from recursion)
     * @param {Action|GroupReference} item - Item to add
     * @returns {boolean} True if added, false if at limit
     */
    addItem(item) {
        if (this.items.length >= MAX_ITEMS_IN_REPEAT) {
            console.warn(`Repeat block limited to ${MAX_ITEMS_IN_REPEAT} items. Use Recursion for more complex patterns!`);
            return false;
        }
        if (item.clone) {
            this.items.push(item.clone());
        } else {
            this.items.push(item);
        }
        return true;
    }
    
    /**
     * Check if at item limit
     * @returns {boolean}
     */
    get isFull() {
        return this.items.length >= MAX_ITEMS_IN_REPEAT;
    }

    /**
     * Set repeat count
     * @param {number} count - New repeat count
     */
    setCount(count) {
        this.count = Math.min(Math.max(1, count), MAX_REPETITIONS);
    }

    /**
     * Increment repeat count
     */
    increment() {
        if (this.count < MAX_REPETITIONS) {
            this.count++;
        }
    }

    /**
     * Decrement repeat count
     */
    decrement() {
        if (this.count > 1) {
            this.count--;
        }
    }

    /**
     * Get all actions expanded for all iterations
     * @returns {Action[]} Array of all actions to execute
     */
    getExpandedActions() {
        const allActions = [];
        
        for (let iteration = 0; iteration < this.count; iteration++) {
            this.items.forEach(item => {
                if (item.isGroupReference && item.isGroupReference()) {
                    // Expand group reference
                    const groupActions = item.getActions();
                    groupActions.forEach(action => {
                        allActions.push({
                            action: action.clone ? action.clone() : action,
                            iteration: iteration,
                            isFromRepeat: true,
                            repeatBlock: this
                        });
                    });
                } else if (item.getActions) {
                    // It's an ActionGroup
                    item.getActions().forEach(action => {
                        allActions.push({
                            action: action,
                            iteration: iteration,
                            isFromRepeat: true,
                            repeatBlock: this
                        });
                    });
                } else {
                    // Regular action
                    allActions.push({
                        action: item.clone ? item.clone() : new Action(item.type),
                        iteration: iteration,
                        isFromRepeat: true,
                        repeatBlock: this
                    });
                }
            });
        }
        
        return allActions;
    }

    /**
     * Get total action count
     * @returns {number} Total actions after expansion
     */
    getTotalActionCount() {
        let itemCount = 0;
        this.items.forEach(item => {
            if (item.isGroupReference && item.isGroupReference()) {
                itemCount += item.group.size;
            } else if (item.size !== undefined) {
                itemCount += item.size;
            } else {
                itemCount += 1;
            }
        });
        return itemCount * this.count;
    }

    /**
     * Get icon representation
     * @returns {string} Icon string
     */
    getIcon() {
        const content = this.items.map(item => {
            if (item.getIcon) {
                return item.getIcon();
            }
            return '?';
        }).join('');
        
        return content.substring(0, 3) + (content.length > 3 ? '…' : '');
    }

    /**
     * Check if this is a repeat block
     * @returns {boolean} Always true
     */
    isRepeatBlock() {
        return true;
    }

    /**
     * Check if this is a group reference (for compatibility)
     * @returns {boolean} Always false
     */
    isGroupReference() {
        return false;
    }

    /**
     * Get the repeat count display
     * @returns {string} Display string like "×3"
     */
    getCountDisplay() {
        return `×${this.count}`;
    }

    /**
     * Reset execution state
     */
    reset() {
        this.isExecuting = false;
        this.isComplete = false;
        this.currentIteration = 0;
        this.currentItemIndex = 0;
        
        // Reset all items
        this.items.forEach(item => {
            if (item.reset) item.reset();
        });
    }

    /**
     * Clone this repeat block
     * @returns {RepeatBlock} New repeat block with same settings
     */
    clone() {
        const newBlock = new RepeatBlock(this.count);
        this.items.forEach(item => {
            if (item.clone) {
                newBlock.items.push(item.clone());
            }
        });
        return newBlock;
    }

    /**
     * Check if block is empty
     * @returns {boolean} True if no items
     */
    get isEmpty() {
        return this.items.length === 0;
    }

    /**
     * Get number of items (not expanded)
     * @returns {number} Number of items
     */
    get size() {
        return this.items.length;
    }

    /**
     * Serialize for storage
     * @returns {Object} Serialized data
     */
    toJSON() {
        return {
            id: this.id,
            count: this.count,
            items: this.items.map(item => {
                if (item.toJSON) return item.toJSON();
                return item;
            })
        };
    }
}
