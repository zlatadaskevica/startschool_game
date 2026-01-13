
/**
 * Event types for analytics
 */
export const AnalyticsEvent = {
    // Session events
    SESSION_START: 'session_start',
    SESSION_END: 'session_end',
    
    // Level events
    LEVEL_START: 'level_start',
    LEVEL_COMPLETE: 'level_complete',
    LEVEL_FAIL: 'level_fail',
    LEVEL_RETRY: 'level_retry',
    LEVEL_SKIP: 'level_skip',
    
    // Feature usage
    ACTION_ADDED: 'action_added',
    BLOCK_CREATED: 'block_created',
    LOOP_USED: 'loop_used',
    RECURSION_USED: 'recursion_used',
    
    // UI interactions
    TUTORIAL_SHOWN: 'tutorial_shown',
    TUTORIAL_DISMISSED: 'tutorial_dismissed',
    ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
    MODAL_OPENED: 'modal_opened'
};

/**
 * Analytics Manager - Tracks and stores game metrics locally
 */
export class AnalyticsManager {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.sessionStartTime = Date.now();
        this.events = [];
        this.levelMetrics = {};
        this.currentLevelStart = null;
        
        this.loadHistory();
        this.track(AnalyticsEvent.SESSION_START);
        
        // Track session end on page unload
        window.addEventListener('beforeunload', () => this.endSession());
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Load analytics history from localStorage
     */
    loadHistory() {
        try {
            const data = localStorage.getItem('startschool_analytics');
            if (data) {
                const parsed = JSON.parse(data);
                this.history = parsed.history || [];
                this.aggregateStats = parsed.aggregateStats || this.getDefaultStats();
            } else {
                this.history = [];
                this.aggregateStats = this.getDefaultStats();
            }
        } catch (e) {
            console.warn('Failed to load analytics:', e);
            this.history = [];
            this.aggregateStats = this.getDefaultStats();
        }
    }

    /**
     * Get default aggregate stats
     */
    getDefaultStats() {
        return {
            totalSessions: 0,
            totalPlayTime: 0,
            totalLevelsCompleted: 0,
            totalLevelAttempts: 0,
            totalActions: 0,
            totalBlocksCreated: 0,
            totalLoopsUsed: 0,
            totalRecursionsUsed: 0,
            levelCompletionTimes: {},
            levelAttemptCounts: {},
            featureDiscoveryOrder: [],
            firstPlayDate: null,
            lastPlayDate: null
        };
    }

    /**
     * Save analytics to localStorage
     */
    save() {
        try {
            // Keep only last 50 sessions in history to prevent storage bloat
            const trimmedHistory = this.history.slice(-50);
            
            const data = {
                history: trimmedHistory,
                aggregateStats: this.aggregateStats
            };
            localStorage.setItem('startschool_analytics', JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save analytics:', e);
        }
    }

    /**
     * Track an event
     */
    track(eventType, data = {}) {
        const event = {
            type: eventType,
            timestamp: Date.now(),
            sessionTime: Date.now() - this.sessionStartTime,
            data
        };
        
        this.events.push(event);
        this.processEvent(event);
        
        // Debug log in development
        if (window.location.hostname === 'localhost') {
            console.log(`📊 [Analytics] ${eventType}`, data);
        }
    }

    /**
     * Process event for aggregate stats
     */
    processEvent(event) {
        const stats = this.aggregateStats;
        
        switch (event.type) {
            case AnalyticsEvent.SESSION_START:
                stats.totalSessions++;
                if (!stats.firstPlayDate) {
                    stats.firstPlayDate = new Date().toISOString();
                }
                stats.lastPlayDate = new Date().toISOString();
                break;
                
            case AnalyticsEvent.LEVEL_START:
                this.currentLevelStart = Date.now();
                stats.totalLevelAttempts++;
                break;
                
            case AnalyticsEvent.LEVEL_COMPLETE:
                const levelId = event.data.levelId;
                const completionTime = this.currentLevelStart 
                    ? (Date.now() - this.currentLevelStart) / 1000 
                    : 0;
                
                stats.totalLevelsCompleted++;
                
                // Track best completion time per level
                if (!stats.levelCompletionTimes[levelId] || 
                    completionTime < stats.levelCompletionTimes[levelId]) {
                    stats.levelCompletionTimes[levelId] = completionTime;
                }
                
                // Track attempt counts per level
                if (!stats.levelAttemptCounts[levelId]) {
                    stats.levelAttemptCounts[levelId] = 0;
                }
                stats.levelAttemptCounts[levelId]++;
                break;
                
            case AnalyticsEvent.ACTION_ADDED:
                stats.totalActions++;
                break;
                
            case AnalyticsEvent.BLOCK_CREATED:
                stats.totalBlocksCreated++;
                if (!stats.featureDiscoveryOrder.includes('blocks')) {
                    stats.featureDiscoveryOrder.push('blocks');
                }
                break;
                
            case AnalyticsEvent.LOOP_USED:
                stats.totalLoopsUsed++;
                if (!stats.featureDiscoveryOrder.includes('loops')) {
                    stats.featureDiscoveryOrder.push('loops');
                }
                break;
                
            case AnalyticsEvent.RECURSION_USED:
                stats.totalRecursionsUsed++;
                if (!stats.featureDiscoveryOrder.includes('recursion')) {
                    stats.featureDiscoveryOrder.push('recursion');
                }
                break;
        }
        
        this.save();
    }

    /**
     * Start tracking a level
     */
    startLevel(levelId) {
        this.currentLevelStart = Date.now();
        this.levelMetrics[levelId] = {
            startTime: Date.now(),
            actions: 0,
            retries: 0,
            blocksUsed: 0,
            loopsUsed: 0,
            recursionsUsed: 0
        };
        this.track(AnalyticsEvent.LEVEL_START, { levelId });
    }

    /**
     * Complete level tracking
     */
    completeLevel(levelId, stars, actionsUsed) {
        const metrics = this.levelMetrics[levelId] || {};
        const timeSpent = metrics.startTime ? (Date.now() - metrics.startTime) / 1000 : 0;
        
        this.track(AnalyticsEvent.LEVEL_COMPLETE, {
            levelId,
            stars,
            actionsUsed,
            timeSpent: Math.round(timeSpent),
            retries: metrics.retries || 0
        });
    }

    /**
     * Track level failure
     */
    failLevel(levelId, reason) {
        const metrics = this.levelMetrics[levelId];
        if (metrics) {
            metrics.retries++;
        }
        this.track(AnalyticsEvent.LEVEL_FAIL, { levelId, reason });
    }

    /**
     * End session and save summary
     */
    endSession() {
        const sessionDuration = (Date.now() - this.sessionStartTime) / 1000;
        this.aggregateStats.totalPlayTime += sessionDuration;
        
        // Save session summary to history
        const sessionSummary = {
            sessionId: this.sessionId,
            date: new Date().toISOString(),
            duration: Math.round(sessionDuration),
            eventsCount: this.events.length,
            levelsCompleted: this.events.filter(e => e.type === AnalyticsEvent.LEVEL_COMPLETE).length
        };
        
        this.history.push(sessionSummary);
        this.track(AnalyticsEvent.SESSION_END, { duration: sessionDuration });
        this.save();
    }

    /**
     * Get analytics summary for display
     */
    getSummary() {
        const stats = this.aggregateStats;
        const avgSessionTime = stats.totalSessions > 0 
            ? Math.round(stats.totalPlayTime / stats.totalSessions) 
            : 0;
        
        const completedLevels = Object.keys(stats.levelCompletionTimes).length;
        
        return {
            totalSessions: stats.totalSessions,
            totalPlayTime: this.formatTime(stats.totalPlayTime),
            avgSessionTime: this.formatTime(avgSessionTime),
            levelsCompleted: completedLevels,
            totalAttempts: stats.totalLevelAttempts,
            completionRate: stats.totalLevelAttempts > 0 
                ? Math.round((stats.totalLevelsCompleted / stats.totalLevelAttempts) * 100) 
                : 0,
            actionsPerLevel: stats.totalLevelsCompleted > 0
                ? Math.round(stats.totalActions / stats.totalLevelsCompleted)
                : 0,
            featuresDiscovered: stats.featureDiscoveryOrder.length,
            firstPlayDate: stats.firstPlayDate ? new Date(stats.firstPlayDate).toLocaleDateString() : '—',
            lastPlayDate: stats.lastPlayDate ? new Date(stats.lastPlayDate).toLocaleDateString() : '—'
        };
    }

    /**
     * Get level-specific analytics
     */
    getLevelAnalytics(levelId) {
        const stats = this.aggregateStats;
        return {
            bestTime: stats.levelCompletionTimes[levelId] 
                ? this.formatTime(stats.levelCompletionTimes[levelId])
                : '—',
            attempts: stats.levelAttemptCounts[levelId] || 0
        };
    }

    /**
     * Format seconds to readable time
     */
    formatTime(seconds) {
        if (!seconds || seconds === 0) return '0s';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        
        if (mins === 0) return `${secs}s`;
        if (secs === 0) return `${mins}m`;
        return `${mins}m ${secs}s`;
    }

    /**
     * Export analytics data (for debugging/development)
     */
    exportData() {
        return {
            sessionId: this.sessionId,
            events: this.events,
            history: this.history,
            aggregateStats: this.aggregateStats
        };
    }

    /**
     * Reset all analytics (for testing)
     */
    reset() {
        this.events = [];
        this.history = [];
        this.aggregateStats = this.getDefaultStats();
        localStorage.removeItem('startschool_analytics');
    }
}
