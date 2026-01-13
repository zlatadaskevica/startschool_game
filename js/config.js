/**
 * Game Configuration
 * Central configuration file for game constants and settings
 */

export const CONFIG = {
    // Brand Colors
    colors: {
        primary: '#000FEE',      // Main ball color
        accent: '#FF77C9',       // Target shape color
        background: '#FAFAFA',
        surface: '#FFFFFF',
        grid: '#E5E5E5',
        success: '#4CAF50',
        error: '#F44336',
        actionBtn: '#333333',
        actionBtnActive: '#000FEE'
    },

    // Grid Settings
    grid: {
        cellSize: 50,           // Base cell size in pixels
        rows: 8,                // Number of rows
        cols: 8,                // Number of columns
        padding: 20             // Padding around grid
    },

    // Ball Settings
    ball: {
        radiusRatio: 0.35,      // Ball radius as ratio of cell size
        glowRadius: 10,         // Glow effect radius
        shadowBlur: 15,
        shadowOffsetY: 4
    },

    // Animation Settings
    animation: {
        fps: 60,
        moveSpeed: 200,         // Pixels per second
        actionDuration: 300,    // Duration of each action in ms
        easingFunction: 'easeInOutCubic'
    },

    // Action Settings
    actions: {
        maxQueueSize: 50        // Maximum actions in queue (generous limit)
    },

    // Game Settings
    game: {
        totalLevels: 14,
        startLevel: 1
    }
};

/**
 * Easing Functions for smooth animations
 */
export const EASING = {
    linear: t => t,
    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: t => t * t * t,
    easeOutCubic: t => (--t) * t * t + 1,
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeOutElastic: t => {
        const p = 0.3;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
    }
};
