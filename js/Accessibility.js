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
        // All keyboard shortcut logic removed as requested.
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

    // Help modal and all shortcut-related UI removed as requested.

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
