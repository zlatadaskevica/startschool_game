/**
 * ActionGroup Class
 * Represents a reusable group of actions (like a function)
 */

import { Action, ActionType, ActionIcons } from './Action.js';
import { CONFIG } from './config.js';

/**
 * Predefined colors for action groups
 */
export const GroupColors = [
    '#FF6B6B',  // Red
    '#4ECDC4',  // Teal
    '#FFE66D',  // Yellow
    '#95E1D3',  // Mint
    '#F38181',  // Coral
    '#AA96DA',  // Purple
    '#FCBAD3',  // Pink
    '#A8D8EA'   // Light Blue
];

export class ActionGroup {
    /**
     * Create a new ActionGroup
     * @param {string} name - Group name (optional)
     * @param {string} color - Group color
     */
    constructor(name = '', color = null) {
        this.id = ActionGroup.generateId();
        this.name = name || `Block ${ActionGroup.groupCount}`;
        this.color = color || GroupColors[ActionGroup.groupCount % GroupColors.length];
        this.actions = [];
        this.icon = '▣';
        
        ActionGroup.groupCount++;
    }

    /**
     * Static counter for naming groups
     */
    static groupCount = 1;

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    static generateId() {
        return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add action to group
     * @param {Action} action - Action to add
     */
    addAction(action) {
        this.actions.push(action.clone());
    }

    /**
     * Add action by type
     * @param {string} actionType - ActionType enum value
     */
    addActionByType(actionType) {
        this.actions.push(new Action(actionType));
    }

    /**
     * Remove action at index
     * @param {number} index - Index to remove
     */
    removeActionAt(index) {
        if (index >= 0 && index < this.actions.length) {
            this.actions.splice(index, 1);
        }
    }

    /**
     * Get all actions (cloned for execution)
     * @returns {Action[]} Array of cloned actions
     */
    getActions() {
        return this.actions.map(action => action.clone());
    }

    /**
     * Get action count
     * @returns {number} Number of actions
     */
    get size() {
        return this.actions.length;
    }

    /**
     * Check if group is empty
     * @returns {boolean} True if empty
     */
    get isEmpty() {
        return this.actions.length === 0;
    }

    /**
     * Get compact representation of actions
     * @returns {string} Compact string like "↑↑→↓"
     */
    getCompactView() {
        return this.actions.map(a => a.getIcon()).join('');
    }

    /**
     * Get short label for display
     * @param {number} maxLength - Maximum length
     * @returns {string} Short label
     */
    getShortLabel(maxLength = 3) {
        const icons = this.getCompactView();
        if (icons.length <= maxLength) {
            return icons;
        }
        return icons.substring(0, maxLength - 1) + '…';
    }

    /**
     * Clone this group
     * @returns {ActionGroup} New group with same actions
     */
    clone() {
        const newGroup = new ActionGroup(this.name + ' copy', this.color);
        this.actions.forEach(action => {
            newGroup.addAction(action);
        });
        return newGroup;
    }

    /**
     * Serialize group for storage
     * @returns {Object} Serialized group
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            actions: this.actions.map(a => a.toJSON())
        };
    }

    /**
     * Create group from serialized data
     * @param {Object} data - Serialized data
     * @returns {ActionGroup} New group instance
     */
    static fromJSON(data) {
        const group = new ActionGroup(data.name, data.color);
        group.id = data.id;
        data.actions.forEach(actionData => {
            group.actions.push(Action.fromJSON(actionData));
        });
        return group;
    }

    /**
     * Reset static counter
     */
    static resetCounter() {
        ActionGroup.groupCount = 1;
    }
}

/**
 * GroupReference Class
 * Represents a reference to an ActionGroup in the queue
 * This allows the same group to be used multiple times
 */
export class GroupReference {
    /**
     * Create a new GroupReference
     * @param {ActionGroup} group - The referenced group
     */
    constructor(group) {
        this.id = GroupReference.generateId();
        this.groupId = group.id;
        this.group = group;
        
        // Execution state
        this.isExecuting = false;
        this.isComplete = false;
        this.currentActionIndex = 0;
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    static generateId() {
        return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get all actions from the group
     * @returns {Action[]} Array of actions
     */
    getActions() {
        return this.group.getActions();
    }

    /**
     * Get icon for display
     * @returns {string} Icon
     */
    getIcon() {
        return this.group.getShortLabel();
    }

    /**
     * Get the group color
     * @returns {string} Color hex
     */
    getColor() {
        return this.group.color;
    }

    /**
     * Check if this is a group reference
     * @returns {boolean} Always true
     */
    isGroupReference() {
        return true;
    }

    /**
     * Reset execution state
     */
    reset() {
        this.isExecuting = false;
        this.isComplete = false;
        this.currentActionIndex = 0;
    }

    /**
     * Clone this reference
     * @returns {GroupReference} New reference to same group
     */
    clone() {
        return new GroupReference(this.group);
    }
}
