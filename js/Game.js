/**
 * Game Class
 * Main game controller that manages game state and loop
 */

import { CONFIG } from './config.js';
import { Renderer } from './Renderer.js';
import { Grid } from './Grid.js';
import { Ball } from './Ball.js';
import { ActionQueue, QueueState } from './ActionQueue.js';
import { Action, ActionType, ActionIcons } from './Action.js';
import { ActionGroup, GroupReference, GroupColors } from './ActionGroup.js';
import { RepeatBlock, MAX_REPETITIONS, DEFAULT_REPETITIONS, MAX_ITEMS_IN_REPEAT } from './RepeatBlock.js';
import { RecursiveGroup, RecursiveReference, MAX_RECURSION_DEPTH, DEFAULT_RECURSION_DEPTH } from './RecursiveGroup.js';
import { LevelManager } from './LevelManager.js';
import { TargetType, UnlockedFeatures } from './Level.js';
import { EffectsManager, SoundManager, TutorialManager, TUTORIALS } from './Effects.js';
import { AchievementsManager } from './Achievements.js';
import { AnalyticsManager, AnalyticsEvent } from './Analytics.js';
import { AccessibilityManager } from './Accessibility.js';

export class Game {
    /**
     * Create a new Game instance
     * @param {HTMLCanvasElement} canvas - The canvas element
     */
    constructor(canvas) {
        // Core components
        this.renderer = new Renderer(canvas);
        this.grid = new Grid();
        this.ball = null;
        this.actionQueue = new ActionQueue();
        
        // Action Groups
        this.savedGroups = [];
        this.isRecording = false;
        this.recordingGroup = null;
        
        // Repeat Building Mode
        this.isBuildingRepeat = false;
        this.buildingRepeatBlock = null;
        this.repeatCount = DEFAULT_REPETITIONS;
        
        // Recursive Groups
        this.savedRecursiveGroups = [];
        this.activeRecursiveRef = null;
        this.currentRecursionDepth = 0;
        
        // Recursion Building Mode
        this.isBuildingRecursion = false;
        this.buildingRecursiveGroup = null;
        this.recursionPhase = null; // 'enter' or 'exit'
        
        // Level System
        this.levelManager = new LevelManager();
        this.targets = [];
        this.actionsUsed = 0;
        this.levelComplete = false;
        
        // Effects System
        this.effects = new EffectsManager();
        this.sound = new SoundManager();
        this.tutorial = new TutorialManager();
        
        // Engagement System
        this.achievements = new AchievementsManager();
        this.levelAttempts = 0;
        this.levelStartTime = null;
        this.hitObstacleThisRun = false;
        this.usedBlocksThisRun = false;
        this.usedLoopsThisRun = false;
        this.usedRecursionThisRun = false;
        
        // Analytics & Accessibility
        this.analytics = new AnalyticsManager();
        this.accessibility = null; // Initialized after UI setup
        
        // Session timer
        this.sessionStartTime = Date.now();
        this.timerInterval = null;
        this.timerVisible = true;
        
        // Initial ball position
        this.initialBallX = 0;
        this.initialBallY = 0;
        
        // Game state
        this.currentLevel = 1;
        this.isPlaying = false;
        this.isPaused = false;
        
        // Currently executing group (for highlighting)
        this.activeGroupRef = null;
        
        // Animation loop
        this.lastFrameTime = 0;
        this.animationFrameId = null;
        
        // UI Elements
        this.levelDisplay = document.getElementById('current-level');
        this.playButton = document.getElementById('btn-play');
        this.resetButton = document.getElementById('btn-reset');
        this.actionPanel = null;
        this.queueDisplay = null;
        this.groupsPanel = null;
        
        // Initialize
        this.init();
    }

    /**
     * Initialize the game
     */
    init() {
        // Set up grid dimensions
        const { width, height } = this.renderer.getDimensions();
        this.grid.calculateDimensions(width, height);
        
        // Load current level
        this.loadCurrentLevel();
        
        // Set up action queue callbacks
        this.setupActionQueueCallbacks();
        
        // Create UI for actions
        this.createActionUI();
        
        // Create UI for groups
        this.createGroupsUI();
        
        // Create UI for recursive groups
        this.createRecursiveGroupsUI();
        
        // Create level navigation UI
        this.createLevelUI();
        
        // Create engagement UI
        this.createEngagementUI();
        
        // Create timer UI
        this.createTimerUI();
        
        // Create sound controls UI
        this.createSoundControlsUI();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update feature visibility after all UI is created
        this.updateFeatureVisibility();
        
        // Initialize accessibility after UI is ready
        this.accessibility = new AccessibilityManager(this);
        
        // Start game loop
        this.startGameLoop();
        
        // Show tutorial for current level
        this.showLevelTutorial();
        
        console.log('Game initialized - Phase 9: Analytics & Accessibility');
    }

    /**
     * Load current level from LevelManager
     */
    loadCurrentLevel() {
        const level = this.levelManager.getCurrentLevel();
        if (!level) return;
        
        // Update grid if level has different size
        this.grid.cols = level.gridCols;
        this.grid.rows = level.gridRows;
        const { width, height } = this.renderer.getDimensions();
        this.grid.calculateDimensions(width, height);
        
        // Set ball start position
        this.initialBallX = level.startX;
        this.initialBallY = level.startY;
        
        // Create ball
        this.ball = new Ball(this.initialBallX, this.initialBallY);
        this.updateBallPosition();
        
        // Copy targets from level
        this.targets = level.targets.map(t => t.clone());
        
        // Reset state
        this.actionsUsed = 0;
        this.levelComplete = false;
        this.currentLevel = level.id;
        
        // Reset run tracking
        this.levelAttempts = 0;
        this.hitObstacleThisRun = false;
        this.usedBlocksThisRun = false;
        this.usedLoopsThisRun = false;
        this.usedRecursionThisRun = false;
        
        // Start level timer for time-based achievements
        this.levelStartTime = Date.now();
        this.achievements.startLevelTimer();
        this.achievements.recordLevelAttempt(level.id);
        
        // Track analytics
        this.analytics?.startLevel(level.id);
        
        // Update accessibility
        this.accessibility?.updateLevelARIA(level);
        
        // Update UI
        this.updateLevelDisplay();
        this.updateFeatureVisibility();
        
        console.log(`Loaded level ${level.id}: ${level.name}`);
    }

    /**
    * Show tutorial for current level features
     */
    showLevelTutorial() {
        const level = this.levelManager.getCurrentLevel();
        if (!level || !level.tutorial) return;

        const tutorialConfig = TUTORIALS[level.tutorial];
        if (tutorialConfig) {
            this.tutorial.show(level.tutorial, tutorialConfig);
            this.analytics?.track(AnalyticsEvent.TUTORIAL_SHOWN, { tutorial: level.tutorial });
        }
    }

    /**
     * Update feature visibility based on current level requirements
     */
    updateFeatureVisibility() {
        const currentLevel = this.levelManager.currentLevel;
        const requiredFeatures = currentLevel?.requiredFeatures || [];
        
        // Check if feature is required for current level
        const needsBlocks = requiredFeatures.includes('BLOCKS');
        const needsRepeat = requiredFeatures.includes('REPEAT');
        const needsRecursion = requiredFeatures.includes('RECURSION');
        
        // Show/hide record button (blocks)
        const recordBtn = document.getElementById('btn-record');
        if (recordBtn) {
            recordBtn.style.display = needsBlocks ? '' : 'none';
        }
        
        // Show/hide repeat button
        const repeatBtn = document.getElementById('btn-repeat');
        if (repeatBtn) {
            repeatBtn.style.display = needsRepeat ? '' : 'none';
        }
        
        // Show/hide recursion button
        const recursionBtn = document.getElementById('btn-recursion');
        if (recursionBtn) {
            recursionBtn.style.display = needsRecursion ? '' : 'none';
        }
        
        // Show/hide panels
        if (this.groupsPanel) {
            this.groupsPanel.style.display = needsBlocks ? '' : 'none';
        }
        if (this.recursivePanel) {
            this.recursivePanel.style.display = needsRecursion ? '' : 'none';
        }
    }

    /**
     * Set up callbacks for action queue
     */
    setupActionQueueCallbacks() {
        this.actionQueue.onActionStart = (action, index, info) => {
            console.log(`Starting action ${index + 1}: ${action.type}`);
            this.updateQueueDisplay();
            
            // Play move sound
            this.sound.playMove();
            
            // Calculate target position
            const direction = action.getDirection();
            const targetX = this.ball.gridX + direction.dx;
            const targetY = this.ball.gridY + direction.dy;
            
            // Check if valid move
            if (this.grid.isValidPosition(targetX, targetY)) {
                this.ball.startMove(targetX, targetY);
            }
        };
        
        this.actionQueue.onActionComplete = (action, index, info) => {
            console.log(`Completed action ${index + 1}: ${action.type}`);
            this.ball.completeAnimation();
            this.actionsUsed++;
            
            // Spawn move effect
            this.effects.spawnMoveEffect(this.ball.pixelX, this.ball.pixelY, CONFIG.colors.primary);
            
            // Check if ball hit any targets
            this.checkTargetCollision();
            
            this.updateQueueDisplay();
        };
        
        this.actionQueue.onGroupStart = (groupRef, itemIndex) => {
            console.log(`Starting group: ${groupRef.group.name}`);
            this.activeGroupRef = groupRef;
            this.updateQueueDisplay();
            this.updateGroupsDisplay();
        };
        
        this.actionQueue.onGroupComplete = (groupRef, itemIndex) => {
            console.log(`Completed group: ${groupRef.group.name}`);
            this.activeGroupRef = null;
            this.updateQueueDisplay();
            this.updateGroupsDisplay();
        };
        
        // Repeat block callbacks
        this.actionQueue.onRepeatStart = (repeatBlock, itemIndex) => {
            console.log(`Starting repeat block: ${repeatBlock.count}x`);
            this.updateQueueDisplay();
        };
        
        this.actionQueue.onRepeatIteration = (repeatBlock, iteration, totalIterations) => {
            console.log(`Repeat iteration: ${iteration + 1}/${totalIterations}`);
            this.updateQueueDisplay();
        };
        
        this.actionQueue.onRepeatComplete = (repeatBlock, itemIndex) => {
            console.log(`Completed repeat block: ${repeatBlock.count}x`);
            this.updateQueueDisplay();
        };
        
        // Recursion callbacks
        this.actionQueue.onRecursionStart = (recursiveRef, itemIndex) => {
            console.log(`Starting recursion: ${recursiveRef.group.name}()`);
            this.activeRecursiveRef = recursiveRef;
            this.currentRecursionDepth = 0;
            this.updateQueueDisplay();
            this.updateRecursiveGroupsDisplay();
        };
        
        this.actionQueue.onRecursionDepthChange = (recursiveRef, depth, phase) => {
            console.log(`Recursion depth: ${depth} (${phase})`);
            this.currentRecursionDepth = depth;
            this.updateQueueDisplay();
        };
        
        this.actionQueue.onRecursionComplete = (recursiveRef, itemIndex) => {
            console.log(`Completed recursion: ${recursiveRef.group.name}()`);
            this.activeRecursiveRef = null;
            this.currentRecursionDepth = 0;
            this.updateQueueDisplay();
            this.updateRecursiveGroupsDisplay();
        };
        
        this.actionQueue.onQueueComplete = () => {
            console.log('All actions complete!');
            this.isPlaying = false;
            this.activeGroupRef = null;
            this.activeRecursiveRef = null;
            
            // Check win condition
            this.checkWinCondition();
            
            this.updatePlayButton();
            this.updateQueueDisplay();
            this.updateGroupsDisplay();
            this.updateRecursiveGroupsDisplay();
        };
        
        this.actionQueue.onQueueChange = () => {
            this.updateQueueDisplay();
        };
    }

    /**
     * Create action selection UI
     */
    createActionUI() {
        const footer = document.querySelector('.game-footer');
        if (!footer) return;
        
        // Create action panel container
        const actionContainer = document.createElement('div');
        actionContainer.className = 'action-container';
        actionContainer.innerHTML = `
            <div class="queue-display" role="list" aria-label="Action queue">
                <div class="queue-header">
                    <span class="queue-label">Queue:</span>
                    <span class="queue-max" id="queue-max"></span>
                    <button class="clear-all-btn" id="btn-clear-queue" title="Clear all">✕</button>
                </div>
                <div class="queue-items" id="queue-items"></div>
            </div>
            <div class="action-buttons" role="toolbar" aria-label="Add actions">
                <button class="action-btn" data-action="${ActionType.MOVE_UP}" aria-label="Move up">
                    ${ActionIcons[ActionType.MOVE_UP]}
                </button>
                <button class="action-btn" data-action="${ActionType.MOVE_LEFT}" aria-label="Move left">
                    ${ActionIcons[ActionType.MOVE_LEFT]}
                </button>
                <button class="action-btn" data-action="${ActionType.MOVE_DOWN}" aria-label="Move down">
                    ${ActionIcons[ActionType.MOVE_DOWN]}
                </button>
                <button class="action-btn" data-action="${ActionType.MOVE_RIGHT}" aria-label="Move right">
                    ${ActionIcons[ActionType.MOVE_RIGHT]}
                </button>
                <div class="action-separator"></div>
                <button class="action-btn record-btn" id="btn-record" aria-label="Record block" title="BLOCK: Save actions to reuse">
                    <span style="font-family: 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif;">💾</span>
                </button>
                <button class="action-btn repeat-btn" id="btn-repeat" aria-label="Start/finish repeat block" title="LOOP: Click to start, add actions, click again to finish">
                    <span style="font-family: 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif;">🔁</span>
                </button>
                <button class="action-btn recursion-btn" id="btn-recursion" aria-label="Create nest pattern" title="NEST: IN→→→OUT pattern">
                    <span style="font-family: 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif;">🌀</span>
                </button>
            </div>
        `;
        
        // Insert before controls
        const controls = footer.querySelector('.controls');
        footer.insertBefore(actionContainer, controls);
        
        // Store references
        this.actionPanel = actionContainer;
        this.queueDisplay = document.getElementById('queue-items');
        
        // Add event listeners for action buttons (only those with data-action)
        const actionButtons = actionContainer.querySelectorAll('.action-btn[data-action]');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const actionType = btn.dataset.action;
                if (actionType) {
                    this.addAction(actionType);
                }
            });
        });
        
        // Clear queue button
        const clearBtn = document.getElementById('btn-clear-queue');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearQueue());
        }
        
        // Record button
        const recordBtn = document.getElementById('btn-record');
        if (recordBtn) {
            recordBtn.addEventListener('click', () => this.toggleRecording());
        }
        
        // Repeat button - toggle mode
        const repeatBtn = document.getElementById('btn-repeat');
        if (repeatBtn) {
            repeatBtn.addEventListener('click', () => this.toggleRepeatMode());
        }
        
        // Recursion button
        const recursionBtn = document.getElementById('btn-recursion');
        if (recursionBtn) {
            recursionBtn.addEventListener('click', () => this.createRecursiveGroup());
        }
    }

    /**
    * Create groups UI panel
     */
    createGroupsUI() {
        const footer = document.querySelector('.game-footer');
        if (!footer) return;
        
        // Create groups panel
        const groupsPanel = document.createElement('div');
        groupsPanel.className = 'groups-panel';
        groupsPanel.innerHTML = `
            <div class="groups-header">
                <span class="groups-label">Blocks:</span>
                <span class="recording-indicator" id="recording-indicator">● REC</span>
                <button class="clear-all-btn" id="btn-clear-blocks" title="Clear all">✕</button>
            </div>
            <div class="groups-list" id="groups-list">
                <div class="groups-empty">Press 💾 to save block</div>
            </div>
        `;
        
        // Clear all blocks button
        const clearBlocksBtn = groupsPanel.querySelector('#btn-clear-blocks');
        if (clearBlocksBtn) {
            clearBlocksBtn.addEventListener('click', () => this.clearAllBlocks());
        }
        
        // Insert before action container
        const actionContainer = footer.querySelector('.action-container');
        footer.insertBefore(groupsPanel, actionContainer);
        
        this.groupsPanel = groupsPanel;
        this.updateGroupsDisplay();
    }

    /**
    * Create recursive groups UI panel
     */
    createRecursiveGroupsUI() {
        const footer = document.querySelector('.game-footer');
        if (!footer) return;
        
        // Create recursive groups panel
        const recursivePanel = document.createElement('div');
        recursivePanel.className = 'recursive-panel';
        recursivePanel.innerHTML = `
            <div class="recursive-header">
                <span class="recursive-label">Nest:</span>
                <span class="depth-indicator" id="depth-indicator"></span>
                <button class="clear-all-btn" id="btn-clear-recursion" title="Clear all">✕</button>
            </div>
            <div class="recursive-list" id="recursive-list">
                <div class="recursive-empty">Press 🌀 to create</div>
            </div>
        `;
        
        // Clear all recursion button
        const clearRecursionBtn = recursivePanel.querySelector('#btn-clear-recursion');
        if (clearRecursionBtn) {
            clearRecursionBtn.addEventListener('click', () => this.clearAllRecursion());
        }
        
        // Insert before groups panel
        const groupsPanel = footer.querySelector('.groups-panel');
        footer.insertBefore(recursivePanel, groupsPanel);
        
        this.recursivePanel = recursivePanel;
        this.updateRecursiveGroupsDisplay();
    }

    /**
    * Create a recursive group with Enter/Exit pattern
     * User adds Enter actions, then Exit actions
     */
    createRecursiveGroup() {
        if (this.isPlaying) {
            console.warn('Cannot create recursive function while playing');
            return;
        }
        
        if (this.isRecording || this.isBuildingRepeat) {
            console.warn('Finish current action first');
            return;
        }
        
        if (this.isBuildingRecursion) {
            // Second click - finish recursion
            this.finishRecursiveGroup();
        } else {
            // First click - start building
            this.startRecursiveGroup();
        }
    }
    
    /**
     * Start building recursive group
     */
    startRecursiveGroup() {
        this.isBuildingRecursion = true;
        this.buildingRecursiveGroup = new RecursiveGroup();
        this.recursionPhase = 'enter'; // 'enter' or 'exit'
        
        this.updateRecursionBuildUI();
        this.updateQueueDisplay();
        this.showMessage('🌀 Add ENTER actions, then click 🌀 for EXIT', 'info');
        console.log('Started building recursion - ENTER phase');
    }
    
    /**
     * Switch to exit phase or finish
     */
    finishRecursiveGroup() {
        if (this.recursionPhase === 'enter') {
            // Switch to exit phase
            if (this.buildingRecursiveGroup.preActions.length === 0) {
                this.showMessage('Add at least one ENTER action!', 'warning');
                return;
            }
            this.recursionPhase = 'exit';
            this.updateRecursionBuildUI();
            this.updateQueueDisplay();
            this.showMessage('🌀 Add EXIT actions (optional), click 🌀 to finish', 'info');
            console.log('Recursion - switched to EXIT phase');
        } else {
            // Finish building - OUT can be empty (just means no exit actions)
            // Save the group
            this.savedRecursiveGroups.push(this.buildingRecursiveGroup);
            
            console.log(`Created recursion: ${this.buildingRecursiveGroup.name}() - Enter: ${this.buildingRecursiveGroup.preActions.length}, Exit: ${this.buildingRecursiveGroup.postActions.length}`);
            
            // Reset state
            this.isBuildingRecursion = false;
            this.buildingRecursiveGroup = null;
            this.recursionPhase = null;
            
            this.updateRecursionBuildUI();
            this.updateRecursiveGroupsDisplay();
            this.updateQueueDisplay();
        }
    }
    
    /**
     * Cancel recursion building
     */
    cancelRecursiveGroup() {
        this.isBuildingRecursion = false;
        this.buildingRecursiveGroup = null;
        this.recursionPhase = null;
        this.updateRecursionBuildUI();
        this.updateQueueDisplay();
    }
    
    /**
     * Update recursion button UI
     */
    updateRecursionBuildUI() {
        const recursionBtn = document.getElementById('btn-recursion');
        if (!recursionBtn) return;
        
        if (this.isBuildingRecursion) {
            if (this.recursionPhase === 'enter') {
                recursionBtn.classList.add('building-recursion');
                recursionBtn.innerHTML = '<span style="font-family: \'Segoe UI Emoji\', sans-serif;">➡️</span>';
                recursionBtn.title = 'Click to switch to EXIT actions';
            } else {
                recursionBtn.innerHTML = '<span style="font-family: \'Segoe UI Emoji\', sans-serif;">✅</span>';
                recursionBtn.title = 'Click to finish nest';
            }
        } else {
            recursionBtn.classList.remove('building-recursion');
            recursionBtn.innerHTML = '<span style="font-family: \'Segoe UI Emoji\', sans-serif;">🌀</span>';
            recursionBtn.title = 'NEST: IN→→→OUT pattern';
        }
    }

    /**
    * Update recursive groups display
     */
    updateRecursiveGroupsDisplay() {
        const recursiveList = document.getElementById('recursive-list');
        if (!recursiveList) return;
        
        recursiveList.innerHTML = '';
        
        // Update depth indicator
        const depthIndicator = document.getElementById('depth-indicator');
        if (depthIndicator) {
            if (this.activeRecursiveRef) {
                depthIndicator.textContent = `depth: ${this.currentRecursionDepth}`;
                depthIndicator.classList.add('active');
            } else {
                depthIndicator.textContent = '';
                depthIndicator.classList.remove('active');
            }
        }
        
        if (this.savedRecursiveGroups.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'recursive-empty';
            empty.textContent = 'Press 🌀 to create';
            recursiveList.appendChild(empty);
            return;
        }
        
        this.savedRecursiveGroups.forEach((group, index) => {
            const groupEl = document.createElement('div');
            groupEl.className = 'recursive-item';
            groupEl.style.borderColor = group.color;
            groupEl.style.backgroundColor = group.color + '20';
            
            // Check if this group is currently executing
            if (this.activeRecursiveRef && this.activeRecursiveRef.groupId === group.id) {
                groupEl.classList.add('recursive-item-active');
            }
            
            // Show Enter/Exit pattern
            const enterIcons = group.preActions.map(a => a.getIcon()).join('');
            const exitIcons = group.postActions.map(a => a.getIcon()).join('');
            
            groupEl.innerHTML = `
                <span class="recursive-icon" style="background-color: ${group.color}">🌀</span>
                <span class="recursive-pattern">
                    <span class="pattern-enter">${enterIcons}</span>
                    <span class="pattern-separator">→🌀→</span>
                    <span class="pattern-exit">${exitIcons}</span>
                </span>
                <span class="recursive-depth">×${group.maxDepth}</span>
                <button class="item-delete-btn" data-index="${index}" title="Delete">✕</button>
            `;
            
            // Delete button
            const deleteBtn = groupEl.querySelector('.item-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteRecursiveGroup(index);
                });
            }
            
            // Click to add to queue
            groupEl.addEventListener('click', () => {
                if (!this.isPlaying && !this.isRecording && !this.isBuildingRecursion) {
                    this.addRecursiveGroupToQueue(group);
                }
            });
            
            // Right click to cycle depth
            groupEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (!this.isPlaying) {
                    this.cycleRecursionDepth(group, index);
                }
            });
            
            recursiveList.appendChild(groupEl);
        });
    }

    /**
    * Add recursive group reference to queue
     * @param {RecursiveGroup} group - Group to add
     */
    addRecursiveGroupToQueue(group) {
        if (this.isPlaying) return;
        
        const success = this.actionQueue.addRecursiveReference(group);
        if (success) {
            // Track for achievements
            this.usedRecursionThisRun = true;
            this.achievements.recordRecursionUsed();
            
            // Track analytics
            this.analytics?.track(AnalyticsEvent.RECURSION_USED, { 
                name: group.name, 
                depth: group.maxDepth 
            });
            
            console.log(`Added recursive function ${group.name}() to queue (depth ${group.maxDepth})`);
        }
    }

    /**
     * Change recursion depth during building
     * @param {number} delta - Amount to change (+1 or -1)
     */
    changeRecursionDepth(delta) {
        if (!this.buildingRecursiveGroup) return;
        
        const newDepth = Math.max(1, Math.min(MAX_RECURSION_DEPTH, this.buildingRecursiveGroup.maxDepth + delta));
        this.buildingRecursiveGroup.setMaxDepth(newDepth);
        console.log(`Recursion depth changed to: ${newDepth}`);
        
        this.updateQueueDisplay();
    }

    /**
    * Cycle recursion depth
     * @param {RecursiveGroup} group - Group to modify
     * @param {number} index - Index in saved groups
     */
    cycleRecursionDepth(group, index) {
        // Cycle through: 2 → 3 → 4 → 5 → 2
        const cycleValues = [2, 3, 4, 5];
        const currentIndex = cycleValues.indexOf(group.maxDepth);
        const nextIndex = (currentIndex + 1) % cycleValues.length;
        
        group.setMaxDepth(cycleValues[nextIndex]);
        console.log(`Recursion depth changed to: ${group.maxDepth}`);
        
        this.updateRecursiveGroupsDisplay();
    }

    /**
     * Save current queue as a block (one click)
     */
    toggleRecording() {
        if (this.isPlaying) {
            console.warn('Cannot save block while playing');
            return;
        }
        
        if (this.actionQueue.isEmpty) {
            console.warn('Add some actions first before saving block');
            return;
        }
        
        // Create new group from current queue
        const newGroup = new ActionGroup();
        
        // Copy current queue actions to the group
        this.actionQueue.items.forEach(item => {
            if (item.isGroupReference && item.isGroupReference()) {
                item.getActions().forEach(action => {
                    newGroup.addAction(action);
                });
            } else if (item instanceof Action) {
                newGroup.addAction(item);
            }
        });
        
        if (newGroup.isEmpty) {
            console.warn('No actions to save');
            return;
        }
        
        // Save the group
        this.savedGroups.push(newGroup);
        console.log(`Saved block: ${newGroup.name} with ${newGroup.size} actions`);
        
        // Track for achievements
        this.usedBlocksThisRun = true;
        this.achievements.recordBlockCreated();
        
        // Track analytics
        this.analytics?.track(AnalyticsEvent.BLOCK_CREATED, { 
            name: newGroup.name, 
            size: newGroup.size 
        });
        
        // Clear queue after saving
        this.actionQueue.clear();
        
        this.updateGroupsDisplay();
        this.updateQueueDisplay();
    }

    /**
     * Start recording a new group
     */
    startRecording() {
        if (this.actionQueue.isEmpty) {
            console.warn('Add some actions first before recording');
            return;
        }
        
        this.isRecording = true;
        this.recordingGroup = new ActionGroup();
        
        // Copy current queue actions to the group
        this.actionQueue.items.forEach(item => {
            if (item.isGroupReference && item.isGroupReference()) {
                // Add each action from the group
                item.getActions().forEach(action => {
                    this.recordingGroup.addAction(action);
                });
            } else {
                this.recordingGroup.addAction(item);
            }
        });
        
        this.updateRecordingUI();
        console.log('Recording started');
    }

    /**
     * Stop recording and save the group
     */
    stopRecording() {
        if (!this.recordingGroup || this.recordingGroup.isEmpty) {
            this.isRecording = false;
            this.recordingGroup = null;
            this.updateRecordingUI();
            return;
        }
        
        // Save the group
        this.savedGroups.push(this.recordingGroup);
        console.log(`Saved group: ${this.recordingGroup.name} with ${this.recordingGroup.size} actions`);
        
        // Track for achievements
        this.usedBlocksThisRun = true;
        this.achievements.recordBlockCreated();
        
        // Track analytics
        this.analytics?.track(AnalyticsEvent.BLOCK_CREATED, { 
            name: this.recordingGroup.name, 
            size: this.recordingGroup.size 
        });
        
        // Clear queue after saving
        this.actionQueue.clear();
        
        this.isRecording = false;
        this.recordingGroup = null;
        
        this.updateRecordingUI();
        this.updateGroupsDisplay();
        this.updateQueueDisplay();
    }

    /**
     * Update recording UI state
     */
    updateRecordingUI() {
        const recordBtn = document.getElementById('btn-record');
        const indicator = document.getElementById('recording-indicator');
        
        if (recordBtn) {
            if (this.isRecording) {
                recordBtn.classList.add('recording');
                recordBtn.textContent = '■';
                recordBtn.setAttribute('aria-label', 'Stop recording');
            } else {
                recordBtn.classList.remove('recording');
                recordBtn.textContent = '●';
                recordBtn.setAttribute('aria-label', 'Record block');
            }
        }
        
        if (indicator) {
            indicator.classList.toggle('active', this.isRecording);
        }
    }

    /**
     * Update groups display
     */
    updateGroupsDisplay() {
        const groupsList = document.getElementById('groups-list');
        if (!groupsList) return;
        
        groupsList.innerHTML = '';
        
        if (this.savedGroups.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'groups-empty';
            empty.textContent = 'Press 💾 to save block';
            groupsList.appendChild(empty);
            return;
        }
        
        this.savedGroups.forEach((group, index) => {
            const groupEl = document.createElement('div');
            groupEl.className = 'group-item';
            groupEl.style.borderColor = group.color;
            groupEl.style.backgroundColor = group.color + '20';
            
            // Check if this group is currently executing
            if (this.activeGroupRef && this.activeGroupRef.groupId === group.id) {
                groupEl.classList.add('group-item-active');
            }
            
            groupEl.innerHTML = `
                <span class="group-icon" style="background-color: ${group.color}">${group.getShortLabel()}</span>
                <span class="group-name">${group.name}</span>
                <span class="group-count">${group.size}</span>
                <button class="item-delete-btn" data-index="${index}" title="Delete">✕</button>
            `;
            
            // Delete button
            const deleteBtn = groupEl.querySelector('.item-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteGroup(index);
                });
            }
            
            // Click to add to queue
            groupEl.addEventListener('click', () => {
                if (!this.isPlaying && !this.isRecording) {
                    this.addGroupToQueue(group);
                }
            });
            
            // Right click to delete
            groupEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (!this.isPlaying) {
                    this.deleteGroup(index);
                }
            });
            
            groupsList.appendChild(groupEl);
        });
    }

    /**
     * Add group reference to queue
     * @param {ActionGroup} group - Group to add
     */
    addGroupToQueue(group) {
        if (this.isPlaying) return;
        
        // Check queue size limit
        const level = this.levelManager.getCurrentLevel();
        if (level && level.maxQueueSize > 0 && this.actionQueue.items.length >= level.maxQueueSize) {
            console.warn(`Queue full! Max ${level.maxQueueSize} items allowed`);
            return;
        }
        
        const success = this.actionQueue.addGroupReference(group);
        if (success) {
            console.log(`Added group ${group.name} to queue`);
            this.updateQueueDisplay();
        }
    }

    /**
    * Toggle repeat building mode
     * Click once to start building, click again to finish
     */
    toggleRepeatMode() {
        if (this.isPlaying) {
            console.warn('Cannot create repeat while playing');
            return;
        }
        
        if (this.isRecording) {
            console.warn('Cannot create repeat while recording block');
            return;
        }
        
        if (this.isBuildingRepeat) {
            // Finish building repeat
            this.finishRepeatBlock();
        } else {
            // Start building repeat
            this.startRepeatBlock();
        }
    }
    
    /**
     * Start building a repeat block
     */
    startRepeatBlock() {
        this.isBuildingRepeat = true;
        this.buildingRepeatBlock = new RepeatBlock(this.repeatCount);
        this.updateRepeatUI();
        this.updateQueueDisplay();
        console.log('Started building repeat block');
    }
    
    /**
     * Finish building repeat block and add to queue
     */
    finishRepeatBlock() {
        if (!this.buildingRepeatBlock || this.buildingRepeatBlock.isEmpty) {
            console.warn('Add some actions to the repeat block first');
            this.isBuildingRepeat = false;
            this.buildingRepeatBlock = null;
            this.updateRepeatUI();
            this.updateQueueDisplay();
            return;
        }
        
        // Check queue size limit
        const level = this.levelManager.getCurrentLevel();
        if (level && level.maxQueueSize > 0 && this.actionQueue.items.length >= level.maxQueueSize) {
            console.warn(`Queue full! Max ${level.maxQueueSize} items allowed. Repeat not added.`);
            // Still close the builder, just don't add
            this.isBuildingRepeat = false;
            this.buildingRepeatBlock = null;
            this.updateRepeatUI();
            this.updateQueueDisplay();
            return;
        }
        
        // Add the repeat block to queue
        this.actionQueue.addRepeatBlock(this.buildingRepeatBlock);
        
        // Track for achievements
        this.usedLoopsThisRun = true;
        this.achievements.recordLoopUsed();
        
        // Track analytics
        this.analytics?.track(AnalyticsEvent.LOOP_USED, { count: this.buildingRepeatBlock.count });
        
        console.log(`Created repeat block: ${this.buildingRepeatBlock.count}x with ${this.buildingRepeatBlock.size} items`);
        
        // Reset state
        this.isBuildingRepeat = false;
        this.buildingRepeatBlock = null;
        
        this.updateRepeatUI();
        this.updateQueueDisplay();
    }
    
    /**
     * Cancel repeat building mode
     */
    cancelRepeatBlock() {
        this.isBuildingRepeat = false;
        this.buildingRepeatBlock = null;
        this.updateRepeatUI();
        this.updateQueueDisplay();
        console.log('Cancelled repeat block');
    }
    
    /**
     * Change repeat count while building
     */
    changeRepeatCount(delta) {
        if (!this.isBuildingRepeat) return;
        
        const newCount = Math.max(1, Math.min(MAX_REPETITIONS, this.repeatCount + delta));
        this.repeatCount = newCount;
        
        if (this.buildingRepeatBlock) {
            this.buildingRepeatBlock.count = newCount;
        }
        
        this.updateRepeatUI();
        this.updateQueueDisplay();
    }
    
    /**
     * Update repeat button UI to show current mode
     */
    updateRepeatUI() {
        const repeatBtn = document.getElementById('btn-repeat');
        if (!repeatBtn) return;
        
        if (this.isBuildingRepeat) {
            repeatBtn.classList.add('building-repeat');
            repeatBtn.innerHTML = '<span style="font-family: \'Segoe UI Emoji\', sans-serif;">✅</span>';
            repeatBtn.setAttribute('aria-label', 'Finish repeat block');
            repeatBtn.title = 'Click to finish repeat block';
        } else {
            repeatBtn.classList.remove('building-repeat');
            repeatBtn.innerHTML = '<span style="font-family: \'Segoe UI Emoji\', sans-serif;">🔁</span>';
            repeatBtn.setAttribute('aria-label', 'Start repeat block');
            repeatBtn.title = 'LOOP: Click to start, add actions, click again to finish';
        }
    }

    /**
     * Delete a saved group
     * @param {number} index - Index of group to delete
     */
    deleteGroup(index) {
        if (index >= 0 && index < this.savedGroups.length) {
            const group = this.savedGroups[index];
            this.savedGroups.splice(index, 1);
            console.log(`Deleted group: ${group.name}`);
            this.updateGroupsDisplay();
        }
    }

    /**
     * Clear all saved blocks/groups
     */
    clearAllBlocks() {
        if (this.savedGroups.length === 0) {
            return; // Nothing to clear
        }
        
        this.savedGroups = [];
        this.updateGroupsDisplay();
        this.sound.playClick();
        console.log('Cleared all blocks');
        this.accessibility?.announcer?.announce('All blocks cleared');
    }

    /**
     * Delete a saved recursive group
     * @param {number} index - Index of group to delete
     */
    deleteRecursiveGroup(index) {
        if (index >= 0 && index < this.savedRecursiveGroups.length) {
            const group = this.savedRecursiveGroups[index];
            this.savedRecursiveGroups.splice(index, 1);
            console.log(`Deleted recursive group: ${group.name}`);
            this.updateRecursiveGroupsDisplay();
        }
    }

    /**
     * Clear all saved recursive groups
     */
    clearAllRecursion() {
        if (this.savedRecursiveGroups.length === 0) {
            return; // Nothing to clear
        }
        
        this.savedRecursiveGroups = [];
        this.updateRecursiveGroupsDisplay();
        this.sound.playClick();
        console.log('Cleared all nest');
        this.accessibility?.announcer?.announce('All nest cleared');
    }

    /**
     * Add action to queue (also records if recording)
     * @param {string} actionType - Type of action to add
     */
    addAction(actionType) {
        if (this.isPlaying) {
            console.warn('Cannot add actions while playing');
            return;
        }
        
        // Don't add to queue if recording - only record
        if (this.isRecording) {
            // Just show visual feedback
            this.animateActionAdd(actionType);
            this.sound.playClick();
            return;
        }
        
        // If building recursion, add to recursive group
        if (this.isBuildingRecursion && this.buildingRecursiveGroup) {
            const action = new Action(actionType);
            if (this.recursionPhase === 'enter') {
                this.buildingRecursiveGroup.addPreAction(action);
                console.log(`Added ${actionType} to recursion ENTER`);
            } else {
                this.buildingRecursiveGroup.addPostAction(action);
                console.log(`Added ${actionType} to recursion EXIT`);
            }
            this.animateActionAdd(actionType);
            this.sound.playClick();
            this.updateQueueDisplay();
            return;
        }
        
        // If building repeat, add to repeat block instead of queue
        if (this.isBuildingRepeat && this.buildingRepeatBlock) {
            // Check if repeat block is full
            if (this.buildingRepeatBlock.isFull) {
                this.showMessage(`🔁 Max ${MAX_ITEMS_IN_REPEAT} in loop! Use 🌀 Recursion`, 'warning');
                this.sound.playError();
                return;
            }
            const action = new Action(actionType);
            this.buildingRepeatBlock.addItem(action);
            this.animateActionAdd(actionType);
            this.sound.playClick();
            this.updateQueueDisplay();
            console.log(`Added ${actionType} to repeat block`);
            return;
        }
        
        // Check queue size limit
        const level = this.levelManager.getCurrentLevel();
        if (level && level.maxQueueSize > 0 && this.actionQueue.items.length >= level.maxQueueSize) {
            console.warn(`Queue full! Max ${level.maxQueueSize} items allowed`);
            return;
        }
        
        const success = this.actionQueue.addByType(actionType);
        
        if (success) {
            // Visual feedback
            this.animateActionAdd(actionType);
            this.sound.playClick();
            
            // Track analytics
            this.analytics?.track(AnalyticsEvent.ACTION_ADDED, { type: actionType });
            
            // Announce for accessibility
            this.accessibility?.announcer?.announceAction(actionType);
        }
    }

    /**
     * Animate action being added
     * @param {string} actionType - Type of action added
     */
    animateActionAdd(actionType) {
        // Flash the corresponding button
        const btn = this.actionPanel?.querySelector(`[data-action="${actionType}"]`);
        if (btn) {
            btn.classList.add('action-btn-active');
            setTimeout(() => btn.classList.remove('action-btn-active'), 150);
        }
    }

    /**
     * Update queue display UI
     */
    updateQueueDisplay() {
        if (!this.queueDisplay) return;
        
        this.queueDisplay.innerHTML = '';
        
        // Get info about currently executing action
        const currentInfo = this.isPlaying ? this.actionQueue.getCurrentItemInfo() : null;
        
        this.actionQueue.items.forEach((queueItem, index) => {
            const item = document.createElement('div');
            
            // Check if this is a repeat block
            if (queueItem.isRepeatBlock && queueItem.isRepeatBlock()) {
                item.className = 'queue-item queue-item-repeat';
                
                // Create repeat container with counter
                const repeatContent = document.createElement('div');
                repeatContent.className = 'repeat-content';
                
                // Show items inside repeat
                const itemsPreview = queueItem.items.slice(0, 3).map(i => {
                    if (typeof i.getIcon === 'function') return i.getIcon();
                    if (i.isGroupReference && i.isGroupReference()) return i.getIcon();
                    return '?';
                }).join('');
                
                const more = queueItem.items.length > 3 ? '...' : '';
                repeatContent.innerHTML = `
                    <span class="repeat-items">${itemsPreview}${more}</span>
                    <span class="repeat-count">×${queueItem.count}</span>
                `;
                
                item.appendChild(repeatContent);
                
                // Highlight if executing
                if (currentInfo && currentInfo.isFromRepeat && currentInfo.itemIndex === index) {
                    item.classList.add('queue-item-active');
                    // Show current iteration
                    const countSpan = item.querySelector('.repeat-count');
                    if (countSpan) {
                        countSpan.textContent = `${currentInfo.iteration + 1}/${currentInfo.totalIterations}`;
                    }
                }
                
                // Mark completed
                if (queueItem.isComplete) {
                    item.classList.add('queue-item-complete');
                }
                
                // Click to edit count (when not playing)
                if (!this.isPlaying && !this.isRecording) {
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.editRepeatCount(queueItem, index);
                    });
                    item.classList.add('queue-item-removable');
                    
                    // Right click to remove
                    item.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        this.actionQueue.removeAt(index);
                    });
                }
            }
            // Check if this is a group reference
            else if (queueItem.isGroupReference && queueItem.isGroupReference()) {
                item.className = 'queue-item queue-item-group';
                item.textContent = queueItem.getIcon();
                item.style.borderColor = queueItem.getColor();
                item.style.backgroundColor = queueItem.getColor() + '30';
                
                // Highlight if this group is currently executing
                if (this.activeGroupRef && this.activeGroupRef.id === queueItem.id) {
                    item.classList.add('queue-item-active');
                }
                
                // Mark completed groups
                if (queueItem.isComplete) {
                    item.classList.add('queue-item-complete');
                }
                
                // Click to remove (only when not playing)
                if (!this.isPlaying && !this.isRecording) {
                    item.addEventListener('click', () => {
                        this.actionQueue.removeAt(index);
                    });
                    item.classList.add('queue-item-removable');
                }
            }
            // Check if this is a recursive reference
            else if (queueItem.isRecursiveReference && queueItem.isRecursiveReference()) {
                item.className = 'queue-item queue-item-recursive';
                
                // Create recursive display with depth
                const recursiveContent = document.createElement('div');
                recursiveContent.className = 'recursive-content';
                
                recursiveContent.innerHTML = `
                    <span class="recursive-icon-small">🔄</span>
                    <span class="recursive-name-small">${queueItem.group.name}</span>
                    <span class="recursive-depth-small">×${queueItem.getMaxDepth()}</span>
                `;
                
                item.appendChild(recursiveContent);
                item.style.borderColor = queueItem.getColor();
                item.style.backgroundColor = queueItem.getColor() + '20';
                
                // Highlight if executing
                if (currentInfo && currentInfo.isFromRecursion && currentInfo.itemIndex === index) {
                    item.classList.add('queue-item-active');
                    // Show current depth
                    const depthSpan = item.querySelector('.recursive-depth-small');
                    if (depthSpan) {
                        depthSpan.textContent = `d${currentInfo.recursionDepth}`;
                    }
                }
                
                // Mark completed
                if (queueItem.isComplete) {
                    item.classList.add('queue-item-complete');
                }
                
                // Click to remove (when not playing)
                if (!this.isPlaying && !this.isRecording) {
                    item.addEventListener('click', () => {
                        this.actionQueue.removeAt(index);
                    });
                    item.classList.add('queue-item-removable');
                }
            } else {
                // Regular action
                item.className = 'queue-item';
                item.textContent = queueItem.getIcon();
                
                // Check if this specific item is currently being executed
                if (currentInfo && currentInfo.itemIndex === index && !currentInfo.isFromGroup && !currentInfo.isFromRepeat && !currentInfo.isFromRecursion) {
                    item.classList.add('queue-item-active');
                }
                
                // Mark completed actions
                if (queueItem.isComplete) {
                    item.classList.add('queue-item-complete');
                }
                
                // Click to remove (only when not playing)
                if (!this.isPlaying && !this.isRecording) {
                    item.addEventListener('click', () => {
                        this.actionQueue.removeAt(index);
                    });
                    item.classList.add('queue-item-removable');
                }
            }
            
            this.queueDisplay.appendChild(item);
        });
        
        // Show repeat builder if in building mode
        if (this.isBuildingRepeat && this.buildingRepeatBlock) {
            const builderEl = document.createElement('div');
            builderEl.className = 'queue-item queue-item-repeat-builder';
            
            const builderContent = document.createElement('div');
            builderContent.className = 'repeat-builder-content';
            
            // Show items being added (or placeholder if empty)
            const itemsPreview = this.buildingRepeatBlock.items.length > 0
                ? this.buildingRepeatBlock.items.map(i => {
                    if (typeof i.getIcon === 'function') return i.getIcon();
                    return '?';
                }).join('')
                : '➕';  // Placeholder when empty
            
            builderContent.innerHTML = `
                <button class="repeat-count-btn minus" title="Decrease">−</button>
                <span class="repeat-builder-items">${itemsPreview}</span>
                <span class="repeat-builder-count">×${this.repeatCount}</span>
                <button class="repeat-count-btn plus" title="Increase">+</button>
            `;
            
            builderEl.appendChild(builderContent);
            
            // Add event listeners for +/- buttons
            const minusBtn = builderContent.querySelector('.minus');
            const plusBtn = builderContent.querySelector('.plus');
            
            minusBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.changeRepeatCount(-1);
            });
            
            plusBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.changeRepeatCount(1);
            });
            
            // Click on builder to cancel
            builderEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.cancelRepeatBlock();
            });
            
            this.queueDisplay.appendChild(builderEl);
        }
        
        // Show recursion builder if in building mode
        if (this.isBuildingRecursion && this.buildingRecursiveGroup) {
            const builderEl = document.createElement('div');
            builderEl.className = 'queue-item queue-item-recursion-builder';
            
            const enterActions = this.buildingRecursiveGroup.preActions.map(a => a.getIcon()).join('') || '➕';
            const exitActions = this.buildingRecursiveGroup.postActions.map(a => a.getIcon()).join('') || '➕';
            
            const isEnterPhase = this.recursionPhase === 'enter';
            
            builderEl.innerHTML = `
                <div class="recursion-builder-content">
                    <div class="recursion-phase ${isEnterPhase ? 'active' : ''}">
                        <span class="phase-label">IN:</span>
                        <span class="phase-actions">${enterActions}</span>
                    </div>
                    <span class="recursion-arrow">→🌀→</span>
                    <div class="recursion-phase ${!isEnterPhase ? 'active' : ''}">
                        <span class="phase-label">OUT:</span>
                        <span class="phase-actions">${exitActions}</span>
                    </div>
                    <div class="recursion-depth-control">
                        <button class="recursion-count-btn minus" title="Decrease">−</button>
                        <span class="recursion-depth">×${this.buildingRecursiveGroup.maxDepth}</span>
                        <button class="recursion-count-btn plus" title="Increase">+</button>
                    </div>
                </div>
            `;
            
            // Depth control buttons
            const minusBtn = builderEl.querySelector('.recursion-count-btn.minus');
            const plusBtn = builderEl.querySelector('.recursion-count-btn.plus');
            
            minusBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.changeRecursionDepth(-1);
            });
            
            plusBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.changeRecursionDepth(1);
            });
            
            // Right click to cancel
            builderEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.cancelRecursiveGroup();
            });
            
            this.queueDisplay.appendChild(builderEl);
        }
        
        // Show empty state
        if (this.actionQueue.isEmpty && !this.isBuildingRepeat && !this.isBuildingRecursion) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'queue-empty';
            emptyMsg.textContent = this.savedGroups.length > 0 ? 'Click blocks or add →' : 'Add actions →';
            this.queueDisplay.appendChild(emptyMsg);
        }
    }

    /**
    * Edit repeat count with click cycling
     * @param {RepeatBlock} repeatBlock - The repeat block to edit
     * @param {number} index - Index in queue
     */
    editRepeatCount(repeatBlock, index) {
        // Cycle through common values: 2, 3, 4, 5, 10, then back to 2
        const cycleValues = [2, 3, 4, 5, 10];
        const currentIndex = cycleValues.indexOf(repeatBlock.count);
        const nextIndex = (currentIndex + 1) % cycleValues.length;
        
        repeatBlock.setCount(cycleValues[nextIndex]);
        console.log(`Repeat count changed to: ${repeatBlock.count}x`);
        
        this.updateQueueDisplay();
    }

    /**
     * Clear the action queue
     */
    clearQueue() {
        if (this.isPlaying) {
            this.stop();
        }
        this.actionQueue.clear();
        this.resetBallPosition();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('gameResize', () => {
            const { width, height } = this.renderer.getDimensions();
            this.grid.calculateDimensions(width, height);
            this.updateBallPosition();
        });
        
        // Initialize audio on first interaction
        const initAudio = () => {
            this.sound.init();
            document.removeEventListener('click', initAudio);
            document.removeEventListener('touchstart', initAudio);
        };
        document.addEventListener('click', initAudio);
        document.addEventListener('touchstart', initAudio);
        
        // Control buttons
        if (this.playButton) {
            this.playButton.addEventListener('click', () => {
                this.sound.playClick();
                this.togglePlay();
            });
        }
        
        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => {
                this.sound.playClick();
                this.reset();
            });
        }
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    /**
     * Handle keyboard input
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
        // Don't handle if playing
        const addingAllowed = !this.isPlaying;
        
        switch (event.key) {
            case ' ':
            case 'Enter':
                event.preventDefault();
                this.togglePlay();
                break;
            case 'r':
            case 'R':
                this.reset();
                break;
            case 'Escape':
                this.stop();
                break;
            case 'Backspace':
                if (addingAllowed) {
                    event.preventDefault();
                    this.actionQueue.removeLast();
                }
                break;
            case 'ArrowUp':
                if (addingAllowed) {
                    event.preventDefault();
                    this.addAction(ActionType.MOVE_UP);
                }
                break;
            case 'ArrowDown':
                if (addingAllowed) {
                    event.preventDefault();
                    this.addAction(ActionType.MOVE_DOWN);
                }
                break;
            case 'ArrowLeft':
                if (addingAllowed) {
                    event.preventDefault();
                    this.addAction(ActionType.MOVE_LEFT);
                }
                break;
            case 'ArrowRight':
                if (addingAllowed) {
                    event.preventDefault();
                    this.addAction(ActionType.MOVE_RIGHT);
                }
                break;
        }
    }

    /**
     * Update ball's pixel position based on current grid
     */
    updateBallPosition() {
        this.ball.updatePosition(
            this.grid.cellSize,
            this.grid.offsetX,
            this.grid.offsetY
        );
    }

    /**
     * Reset ball to initial position
     */
    resetBallPosition() {
        this.ball.setGridPosition(this.initialBallX, this.initialBallY);
        this.ball.reset();
        this.updateBallPosition();
    }

    /**
     * Toggle play/pause state
     */
    togglePlay() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.play();
        }
    }

    /**
     * Start playing actions
     */
    play() {
        if (this.actionQueue.isEmpty) {
            console.warn('Add some actions first!');
            return;
        }
        
        // Reset ball to start position before playing
        this.resetBallPosition();
        
        this.isPlaying = true;
        this.actionQueue.start();
        this.updatePlayButton();
    }

    /**
     * Stop playing actions
     */
    stop() {
        this.isPlaying = false;
        this.actionQueue.stop();
        this.resetBallPosition();
        this.updatePlayButton();
        this.updateQueueDisplay();
    }

    /**
     * Update play button visual state
     */
    updatePlayButton() {
        if (!this.playButton) return;
        
        if (this.isPlaying) {
            this.playButton.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 6h12v12H6z"/>
                </svg>
            `;
            this.playButton.setAttribute('aria-label', 'Stop');
        } else {
            this.playButton.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            `;
            this.playButton.setAttribute('aria-label', 'Play');
        }
    }

    /**
     * Reset game to initial state
     */
    reset() {
        this.stop();
        this.actionQueue.clear();
        this.resetBallPosition();
        this.grid.reset();
        this.effects.clear(); // Clear effects
        
        // Reset all targets to uncollected state
        this.targets.forEach(target => {
            target.collected = false;
        });
        
        this.updateQueueDisplay();
    }

    /**
     * Start the game loop
     */
    startGameLoop() {
        this.lastFrameTime = performance.now();
        this.gameLoop(this.lastFrameTime);
    }

    /**
     * Main game loop
     * @param {number} currentTime - Current timestamp
     */
    gameLoop(currentTime) {
        // Calculate delta time
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // Update
        this.update(deltaTime);
        
        // Render
        this.render();
        
        // Continue loop
        this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * Update game state
     * @param {number} deltaTime - Time since last frame in ms
     */
    update(deltaTime) {
        // Update action queue if playing
        if (this.isPlaying) {
            const result = this.actionQueue.update(deltaTime);
            
            // Update ball animation
            if (result.action && this.ball.isAnimating) {
                this.ball.updateAnimation(result.progress);
            }
        }
        
        // Update ball and add trail
        if (this.ball) {
            this.ball.update(deltaTime);
            
            // Add trail point when ball is moving
            if (this.ball.isMoving) {
                this.effects.addTrailPoint(this.ball.pixelX, this.ball.pixelY, CONFIG.colors.primary);
            }
        }
        
        // Update effects
        this.effects.update();
    }

    /**
     * Render the game
     */
    render() {
        const ctx = this.renderer.getContext();
        const { width, height } = this.renderer.getDimensions();
        
        // Apply screen shake
        const shake = this.effects.getShakeOffset();
        ctx.save();
        ctx.translate(shake.x, shake.y);
        
        // Clear and fill background
        this.renderer.clear();
        this.renderer.fillBackground();
        
        // Render grid
        this.grid.render(ctx, true);
        
        // Render targets
        this.renderTargets(ctx);
        
        // Render trail (Phase 7 - behind ball)
        this.effects.render(ctx);
        
        // Render ball
        if (this.ball) {
            this.ball.render(ctx);
        }
        
        // Render overlay effects
        this.effects.renderOverlay(ctx, width, height);
        
        ctx.restore();
    }

    /**
     * Render level targets
     * @param {CanvasRenderingContext2D} ctx
     */
    renderTargets(ctx) {
        const time = performance.now();
        const cellSize = this.grid.cellSize;
        
        // First pass: render all targets as the "path/form" to complete
        this.targets.forEach(target => {
            const { x, y } = this.grid.gridToPixel(target.x, target.y);
            
            ctx.save();
            
            // Subtle pulse animation
            const pulse = Math.sin(time * 0.002 + target.pulsePhase) * 0.03 + 1;
            const squareSize = cellSize * 0.9 * pulse;
            const halfSize = squareSize / 2;
            
            if (target.collected) {
                // Collected - show as filled/completed
                ctx.fillStyle = target.type === TargetType.AVOID ? '#ffcccc' : '#ccffcc';
                ctx.globalAlpha = 0.5;
                ctx.fillRect(x - halfSize, y - halfSize, squareSize, squareSize);
                
                // Checkmark for collected
                if (target.type !== TargetType.AVOID) {
                    ctx.globalAlpha = 0.7;
                    ctx.strokeStyle = '#44aa44';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(x - halfSize * 0.3, y);
                    ctx.lineTo(x - halfSize * 0.1, y + halfSize * 0.25);
                    ctx.lineTo(x + halfSize * 0.35, y - halfSize * 0.25);
                    ctx.stroke();
                }
            } else {
                // Active target - part of the form
                switch (target.type) {
                    case TargetType.FINISH:
                        // Finish point - green area
                        ctx.fillStyle = '#e8ffe8';
                        ctx.fillRect(x - halfSize, y - halfSize, squareSize, squareSize);
                        
                        // Border
                        ctx.strokeStyle = '#22aa22';
                        ctx.lineWidth = 3;
                        ctx.strokeRect(x - halfSize, y - halfSize, squareSize, squareSize);
                        
                        // Flag icon
                        ctx.fillStyle = '#22aa22';
                        ctx.font = `${cellSize * 0.4}px Arial`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('🏁', x, y);
                        break;
                        
                    case TargetType.AVOID:
                        // Avoid - danger zone
                        ctx.fillStyle = '#ffe8e8';
                        ctx.fillRect(x - halfSize, y - halfSize, squareSize, squareSize);
                        
                        // Border
                        ctx.strokeStyle = '#cc4444';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(x - halfSize, y - halfSize, squareSize, squareSize);
                        
                        // X mark
                        ctx.strokeStyle = '#cc4444';
                        ctx.lineWidth = 2;
                        const offset = halfSize * 0.35;
                        ctx.beginPath();
                        ctx.moveTo(x - offset, y - offset);
                        ctx.lineTo(x + offset, y + offset);
                        ctx.moveTo(x + offset, y - offset);
                        ctx.lineTo(x - offset, y + offset);
                        ctx.stroke();
                        break;
                        
                    case TargetType.COLLECT:
                    default:
                        // Collect - part of form to fill
                        // Light fill to show it's part of the path
                        ctx.fillStyle = '#f8f4ff';
                        ctx.fillRect(x - halfSize, y - halfSize, squareSize, squareSize);
                        
                        // Border (the outline of the form)
                        ctx.strokeStyle = '#8866dd';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(x - halfSize, y - halfSize, squareSize, squareSize);
                        break;
                }
            }
            
            ctx.restore();
        });
        
        // Second pass: render start position indicator
        this.renderStartPosition(ctx);
    }
    
    /**
     * Render start position marker
     * @param {CanvasRenderingContext2D} ctx
     */
    renderStartPosition(ctx) {
        const { x, y } = this.grid.gridToPixel(this.initialBallX, this.initialBallY);
        const cellSize = this.grid.cellSize;
        const size = cellSize * 0.25;
        
        ctx.save();
        
        // Small start indicator (if ball is not at start, show where start was)
        if (this.ball && (this.ball.gridX !== this.initialBallX || this.ball.gridY !== this.initialBallY)) {
            ctx.fillStyle = 'rgba(0, 15, 238, 0.2)';
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(0, 15, 238, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        ctx.restore();
    }

    /**
     * Check if ball hit any targets
     */
    checkTargetCollision() {
        this.targets.forEach(target => {
            if (!target.collected && target.isAtPosition(this.ball.gridX, this.ball.gridY)) {
                target.collect();
                
                // Get pixel position for effects
                const { x, y } = this.grid.gridToPixel(target.x, target.y);
                
                if (target.type === TargetType.AVOID) {
                    console.log('Hit obstacle!');
                    this.showMessage('💥 Hit obstacle!', 'error');
                    this.effects.spawnErrorEffect(x, y);
                    this.sound.playError();
                    this.hitObstacleThisRun = true; // Track for achievements
                } else if (target.type === TargetType.COLLECT) {
                    console.log('Target collected!');
                    this.effects.spawnCollectEffect(x, y);
                    this.sound.playCollect();
                } else if (target.type === TargetType.FINISH) {
                    console.log('Reached finish! Stopping execution.');
                    this.effects.spawnFinishEffect(x, y);
                    
                    // IMMEDIATELY stop queue execution and check win
                    this.actionQueue.stop();
                    this.isPlaying = false;
                    this.updatePlayButton();
                    
                    // Check win condition right away
                    this.checkWinCondition();
                }
            }
        });
    }

    /**
     * Check win condition at end of queue
     */
    checkWinCondition() {
        const level = this.levelManager.getCurrentLevel();
        if (!level || this.levelComplete) return;
        
        // Increment attempts
        this.levelAttempts++;
        
        // Sync collected state with level targets
        this.targets.forEach((target, i) => {
            if (level.targets[i]) {
                level.targets[i].collected = target.collected;
            }
        });
        
        const result = level.checkWinCondition(this.ball.gridX, this.ball.gridY, this.actionsUsed);
        
        if (result.won) {
            this.levelComplete = true;
            const completion = this.levelManager.completeLevel(this.actionsUsed);
            
            // Celebration effects
            const { width, height } = this.renderer.getDimensions();
            this.effects.spawnConfetti(width, height);
            this.sound.playWin();
            
            // Track achievements
            const newAchievements = this.achievements.recordLevelComplete(
                level.id,
                completion.stars,
                this.actionsUsed,
                this.hitObstacleThisRun,
                this.levelAttempts
            );
            
            // Track analytics
            this.analytics?.completeLevel(level.id, completion.stars, this.actionsUsed);
            
            // Announce for accessibility
            this.accessibility?.announce('Level complete!', true);
            newAchievements.forEach(a => {
                this.accessibility?.announcer?.announceAchievement(a.name);
                this.analytics?.track(AnalyticsEvent.ACHIEVEMENT_UNLOCKED, { id: a.id, name: a.name });
            });
            
            this.showLevelComplete(completion, newAchievements);
            console.log(`Level complete! Stars: ${completion.stars}, Actions: ${this.actionsUsed}`);
        } else {
            // Track failure
            this.analytics?.failLevel(level.id, result.reason);
            this.accessibility?.announce(result.reason);
            
            this.showMessage(result.reason, 'error');
            this.sound.playError();
            console.log(`Level failed: ${result.reason}`);
        }
    }

    /**
     * Show level complete modal (Phase 6, updated Phase 8)
     * @param {Object} completion - Completion data
     * @param {Array} achievements - Newly unlocked achievements
     */
    showLevelComplete(completion, achievements = []) {
        // Remove existing modal
        const existing = document.querySelector('.level-complete-modal');
        if (existing) existing.remove();
        
        const currentLevelId = this.levelManager.getCurrentLevel()?.id || 0;
        
        // Special celebration for completing level 14 (final level)
        if (currentLevelId === 14) {
            this.showGameCompleteModal();
            return;
        }
        
        const stars = '⭐'.repeat(completion.stars) + '☆'.repeat(3 - completion.stars);
        const hasNext = this.levelManager.currentLevelIndex < this.levelManager.levels.length - 1;
        
        // Build achievements HTML
        let achievementsHtml = '';
        if (achievements && achievements.length > 0) {
            achievementsHtml = `
                <div class="modal-achievements">
                    ${achievements.map(a => `
                        <div class="achievement-unlock">
                            <span class="achievement-icon">${a.icon}</span>
                            <span class="achievement-name">${a.name}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        const modal = document.createElement('div');
        modal.className = 'level-complete-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>🎉 Level Complete!</h2>
                <div class="stars">${stars}</div>
                <p class="actions-used">Actions: ${this.actionsUsed}</p>
                ${completion.isNewBest ? '<p class="new-best">🏆 New Best!</p>' : ''}
                ${completion.unlockedFeature ? `<p class="unlock">🔓 Unlocked: ${completion.unlockedFeature}!</p>` : ''}
                ${achievementsHtml}
                <div class="modal-buttons">
                    <button class="btn-retry" onclick="game.retryLevel()">🔄 Retry</button>
                    ${hasNext ? '<button class="btn-next" onclick="game.goToNextLevel()">Next ➡</button>' : ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Animate in
        requestAnimationFrame(() => modal.classList.add('show'));
    }

    /**
     * Show game complete modal with social sharing (final level 14)
     */
    showGameCompleteModal() {
        const modal = document.createElement('div');
        modal.className = 'level-complete-modal game-complete-modal';
        
        // Новый текст для шаринга и предпросмотра
        const shareText = "Proud to share that I’ve completed all 14 levels of the StartSchool Logic Game 🧠✨ #startschoolriga #startschoolgame";
        modal.innerHTML = `
            <div class="modal-content game-complete-content">
                <div class="confetti-bg"></div>
                <h2 class="game-congrats-title">🏆 Congratulations!</h2>
                <div class="share-section">
                    <p class="share-title">Share your achievement:</p>
                    <div class="share-example" style="margin: 10px 0; font-size: 1.05em; color: #333; background: #f8f8fa; border-radius: 8px; padding: 8px 12px;">
                        <span>${shareText}</span>
                    </div>
                    <div class="social-buttons">
                        <button class="social-btn facebook" onclick="game.shareToFacebook()" title="Share on Facebook">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                            Facebook
                        </button>
                        <button class="social-btn linkedin" onclick="game.shareToLinkedIn()" title="Share on LinkedIn">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-1.14 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                            LinkedIn
                        </button>
                        <button class="social-btn twitter" onclick="game.shareToTwitter()" title="Share on X (Twitter)">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            X
                        </button>
                    </div>
                </div>
                <div class="modal-buttons">
                    <button class="btn-retry" onclick="game.closeGameCompleteModal()">🔄 Play Again</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Extra confetti celebration
        const { width, height } = this.renderer.getDimensions();
        for (let i = 0; i < 3; i++) {
            setTimeout(() => this.effects.spawnConfetti(width, height), i * 500);
        }
        
        // Animate in
        requestAnimationFrame(() => modal.classList.add('show'));
    }

    /**
     * Close game complete modal and restart
     */
    closeGameCompleteModal() {
        const modal = document.querySelector('.game-complete-modal');
        if (modal) modal.remove();
        
        // Go back to level 1
        this.levelManager.goToLevel(0);
        this.loadCurrentLevel();
        this.actionQueue.clear();
        this.updateQueueDisplay();
    }

    /**
     * Share to Facebook
     */
    shareToFacebook() {
        const shareText = "Proud to share that I’ve completed all 14 levels of the StartSchool Logic Game 🧠✨ #startschoolriga #startschoolgame";
        const url = `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(shareText)}`;
        window.open(url, '_blank', 'width=600,height=400');
    }

    /**
     * Share to LinkedIn
     */
    shareToLinkedIn() {
        const shareText = "Proud to share that I’ve completed all 14 levels of the StartSchool Logic Game 🧠✨ #startschoolriga #startschoolgame";
        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodeURIComponent(shareText)}`;
        window.open(url, '_blank', 'width=600,height=400');
    }

    /**
     * Share to Twitter/X
     */
    shareToTwitter() {
        const shareText = "Proud to share that I’ve completed all 14 levels of the StartSchool Logic Game 🧠✨ #startschoolriga #startschoolgame";
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
        window.open(url, '_blank', 'width=600,height=400');
    }

    /**
     * Show temporary message
     * @param {string} text - Message text
     * @param {string} type - 'success', 'error', 'info'
     */
    showMessage(text, type = 'info') {
        const msg = document.createElement('div');
        msg.className = `game-message game-message-${type}`;
        msg.textContent = text;
        
        const container = document.getElementById('game-container');
        if (container) {
            container.appendChild(msg);
            
            // Animate and remove
            setTimeout(() => msg.classList.add('show'), 10);
            setTimeout(() => {
                msg.classList.remove('show');
                setTimeout(() => msg.remove(), 300);
            }, 1500);
        }
    }

    /**
     * Retry current level
     */
    retryLevel() {
        // Remove modal
        const modal = document.querySelector('.level-complete-modal');
        if (modal) modal.remove();
        
        // Reset level
        this.levelManager.loadLevel(this.currentLevel);
        this.loadCurrentLevel();
        this.actionQueue.clear();
        this.updateQueueDisplay();
    }

    /**
     * Go to next level
     */
    goToNextLevel() {
        // Remove modal
        const modal = document.querySelector('.level-complete-modal');
        if (modal) modal.remove();
        
        // Load next
        this.levelManager.nextLevel();
        this.loadCurrentLevel();
        this.actionQueue.clear();
        this.savedGroups = [];
        this.savedRecursiveGroups = [];
        this.updateQueueDisplay();
        this.updateGroupsDisplay();
        this.updateRecursiveGroupsDisplay();
    }

    /**
     * Create level navigation UI
     */
    createLevelUI() {
        const header = document.querySelector('.game-header');
        if (!header) return;
        
        // Update level info section
        const levelInfo = header.querySelector('.level-info');
        if (levelInfo) {
            levelInfo.innerHTML = `
                <button class="level-nav-btn restart-btn" id="btn-restart" aria-label="Restart game" title="Restart from Level 1">↺</button>
                <button class="level-nav-btn" id="btn-prev-level" aria-label="Previous level">◀</button>
                <span class="level-text">
                    <span class="level-label">Level</span>
                    <span class="level-number" id="current-level">${this.currentLevel}</span>
                </span>
                <button class="level-nav-btn" id="btn-next-level" aria-label="Next level">▶</button>
            `;
            
            // Event listeners
            document.getElementById('btn-restart')?.addEventListener('click', () => this.restartGame());
            document.getElementById('btn-prev-level')?.addEventListener('click', () => this.goToPrevLevel());
            document.getElementById('btn-next-level')?.addEventListener('click', () => this.skipToNextLevel());
        }
        
        this.updateLevelDisplay();
    }

    /**
     * Update level display
     */
    updateLevelDisplay() {
        const level = this.levelManager.getCurrentLevel();
        if (!level) return;
        
        // Update level number
        const levelNum = document.getElementById('current-level');
        if (levelNum) {
            levelNum.textContent = level.id;
        }
        
        // Update max actions display in queue
        this.updateQueueMaxActions();
        
        // Update nav buttons
        const prevBtn = document.getElementById('btn-prev-level');
        const nextBtn = document.getElementById('btn-next-level');
        
        if (prevBtn) {
            prevBtn.disabled = level.id <= 1;
        }
        if (nextBtn) {
            nextBtn.disabled = !this.levelManager.isLevelUnlocked(level.id + 1);
        }
    }

    /**
     * Go to previous level
     */
    goToPrevLevel() {
        if (this.levelManager.previousLevel()) {
            this.loadCurrentLevel();
            this.actionQueue.clear();
            this.updateQueueDisplay();
        }
    }

    /**
     * Skip to next level if unlocked
     */
    skipToNextLevel() {
        const nextId = this.levelManager.currentLevel.id + 1;
        if (this.levelManager.isLevelUnlocked(nextId)) {
            this.levelManager.nextLevel();
            this.loadCurrentLevel();
            this.actionQueue.clear();
            this.updateQueueDisplay();
        }
    }

    /**
     * Restart game from Level 1
     */
    restartGame() {
        // Reset to level 1
        this.levelManager.loadLevel(1);
        this.loadCurrentLevel();
        
        // Clear everything
        this.actionQueue.clear();
        this.savedGroups = [];
        this.savedRecursiveGroups = [];
        
        // Update displays
        this.updateQueueDisplay();
        this.updateGroupsDisplay();
        this.updateRecursiveGroupsDisplay();
        
        this.sound.playClick();
        console.log('Game restarted from Level 1');
        this.accessibility?.announcer?.announce('Game restarted from Level 1');
    }

    /**
     * Update max queue size display
     */
    updateQueueMaxActions() {
        const maxEl = document.getElementById('queue-max');
        if (!maxEl) return;
        
        const level = this.levelManager.getCurrentLevel();
        if (level && level.maxQueueSize > 0) {
            maxEl.textContent = `(max ${level.maxQueueSize} items)`;
            maxEl.style.display = '';
        } else {
            maxEl.textContent = '';
            maxEl.style.display = 'none';
        }
    }

    /**
     * Create engagement UI elements 
     */
    createEngagementUI() {
        // Add achievements button to header
        const header = document.querySelector('.game-header');
        if (header) {
            const engagementBtns = document.createElement('div');
            engagementBtns.className = 'engagement-buttons';
            engagementBtns.innerHTML = `
                <button class="engagement-btn" id="btn-achievements" title="Achievements (T)" aria-label="View achievements">
                    🏆
                    <span class="badge-count" id="achievements-count">0</span>
                </button>
                <button class="engagement-btn" id="btn-stats" title="Stats (I)" aria-label="View statistics">
                    📊
                </button>
                <!-- Help button removed: no keyboard shortcuts -->
                <!-- '?' removed as requested -->
            `;
            header.appendChild(engagementBtns);

            // Bind events
            document.getElementById('btn-achievements')?.addEventListener('click', () => this.showAchievementsModal());
            document.getElementById('btn-stats')?.addEventListener('click', () => this.showStatsModal());
            document.getElementById('btn-help')?.addEventListener('click', () => this.accessibility?.showHelpModal());
        }

        // Update achievements count
        this.updateAchievementsCount();
    }

    /**
     * Create timer UI
     */
    createTimerUI() {
        const header = document.querySelector('.game-header');
        if (!header) return;
        
        const timerContainer = document.createElement('div');
        timerContainer.className = 'timer-container';
        timerContainer.innerHTML = `
            <div class="timer-display" id="session-timer">
                <span class="timer-icon">⏱️</span>
                <span class="timer-value" id="timer-value">00:00</span>
            </div>
            <button class="timer-toggle-btn" id="btn-timer-toggle" title="Show/Hide Timer">
                Hide
            </button>
        `;
        
        // Insert before engagement buttons
        const engagementBtns = header.querySelector('.engagement-buttons');
        if (engagementBtns) {
            header.insertBefore(timerContainer, engagementBtns);
        } else {
            header.appendChild(timerContainer);
        }
        
        // Bind toggle button
        document.getElementById('btn-timer-toggle')?.addEventListener('click', () => this.toggleTimer());
        
        // Load timer visibility preference
        const savedPref = localStorage.getItem('startschool_timer_visible');
        if (savedPref !== null) {
            this.timerVisible = savedPref === 'true';
            this.updateTimerVisibility();
        }
        
        // Start timer interval
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
        this.updateTimer();
    }

    /**
     * Update timer display
     */
    updateTimer() {
        if (!this.timerVisible) return;
        
        const elapsed = Date.now() - this.sessionStartTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        const timerValue = document.getElementById('timer-value');
        if (timerValue) {
            if (hours > 0) {
                timerValue.textContent = `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
            } else {
                timerValue.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
            }
        }
    }

    /**
     * Toggle timer visibility
     */
    toggleTimer() {
        this.timerVisible = !this.timerVisible;
        localStorage.setItem('startschool_timer_visible', this.timerVisible.toString());
        this.updateTimerVisibility();
    }

    /**
     * Update timer visibility in UI
     */
    updateTimerVisibility() {
        const timerDisplay = document.getElementById('session-timer');
        const toggleBtn = document.getElementById('btn-timer-toggle');
        
        if (timerDisplay) {
            timerDisplay.style.display = this.timerVisible ? 'flex' : 'none';
        }
        if (toggleBtn) {
            toggleBtn.textContent = this.timerVisible ? 'Hide' : 'Show';
        }
    }

    /**
     * Create sound controls UI (positioned on right side)
     */
    createSoundControlsUI() {
        const soundControls = document.createElement('div');
        soundControls.className = 'sound-controls';
        soundControls.innerHTML = `
            <button class="sound-btn ${this.sound.musicEnabled ? 'active' : ''}" id="btn-music" title="Toggle Music">
                <span class="sound-icon">🎵</span>
            </button>
            <button class="sound-btn ${this.sound.sfxEnabled ? 'active' : ''}" id="btn-sfx" title="Toggle Sound Effects">
                <span class="sound-icon">🔊</span>
            </button>
        `;
        
        // Append to body for fixed positioning
        document.body.appendChild(soundControls);
        
        // Bind events
        document.getElementById('btn-music')?.addEventListener('click', () => this.toggleMusic());
        document.getElementById('btn-sfx')?.addEventListener('click', () => this.toggleSFX());
    }

    /**
     * Toggle music
     */
    toggleMusic() {
        const enabled = this.sound.toggleMusic();
        const btn = document.getElementById('btn-music');
        if (btn) {
            btn.classList.toggle('active', enabled);
        }
    }

    /**
     * Toggle sound effects
     */
    toggleSFX() {
        const enabled = this.sound.toggleSFX();
        const btn = document.getElementById('btn-sfx');
        if (btn) {
            btn.classList.toggle('active', enabled);
        }
    }

    /**
     * Update achievements count badge
     */
    updateAchievementsCount() {
        const badge = document.getElementById('achievements-count');
        if (badge) {
            const unlocked = this.achievements.unlockedAchievements.size;
            badge.textContent = unlocked;
            badge.style.display = unlocked > 0 ? '' : 'none';
        }
    }

    /**
     * Show achievements modal
     */
    showAchievementsModal() {
        const existing = document.querySelector('.achievements-modal');
        if (existing) existing.remove();

        const achievements = this.achievements.getAllAchievements();
        const progress = this.achievements.getProgressPercent();

        const modal = document.createElement('div');
        modal.className = 'achievements-modal show';
        modal.innerHTML = `
            <div class="modal-content achievements-content">
                <h2>🏆 Achievements</h2>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                    <span class="progress-text">${progress}% Complete</span>
                </div>
                <div class="achievements-grid">
                    ${achievements.map(a => `
                        <div class="achievement-item ${a.unlocked ? 'unlocked' : 'locked'}">
                            <span class="achievement-icon">${a.unlocked ? a.icon : '🔒'}</span>
                            <div class="achievement-info">
                                <span class="achievement-name">${a.name}</span>
                                <span class="achievement-desc">${a.description}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button class="modal-close-btn" onclick="this.closest('.achievements-modal').remove()">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
        
        this.sound.playClick();
    }

    /**
     * Show stats modal 
     */
    showStatsModal() {
        const existing = document.querySelector('.stats-modal');
        if (existing) existing.remove();

        const stats = this.achievements.getStats();
        const progress = this.levelManager.progress;
        
        // Format fastest time
        let fastestTimeStr = '—';
        if (stats.fastestLevelTime && stats.fastestLevelTime !== Infinity && stats.fastestLevelTime !== null) {
            const secs = Math.round(stats.fastestLevelTime);
            fastestTimeStr = secs < 60 ? `${secs}s` : `${Math.floor(secs/60)}m ${secs%60}s`;
        }

        const modal = document.createElement('div');
        modal.className = 'stats-modal show';
        modal.innerHTML = `
            <div class="modal-content stats-content">
                <h2>📊 Your Stats</h2>
                
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-value">${stats.levelsCompleted}</span>
                        <span class="stat-label">Levels Completed</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${stats.totalStars}</span>
                        <span class="stat-label">Total Stars</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${stats.threeStarLevels}</span>
                        <span class="stat-label">Perfect Levels</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${fastestTimeStr}</span>
                        <span class="stat-label">Fastest Level</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${stats.levelsThisSession || 0}</span>
                        <span class="stat-label">Levels This Session</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${stats.blocksCreated}</span>
                        <span class="stat-label">Blocks Created</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${stats.loopsUsed}</span>
                        <span class="stat-label">Loops Used</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${stats.recursionUsed}</span>
                        <span class="stat-label">Nests Used</span>
                    </div>
                </div>

                <button class="modal-close-btn" onclick="this.closest('.stats-modal').remove()">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
        
        this.sound.playClick();
    }

    /**
     * Go to specific level
     */
    goToLevel(levelId) {
        if (this.levelManager.goToLevel(levelId)) {
            this.loadCurrentLevel();
            this.actionQueue.clear();
            this.updateQueueDisplay();
        }
    }

    /**
     * Clean up and destroy game
     */
    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.renderer.destroy();
    }
}
