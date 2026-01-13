/**
 * Main Entry Point
 * Initializes the game when DOM is ready
 * Optimized for fast loading (<3s on mobile)
 */

import { Game } from './Game.js';

// Performance timing
const loadStartTime = performance.now();

// Hide loading screen
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        // Remove from DOM after animation
        setTimeout(() => loadingScreen.remove(), 300);
    }
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Get canvas element
    const canvas = document.getElementById('game-canvas');
    
    if (!canvas) {
        console.error('Game canvas not found!');
        hideLoadingScreen();
        return;
    }
    
    // Initialize game
    const game = new Game(canvas);
    
    // Hide loading screen
    hideLoadingScreen();
    
    // Expose game instance for debugging
    window.game = game;
    
    // Log performance
    const loadTime = (performance.now() - loadStartTime).toFixed(0);
    console.log(`✅ Game loaded in ${loadTime}ms`);
    
    console.log('StartSchool Logic Game - Phase 9: Analytics & Accessibility');
    console.log('');
    console.log('🎮 14 levels with fun shapes!');
    console.log('');
    console.log('✨ Features:');
    console.log('  🏆 22 Achievements');
    console.log('  📊 Analytics tracking');
    console.log('  ⌨️ Full keyboard navigation (press H for help)');
    console.log('  ♿ Screen reader support');
    console.log('');
    console.log('Keyboard: WASD/Arrows=move, Space=play, R=reset, H=help');
});
