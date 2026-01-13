
import { Action, ActionType } from './Action.js';
import { GroupColors } from './ActionGroup.js';

// Maximum recursion depth to prevent infinite loops
export const MAX_RECURSION_DEPTH = 5;
export const DEFAULT_RECURSION_DEPTH = 3;

// Unique ID counter for recursive groups
let recursiveGroupIdCounter = 0;

/**
 * RecursiveGroup - A group that contains a self-reference
 * When expanded, it "unrolls" the recursion up to max depth
 */
export class RecursiveGroup {
    /**
     * Create a new recursive group
     * @param {string} name - Optional name for the group
     */
    constructor(name = null) {
        this.id = ++recursiveGroupIdCounter;
        this.name = name || `R${this.id}`;
        this.color = GroupColors[(this.id - 1) % GroupColors.length];
        
        // Actions before the recursive call (pre-actions)
        this.preActions = [];
        
        // Actions after the recursive call (post-actions) 
        this.postActions = [];
        
        // Recursion settings
        this.maxDepth = DEFAULT_RECURSION_DEPTH;
        this.currentDepth = 0;
        
        // State
        this.isComplete = false;
        this.isExecuting = false;
    }

    /**
     * Add action before recursive call
     * @param {Action} action - Action to add
     */
    addPreAction(action) {
        if (action instanceof Action) {
            this.preActions.push(action.clone());
        }
    }

    /**
     * Add action after recursive call
     * @param {Action} action - Action to add
     */
    addPostAction(action) {
        if (action instanceof Action) {
            this.postActions.push(action.clone());
        }
    }

    /**
     * Set maximum recursion depth
     * @param {number} depth - New max depth (1 to MAX_RECURSION_DEPTH)
     */
    setMaxDepth(depth) {
        this.maxDepth = Math.max(1, Math.min(MAX_RECURSION_DEPTH, depth));
    }

    /**
     * Get total number of base actions (pre + post)
     */
    get baseSize() {
        return this.preActions.length + this.postActions.length;
    }

    /**
     * Check if group is empty
     */
    get isEmpty() {
        return this.preActions.length === 0 && this.postActions.length === 0;
    }

    /**
     * Check if this is a recursive group
     * @returns {boolean}
     */
    isRecursiveGroup() {
        return true;
    }

    /**
     * Get short label for UI
     * @returns {string}
     */
    getShortLabel() {
        return `${this.name}()`;
    }

    /**
     * Get icon representation
     * @returns {string}
     */
    getIcon() {
        return '🔄';
    }

    /**
     * Get expanded actions with recursion unrolled
     * Pattern: pre → pre → pre → post → post → post (for depth 3)
     * This simulates: call → call → call → return → return → return
     * 
     * @param {number} depth - Current recursion depth (internal use)
     * @returns {Array} Array of {action, depth, phase, isBaseCase}
     */
    getExpandedActions(depth = 0) {
        const expanded = [];
        
        if (depth >= this.maxDepth) {
            // Base case reached - no more recursion
            return expanded;
        }
        
        const isBaseCase = (depth === this.maxDepth - 1);
        
        // Pre-actions (going down the recursion)
        this.preActions.forEach((action, index) => {
            expanded.push({
                action: action.clone(),
                depth: depth,
                phase: 'pre',
                actionIndex: index,
                isBaseCase: false,
                isFirstAtDepth: index === 0,
                isLastAtDepth: false
            });
        });
        
        // Recursive call (if not at max depth)
        if (!isBaseCase) {
            const nestedExpanded = this.getExpandedActions(depth + 1);
            expanded.push(...nestedExpanded);
        }
        
        // Post-actions (coming back up from recursion)
        this.postActions.forEach((action, index) => {
            expanded.push({
                action: action.clone(),
                depth: depth,
                phase: 'post',
                actionIndex: index,
                isBaseCase: isBaseCase && index === 0,
                isFirstAtDepth: false,
                isLastAtDepth: index === this.postActions.length - 1
            });
        });
        
        return expanded;
    }

    /**
     * Get total action count when fully expanded
     * @returns {number}
     */
    getTotalActionCount() {
        // Formula: (pre + post) * maxDepth
        return this.baseSize * this.maxDepth;
    }

    /**
     * Reset state
     */
    reset() {
        this.isComplete = false;
        this.isExecuting = false;
        this.currentDepth = 0;
        
        this.preActions.forEach(a => a.reset());
        this.postActions.forEach(a => a.reset());
    }

    /**
     * Clone the recursive group
     * @returns {RecursiveGroup}
     */
    clone() {
        const cloned = new RecursiveGroup(this.name);
        cloned.color = this.color;
        cloned.maxDepth = this.maxDepth;
        
        this.preActions.forEach(a => cloned.preActions.push(a.clone()));
        this.postActions.forEach(a => cloned.postActions.push(a.clone()));
        
        return cloned;
    }

    /**
     * Serialize to JSON
     * @returns {Object}
     */
    toJSON() {
        return {
            type: 'RecursiveGroup',
            id: this.id,
            name: this.name,
            color: this.color,
            maxDepth: this.maxDepth,
            preActions: this.preActions.map(a => a.toJSON()),
            postActions: this.postActions.map(a => a.toJSON())
        };
    }

    /**
     * Create from JSON
     * @param {Object} json - Serialized data
     * @returns {RecursiveGroup}
     */
    static fromJSON(json) {
        const group = new RecursiveGroup(json.name);
        group.color = json.color;
        group.maxDepth = json.maxDepth;
        
        if (json.preActions) {
            json.preActions.forEach(actionData => {
                group.preActions.push(Action.fromJSON(actionData));
            });
        }
        
        if (json.postActions) {
            json.postActions.forEach(actionData => {
                group.postActions.push(Action.fromJSON(actionData));
            });
        }
        
        return group;
    }
}

/**
 * RecursiveReference - Reference to a recursive group in the queue
 */
export class RecursiveReference {
    /**
     * Create a reference to a recursive group
     * @param {RecursiveGroup} group - The recursive group to reference
     */
    constructor(group) {
        this.id = Date.now() + Math.random();
        this.group = group;
        this.groupId = group.id;
        
        // Execution state
        this.isComplete = false;
        this.isExecuting = false;
        this.currentDepth = 0;
    }

    /**
     * Check if this is a recursive reference
     * @returns {boolean}
     */
    isRecursiveReference() {
        return true;
    }

    /**
     * Get expanded actions from the referenced group
     * @returns {Array}
     */
    getExpandedActions() {
        return this.group.getExpandedActions();
    }

    /**
     * Get actions (for compatibility)
     * @returns {Array<Action>}
     */
    getActions() {
        return this.getExpandedActions().map(item => item.action);
    }

    /**
     * Get icon
     * @returns {string}
     */
    getIcon() {
        return this.group.getIcon();
    }

    /**
     * Get color
     * @returns {string}
     */
    getColor() {
        return this.group.color;
    }

    /**
     * Get max depth
     * @returns {number}
     */
    getMaxDepth() {
        return this.group.maxDepth;
    }

    /**
     * Reset state
     */
    reset() {
        this.isComplete = false;
        this.isExecuting = false;
        this.currentDepth = 0;
    }
}
