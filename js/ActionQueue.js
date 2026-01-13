/**
 * ActionQueue Class
 * Manages a queue of actions for sequential execution
 * Supports individual actions, group references, and repeat blocks
 */

import { Action, ActionType } from './Action.js';
import { GroupReference } from './ActionGroup.js';
import { RepeatBlock } from './RepeatBlock.js';
import { RecursiveReference } from './RecursiveGroup.js';
import { CONFIG } from './config.js';

/**
 * Queue state enum
 */
export const QueueState = {
    IDLE: 'IDLE',
    RUNNING: 'RUNNING',
    PAUSED: 'PAUSED',
    COMPLETE: 'COMPLETE'
};

export class ActionQueue {
    /**
     * Create a new ActionQueue
     * @param {number} maxSize - Maximum queue size
     */
    constructor(maxSize = CONFIG.actions.maxQueueSize) {
        this.items = [];           // Queue items (actions or group references)
        this.maxSize = maxSize;
        this.currentIndex = 0;
        this.state = QueueState.IDLE;
        
        // For group/repeat execution
        this.expandedActions = [];  // Flattened actions for execution
        this.expandedIndex = 0;
        
        // Callbacks
        this.onActionStart = null;
        this.onActionComplete = null;
        this.onQueueComplete = null;
        this.onQueueChange = null;
        this.onGroupStart = null;
        this.onGroupComplete = null;
        this.onRepeatStart = null;
        this.onRepeatIteration = null;
        this.onRepeatComplete = null;
        this.onRecursionStart = null;
        this.onRecursionDepthChange = null;
        this.onRecursionComplete = null;
    }

    /**
     * Legacy getter for backwards compatibility
     */
    get actions() {
        return this.items;
    }

    /**
     * Add item to queue (action or group reference)
     * @param {Action|GroupReference} item - Item to add
     * @returns {boolean} True if item was added
     */
    add(item) {
        if (this.items.length >= this.maxSize) {
            console.warn('Action queue is full');
            return false;
        }

        if (this.state === QueueState.RUNNING) {
            console.warn('Cannot add items while running');
            return false;
        }

        this.items.push(item);
        this.notifyChange();
        return true;
    }

    /**
     * Add action by type
     * @param {string} actionType - ActionType enum value
     * @returns {boolean} True if action was added
     */
    addByType(actionType) {
        const action = new Action(actionType);
        return this.add(action);
    }

    /**
     * Add group reference to queue
     * @param {ActionGroup} group - Group to reference
     * @returns {boolean} True if added
     */
    addGroupReference(group) {
        const ref = new GroupReference(group);
        return this.add(ref);
    }

    /**
     * Add repeat block to queue
     * @param {RepeatBlock} repeatBlock - Repeat block to add
     * @returns {boolean} True if added
     */
    addRepeatBlock(repeatBlock) {
        return this.add(repeatBlock);
    }

    /**
     * Add recursive reference to queue
     * @param {RecursiveGroup} group - Recursive group to reference
     * @returns {boolean} True if added
     */
    addRecursiveReference(group) {
        const ref = new RecursiveReference(group);
        return this.add(ref);
    }

    /**
     * Remove item at index
     * @param {number} index - Index to remove
     * @returns {Action|GroupReference|null} Removed item or null
     */
    removeAt(index) {
        if (this.state === QueueState.RUNNING) {
            console.warn('Cannot remove items while running');
            return null;
        }

        if (index < 0 || index >= this.items.length) {
            return null;
        }

        const removed = this.items.splice(index, 1)[0];
        this.notifyChange();
        return removed;
    }

    /**
     * Remove last item from queue
     * @returns {Action|GroupReference|null} Removed item or null
     */
    removeLast() {
        return this.removeAt(this.items.length - 1);
    }

    /**
     * Clear all items
     */
    clear() {
        if (this.state === QueueState.RUNNING) {
            this.stop();
        }
        
        this.items = [];
        this.expandedActions = [];
        this.currentIndex = 0;
        this.expandedIndex = 0;
        this.state = QueueState.IDLE;
        this.notifyChange();
    }

    /**
     * Expand all items into flat action list for execution
     */
    expandItems() {
        this.expandedActions = [];
        
        this.items.forEach((item, itemIndex) => {
            if (item.isRepeatBlock && item.isRepeatBlock()) {
                // Expand repeat block
                const expandedRepeat = item.getExpandedActions();
                let lastIteration = -1;
                
                expandedRepeat.forEach((expandedItem, actionIndex) => {
                    const isNewIteration = expandedItem.iteration !== lastIteration;
                    const isLastAction = actionIndex === expandedRepeat.length - 1;
                    
                    this.expandedActions.push({
                        action: expandedItem.action,
                        itemIndex: itemIndex,
                        isFromGroup: false,
                        isFromRepeat: true,
                        isFromRecursion: false,
                        repeatBlock: item,
                        recursiveRef: null,
                        recursionDepth: 0,
                        recursionPhase: null,
                        iteration: expandedItem.iteration,
                        totalIterations: item.count,
                        isFirstInIteration: isNewIteration,
                        isLastInIteration: actionIndex === expandedRepeat.length - 1 || 
                            (expandedRepeat[actionIndex + 1]?.iteration !== expandedItem.iteration),
                        isFirstInRepeat: actionIndex === 0,
                        isLastInRepeat: isLastAction,
                        groupRef: null,
                        actionIndexInGroup: -1,
                        isFirstInGroup: false,
                        isLastInGroup: false
                    });
                    
                    lastIteration = expandedItem.iteration;
                });
            } else if (item.isGroupReference && item.isGroupReference()) {
                // Expand group into individual actions
                const actions = item.getActions();
                actions.forEach((action, actionIndex) => {
                    this.expandedActions.push({
                        action: action,
                        itemIndex: itemIndex,
                        isFromGroup: true,
                        isFromRepeat: false,
                        isFromRecursion: false,
                        repeatBlock: null,
                        recursiveRef: null,
                        recursionDepth: 0,
                        recursionPhase: null,
                        iteration: 0,
                        totalIterations: 1,
                        isFirstInIteration: false,
                        isLastInIteration: false,
                        isFirstInRepeat: false,
                        isLastInRepeat: false,
                        groupRef: item,
                        actionIndexInGroup: actionIndex,
                        isFirstInGroup: actionIndex === 0,
                        isLastInGroup: actionIndex === actions.length - 1
                    });
                });
            } else if (item.isRecursiveReference && item.isRecursiveReference()) {
                // Expand recursive group
                const expandedRecursive = item.getExpandedActions();
                let lastDepth = -1;
                
                expandedRecursive.forEach((expandedItem, actionIndex) => {
                    const isNewDepth = expandedItem.depth !== lastDepth;
                    const isLastAction = actionIndex === expandedRecursive.length - 1;
                    const isFirstAction = actionIndex === 0;
                    
                    this.expandedActions.push({
                        action: expandedItem.action,
                        itemIndex: itemIndex,
                        isFromGroup: false,
                        isFromRepeat: false,
                        isFromRecursion: true,
                        repeatBlock: null,
                        recursiveRef: item,
                        recursionDepth: expandedItem.depth,
                        recursionPhase: expandedItem.phase,
                        recursionMaxDepth: item.getMaxDepth(),
                        isBaseCase: expandedItem.isBaseCase,
                        isFirstAtDepth: expandedItem.isFirstAtDepth,
                        isLastAtDepth: expandedItem.isLastAtDepth,
                        iteration: 0,
                        totalIterations: 1,
                        isFirstInIteration: false,
                        isLastInIteration: false,
                        isFirstInRepeat: false,
                        isLastInRepeat: false,
                        isFirstInRecursion: isFirstAction,
                        isLastInRecursion: isLastAction,
                        groupRef: null,
                        actionIndexInGroup: -1,
                        isFirstInGroup: false,
                        isLastInGroup: false
                    });
                    
                    lastDepth = expandedItem.depth;
                });
            } else {
                // Regular action
                this.expandedActions.push({
                    action: item,
                    itemIndex: itemIndex,
                    isFromGroup: false,
                    isFromRepeat: false,
                    isFromRecursion: false,
                    repeatBlock: null,
                    recursiveRef: null,
                    recursionDepth: 0,
                    recursionPhase: null,
                    iteration: 0,
                    totalIterations: 1,
                    isFirstInIteration: false,
                    isLastInIteration: false,
                    isFirstInRepeat: false,
                    isLastInRepeat: false,
                    groupRef: null,
                    actionIndexInGroup: -1,
                    isFirstInGroup: false,
                    isLastInGroup: false
                });
            }
        });
    }

    /**
     * Get current action being executed
     * @returns {Action|null} Current action or null
     */
    getCurrentAction() {
        if (this.expandedIndex < this.expandedActions.length) {
            return this.expandedActions[this.expandedIndex].action;
        }
        return null;
    }

    /**
     * Get current expanded item info
     * @returns {Object|null} Current item info or null
     */
    getCurrentItemInfo() {
        if (this.expandedIndex < this.expandedActions.length) {
            return this.expandedActions[this.expandedIndex];
        }
        return null;
    }

    /**
     * Start executing the queue
     */
    start() {
        if (this.items.length === 0) {
            console.warn('Cannot start empty queue');
            return;
        }

        if (this.state === QueueState.COMPLETE) {
            this.reset();
        }

        // Expand items into flat action list
        this.expandItems();
        
        if (this.expandedActions.length === 0) {
            console.warn('No actions to execute');
            return;
        }

        this.state = QueueState.RUNNING;
        
        const currentInfo = this.getCurrentItemInfo();
        if (currentInfo) {
            currentInfo.action.start();
            
            // Check if starting a repeat block
            if (currentInfo.isFirstInRepeat && currentInfo.repeatBlock) {
                currentInfo.repeatBlock.isExecuting = true;
                this.onRepeatStart?.(currentInfo.repeatBlock, currentInfo.itemIndex);
            }
            
            // Check if starting a new iteration
            if (currentInfo.isFirstInIteration && currentInfo.repeatBlock) {
                this.onRepeatIteration?.(currentInfo.repeatBlock, currentInfo.iteration, currentInfo.totalIterations);
            }
            
            // Check if starting a recursion
            if (currentInfo.isFirstInRecursion && currentInfo.recursiveRef) {
                currentInfo.recursiveRef.isExecuting = true;
                this.onRecursionStart?.(currentInfo.recursiveRef, currentInfo.itemIndex);
            }
            
            // Check for recursion depth change
            if (currentInfo.isFromRecursion && currentInfo.isFirstAtDepth) {
                this.onRecursionDepthChange?.(currentInfo.recursiveRef, currentInfo.recursionDepth, currentInfo.recursionPhase);
            }
            
            // Check if starting a group
            if (currentInfo.isFirstInGroup && currentInfo.groupRef) {
                currentInfo.groupRef.isExecuting = true;
                this.onGroupStart?.(currentInfo.groupRef, currentInfo.itemIndex);
            }
            
            this.onActionStart?.(currentInfo.action, this.expandedIndex, currentInfo);
        }
        
        this.notifyChange();
    }

    /**
     * Pause queue execution
     */
    pause() {
        if (this.state === QueueState.RUNNING) {
            this.state = QueueState.PAUSED;
        }
    }

    /**
     * Resume queue execution
     */
    resume() {
        if (this.state === QueueState.PAUSED) {
            this.state = QueueState.RUNNING;
        }
    }

    /**
     * Stop queue execution
     */
    stop() {
        this.state = QueueState.IDLE;
        this.reset();
    }

    /**
     * Reset queue to beginning
     */
    reset() {
        this.currentIndex = 0;
        this.expandedIndex = 0;
        this.state = QueueState.IDLE;
        this.expandedActions = [];
        
        // Reset all items
        this.items.forEach(item => {
            if (item.reset) item.reset();
        });
    }

    /**
     * Update queue (called each frame)
     * @param {number} deltaTime - Time since last frame in ms
     * @returns {Object} Update result
     */
    update(deltaTime) {
        const result = {
            action: null,
            progress: 0,
            direction: { dx: 0, dy: 0 },
            actionComplete: false,
            groupInfo: null
        };

        if (this.state !== QueueState.RUNNING) {
            return result;
        }

        const currentInfo = this.getCurrentItemInfo();
        if (!currentInfo) {
            this.state = QueueState.COMPLETE;
            this.onQueueComplete?.();
            return result;
        }

        const currentAction = currentInfo.action;
        result.action = currentAction;
        result.progress = currentAction.update(deltaTime);
        result.direction = currentAction.getDirection();
        result.groupInfo = currentInfo;

        // Check if current action is complete
        if (currentAction.isComplete) {
            result.actionComplete = true;
            this.onActionComplete?.(currentAction, this.expandedIndex, currentInfo);
            
            // Check if repeat iteration is complete
            if (currentInfo.isLastInIteration && currentInfo.repeatBlock) {
                // Iteration complete - check if more iterations
                const hasMoreIterations = currentInfo.iteration < currentInfo.totalIterations - 1;
                if (!hasMoreIterations && currentInfo.isLastInRepeat) {
                    // Repeat block complete
                    currentInfo.repeatBlock.isComplete = true;
                    currentInfo.repeatBlock.isExecuting = false;
                    this.onRepeatComplete?.(currentInfo.repeatBlock, currentInfo.itemIndex);
                }
            }
            
            // Check if group is complete
            if (currentInfo.isLastInGroup && currentInfo.groupRef) {
                currentInfo.groupRef.isComplete = true;
                currentInfo.groupRef.isExecuting = false;
                this.onGroupComplete?.(currentInfo.groupRef, currentInfo.itemIndex);
            }
            
            // Check if recursion is complete
            if (currentInfo.isLastInRecursion && currentInfo.recursiveRef) {
                currentInfo.recursiveRef.isComplete = true;
                currentInfo.recursiveRef.isExecuting = false;
                this.onRecursionComplete?.(currentInfo.recursiveRef, currentInfo.itemIndex);
            }
            
            // Move to next action
            this.expandedIndex++;
            
            const nextInfo = this.getCurrentItemInfo();
            if (nextInfo) {
                nextInfo.action.start();
                
                // Check if starting a repeat block
                if (nextInfo.isFirstInRepeat && nextInfo.repeatBlock) {
                    nextInfo.repeatBlock.isExecuting = true;
                    this.onRepeatStart?.(nextInfo.repeatBlock, nextInfo.itemIndex);
                }
                
                // Check if starting a new iteration
                if (nextInfo.isFirstInIteration && nextInfo.repeatBlock) {
                    this.onRepeatIteration?.(nextInfo.repeatBlock, nextInfo.iteration, nextInfo.totalIterations);
                }
                
                // Check if starting a recursion
                if (nextInfo.isFirstInRecursion && nextInfo.recursiveRef) {
                    nextInfo.recursiveRef.isExecuting = true;
                    this.onRecursionStart?.(nextInfo.recursiveRef, nextInfo.itemIndex);
                }
                
                // Check for recursion depth change
                if (nextInfo.isFromRecursion && nextInfo.isFirstAtDepth) {
                    this.onRecursionDepthChange?.(nextInfo.recursiveRef, nextInfo.recursionDepth, nextInfo.recursionPhase);
                }
                
                // Check if starting a new group
                if (nextInfo.isFirstInGroup && nextInfo.groupRef) {
                    nextInfo.groupRef.isExecuting = true;
                    this.onGroupStart?.(nextInfo.groupRef, nextInfo.itemIndex);
                }
                
                this.onActionStart?.(nextInfo.action, this.expandedIndex, nextInfo);
            } else {
                // Queue complete
                this.state = QueueState.COMPLETE;
                this.onQueueComplete?.();
            }
            
            this.notifyChange();
        }

        return result;
    }

    /**
     * Notify listeners of queue change
     */
    notifyChange() {
        this.onQueueChange?.(this.items, this.currentIndex);
    }

    /**
     * Get queue size (number of items)
     * @returns {number} Number of items in queue
     */
    get size() {
        return this.items.length;
    }

    /**
     * Get total action count (expanded)
     * @returns {number} Total number of actions
     */
    get totalActions() {
        let count = 0;
        this.items.forEach(item => {
            if (item.isGroupReference && item.isGroupReference()) {
                count += item.group.size;
            } else {
                count += 1;
            }
        });
        return count;
    }

    /**
     * Check if queue is empty
     * @returns {boolean} True if empty
     */
    get isEmpty() {
        return this.items.length === 0;
    }

    /**
     * Check if queue is full
     * @returns {boolean} True if full
     */
    get isFull() {
        return this.actions.length >= this.maxSize;
    }

    /**
     * Check if queue is running
     * @returns {boolean} True if running
     */
    get isRunning() {
        return this.state === QueueState.RUNNING;
    }

    /**
     * Serialize queue for storage
     * @returns {Array} Serialized actions
     */
    toJSON() {
        return this.actions.map(action => action.toJSON());
    }

    /**
     * Load queue from serialized data
     * @param {Array} data - Serialized actions
     */
    fromJSON(data) {
        this.clear();
        data.forEach(actionData => {
            const action = Action.fromJSON(actionData);
            this.add(action);
        });
    }
}
