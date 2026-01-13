/**
 * Accessibility System - Phase 9
 * Keyboard navigation, ARIA labels, and screen reader support
 */

/**
 * Keyboard shortcuts configuration
 */
export const KeyboardShortcuts = {
    // Game controls
    PLAY: ['Space', 'Enter'],
    RESET: ['KeyR', 'Escape'],
    
    // Navigation
    NEXT_LEVEL: ['ArrowRight', 'KeyN'],
    PREV_LEVEL: ['ArrowLeft', 'KeyP'],
    
    // Actions
    MOVE_UP: ['KeyW', 'ArrowUp'],
    MOVE_DOWN: ['KeyS', 'ArrowDown'],
    MOVE_LEFT: ['KeyA', 'ArrowLeft'],
    MOVE_RIGHT: ['KeyD', 'ArrowRight'],
    
    // Features
    RECORD_BLOCK: ['KeyB'],
    CREATE_LOOP: ['KeyL'],
    CREATE_RECURSION: ['KeyC'],
    
    // UI
    SHOW_HELP: ['KeyH', 'F1'],
    SHOW_ACHIEVEMENTS: ['KeyT'],
    SHOW_STATS: ['KeyI'],
    TOGGLE_SOUND: ['KeyM'],
    
    // Focus
    FOCUS_ACTIONS: ['Digit1'],
    FOCUS_QUEUE: ['Digit2'],
    FOCUS_GROUPS: ['Digit3']
};

/**
 * ARIA live region announcer
 */
class ScreenReaderAnnouncer {
    constructor() {
        this.liveRegion = null;
        this.init();
    }

    init() {
        // Create live region for announcements
        this.liveRegion = document.createElement('div');
        this.liveRegion.setAttribute('role', 'status');
        this.liveRegion.setAttribute('aria-live', 'polite');
        this.liveRegion.setAttribute('aria-atomic', 'true');
        this.liveRegion.className = 'sr-only';
        this.liveRegion.id = 'sr-announcer';
        document.body.appendChild(this.liveRegion);
        
        // Create assertive region for urgent announcements
        this.urgentRegion = document.createElement('div');
        this.urgentRegion.setAttribute('role', 'alert');
        this.urgentRegion.setAttribute('aria-live', 'assertive');
        this.urgentRegion.setAttribute('aria-atomic', 'true');
        this.urgentRegion.className = 'sr-only';
        this.urgentRegion.id = 'sr-alert';
        document.body.appendChild(this.urgentRegion);
    }

    /**
     * Announce message to screen readers
     */
    announce(message, urgent = false) {
        const region = urgent ? this.urgentRegion : this.liveRegion;
        
        // Clear and re-set to trigger announcement
        region.textContent = '';
        setTimeout(() => {
            region.textContent = message;
        }, 100);
    }

    /**
     * Announce level change
     */
    announceLevel(levelId, levelName) {
        this.announce(`Level ${levelId}: ${levelName}`);
    }

    /**
     * Announce action added
     */
    announceAction(actionName) {
        this.announce(`Added action: ${actionName}`);
    }

    /**
     * Announce game state
     */
    announceGameState(state) {
        const messages = {
            'playing': 'Executing actions',
            'paused': 'Paused',
            'complete': 'Level complete!',
            'failed': 'Try again'
        };
        this.announce(messages[state] || state);
    }

    /**
     * Announce achievement
     */
    announceAchievement(name) {
        this.announce(`Achievement unlocked: ${name}`, true);
    }
}

/**
 * Focus management for keyboard navigation
 */
class FocusManager {
    constructor() {
        this.focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            'a[href]',
            'select:not([disabled])'
        ].join(', ');
        
        this.focusGroups = {
            actions: null,
            queue: null,
            groups: null,
            controls: null
        };
    }

    /**
     * Register focus group
     */
    registerGroup(name, element) {
        this.focusGroups[name] = element;
    }

    /**
     * Focus first element in group
     */
    focusGroup(groupName) {
        const group = this.focusGroups[groupName];
        if (!group) return;

        const focusable = group.querySelector(this.focusableSelectors);
        if (focusable) {
            focusable.focus();
            return true;
        }
        return false;
    }

    /**
     * Trap focus within element (for modals)
     */
    trapFocus(element) {
        const focusableElements = element.querySelectorAll(this.focusableSelectors);
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        element.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    lastFocusable.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    firstFocusable.focus();
                    e.preventDefault();
                }
            }
        });

        // Focus first element
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }

    /**
     * Get all focusable elements in container
     */
    getFocusableElements(container) {
        return Array.from(container.querySelectorAll(this.focusableSelectors));
    }
}

/**
 * Main Accessibility Manager
 */
export class AccessibilityManager {
    constructor(game) {
        this.game = game;
        this.announcer = new ScreenReaderAnnouncer();
        this.focusManager = new FocusManager();
        this.keyboardEnabled = true;
        this.helpModalVisible = false;
        
        this.init();
    }

    /**
     * Initialize accessibility features
     */
    init() {
        this.setupARIALabels();
        this.setupKeyboardNavigation();
        this.setupSkipLinks();
        this.setupFocusIndicators();
        
        console.log('♿ Accessibility features initialized');
    }

    /**
     * Set up ARIA labels for game elements
     */
    setupARIALabels() {
        // Main game regions
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', 'Game board showing ball position and targets');
        }

        // Action panel
        const actionPanel = document.querySelector('.action-panel');
        if (actionPanel) {
            actionPanel.setAttribute('role', 'toolbar');
            actionPanel.setAttribute('aria-label', 'Available actions');
            this.focusManager.registerGroup('actions', actionPanel);
        }

        // Queue display
        const queueDisplay = document.querySelector('.queue-display');
        if (queueDisplay) {
            queueDisplay.setAttribute('role', 'list');
            queueDisplay.setAttribute('aria-label', 'Action queue');
            this.focusManager.registerGroup('queue', queueDisplay);
        }

        // Groups panel
        const groupsPanel = document.querySelector('.groups-panel');
        if (groupsPanel) {
            groupsPanel.setAttribute('role', 'toolbar');
            groupsPanel.setAttribute('aria-label', 'Saved action blocks');
            this.focusManager.registerGroup('groups', groupsPanel);
        }

        // Control buttons
        const playBtn = document.getElementById('btn-play');
        if (playBtn) {
            playBtn.setAttribute('aria-label', 'Play actions (Space or Enter)');
        }

        const resetBtn = document.getElementById('btn-reset');
        if (resetBtn) {
            resetBtn.setAttribute('aria-label', 'Reset level (R or Escape)');
        }

        // Level navigation
        const prevBtn = document.getElementById('btn-prev-level');
        if (prevBtn) {
            prevBtn.setAttribute('aria-label', 'Previous level (Left arrow or P)');
        }

        const nextBtn = document.getElementById('btn-next-level');
        if (nextBtn) {
            nextBtn.setAttribute('aria-label', 'Next level (Right arrow or N)');
        }

        // Engagement buttons
        const achievementsBtn = document.getElementById('btn-achievements');
        if (achievementsBtn) {
            achievementsBtn.setAttribute('aria-label', 'View achievements (T)');
        }

        const statsBtn = document.getElementById('btn-stats');
        if (statsBtn) {
            statsBtn.setAttribute('aria-label', 'View statistics (I)');
        }
    }

    /**
     * Setup keyboard navigation
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (!this.keyboardEnabled) return;
            
            // Ignore if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Check for modal - if open, only allow Escape
            const modal = document.querySelector('.level-complete-modal, .achievements-modal, .stats-modal, .help-modal');
            if (modal) {
                if (e.key === 'Escape') {
                    modal.remove();
                    e.preventDefault();
                }
                return;
            }

            const handled = this.handleKeyPress(e);
            if (handled) {
                e.preventDefault();
            }
        });
    }

    /**
     * Handle keyboard press
     */
    handleKeyPress(e) {
        const key = e.code;
        const shortcuts = KeyboardShortcuts;

        // Game controls
        if (shortcuts.PLAY.includes(key)) {
            this.game.playButton?.click();
            return true;
        }
        if (shortcuts.RESET.includes(key)) {
            this.game.resetButton?.click();
            return true;
        }

        // Navigation
        if (shortcuts.NEXT_LEVEL.includes(key) && !e.ctrlKey) {
            document.getElementById('btn-next-level')?.click();
            return true;
        }
        if (shortcuts.PREV_LEVEL.includes(key) && !e.ctrlKey) {
            document.getElementById('btn-prev-level')?.click();
            return true;
        }

        // Actions (when not playing)
        if (!this.game.isPlaying) {
            if (shortcuts.MOVE_UP.includes(key)) {
                this.addAction('UP');
                return true;
            }
            if (shortcuts.MOVE_DOWN.includes(key)) {
                this.addAction('DOWN');
                return true;
            }
            if (shortcuts.MOVE_LEFT.includes(key)) {
                this.addAction('LEFT');
                return true;
            }
            if (shortcuts.MOVE_RIGHT.includes(key)) {
                this.addAction('RIGHT');
                return true;
            }
        }

        // Features
        if (shortcuts.RECORD_BLOCK.includes(key)) {
            document.getElementById('btn-record')?.click();
            return true;
        }

        // UI
        if (shortcuts.SHOW_HELP.includes(key)) {
            this.showHelpModal();
            return true;
        }
        if (shortcuts.SHOW_ACHIEVEMENTS.includes(key)) {
            this.game.showAchievementsModal?.();
            return true;
        }
        if (shortcuts.SHOW_STATS.includes(key)) {
            this.game.showStatsModal?.();
            return true;
        }
        if (shortcuts.TOGGLE_SOUND.includes(key)) {
            this.game.sound?.toggle?.();
            return true;
        }

        // Focus groups
        if (shortcuts.FOCUS_ACTIONS.includes(key)) {
            this.focusManager.focusGroup('actions');
            return true;
        }
        if (shortcuts.FOCUS_QUEUE.includes(key)) {
            this.focusManager.focusGroup('queue');
            return true;
        }
        if (shortcuts.FOCUS_GROUPS.includes(key)) {
            this.focusManager.focusGroup('groups');
            return true;
        }

        return false;
    }

    /**
     * Add action via keyboard
     */
    addAction(direction) {
        const actionBtns = {
            'UP': document.querySelector('[data-action="UP"]'),
            'DOWN': document.querySelector('[data-action="DOWN"]'),
            'LEFT': document.querySelector('[data-action="LEFT"]'),
            'RIGHT': document.querySelector('[data-action="RIGHT"]')
        };
        
        const btn = actionBtns[direction];
        if (btn && !btn.disabled) {
            btn.click();
            this.announcer.announce(`Move ${direction.toLowerCase()}`);
        }
    }

    /**
     * Setup skip links for keyboard users
     */
    setupSkipLinks() {
        const skipLink = document.createElement('a');
        skipLink.href = '#game-canvas';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Skip to game';
        skipLink.addEventListener('click', (e) => {
            e.preventDefault();
            const canvas = document.getElementById('game-canvas');
            if (canvas) {
                canvas.setAttribute('tabindex', '-1');
                canvas.focus();
            }
        });
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    /**
     * Setup visible focus indicators
     */
    setupFocusIndicators() {
        // Add focus-visible polyfill behavior
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
    }

    /**
     * Show help modal with keyboard shortcuts
     */
    showHelpModal() {
        const existing = document.querySelector('.help-modal');
        if (existing) {
            existing.remove();
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'help-modal show';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'help-title');
        modal.innerHTML = `
            <div class="modal-content help-content">
                <h2 id="help-title">⌨️ Keyboard Shortcuts</h2>
                
                <div class="shortcuts-grid">
                    <div class="shortcut-group">
                        <h3>Game Controls</h3>
                        <div class="shortcut-item">
                            <kbd>Space</kbd> / <kbd>Enter</kbd>
                            <span>Play/Stop</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>R</kbd> / <kbd>Esc</kbd>
                            <span>Reset</span>
                        </div>
                    </div>
                    
                    <div class="shortcut-group">
                        <h3>Movement</h3>
                        <div class="shortcut-item">
                            <kbd>W</kbd> / <kbd>↑</kbd>
                            <span>Move Up</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>S</kbd> / <kbd>↓</kbd>
                            <span>Move Down</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>A</kbd> / <kbd>←</kbd>
                            <span>Move Left</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>D</kbd> / <kbd>→</kbd>
                            <span>Move Right</span>
                        </div>
                    </div>
                    
                    <div class="shortcut-group">
                        <h3>Navigation</h3>
                        <div class="shortcut-item">
                            <kbd>N</kbd>
                            <span>Next Level</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>P</kbd>
                            <span>Previous Level</span>
                        </div>
                    </div>
                    
                    <div class="shortcut-group">
                        <h3>UI</h3>
                        <div class="shortcut-item">
                            <kbd>H</kbd> / <kbd>F1</kbd>
                            <span>Help</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>T</kbd>
                            <span>Achievements</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>I</kbd>
                            <span>Stats</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>M</kbd>
                            <span>Toggle Sound</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>B</kbd>
                            <span>Record Block</span>
                        </div>
                    </div>
                    
                    <div class="shortcut-group">
                        <h3>Focus</h3>
                        <div class="shortcut-item">
                            <kbd>1</kbd>
                            <span>Focus Actions</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>2</kbd>
                            <span>Focus Queue</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>3</kbd>
                            <span>Focus Blocks</span>
                        </div>
                    </div>
                </div>
                
                <button class="modal-close-btn" onclick="this.closest('.help-modal').remove()">
                    Close (Esc)
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.focusManager.trapFocus(modal.querySelector('.modal-content'));
        this.helpModalVisible = true;
    }

    /**
     * Announce to screen readers
     */
    announce(message, urgent = false) {
        this.announcer.announce(message, urgent);
    }

    /**
     * Update ARIA labels when level changes
     */
    updateLevelARIA(level) {
        const canvas = document.getElementById('game-canvas');
        if (canvas && level) {
            canvas.setAttribute('aria-label', 
                `Level ${level.id}: ${level.name}. ${level.hint || ''}`);
        }
        this.announcer.announceLevel(level.id, level.name);
    }

    /**
     * Disable keyboard shortcuts (e.g., during input)
     */
    disable() {
        this.keyboardEnabled = false;
    }

    /**
     * Enable keyboard shortcuts
     */
    enable() {
        this.keyboardEnabled = true;
    }
}
